import { validateHeight, validateWeight } from '@/features/unified/child-profile-validation';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import type { RealtimeChannel, User } from '@supabase/supabase-js';

import type { Recipe } from '@/constants/warrior-kids';
import {
  createEmptyUnifiedData,
  isUnifiedData,
  type LocalAccount,
  type NutriChild,
  type UnifiedData,
} from '@/features/unified/model';
import { FOOD_OPTIONS } from '@/features/unified/constants';
import { unique, userError } from '@/features/unified/utils';
import { getSupabaseClient, type Json } from '@/lib/supabase';

const EVIDENCE_BUCKET = 'activity-evidence';

export type CloudDataSnapshot = {
  data: UnifiedData;
  version: number;
};

export type PhysicalActivityCatalog = {
  codigo: string;
  nombre: string;
  grupo_edad: string;
  tipo: string;
  capacidad_fisica: string;
  intensidad: string;
  minutos_sesion: string;
  dias_por_semana: string;
  supervision: string;
  material: string;
  espacio: string;
  precauciones: string;
  como_se_hace: string;
};

export async function loadPhysicalActivityCatalog(): Promise<PhysicalActivityCatalog[]> {
  const { data, error } = await getSupabaseClient()
    .from('catalogo_actividades_fisicas')
    .select('*')
    .order('codigo');

  if (error) throw userError('No se pudo cargar el catálogo de actividades físicas.', error);
  return data;
}

export async function loadDatabaseRecipes(): Promise<Recipe[]> {
  const supabase = getSupabaseClient();
  const [catalogResult, recipesResult] = await Promise.all([
    supabase
      .from('catalogo_recetas_warrior_kids')
      .select('codigo, id_receta, nombre_platillo, tipo_comida, grupo_edad, combinacion_grupos, ingredientes, porciones_por_grupo, calorias_porcion_kcal, tiempo_preparacion_min, nota_educativa_app, preparacion_completa')
      .order('nombre_platillo'),
    supabase
      .from('recetas')
      .select('id_receta, nombre_platillo, instrucciones, prep_horas, prep_minutos, calorias_porcion')
      .order('nombre_platillo'),
  ]);
  if (catalogResult.error) throw userError('No se pudo cargar el catálogo de recetas de Warrior Kids.', catalogResult.error);
  if (recipesResult.error) throw userError('No se pudieron cargar las recetas de la base de datos.', recipesResult.error);
  const catalogRecipeIds = new Set(catalogResult.data.map(recipe => recipe.id_receta));
  const recipes = recipesResult.data.filter(recipe => !catalogRecipeIds.has(recipe.id_receta));
  if (!recipes.length) {
    return catalogResult.data.map(recipe => {
      const ingredientDetails = parseRecipeIngredients(recipe.ingredientes);
      return {
        id: `database-recipe-${recipe.id_receta}`,
        databaseId: recipe.id_receta,
        catalogCode: recipe.codigo,
        mealType: recipe.tipo_comida,
        ageGroup: recipe.grupo_edad,
        portionsByGroup: recipe.porciones_por_grupo,
        preparationTimeMinutes: recipe.tiempo_preparacion_min,
        caloriesPerPortion: recipe.calorias_porcion_kcal,
        title: recipe.nombre_platillo,
        emoji: '',
        groups: recipe.combinacion_grupos,
        ingredients: ingredientDetails.map(ingredient => ingredient.name),
        ingredientDetails,
        preparation: recipe.preparacion_completa,
        note: recipe.nota_educativa_app,
      };
    });
  }

  const recipeIds = recipes.map(recipe => recipe.id_receta);
  const { data: relations, error: relationsError } = await supabase
    .from('receta_ingrediente')
    .select('id_receta, id_ingrediente, cantidad')
    .in('id_receta', recipeIds);
  if (relationsError) throw userError('No se pudieron cargar los ingredientes de las recetas.', relationsError);

  const ingredientIds = [...new Set(relations.map(relation => relation.id_ingrediente))];
  const { data: ingredients, error: ingredientsError } = ingredientIds.length
    ? await supabase
        .from('ingredientes')
        .select('id_ingrediente, nombre')
        .in('id_ingrediente', ingredientIds)
    : { data: [], error: null };
  if (ingredientsError) throw userError('No se pudieron cargar los nombres de ingredientes.', ingredientsError);

  const ingredientNames = new Map(ingredients.map(ingredient => [ingredient.id_ingrediente, ingredient.nombre]));
  const recipeIngredients = new Map<number, { name: string; quantity: string | null }[]>();
  for (const relation of relations) {
    const name = ingredientNames.get(relation.id_ingrediente);
    if (!name) continue;
    const values = recipeIngredients.get(relation.id_receta) ?? [];
    values.push({ name, quantity: relation.cantidad });
    recipeIngredients.set(relation.id_receta, values);
  }

  const legacyRecipes = recipes.map(recipe => {
    const preparationDetails = [
      recipe.prep_horas ? `${recipe.prep_horas} h` : '',
      recipe.prep_minutos ? `${recipe.prep_minutos} min` : '',
    ].filter(Boolean).join(' ');
    const note = [
      preparationDetails ? `Preparación registrada: ${preparationDetails}.` : '',
      recipe.calorias_porcion !== null ? `${recipe.calorias_porcion} kcal por porción.` : '',
    ].filter(Boolean).join(' ');
    return {
      id: `database-recipe-${recipe.id_receta}`,
      databaseId: recipe.id_receta,
      title: recipe.nombre_platillo,
      emoji: '',
      groups: '',
      ingredients: (recipeIngredients.get(recipe.id_receta) ?? []).map(ingredient => ingredient.name),
      ingredientDetails: recipeIngredients.get(recipe.id_receta) ?? [],
      preparation: recipe.instrucciones,
      note,
    };
  });
  const catalogRecipes = catalogResult.data.map(recipe => {
    const ingredientDetails = parseRecipeIngredients(recipe.ingredientes);
    return {
      id: `database-recipe-${recipe.id_receta}`,
      databaseId: recipe.id_receta,
      catalogCode: recipe.codigo,
      mealType: recipe.tipo_comida,
      ageGroup: recipe.grupo_edad,
      portionsByGroup: recipe.porciones_por_grupo,
      preparationTimeMinutes: recipe.tiempo_preparacion_min,
      caloriesPerPortion: recipe.calorias_porcion_kcal,
      title: recipe.nombre_platillo,
      emoji: '',
      groups: recipe.combinacion_grupos,
      ingredients: ingredientDetails.map(ingredient => ingredient.name),
      ingredientDetails,
      preparation: recipe.preparacion_completa,
      note: recipe.nota_educativa_app,
    };
  });
  return [...catalogRecipes, ...legacyRecipes];
}

