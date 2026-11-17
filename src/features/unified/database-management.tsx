import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { Recipe } from '@/constants/warrior-kids';
import {
  addPlanRecipe,
  createChallengeAssignment,
  createRewardRedemption,
  deleteChallenge,
  deleteChallengeAssignment,
  deleteMealPlan,
  deleteReward,
  deleteRewardRedemption,
  loadDatabaseRecipes,
  loadNormalizedManagement,
  removePlanRecipe,
  saveChallenge,
  saveMealPlan,
  saveReward,
  updateChallengeAssignment,
  updateRewardRedemption,
  type AssignmentStatus,
  type NormalizedManagementSnapshot,
  type PlanRecipeInput,
} from '@/features/unified/cloud-data';
import { PillButton, SectionCard } from '@/features/unified/design';
import { DatabaseActivities } from '@/features/unified/database-activities';
import { useAppTheme } from '@/features/unified/tokens';
import { plural } from '@/features/unified/format';
import { friendlyError } from '@/features/unified/utils';
import { Button, Card, Field, Icon, SectionTitle, styles } from '@/features/unified/ui';

type ManagementSection = 'retos' | 'recompensas' | 'planes' | 'actividades';
type DeleteTarget = { kind: 'reto' | 'asignacion' | 'recompensa' | 'canje' | 'plan'; id: number };
type ChallengeDraft = {
  id?: number;
  description: string;
  points: string;
  starts: string;
  ends: string;
};
type RewardDraft = {
  id?: number;
  name: string;
  cost: string;
  quantity: string;
  status: 'activa' | 'inactiva' | 'agotada';
};
type PlanDraft = {
  id?: number;
  childId: string;
  calories: string;
  starts: string;
  ends: string;
};

const EMPTY_CHALLENGE: ChallengeDraft = { description: '', points: '', starts: '', ends: '' };
const EMPTY_REWARD: RewardDraft = { name: '', cost: '', quantity: '1', status: 'activa' };
const EMPTY_PLAN: PlanDraft = { childId: '', calories: '', starts: '', ends: '' };

const ASSIGNMENT_STATES: { id: AssignmentStatus; label: string }[] = [
  { id: 'asignado', label: 'Asignado' },
  { id: 'en_progreso', label: 'En progreso' },
  { id: 'completado', label: 'Completado' },
  { id: 'verificado', label: 'Verificado' },
  { id: 'rechazado', label: 'Rechazado' },
];
const REWARD_STATES: RewardDraft['status'][] = ['activa', 'inactiva', 'agotada'];
const REDEMPTION_STATES = ['solicitado', 'entregado', 'cancelado'] as const;
const MEAL_TYPES: PlanRecipeInput['tipo_comida'][] = ['desayuno', 'colacion', 'comida', 'cena'];
const MEAL_LABELS: Record<PlanRecipeInput['tipo_comida'], string> = {
  desayuno: 'Desayuno',
  colacion: 'Colación',
  comida: 'Comida',
  cena: 'Cena',
};

