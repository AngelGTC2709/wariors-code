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
  const { data: recipes, error: recipesError } = await supabase
    .from('recetas')
    .select('id_receta, nombre_platillo, instrucciones, prep_horas, prep_minutos, calorias_porcion')
    .order('nombre_platillo');
  if (recipesError) throw userError('No se pudieron cargar las recetas de la base de datos.', recipesError);
  if (!recipes.length) return [];

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

  return recipes.map(recipe => {
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
        peso: match.peso || child.peso,
        altura: match.altura || child.altura,
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
  const weight = input.weight.trim() ? Number(input.weight) : null;
  const height = input.height.trim() ? Number(input.height) : null;
  if ((weight === null) !== (height === null)) {
    throw userError('Para registrar una medición en la base de datos, captura peso y estatura.');
  }
  if (
    (weight !== null && (!Number.isFinite(weight) || weight < 10 || weight > 150)) ||
    (height !== null && (!Number.isFinite(height) || height < 80 || height > 200))
  ) {
    throw userError('Revisa el peso (10 a 150 kg) y la estatura (80 a 200 cm).');
  }
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