function parseRecipeIngredients(value: string): { name: string; quantity: string | null }[] {
  return value.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const quantityStart = part.lastIndexOf(' (');
    if (quantityStart < 0 || !part.endsWith(')')) return { name: part, quantity: null };
    return {
      name: part.slice(0, quantityStart).trim(),
      quantity: part.slice(quantityStart + 2, -1).trim(),
    };
  });
}

// Solo retos y recompensas: las asignaciones, los pedidos y los planes viven en datos_app.
export type NormalizedManagementSnapshot = {
  challenges: {
    id_reto: number;
    descripcion_reto: string;
    puntos_de_recompensa: number;
    fecha_inicio: string;
    fecha_limite: string;
  }[];
  rewards: {
    id_recompensa: number;
    nombre_premio: string;
    costo_en_puntos: number;
    cantidad_disponible: number;
    estado: 'activa' | 'inactiva' | 'agotada';
  }[];
};

export async function loadNormalizedManagement(userId: string): Promise<NormalizedManagementSnapshot> {
  const supabase = getSupabaseClient();
  const [challengesResult, rewardsResult] = await Promise.all([
    supabase
      .from('retos')
      .select('id_reto, descripcion_reto, puntos_de_recompensa, fecha_inicio, fecha_limite')
      .eq('id_padre', userId)
      .order('fecha_inicio', { ascending: false }),
    supabase
      .from('recompensas')
      .select('id_recompensa, nombre_premio, costo_en_puntos, cantidad_disponible, estado')
      .eq('id_padre', userId)
      .order('nombre_premio'),
  ]);
  if (challengesResult.error) throw userError('No se pudieron cargar los retos.', challengesResult.error);
  if (rewardsResult.error) throw userError('No se pudieron cargar las recompensas.', rewardsResult.error);

  return { challenges: challengesResult.data, rewards: rewardsResult.data };
}

export type ActivityManagementSnapshot = {
  challenges: { id_reto: number; descripcion_reto: string }[];
  sports: { id_tipo_deporte: number; nombre: string }[];
  intensities: { id_intensidad: number; nombre: string }[];
  subjects: { id_materia: number; nombre: string }[];
  physicalActivities: {
    id_actividad_fisica: number;
    id_reto: number;
    id_tipo_deporte: number;
    id_intensidad: number;
    distancia_km: number | null;
    tiempo_minutos: number | null;
  }[];
  didacticActivities: {
    id_actividad_didactica: number;
    id_reto: number;
    id_materia: number;
    duracion_horas: number;
    duracion_minutos: number;
  }[];
};

export async function loadActivityManagement(userId: string): Promise<ActivityManagementSnapshot> {
  const supabase = getSupabaseClient();
  const [challengesResult, sportsResult, intensitiesResult, subjectsResult] = await Promise.all([
    supabase
      .from('retos')
      .select('id_reto, descripcion_reto')
      .eq('id_padre', userId)
      .order('fecha_inicio', { ascending: false }),
    supabase.from('cat_tipo_deporte').select('id_tipo_deporte, nombre').order('nombre'),
    supabase.from('cat_intensidad').select('id_intensidad, nombre').order('nombre'),
    supabase.from('cat_materia').select('id_materia, nombre').order('nombre'),
  ]);
  if (challengesResult.error) throw userError('No se pudieron cargar los retos para las actividades.', challengesResult.error);
  if (sportsResult.error) throw userError('No se pudo cargar el catálogo de deportes.', sportsResult.error);
  if (intensitiesResult.error) throw userError('No se pudo cargar el catálogo de intensidades.', intensitiesResult.error);
  if (subjectsResult.error) throw userError('No se pudo cargar el catálogo de materias.', subjectsResult.error);

  const challengeIds = challengesResult.data.map(challenge => challenge.id_reto);
  if (!challengeIds.length) {
    return {
      challenges: challengesResult.data,
      sports: sportsResult.data,
      intensities: intensitiesResult.data,
      subjects: subjectsResult.data,
      physicalActivities: [],
      didacticActivities: [],
    };
  }

  const [physicalResult, didacticResult] = await Promise.all([
    supabase
      .from('actividades_fisicas')
      .select('id_actividad_fisica, id_reto, id_tipo_deporte, id_intensidad, distancia_km, tiempo_minutos')
      .in('id_reto', challengeIds)
      .order('id_actividad_fisica'),
    supabase
      .from('actividades_didacticas')
      .select('id_actividad_didactica, id_reto, id_materia, duracion_horas, duracion_minutos')
      .in('id_reto', challengeIds)
      .order('id_actividad_didactica'),
  ]);
  if (physicalResult.error) throw userError('No se pudieron cargar las actividades físicas.', physicalResult.error);
  if (didacticResult.error) throw userError('No se pudieron cargar las actividades didácticas.', didacticResult.error);

  return {
    challenges: challengesResult.data,
    sports: sportsResult.data,
    intensities: intensitiesResult.data,
    subjects: subjectsResult.data,
    physicalActivities: physicalResult.data,
    didacticActivities: didacticResult.data,
  };
}

export type PhysicalActivityInput = {
  id_reto: number;
  id_tipo_deporte: number;
  id_intensidad: number;
  distancia_km: number | null;
  tiempo_minutos: number | null;
};

async function validateActivityReferences(
  userId: string,
  challengeId: number,
  catalog: 'cat_tipo_deporte' | 'cat_intensidad' | 'cat_materia',
  catalogId: number,
): Promise<void> {
  const supabase = getSupabaseClient();
  const challengeResult = await supabase
    .from('retos')
    .select('id_reto')
    .eq('id_reto', challengeId)
    .eq('id_padre', userId)
    .maybeSingle();
  if (challengeResult.error) throw userError('No se pudo verificar el reto seleccionado.', challengeResult.error);
  if (!challengeResult.data) throw userError('Selecciona un reto que pertenezca a esta cuenta.');

  const catalogResult = catalog === 'cat_tipo_deporte'
    ? await supabase.from('cat_tipo_deporte').select('id_tipo_deporte').eq('id_tipo_deporte', catalogId).maybeSingle()
    : catalog === 'cat_intensidad'
      ? await supabase.from('cat_intensidad').select('id_intensidad').eq('id_intensidad', catalogId).maybeSingle()
      : await supabase.from('cat_materia').select('id_materia').eq('id_materia', catalogId).maybeSingle();
  if (catalogResult.error) throw userError('No se pudo verificar la opción del catálogo.', catalogResult.error);
  if (!catalogResult.data) throw userError('La opción seleccionada ya no está disponible en el catálogo.');
}