export function DatabaseManagement({ userId }: { userId: string }) {
  const theme = useAppTheme('tutor', 'nina');
  const [section, setSection] = useState<ManagementSection>('retos');
  const [snapshot, setSnapshot] = useState<NormalizedManagementSnapshot | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraft>(EMPTY_CHALLENGE);
  const [assignmentChild, setAssignmentChild] = useState<Record<number, string>>({});
  const [rewardDraft, setRewardDraft] = useState<RewardDraft>(EMPTY_REWARD);
  const [redemptionChild, setRedemptionChild] = useState('');
  const [redemptionReward, setRedemptionReward] = useState('');
  const [redemptionPointDrafts, setRedemptionPointDrafts] = useState<Record<number, string>>({});
  const [planDraft, setPlanDraft] = useState<PlanDraft>(EMPTY_PLAN);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [planRecipeDate, setPlanRecipeDate] = useState('');
  const [planRecipeMeal, setPlanRecipeMeal] = useState<PlanRecipeInput['tipo_comida']>('comida');
  const [planRecipeId, setPlanRecipeId] = useState('');

  const reload = useCallback(async () => {
    const [data, loadedRecipes] = await Promise.all([
      loadNormalizedManagement(userId),
      loadDatabaseRecipes(),
    ]);
    setSnapshot(data);
    setRecipes(loadedRecipes);
  }, [userId]);

  useEffect(() => {
    let active = true;
    void Promise.all([loadNormalizedManagement(userId), loadDatabaseRecipes()])
      .then(([data, loadedRecipes]) => {
        if (!active) return;
        setSnapshot(data);
        setRecipes(loadedRecipes);
        setError('');
      })
      .catch(cause => {
        if (active) setError(friendlyError(cause, 'No se pudieron cargar los datos de gestión.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [userId]);

  const childNames = useMemo(
    () => new Map((snapshot?.children ?? []).map(child => [child.id_hijo, child.nombre])),
    [snapshot?.children],
  );
  const recipeNames = useMemo(
    () => new Map(recipes.flatMap(recipe => recipe.databaseId ? [[recipe.databaseId, recipe.title] as const] : [])),
    [recipes],
  );

  const run = async (successMessage: string, operation: () => Promise<void>) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await operation();
      await reload();
      setNotice(successMessage);
    } catch (cause) {
      setError(friendlyError(cause, 'No se pudo completar el cambio.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    await run('Se eliminó el registro.', async () => {
      if (target.kind === 'reto') await deleteChallenge(userId, target.id);
      if (target.kind === 'asignacion') await deleteChallengeAssignment(target.id);
      if (target.kind === 'recompensa') await deleteReward(userId, target.id);
      if (target.kind === 'canje') await deleteRewardRedemption(target.id);
      if (target.kind === 'plan') await deleteMealPlan(target.id);
    });
    setDeleteTarget(null);
  };

  const renderChoices = <T extends string>(
    options: readonly T[],
    value: T,
    label: (option: T) => string,
    onSelect: (option: T) => void,
  ) => (
    <View style={styles.wrap}>
      {options.map(option => (
        <PillButton
          key={option}
          theme={theme}
          label={label(option)}
          variant={value === option ? 'primary' : 'ghost'}
          onPress={() => onSelect(option)}
        />
      ))}
    </View>
  );

  const renderDeleteConfirmation = (target: DeleteTarget, description: string) => deleteTarget?.kind === target.kind && deleteTarget.id === target.id ? (
    <Card>
      <Text style={styles.body}>{description}</Text>
      <View style={styles.horizontal}>
        <Button title="Cancelar" variant="outline" small onPress={() => setDeleteTarget(null)} />
        <Button title="Confirmar eliminación" variant="danger" small disabled={saving} onPress={() => void handleDelete()} />
      </View>
    </Card>
  ) : null;

  const editChallenge = (challenge: NormalizedManagementSnapshot['challenges'][number]) => {
    setChallengeDraft({
      id: challenge.id_reto,
      description: challenge.descripcion_reto,
      points: String(challenge.puntos_de_recompensa),
      starts: challenge.fecha_inicio,
      ends: challenge.fecha_limite,
    });
  };

  const saveChallengeDraft = () => {
    const points = Number(challengeDraft.points);
    void run(challengeDraft.id ? 'Se actualizó el reto.' : 'Se creó el reto.', async () => {
      await saveChallenge(userId, {
        descripcion_reto: challengeDraft.description,
        puntos_de_recompensa: points,
        fecha_inicio: challengeDraft.starts,
        fecha_limite: challengeDraft.ends,
      }, challengeDraft.id);
      setChallengeDraft(EMPTY_CHALLENGE);
    });
  };

  const renderChallengeSection = () => (
    <View style={{ gap: 16 }}>
      <SectionCard theme={theme} role="tutor" title={challengeDraft.id ? 'Editar reto' : 'Crear reto'}>
        <Field label="Descripción del reto" value={challengeDraft.description} onChangeText={value => setChallengeDraft(current => ({ ...current, description: value }))} />
        <Field label="Puntos de recompensa" keyboardType="number-pad" value={challengeDraft.points} onChangeText={value => setChallengeDraft(current => ({ ...current, points: value }))} />
        <Field label="Fecha de inicio (AAAA-MM-DD)" placeholder="AAAA-MM-DD" value={challengeDraft.starts} onChangeText={value => setChallengeDraft(current => ({ ...current, starts: value }))} />
        <Field label="Fecha límite (AAAA-MM-DD)" placeholder="AAAA-MM-DD" value={challengeDraft.ends} onChangeText={value => setChallengeDraft(current => ({ ...current, ends: value }))} />
        <View style={styles.horizontal}>
          <Button title={challengeDraft.id ? 'Guardar cambios' : 'Crear reto'} disabled={saving} onPress={saveChallengeDraft} />
          {challengeDraft.id ? <Button title="Cancelar" variant="outline" disabled={saving} onPress={() => setChallengeDraft(EMPTY_CHALLENGE)} /> : null}
        </View>
      </SectionCard>

      {snapshot?.challenges.map(challenge => (
        <SectionCard
          key={challenge.id_reto}
          theme={theme}
          role="tutor"
          title={challenge.descripcion_reto}
          subtitle={`${challenge.puntos_de_recompensa} puntos · ${challenge.fecha_inicio} al ${challenge.fecha_limite}`}
        >
          <View style={styles.horizontal}>
            <Button title="Editar" icon="edit" variant="outline" small onPress={() => editChallenge(challenge)} />
            <Button title="Eliminar" icon="close" variant="danger" small onPress={() => setDeleteTarget({ kind: 'reto', id: challenge.id_reto })} />
          </View>
          {renderDeleteConfirmation(
            { kind: 'reto', id: challenge.id_reto },
            'Al eliminar este reto también se eliminan sus asignaciones y actividades relacionadas.',
          )}
          <Text style={styles.cardTitle}>Asignar a un perfil</Text>
          {snapshot.children.length ? (
            <View style={styles.wrap}>
              {snapshot.children.map(child => (
                <PillButton
                  key={child.id_hijo}
                  theme={theme}
                  label={child.nombre}
                  variant={assignmentChild[challenge.id_reto] === String(child.id_hijo) ? 'primary' : 'ghost'}
                  onPress={() => setAssignmentChild(current => ({ ...current, [challenge.id_reto]: String(child.id_hijo) }))}
                />
              ))}
            </View>
          ) : <Text style={styles.muted}>Primero sincroniza un perfil infantil con autorización desde Familia.</Text>}
          <Button
            title="Asignar reto"
            small
            disabled={saving || !assignmentChild[challenge.id_reto]}
            onPress={() => {
              const childId = Number(assignmentChild[challenge.id_reto]);
              void run('Se asignó el reto.', () => createChallengeAssignment(userId, childId, challenge.id_reto));
            }}
          />

          {(snapshot.assignments.filter(item => item.id_reto === challenge.id_reto)).map(assignment => (
            <Card key={assignment.id_hijo_reto}>
              <Text style={styles.cardTitle}>{childNames.get(assignment.id_hijo) ?? 'Perfil infantil'}</Text>
              <Text style={styles.muted}>Asignado: {new Date(assignment.fecha_asignacion).toLocaleDateString('es-MX')}</Text>
              {renderChoices(
                ASSIGNMENT_STATES.map(item => item.id),
                assignment.estado,
                value => ASSIGNMENT_STATES.find(item => item.id === value)?.label ?? value,
                value => void run('Se actualizó el estado de la asignación.', () => updateChallengeAssignment(
                  assignment.id_hijo_reto,
                  value,
                  value === 'verificado' ? challenge.puntos_de_recompensa : undefined,
                )),
              )}
              {assignment.fecha_completado ? <Text style={styles.muted}>Completado: {new Date(assignment.fecha_completado).toLocaleDateString('es-MX')}</Text> : null}
              {assignment.fecha_verificacion ? <Text style={styles.muted}>Verificado: {new Date(assignment.fecha_verificacion).toLocaleDateString('es-MX')}</Text> : null}
              {assignment.puntos_otorgados !== null ? <Text style={styles.muted}>Puntos otorgados: {assignment.puntos_otorgados}</Text> : null}
              <Button title="Retirar asignación" small variant="danger" onPress={() => setDeleteTarget({ kind: 'asignacion', id: assignment.id_hijo_reto })} />
              {renderDeleteConfirmation(
                { kind: 'asignacion', id: assignment.id_hijo_reto },
                'Se quitará esta asignación del reto.',
              )}
            </Card>
          ))}
        </SectionCard>
      ))}
      {!snapshot?.challenges.length ? <Card><Text style={styles.muted}>Todavía no hay retos creados.</Text></Card> : null}
    </View>
  );

  const editReward = (reward: NormalizedManagementSnapshot['rewards'][number]) => {
    setRewardDraft({
      id: reward.id_recompensa,
      name: reward.nombre_premio,
      cost: String(reward.costo_en_puntos),
      quantity: String(reward.cantidad_disponible),
      status: reward.estado,
    });
  };

  const saveRewardDraft = () => {
    void run(rewardDraft.id ? 'Se actualizó la recompensa.' : 'Se creó la recompensa.', async () => {
      await saveReward(userId, {
        nombre_premio: rewardDraft.name,
        costo_en_puntos: Number(rewardDraft.cost),
        cantidad_disponible: Number(rewardDraft.quantity),
        estado: rewardDraft.status,
      }, rewardDraft.id);
      setRewardDraft(EMPTY_REWARD);
    });
  };

  const selectedReward = snapshot?.rewards.find(reward => reward.id_recompensa === Number(redemptionReward));

  const renderRewardSection = () => (
    <View style={{ gap: 16 }}>
      <SectionCard theme={theme} role="tutor" title={rewardDraft.id ? 'Editar recompensa' : 'Crear recompensa'}>
        <Field label="Nombre del premio" value={rewardDraft.name} onChangeText={value => setRewardDraft(current => ({ ...current, name: value }))} />
        <View style={styles.horizontal}>
          <Field label="Costo en puntos" keyboardType="number-pad" value={rewardDraft.cost} onChangeText={value => setRewardDraft(current => ({ ...current, cost: value }))} style={styles.flex} />
          <Field label="Cantidad disponible" keyboardType="number-pad" value={rewardDraft.quantity} onChangeText={value => setRewardDraft(current => ({ ...current, quantity: value }))} style={styles.flex} />
        </View>
        <Text style={styles.inputLabel}>Estado</Text>
        {renderChoices(REWARD_STATES, rewardDraft.status, value => value[0].toLocaleUpperCase('es-MX') + value.slice(1), value => setRewardDraft(current => ({ ...current, status: value })))}
        <View style={styles.horizontal}>
          <Button title={rewardDraft.id ? 'Guardar cambios' : 'Crear recompensa'} disabled={saving} onPress={saveRewardDraft} />
          {rewardDraft.id ? <Button title="Cancelar" variant="outline" disabled={saving} onPress={() => setRewardDraft(EMPTY_REWARD)} /> : null}
        </View>
      </SectionCard>

      {snapshot?.rewards.map(reward => (
        <SectionCard key={reward.id_recompensa} theme={theme} role="tutor" title={reward.nombre_premio} subtitle={`${reward.costo_en_puntos} puntos · ${plural(reward.cantidad_disponible, 'disponible')} · ${reward.estado}`}>
          <View style={styles.horizontal}>
            <Button title="Editar" icon="edit" variant="outline" small onPress={() => editReward(reward)} />
            <Button title="Eliminar" icon="close" variant="danger" small onPress={() => setDeleteTarget({ kind: 'recompensa', id: reward.id_recompensa })} />
          </View>
          {renderDeleteConfirmation(
            { kind: 'recompensa', id: reward.id_recompensa },
            'Si esta recompensa ya tiene canjes no se podrá eliminar; puedes cambiar su estado a inactiva.',
          )}
        </SectionCard>
      ))}
      {!snapshot?.rewards.length ? <Card><Text style={styles.muted}>Todavía no hay recompensas registradas.</Text></Card> : null}

      <SectionCard theme={theme} role="tutor" title="Registrar canje">
        <Text style={styles.muted}>El canje guarda el costo configurado para la recompensa. El saldo de puntos de la app se conserva en el espacio familiar.</Text>
        <Text style={styles.inputLabel}>Perfil infantil</Text>
        {renderChoices(
          (snapshot?.children ?? []).map(child => String(child.id_hijo)),
          redemptionChild,
          value => childNames.get(Number(value)) ?? value,
          setRedemptionChild,
        )}
        <Text style={styles.inputLabel}>Recompensa activa</Text>
        {renderChoices(
          (snapshot?.rewards ?? []).filter(reward => reward.estado === 'activa' && reward.cantidad_disponible > 0).map(reward => String(reward.id_recompensa)),
          redemptionReward,
          value => snapshot?.rewards.find(reward => reward.id_recompensa === Number(value))?.nombre_premio ?? value,
          value => setRedemptionReward(value),
        )}
        {selectedReward ? <Text style={styles.muted}>Se registrarán {selectedReward.costo_en_puntos} puntos gastados.</Text> : null}
        <Button
          title="Crear solicitud de canje"
          disabled={saving || !redemptionChild || !selectedReward}
          onPress={() => {
            if (!selectedReward) return;
            void run('Se registró la solicitud de canje.', () => createRewardRedemption(
              userId,
              Number(redemptionChild),
              selectedReward.id_recompensa,
              selectedReward.costo_en_puntos,
            ));
          }}
        />
      </SectionCard>

      <SectionTitle title="Canjes registrados" />
      {snapshot?.redemptions.map(redemption => (
        <RedemptionCard
          key={redemption.id_canje}
          redemption={redemption}
          childName={childNames.get(redemption.id_hijo) ?? 'Perfil infantil'}
          rewardName={snapshot.rewards.find(reward => reward.id_recompensa === redemption.id_recompensa)?.nombre_premio ?? 'Recompensa'}
          pointsValue={redemptionPointDrafts[redemption.id_canje] ?? String(redemption.puntos_gastados)}
          onPointsChange={value => setRedemptionPointDrafts(current => ({ ...current, [redemption.id_canje]: value }))}
          onSave={status => void run('Se actualizó el canje.', () => updateRewardRedemption(redemption.id_canje, {
            estado: status,
            puntos_gastados: Number(redemptionPointDrafts[redemption.id_canje] ?? redemption.puntos_gastados),
          }))}
          onDelete={() => setDeleteTarget({ kind: 'canje', id: redemption.id_canje })}
          deleteConfirmation={renderDeleteConfirmation({ kind: 'canje', id: redemption.id_canje }, 'Se eliminará este registro de canje.')}
          theme={theme}
          saving={saving}
        />
      ))}
      {!snapshot?.redemptions.length ? <Card><Text style={styles.muted}>Todavía no hay canjes registrados.</Text></Card> : null}
    </View>
  );

  const editPlan = (plan: NormalizedManagementSnapshot['plans'][number]) => {
    setPlanDraft({
      id: plan.id_plan,
      childId: String(plan.id_hijo),
      calories: String(plan.meta_calorias_diarias),
      starts: plan.fecha_inicio,
      ends: plan.fecha_fin,
    });
    setActivePlanId(plan.id_plan);
  };

  const savePlanDraft = () => {
    void run(planDraft.id ? 'Se actualizó el plan.' : 'Se creó el plan.', async () => {
      await saveMealPlan({
        id_hijo: Number(planDraft.childId),
        meta_calorias_diarias: Number(planDraft.calories),
        fecha_inicio: planDraft.starts,
        fecha_fin: planDraft.ends,
      }, planDraft.id);
      setPlanDraft(EMPTY_PLAN);
    });
  };

  const addRecipe = () => {
    if (!activePlanId) return;
    const activePlan = snapshot?.plans.find(plan => plan.id_plan === activePlanId);
    if (!activePlan || planRecipeDate < activePlan.fecha_inicio || planRecipeDate > activePlan.fecha_fin) {
      setError('La fecha de la receta debe estar dentro de la vigencia del plan.');
      return;
    }
    void run('Se agregó la receta al plan.', () => addPlanRecipe({
      id_plan: activePlanId,
      id_receta: Number(planRecipeId),
      fecha: planRecipeDate,
      tipo_comida: planRecipeMeal,
    }));
  };

  const renderPlanSection = () => (
    <View style={{ gap: 16 }}>
      <SectionCard theme={theme} role="tutor" title={planDraft.id ? 'Editar plan alimenticio' : 'Crear plan alimenticio'}>
        <Text style={styles.muted}>La app no calcula metas calóricas. Registra aquí solo una meta que ya tengas indicada.</Text>
        <Text style={styles.inputLabel}>Perfil infantil</Text>
        {renderChoices(
          (snapshot?.children ?? []).map(child => String(child.id_hijo)),
          planDraft.childId,
          value => childNames.get(Number(value)) ?? value,
          value => setPlanDraft(current => ({ ...current, childId: value })),
        )}
        <Field label="Meta de calorías diarias" keyboardType="number-pad" value={planDraft.calories} onChangeText={value => setPlanDraft(current => ({ ...current, calories: value }))} />
        <View style={styles.horizontal}>
          <Field label="Fecha de inicio (AAAA-MM-DD)" placeholder="AAAA-MM-DD" value={planDraft.starts} onChangeText={value => setPlanDraft(current => ({ ...current, starts: value }))} style={styles.flex} />
          <Field label="Fecha de fin (AAAA-MM-DD)" placeholder="AAAA-MM-DD" value={planDraft.ends} onChangeText={value => setPlanDraft(current => ({ ...current, ends: value }))} style={styles.flex} />
        </View>
        <View style={styles.horizontal}>
          <Button title={planDraft.id ? 'Guardar cambios' : 'Crear plan'} disabled={saving || !planDraft.childId} onPress={savePlanDraft} />
          {planDraft.id ? <Button title="Cancelar" variant="outline" disabled={saving} onPress={() => setPlanDraft(EMPTY_PLAN)} /> : null}
        </View>
      </SectionCard>

      {snapshot?.plans.map(plan => (
        <SectionCard
          key={plan.id_plan}
          theme={theme}
          role="tutor"
          title={`Plan · ${childNames.get(plan.id_hijo) ?? 'Perfil infantil'}`}
          subtitle={`${plan.meta_calorias_diarias} kcal diarias · ${plan.fecha_inicio} al ${plan.fecha_fin}`}
        >
          <View style={styles.horizontal}>
            <Button title="Editar" icon="edit" variant="outline" small onPress={() => editPlan(plan)} />
            <Button title="Recetas" icon="recipes" variant="secondary" small onPress={() => setActivePlanId(plan.id_plan)} />
            <Button title="Eliminar" icon="close" variant="danger" small onPress={() => setDeleteTarget({ kind: 'plan', id: plan.id_plan })} />
          </View>
          {renderDeleteConfirmation(
            { kind: 'plan', id: plan.id_plan },
            'Al eliminar el plan también se eliminan sus asociaciones de recetas.',
          )}
          {activePlanId === plan.id_plan ? (
            <View style={{ gap: 10 }}>
              <Text style={styles.cardTitle}>Recetas del plan</Text>
              {snapshot.planRecipes.filter(item => item.id_plan === plan.id_plan).map(item => (
                <Card key={`${item.id_receta}-${item.fecha}-${item.tipo_comida}`}>
                  <Text style={styles.body}>{item.fecha} · {MEAL_LABELS[item.tipo_comida]} · {recipeNames.get(item.id_receta) ?? 'Receta'}</Text>
                  <Button title="Quitar receta" variant="danger" small onPress={() => void run('Se quitó la receta del plan.', () => removePlanRecipe(item))} />
                </Card>
              ))}
              <Text style={styles.inputLabel}>Agregar receta</Text>
              {recipes.length ? renderChoices(
                recipes.flatMap(recipe => recipe.databaseId ? [String(recipe.databaseId)] : []),
                planRecipeId,
                value => recipeNames.get(Number(value)) ?? value,
                setPlanRecipeId,
              ) : <Text style={styles.muted}>No hay recetas disponibles para asignar.</Text>}
              <Field label="Fecha (AAAA-MM-DD)" placeholder="AAAA-MM-DD" value={planRecipeDate} onChangeText={setPlanRecipeDate} />
              <Text style={styles.inputLabel}>Momento de comida</Text>
              {renderChoices(MEAL_TYPES, planRecipeMeal, value => MEAL_LABELS[value], setPlanRecipeMeal)}
              <Button title="Agregar al plan" disabled={saving || !planRecipeId || !planRecipeDate} onPress={addRecipe} />
            </View>
          ) : null}
        </SectionCard>
      ))}
      {!snapshot?.plans.length ? <Card><Text style={styles.muted}>Todavía no hay planes alimenticios.</Text></Card> : null}
      {!snapshot?.children.length ? <Card><Text style={styles.muted}>Para crear un plan, edita el perfil infantil en Ajustes, sección Control parental, registra su fecha de nacimiento y autoriza guardar sus datos de salud.</Text></Card> : null}
    </View>
  );

  if (loading && !snapshot) {
    return <Card><View style={styles.horizontal}><Icon name="activity" /><Text style={styles.body}>Cargando la gestión familiar…</Text></View></Card>;
  }

  return (
    <View style={{ gap: 16 }}>
      <SectionTitle title="Gestión de datos" subtitle="Administra retos, actividades, recompensas y planes alimenticios de la familia." />
      {error ? <View accessibilityRole="alert" style={styles.notice}><Text style={styles.errorText}>{error}</Text><Button title="Reintentar" small variant="outline" onPress={() => void reload().catch(cause => setError(friendlyError(cause, 'No se pudieron recargar los datos.')))} /></View> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.noticeText}>{notice}</Text> : null}
      <View style={styles.wrap}>
        {([
          { id: 'retos', label: 'Retos' },
          { id: 'actividades', label: 'Actividades' },
          { id: 'recompensas', label: 'Recompensas' },
          { id: 'planes', label: 'Planes' },
        ] as const).map(item => (
          <PillButton
            key={item.id}
            theme={theme}
            label={item.label}
            variant={section === item.id ? 'primary' : 'ghost'}
            onPress={() => setSection(item.id)}
          />
        ))}
      </View>
      {section === 'retos' ? renderChallengeSection() : null}
      {section === 'actividades' ? <DatabaseActivities userId={userId} /> : null}
      {section === 'recompensas' ? renderRewardSection() : null}
      {section === 'planes' ? renderPlanSection() : null}
    </View>
  );
}

function RedemptionCard({
  redemption,
  childName,
  rewardName,
  pointsValue,
  onPointsChange,
  onSave,
  onDelete,
  deleteConfirmation,
  theme,
  saving,
}: {
  redemption: NormalizedManagementSnapshot['redemptions'][number];
  childName: string;
  rewardName: string;
  pointsValue: string;
  onPointsChange: (value: string) => void;
  onSave: (status: (typeof REDEMPTION_STATES)[number]) => void;
  onDelete: () => void;
  deleteConfirmation: ReactNode;
  theme: ReturnType<typeof useAppTheme>;
  saving: boolean;
}) {
  return (
    <SectionCard theme={theme} role="tutor" title={rewardName} subtitle={`${childName} · ${new Date(redemption.fecha_canje).toLocaleDateString('es-MX')}`}>
      <Field label="Puntos gastados" keyboardType="number-pad" value={pointsValue} onChangeText={onPointsChange} />
      <Text style={styles.inputLabel}>Estado del canje</Text>
      <View style={styles.wrap}>
        {REDEMPTION_STATES.map(status => (
          <PillButton
            key={status}
            theme={theme}
            label={status[0].toLocaleUpperCase('es-MX') + status.slice(1)}
            variant={redemption.estado === status ? 'primary' : 'ghost'}
            onPress={() => onSave(status)}
          />
        ))}
      </View>
      <View style={styles.horizontal}>
        <Button title="Guardar cambios" small disabled={saving} onPress={() => onSave(redemption.estado)} />
        <Button title="Eliminar canje" small variant="danger" onPress={onDelete} />
      </View>
      {deleteConfirmation}
    </SectionCard>
  );
}