export async function savePhysicalChallengeActivity(
  userId: string,
  input: PhysicalActivityInput,
  activityId?: number,
): Promise<void> {
  if (!Number.isSafeInteger(input.id_reto) || input.id_reto <= 0 ||
      !Number.isSafeInteger(input.id_tipo_deporte) || input.id_tipo_deporte <= 0 ||
      !Number.isSafeInteger(input.id_intensidad) || input.id_intensidad <= 0) {
    throw userError('Selecciona un reto, deporte e intensidad válidos.');
  }
  if ((input.distancia_km !== null && (!Number.isFinite(input.distancia_km) || input.distancia_km < 0)) ||
      (input.tiempo_minutos !== null && (!Number.isSafeInteger(input.tiempo_minutos) || input.tiempo_minutos < 0))) {
    throw userError('La distancia y el tiempo deben ser valores válidos y no negativos.');
  }

  await Promise.all([
    validateActivityReferences(userId, input.id_reto, 'cat_tipo_deporte', input.id_tipo_deporte),
    validateActivityReferences(userId, input.id_reto, 'cat_intensidad', input.id_intensidad),
  ]);
  const supabase = getSupabaseClient();
  const values = {
    id_reto: input.id_reto,
    id_tipo_deporte: input.id_tipo_deporte,
    id_intensidad: input.id_intensidad,
    distancia_km: input.distancia_km,
    tiempo_minutos: input.tiempo_minutos,
  };
  const result = activityId
    ? await supabase.from('actividades_fisicas').update(values)
        .eq('id_actividad_fisica', activityId).select('id_actividad_fisica').maybeSingle()
    : await supabase.from('actividades_fisicas').insert(values)
        .select('id_actividad_fisica').single();
  if (result.error) throw userError('No se pudo guardar la actividad física.', result.error);
  if (!result.data) throw userError('La actividad física ya no está disponible para esta cuenta.');
}

export async function deletePhysicalChallengeActivity(activityId: number): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('actividades_fisicas')
    .delete()
    .eq('id_actividad_fisica', activityId)
    .select('id_actividad_fisica')
    .maybeSingle();
  if (error) throw userError('No se pudo eliminar la actividad física.', error);
  if (!data) throw userError('La actividad física ya no está disponible para esta cuenta.');
}

export type DidacticActivityInput = {
  id_reto: number;
  id_materia: number;
  duracion_horas: number;
  duracion_minutos: number;
};

export async function saveDidacticChallengeActivity(
  userId: string,
  input: DidacticActivityInput,
  activityId?: number,
): Promise<void> {
  if (!Number.isSafeInteger(input.id_reto) || input.id_reto <= 0 ||
      !Number.isSafeInteger(input.id_materia) || input.id_materia <= 0) {
    throw userError('Selecciona un reto y una materia válidos.');
  }
  if (!Number.isSafeInteger(input.duracion_horas) || input.duracion_horas < 0 ||
      !Number.isSafeInteger(input.duracion_minutos) || input.duracion_minutos < 0 || input.duracion_minutos > 59) {
    throw userError('La duración debe usar horas no negativas y minutos entre 0 y 59.');
  }
  await validateActivityReferences(userId, input.id_reto, 'cat_materia', input.id_materia);

  const supabase = getSupabaseClient();
  const values = {
    id_reto: input.id_reto,
    id_materia: input.id_materia,
    duracion_horas: input.duracion_horas,
    duracion_minutos: input.duracion_minutos,
  };
  const result = activityId
    ? await supabase.from('actividades_didacticas').update(values)
        .eq('id_actividad_didactica', activityId).select('id_actividad_didactica').maybeSingle()
    : await supabase.from('actividades_didacticas').insert(values)
        .select('id_actividad_didactica').single();
  if (result.error) throw userError('No se pudo guardar la actividad didáctica.', result.error);
  if (!result.data) throw userError('La actividad didáctica ya no está disponible para esta cuenta.');
}

export async function deleteDidacticChallengeActivity(activityId: number): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('actividades_didacticas')
    .delete()
    .eq('id_actividad_didactica', activityId)
    .select('id_actividad_didactica')
    .maybeSingle();
  if (error) throw userError('No se pudo eliminar la actividad didáctica.', error);
  if (!data) throw userError('La actividad didáctica ya no está disponible para esta cuenta.');
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export type ChallengeInput = {
  descripcion_reto: string;
  puntos_de_recompensa: number;
  fecha_inicio: string;
  fecha_limite: string;
};

export async function saveChallenge(
  userId: string,
  input: ChallengeInput,
  challengeId?: number,
): Promise<void> {
  const description = input.descripcion_reto.trim();
  if (!description || !Number.isSafeInteger(input.puntos_de_recompensa) || input.puntos_de_recompensa < 0) {
    throw userError('Escribe la descripción del reto y una cantidad válida de puntos.');
  }
  if (!isIsoDate(input.fecha_inicio) || !isIsoDate(input.fecha_limite) || input.fecha_limite < input.fecha_inicio) {
    throw userError('Revisa las fechas del reto; la fecha límite no puede ser anterior al inicio.');
  }

  const supabase = getSupabaseClient();
  const values = {
    descripcion_reto: description,
    puntos_de_recompensa: input.puntos_de_recompensa,
    fecha_inicio: input.fecha_inicio,
    fecha_limite: input.fecha_limite,
  };
  const result = challengeId
    ? await supabase.from('retos').update(values).eq('id_reto', challengeId).eq('id_padre', userId).select('id_reto').maybeSingle()
    : await supabase.from('retos').insert({ ...values, id_padre: userId }).select('id_reto').single();
  if (result.error) throw userError('No se pudo guardar el reto.', result.error);
  if (!result.data) throw userError('El reto ya no está disponible para esta cuenta.');
}

export async function deleteChallenge(userId: string, challengeId: number): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('retos')
    .delete()
    .eq('id_reto', challengeId)
    .eq('id_padre', userId)
    .select('id_reto')
    .maybeSingle();
  if (error) throw userError('No se pudo eliminar el reto.', error);
  if (!data) throw userError('El reto ya no está disponible para esta cuenta.');
}

export type AssignmentStatus = 'asignado' | 'en_progreso' | 'completado' | 'verificado' | 'rechazado';

export async function createChallengeAssignment(
  userId: string,
  childId: number,
  challengeId: number,
): Promise<void> {
  const supabase = getSupabaseClient();
  const [child, challenge] = await Promise.all([
    supabase.from('hijos').select('id_hijo').eq('id_hijo', childId).eq('id_padre', userId).maybeSingle(),
    supabase.from('retos').select('id_reto').eq('id_reto', challengeId).eq('id_padre', userId).maybeSingle(),
  ]);
  if (child.error) throw userError('No se pudo verificar el perfil infantil.', child.error);
  if (challenge.error) throw userError('No se pudo verificar el reto.', challenge.error);
  if (!child.data || !challenge.data) throw userError('El perfil y el reto deben pertenecer a esta cuenta.');

  const { error } = await supabase
    .from('hijo_reto')
    .insert({ id_hijo: childId, id_reto: challengeId })
    .select('id_hijo_reto')
    .single();
  if (error) throw userError('No se pudo asignar el reto a este perfil.', error);
}

export async function updateChallengeAssignment(
  assignmentId: number,
  status: AssignmentStatus,
  pointsAwarded?: number,
): Promise<void> {
  const now = new Date().toISOString();
  const updates: {
    estado: AssignmentStatus;
    fecha_completado: string | null;
    fecha_verificacion: string | null;
    puntos_otorgados?: number;
  } = {
    estado: status,
    fecha_completado: status === 'completado' || status === 'verificado' ? now : null,
    fecha_verificacion: status === 'verificado' ? now : null,
  };
  if (status === 'verificado' && pointsAwarded !== undefined) updates.puntos_otorgados = pointsAwarded;
  const { data, error } = await getSupabaseClient()
    .from('hijo_reto')
    .update(updates)
    .eq('id_hijo_reto', assignmentId)
    .select('id_hijo_reto')
    .maybeSingle();
  if (error) throw userError('No se pudo actualizar el estado de la asignación.', error);
  if (!data) throw userError('La asignación ya no está disponible para esta cuenta.');
}

export async function deleteChallengeAssignment(assignmentId: number): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('hijo_reto')
    .delete()
    .eq('id_hijo_reto', assignmentId)
    .select('id_hijo_reto')
    .maybeSingle();
  if (error) throw userError('No se pudo retirar la asignación del reto.', error);
  if (!data) throw userError('La asignación ya no está disponible para esta cuenta.');
}

export type RewardInput = {
  nombre_premio: string;
  costo_en_puntos: number;
  cantidad_disponible: number;
  estado: 'activa' | 'inactiva' | 'agotada';
};

export async function saveReward(userId: string, input: RewardInput, rewardId?: number): Promise<void> {
  const name = input.nombre_premio.trim();
  if (
    !name ||
    !Number.isSafeInteger(input.costo_en_puntos) ||
    input.costo_en_puntos < 0 ||
    !Number.isSafeInteger(input.cantidad_disponible) ||
    input.cantidad_disponible < 0
  ) {
    throw userError('Revisa el nombre, costo en puntos y cantidad disponible de la recompensa.');
  }
  const values = {
    nombre_premio: name,
    costo_en_puntos: input.costo_en_puntos,
    cantidad_disponible: input.cantidad_disponible,
    estado: input.estado,
  };
  const supabase = getSupabaseClient();
  const result = rewardId
    ? await supabase.from('recompensas').update(values).eq('id_recompensa', rewardId).eq('id_padre', userId).select('id_recompensa').maybeSingle()
    : await supabase.from('recompensas').insert({ ...values, id_padre: userId }).select('id_recompensa').single();
  if (result.error) throw userError('No se pudo guardar la recompensa.', result.error);
  if (!result.data) throw userError('La recompensa ya no está disponible para esta cuenta.');
}

export async function deleteReward(userId: string, rewardId: number): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('recompensas')
    .delete()
    .eq('id_recompensa', rewardId)
    .eq('id_padre', userId)
    .select('id_recompensa')
    .maybeSingle();
  if (error) {
    if (error.code === '23503') {
      throw userError('No se puede eliminar una recompensa con canjes registrados. Puedes cambiarla a inactiva.');
    }
    throw userError('No se pudo eliminar la recompensa.', error);
  }
  if (!data) throw userError('La recompensa ya no está disponible para esta cuenta.');
}

export async function createRewardRedemption(
  userId: string,
  childId: number,
  rewardId: number,
  pointsSpent: number,
): Promise<void> {
  if (!Number.isSafeInteger(pointsSpent) || pointsSpent < 0) {
    throw userError('Los puntos registrados para el canje no son válidos.');
  }
  const supabase = getSupabaseClient();
  const [child, reward] = await Promise.all([
    supabase.from('hijos').select('id_hijo').eq('id_hijo', childId).eq('id_padre', userId).maybeSingle(),
    supabase
      .from('recompensas')
      .select('id_recompensa, costo_en_puntos, cantidad_disponible, estado')
      .eq('id_recompensa', rewardId)
      .eq('id_padre', userId)
      .maybeSingle(),
  ]);
  if (child.error) throw userError('No se pudo verificar el perfil infantil.', child.error);
  if (reward.error) throw userError('No se pudo verificar la recompensa.', reward.error);
  if (!child.data || !reward.data) throw userError('El perfil y la recompensa deben pertenecer a esta cuenta.');
  if (reward.data.estado !== 'activa' || reward.data.cantidad_disponible < 1) {
    throw userError('La recompensa ya no está disponible.');
  }
  if (pointsSpent !== reward.data.costo_en_puntos) {
    throw userError('El costo del canje debe coincidir con el costo actual de la recompensa.');
  }

  const { error } = await supabase
    .from('canjes_recompensa')
    .insert({
      id_hijo: childId,
      id_recompensa: rewardId,
      puntos_gastados: pointsSpent,
    })
    .select('id_canje')
    .single();
  if (error) throw userError('No se pudo registrar el canje.', error);
}

export async function updateRewardRedemption(
  redemptionId: number,
  updates: { estado: 'solicitado' | 'entregado' | 'cancelado'; puntos_gastados: number },
): Promise<void> {
  if (!Number.isSafeInteger(updates.puntos_gastados) || updates.puntos_gastados < 0) {
    throw userError('Los puntos registrados para el canje no son válidos.');
  }
  const { data, error } = await getSupabaseClient()
    .from('canjes_recompensa')
    .update(updates)
    .eq('id_canje', redemptionId)
    .select('id_canje')
    .maybeSingle();
  if (error) throw userError('No se pudo actualizar el canje.', error);
  if (!data) throw userError('El canje ya no está disponible para esta cuenta.');
}

export async function deleteRewardRedemption(redemptionId: number): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('canjes_recompensa')
    .delete()
    .eq('id_canje', redemptionId)
    .select('id_canje')
    .maybeSingle();
  if (error) throw userError('No se pudo eliminar el canje.', error);
  if (!data) throw userError('El canje ya no está disponible para esta cuenta.');
}

export type MealPlanInput = {
  id_hijo: number;
  meta_calorias_diarias: number;
  fecha_inicio: string;
  fecha_fin: string;
};

export async function saveMealPlan(input: MealPlanInput, planId?: number): Promise<void> {
  if (
    !Number.isSafeInteger(input.meta_calorias_diarias) ||
    input.meta_calorias_diarias <= 0 ||
    !isIsoDate(input.fecha_inicio) ||
    !isIsoDate(input.fecha_fin) ||
    input.fecha_fin < input.fecha_inicio
  ) {
    throw userError('Revisa la meta calórica y el periodo del plan.');
  }
  const values = {
    id_hijo: input.id_hijo,
    meta_calorias_diarias: input.meta_calorias_diarias,
    fecha_inicio: input.fecha_inicio,
    fecha_fin: input.fecha_fin,
  };
  const supabase = getSupabaseClient();
  const result = planId
    ? await supabase.from('planes_alimenticios').update(values).eq('id_plan', planId).select('id_plan').maybeSingle()
    : await supabase.from('planes_alimenticios').insert(values).select('id_plan').single();
  if (result.error) throw userError('No se pudo guardar el plan alimenticio.', result.error);
  if (!result.data) throw userError('El plan ya no está disponible para esta cuenta.');
}

export async function deleteMealPlan(planId: number): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('planes_alimenticios')
    .delete()
    .eq('id_plan', planId)
    .select('id_plan')
    .maybeSingle();
  if (error) throw userError('No se pudo eliminar el plan alimenticio.', error);
  if (!data) throw userError('El plan ya no está disponible para esta cuenta.');
}

export type PlanRecipeInput = {
  id_plan: number;
  id_receta: number;
  fecha: string;
  tipo_comida: 'desayuno' | 'colacion' | 'comida' | 'cena';
};

export async function addPlanRecipe(input: PlanRecipeInput): Promise<void> {
  if (!isIsoDate(input.fecha)) throw userError('Escribe una fecha válida para la receta del plan.');
  const { error } = await getSupabaseClient()
    .from('plan_receta')
    .insert(input)
    .select('id_plan')
    .single();
  if (error) {
    if (error.code === '23505') throw userError('Esta receta ya está agregada en esa fecha y momento de comida.');
    throw userError('No se pudo agregar la receta al plan.', error);
  }
}

export async function removePlanRecipe(input: PlanRecipeInput): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('plan_receta')
    .delete()
    .eq('id_plan', input.id_plan)
    .eq('id_receta', input.id_receta)
    .eq('fecha', input.fecha)
    .eq('tipo_comida', input.tipo_comida)
    .select('id_plan')
    .maybeSingle();
  if (error) throw userError('No se pudo quitar la receta del plan.', error);
  if (!data) throw userError('La receta ya no estaba asignada a este plan.');
}

function normalizeFoodName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').trim();
}

function foodOptionForIngredient(name: string) {
  const normalized = normalizeFoodName(name);
  return FOOD_OPTIONS.find(option =>
    [option.name, ...option.keywords].some(term => normalizeFoodName(term) === normalized),
  );
}

function diagnosisFromDatabase(
  weightDiagnosis: string,
  glucoseDiagnosis: string,
): NutriChild['dictamen'] {
  if (glucoseDiagnosis === 'diabetes_tipo_2') return 'diabetes2';
  if (glucoseDiagnosis === 'prediabetes') return 'prediabetes';
  if (weightDiagnosis === 'sobrepeso' || weightDiagnosis === 'obesidad') return weightDiagnosis;
  return undefined;
}

export async function loadDatabaseChildren(userId: string): Promise<NutriChild[]> {
  const supabase = getSupabaseClient();
  const { data: children, error: childrenError } = await supabase
    .from('hijos')
    .select('id_hijo, nombres, apellidos, fecha_nacimiento, sexo')
    .eq('id_padre', userId)
    .order('id_hijo');
  if (childrenError) throw userError('No se pudieron cargar los perfiles infantiles.', childrenError);
  if (!children.length) return [];

  const childIds = children.map(child => child.id_hijo);
  const [measurementsResult, healthResult, preferencesResult, ingredientsResult] = await Promise.all([
    supabase
      .from('mediciones_hijo')
      .select('id_hijo, fecha_medicion, id_medicion, peso_kg, estatura_cm')
      .in('id_hijo', childIds)
      .order('fecha_medicion', { ascending: false })
      .order('id_medicion', { ascending: false }),
    supabase
      .from('valoraciones_salud')
      .select('id_hijo, fecha_registro, id_valoracion, diagnostico_peso, diagnostico_glucosa')
      .in('id_hijo', childIds)
      .order('fecha_registro', { ascending: false })
      .order('id_valoracion', { ascending: false }),
    supabase
      .from('hijo_ingrediente')
      .select('id_hijo, id_ingrediente, tipo')
      .in('id_hijo', childIds),
    supabase
      .from('ingredientes')
      .select('id_ingrediente, nombre'),
  ]);
  if (measurementsResult.error) throw userError('No se pudieron cargar las mediciones infantiles.', measurementsResult.error);
  if (healthResult.error) throw userError('No se pudieron cargar las valoraciones de salud.', healthResult.error);
  if (preferencesResult.error) throw userError('No se pudieron cargar las preferencias de alimentos.', preferencesResult.error);
  if (ingredientsResult.error) throw userError('No se pudo cargar el catálogo de ingredientes.', ingredientsResult.error);

  const latestMeasurement = new Map<number, (typeof measurementsResult.data)[number]>();
  for (const measurement of measurementsResult.data) {
    if (!latestMeasurement.has(measurement.id_hijo)) latestMeasurement.set(measurement.id_hijo, measurement);
  }
  const latestHealth = new Map<number, (typeof healthResult.data)[number]>();
  for (const health of healthResult.data) {
    if (!latestHealth.has(health.id_hijo)) latestHealth.set(health.id_hijo, health);
  }
  const ingredientNames = new Map(ingredientsResult.data.map(item => [item.id_ingrediente, item.nombre]));
  const preferences = new Map<number, { alergia: string[]; noLeGusta: string[]; preferidos: string[] }>();
  for (const preference of preferencesResult.data) {
    const name = ingredientNames.get(preference.id_ingrediente);
    if (!name) continue;
    const group = preferences.get(preference.id_hijo) ?? { alergia: [], noLeGusta: [], preferidos: [] };
    const option = foodOptionForIngredient(name);
    const value = option?.id ?? name;
    if (preference.tipo === 'alergia') group.alergia.push(value);
    if (preference.tipo === 'no_le_gusta') group.noLeGusta.push(value);
    if (preference.tipo === 'preferido') group.preferidos.push(value);
    preferences.set(preference.id_hijo, group);
  }

  return children.map(child => {
    const measurement = latestMeasurement.get(child.id_hijo);
    const health = latestHealth.get(child.id_hijo);
    const childPreferences = preferences.get(child.id_hijo) ?? { alergia: [], noLeGusta: [], preferidos: [] };
    const knownFoodIds = (values: string[]) => unique(values.filter(value => FOOD_OPTIONS.some(item => item.id === value)));
    const otherFoodNames = (values: string[]) => unique(values.filter(value => !FOOD_OPTIONS.some(item => item.id === value))).join(', ');

    return {
      id: `database-child-${child.id_hijo}`,
      databaseChildId: child.id_hijo,
      nombre: [child.nombres, child.apellidos].filter(Boolean).join(' ').trim(),
      genero: child.sexo === 'masculino' ? 'nino' : 'nina',
      nacimiento: child.fecha_nacimiento,
      peso: measurement ? String(measurement.peso_kg) : '',
      altura: measurement ? String(measurement.estatura_cm) : '',
      alergias: knownFoodIds(childPreferences.alergia),
      noGusta: knownFoodIds(childPreferences.noLeGusta),
      gusta: knownFoodIds(childPreferences.preferidos),
      otrasAlergias: otherFoodNames(childPreferences.alergia),
      otrosNoGusta: otherFoodNames(childPreferences.noLeGusta),
      otrosGusta: otherFoodNames(childPreferences.preferidos),
      dictamen: health
        ? diagnosisFromDatabase(health.diagnostico_peso, health.diagnostico_glucosa)
        : undefined,
    };
  });
}

export function mergeDatabaseChildren(data: UnifiedData, children: NutriChild[]): UnifiedData {
  if (!children.length) return data;
  const merged = [...data.nutribot.ninos];
  for (const child of children) {
    const matchIndex = merged.findIndex(item => item.databaseChildId === child.databaseChildId);
    if (matchIndex >= 0) {
      const match = merged[matchIndex];
      merged[matchIndex] = {
        ...match,
        databaseChildId: child.databaseChildId,
        nombre: match.nombre || child.nombre,
        genero: match.genero || child.genero,
        nacimiento: match.nacimiento || child.nacimiento,
        // Si se decidió no registrar mediciones, no se vuelven a traer de la base de datos.
        peso: match.sinMediciones ? '' : match.peso || child.peso,
        altura: match.sinMediciones ? '' : match.altura || child.altura,
        alergias: unique([...match.alergias, ...child.alergias]),
        noGusta: unique([...match.noGusta, ...child.noGusta]),
        gusta: unique([...(match.gusta ?? []), ...(child.gusta ?? [])]),
        otrasAlergias: unique([match.otrasAlergias, child.otrasAlergias].filter(Boolean)).join(', '),
        otrosNoGusta: unique([match.otrosNoGusta, child.otrosNoGusta].filter(Boolean)).join(', '),
        otrosGusta: unique([match.otrosGusta ?? '', child.otrosGusta ?? ''].filter(Boolean)).join(', '),
        dictamen: match.dictamen ?? child.dictamen,
      };
    } else {
      merged.push(child);
    }
  }
  return { ...data, nutribot: { ...data.nutribot, ninos: merged } };
}

export type DatabaseChildProfileInput = {
  userId: string;
  databaseChildId?: number;
  name: string;
  birthDate: string;
  theme: 'nina' | 'nino';
  weight: string;
  height: string;
  diagnosis: NutriChild['dictamen'] | '';
  allergies: string[];
  noLikes: string[];
  likes: string[];
  otherAllergies: string;
  otherNoLikes: string;
  otherLikes: string;
  healthConsent: boolean;
};

export async function saveDatabaseChildProfile(
  input: DatabaseChildProfileInput,
): Promise<number> {
  if (!input.healthConsent) {
    throw userError('Se requiere autorización explícita antes de sincronizar datos infantiles de salud.');
  }
  const supabase = getSupabaseClient();
  // Misma validación que el formulario: la lógica de guardado no confía solo en la interfaz.
  const weightCheck = input.weight.trim() ? validateWeight(input.weight) : null;
  const heightCheck = input.height.trim() ? validateHeight(input.height) : null;
  if (Boolean(weightCheck) !== Boolean(heightCheck)) {
    throw userError('Para registrar una medición en la base de datos, captura peso y estatura.');
  }
  if (weightCheck?.error || heightCheck?.error) {
    throw userError(weightCheck?.error ?? heightCheck?.error ?? 'Revisa el peso y la estatura.');
  }
  const weight = weightCheck?.value ?? null;
  const height = heightCheck?.value ?? null;
  const nameParts = input.name.trim().split(/\s+/);
  const names = nameParts.shift() ?? '';
  const apellidos = nameParts.join(' ');
  let childId = input.databaseChildId;

  if (childId) {
    const { data, error } = await supabase
      .from('hijos')
      .update({
        nombres: names,
        apellidos,
        fecha_nacimiento: input.birthDate,
        sexo: input.theme === 'nino' ? 'masculino' : 'femenino',
      })
      .eq('id_hijo', childId)
      .select('id_hijo')
      .maybeSingle();
    if (error) throw userError('No se pudo actualizar el perfil infantil en la base de datos.', error);
    if (!data) throw userError('El perfil infantil ya no está disponible en la base de datos.');
  } else {
    const { data: existingChildren, error: existingChildrenError } = await supabase
      .from('hijos')
      .select('id_hijo, nombres, apellidos, fecha_nacimiento')
      .eq('id_padre', input.userId);
    if (existingChildrenError) throw userError('No se pudieron verificar perfiles infantiles existentes.', existingChildrenError);
    const normalizedName = normalizeFoodName(input.name);
    const matchingChildren = existingChildren.filter(child =>
      child.fecha_nacimiento === input.birthDate &&
      normalizeFoodName([child.nombres, child.apellidos].filter(Boolean).join(' ')) === normalizedName,
    );
    if (matchingChildren.length === 1) childId = matchingChildren[0].id_hijo;
  }

  if (!input.databaseChildId && childId) {
    const { error } = await supabase
      .from('hijos')
      .update({
        nombres: names,
        apellidos,
        fecha_nacimiento: input.birthDate,
        sexo: input.theme === 'nino' ? 'masculino' : 'femenino',
        consentimiento_salud_en: new Date().toISOString(),
      })
      .eq('id_hijo', childId)
      .eq('id_padre', input.userId);
    if (error) throw userError('No se pudo vincular el perfil infantil existente.', error);
  } else if (!childId) {
    const { data, error } = await supabase
      .from('hijos')
      .insert({
        id_padre: input.userId,
        nombres: names,
        apellidos,
        fecha_nacimiento: input.birthDate,
        sexo: input.theme === 'nino' ? 'masculino' : 'femenino',
        consentimiento_salud_en: new Date().toISOString(),
      })
      .select('id_hijo')
      .single();
    if (error) throw userError('No se pudo crear el perfil infantil en la base de datos.', error);
    childId = data.id_hijo;
  }

  if (weight !== null && height !== null) {
    const { data: latest, error } = await supabase
      .from('mediciones_hijo')
      .select('peso_kg, estatura_cm')
      .eq('id_hijo', childId)
      .order('fecha_medicion', { ascending: false })
      .order('id_medicion', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw userError('No se pudo consultar la medición infantil más reciente.', error);
    if (!latest || Number(latest.peso_kg) !== weight || Number(latest.estatura_cm) !== height) {
      const { error: insertError } = await supabase
        .from('mediciones_hijo')
        .insert({
          id_hijo: childId,
          fecha_medicion: new Date().toISOString().slice(0, 10),
          peso_kg: weight,
          estatura_cm: height,
        });
      if (insertError) throw userError('No se pudo guardar la medición infantil.', insertError);
    }
  }

  if (input.diagnosis) {
    const diagnosticoPeso =
      input.diagnosis === 'sobrepeso' || input.diagnosis === 'obesidad'
        ? input.diagnosis
        : 'ninguno';
    const diagnosticoGlucosa =
      input.diagnosis === 'prediabetes'
        ? 'prediabetes'
        : input.diagnosis === 'diabetes2'
          ? 'diabetes_tipo_2'
          : 'ninguno';
    const { data: latest, error } = await supabase
      .from('valoraciones_salud')
      .select('acudio_especialista, diagnostico_peso, diagnostico_glucosa')
      .eq('id_hijo', childId)
      .order('fecha_registro', { ascending: false })
      .order('id_valoracion', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw userError('No se pudo consultar la valoración de salud más reciente.', error);
    if (
      !latest ||
      !latest.acudio_especialista ||
      latest.diagnostico_peso !== diagnosticoPeso ||
      latest.diagnostico_glucosa !== diagnosticoGlucosa
    ) {
      const { error: insertError } = await supabase
        .from('valoraciones_salud')
        .insert({
          id_hijo: childId,
          acudio_especialista: true,
          diagnostico_peso: diagnosticoPeso,
          diagnostico_glucosa: diagnosticoGlucosa,
        });
      if (insertError) throw userError('No se pudo guardar la valoración de salud.', insertError);
    }
  }

  const { data: ingredientRows, error: ingredientError } = await supabase
    .from('ingredientes')
    .select('id_ingrediente, nombre, id_padre');
  if (ingredientError) throw userError('No se pudo consultar el catálogo de ingredientes.', ingredientError);

  const desired = new Map<'alergia' | 'no_le_gusta' | 'preferido', Set<number>>([
    ['alergia', new Set()],
    ['no_le_gusta', new Set()],
    ['preferido', new Set()],
  ]);
  const optionPreferences = [
    { type: 'alergia' as const, values: input.allergies, other: input.otherAllergies },
    { type: 'no_le_gusta' as const, values: input.noLikes, other: input.otherNoLikes },
    { type: 'preferido' as const, values: input.likes, other: input.otherLikes },
  ];

  for (const preference of optionPreferences) {
    for (const value of preference.values) {
      const ingredient = ingredientRows.find(row => foodOptionForIngredient(row.nombre)?.id === value);
      if (ingredient) desired.get(preference.type)?.add(ingredient.id_ingrediente);
    }
    const otherName = preference.other.trim();
    if (!otherName) continue;
    let ingredient = ingredientRows.find(row =>
      row.id_padre === input.userId && normalizeFoodName(row.nombre) === normalizeFoodName(otherName),
    );
    if (!ingredient) {
      const { data, error } = await supabase
        .from('ingredientes')
        .insert({ nombre: otherName, id_padre: input.userId })
        .select('id_ingrediente, nombre, id_padre')
        .single();
      if (error) throw userError('No se pudo guardar el ingrediente personalizado.', error);
      ingredient = data;
      ingredientRows.push(data);
    }
    desired.get(preference.type)?.add(ingredient.id_ingrediente);
  }

  const { data: existingPreferences, error: preferencesError } = await supabase
    .from('hijo_ingrediente')
    .select('id_ingrediente, tipo')
    .eq('id_hijo', childId);
  if (preferencesError) throw userError('No se pudieron consultar las preferencias de alimentos.', preferencesError);

  const managedIngredientIds = new Set(
    ingredientRows
      .filter(row => row.id_padre === input.userId || foodOptionForIngredient(row.nombre))
      .map(row => row.id_ingrediente),
  );
  for (const preference of optionPreferences) {
    const selectedIds = desired.get(preference.type) ?? new Set<number>();
    const oldIds = existingPreferences
      .filter(row => row.tipo === preference.type && managedIngredientIds.has(row.id_ingrediente))
      .map(row => row.id_ingrediente);
    const staleIds = oldIds.filter(id => !selectedIds.has(id));
    if (staleIds.length) {
      const { error } = await supabase
        .from('hijo_ingrediente')
        .delete()
        .eq('id_hijo', childId)
        .eq('tipo', preference.type)
        .in('id_ingrediente', staleIds);
      if (error) throw userError('No se pudieron actualizar las preferencias de alimentos.', error);
    }
    const existingIds = new Set(
      existingPreferences
        .filter(row => row.tipo === preference.type)
        .map(row => row.id_ingrediente),
    );
    const rowsToAdd = [...selectedIds]
      .filter(id => !existingIds.has(id))
      .map(id => ({ id_hijo: childId!, id_ingrediente: id, tipo: preference.type }));
    if (rowsToAdd.length) {
      const { error } = await supabase.from('hijo_ingrediente').insert(rowsToAdd);
      if (error) throw userError('No se pudieron guardar las preferencias de alimentos.', error);
    }
  }

  return childId;
}

export async function deleteDatabaseChild(userId: string, childId: number): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('hijos')
    .delete()
    .eq('id_hijo', childId)
    .eq('id_padre', userId)
    .select('id_hijo')
    .maybeSingle();
  if (error) throw userError('No se pudo eliminar el perfil infantil de la base de datos.', error);
  if (!data) throw userError('El perfil infantil ya no está disponible en la base de datos.');
}

export function accountFromUser(user: User): LocalAccount {
  const email = user.email?.trim().toLocaleLowerCase('es-MX') ?? '';
  if (!email) throw userError('Tu cuenta no tiene un correo electrónico registrado.');
  const metadataName = user.user_metadata?.name;
  const name = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : email.split('@')[0];

  return { id: user.id, name, email, role: 'tutor', source: 'unified' };
}

export async function verifyTutorPassword(
  email: string,
  password: string,
  expectedUserId: string,
): Promise<void> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user?.id !== expectedUserId) {
    throw new Error('La cuenta verificada no coincide con la sesión actual.');
  }
}

export async function loadCloudData(
  user: User,
  account: LocalAccount,
): Promise<CloudDataSnapshot> {
  const supabase = getSupabaseClient();
  const { data: parent, error } = await supabase
    .from('padres')
    .select('datos_app, datos_app_version')
    .eq('id_padre', user.id)
    .maybeSingle();

  if (error) throw userError('No se pudieron cargar los datos de tu espacio familiar.', error);
  if (!parent) {
    throw userError('No encontramos el perfil familiar de esta cuenta. Verifica que se haya aplicado el SQL de configuración.');
  }

  if (parent.datos_app === null) {
    const initialData = createEmptyUnifiedData(account);
    const version = await saveCloudData(user.id, initialData, parent.datos_app_version);
    const children = await loadDatabaseChildren(user.id);
    return { data: mergeDatabaseChildren(initialData, children), version };
  }
  if (!isUnifiedData(parent.datos_app)) {
    throw userError('Los datos de tu espacio familiar no tienen el formato esperado. No se sobrescribieron.');
  }

  const children = await loadDatabaseChildren(user.id);
  return {
    data: mergeDatabaseChildren(parent.datos_app, children),
    version: parent.datos_app_version,
  };
}

export async function saveCloudData(
  userId: string,
  data: UnifiedData,
  expectedVersion: number,
): Promise<number> {
  if (!isUnifiedData(data)) {
    throw userError('No se guardaron los cambios porque el formato nuevo no pasó la validación.');
  }
  const { data: updated, error } = await getSupabaseClient()
    .from('padres')
    .update({ datos_app: JSON.parse(JSON.stringify(data)) as Json })
    .eq('id_padre', userId)
    .eq('datos_app_version', expectedVersion)
    .select('datos_app_version')
    .maybeSingle();

  if (error) throw userError('No se pudieron guardar los cambios en tu espacio familiar.', error);
  if (!updated) {
    throw userError('Los datos cambiaron en otro dispositivo. Vuelve a cargar tu espacio para evitar sobrescribir cambios.');
  }
  return updated.datos_app_version;
}

export function subscribeToCloudData(
  userId: string,
  onData: (snapshot: CloudDataSnapshot) => void,
  onError: (error: Error) => void,
): RealtimeChannel {
  return getSupabaseClient()
    .channel(`family-data-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'padres',
        filter: `id_padre=eq.${userId}`,
      },
      payload => {
        const row = payload.new;
        if (typeof row.datos_app_version !== 'number' || !isUnifiedData(row.datos_app)) {
          onError(userError('Llegaron datos familiares con un formato inesperado.'));
          return;
        }
        onData({ data: row.datos_app, version: row.datos_app_version });
      },
    )
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError(userError('No se pudo mantener la sincronización en tiempo real.'));
      }
    });
}

export async function uploadEvidence(
  userId: string,
  uri: string,
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
): Promise<string> {
  const contentType = mimeType || 'image/jpeg';
  const extension = fileName?.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '')
    || contentType.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '')
    || 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const body = Platform.OS === 'web'
    ? await (await fetch(uri)).blob()
    : await new File(uri).arrayBuffer();

  const { data, error } = await getSupabaseClient()
    .storage
    .from(EVIDENCE_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw userError('No se pudo subir la foto de evidencia.', error);
  return data.path;
}

export async function deleteEvidence(path: string): Promise<void> {
  const { error } = await getSupabaseClient().storage.from(EVIDENCE_BUCKET).remove([path]);
  if (error) throw userError('No se pudo eliminar la foto de evidencia.', error);
}

export async function getEvidenceUrl(path: string): Promise<string> {
  const { data, error } = await getSupabaseClient()
    .storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw userError('No se pudo abrir la evidencia.', error);
  return data.signedUrl;
}
