import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import type { Recipe } from '@/constants/warrior-kids';
import {
  deleteChallenge,
  deleteReward,
  loadDatabaseRecipes,
  loadNormalizedManagement,
  saveChallenge,
  saveReward,
  type NormalizedManagementSnapshot,
} from '@/features/unified/cloud-data';
import { DateField, isoToText } from '@/features/unified/date-field';
import { PillButton, SectionCard } from '@/features/unified/design';
import { DatabaseActivities } from '@/features/unified/database-activities';
import { plural } from '@/features/unified/format';
import type {
  FamilyAssignment,
  FamilyAssignmentStatus,
  FamilyMealPlan,
  MealPlanMeal,
  MealPlanRecipe,
  RewardRequest,
  RewardRequestStatus,
} from '@/features/unified/model';
import { useAppTheme } from '@/features/unified/tokens';
import {
  canChangeRewardRequest,
  CHALLENGE_DURATIONS,
  challengeDateRange,
  challengeDurationFor,
  localDateKey,
  rewardStockLeft,
  type ChallengeDurationId,
} from '@/features/unified/progress-rules';
import { friendlyError } from '@/features/unified/utils';
import { Button, Card, Field, Icon, SectionTitle, Tag, useUiStyles } from '@/features/unified/ui';
import { COLORS } from '@/features/unified/constants';

// Gestión del tutor. Los retos, actividades y recompensas se definen en Supabase (son de la
// cuenta tutora); a quién aplican, los pedidos de premios y los planes se guardan por perfil en
// el espacio familiar, así que sirven para todos los perfiles sin sincronizar datos de salud.

export type FamilyProfileOption = { progressKey: string; name: string; rewardPoints: number };
export type FamilyRecords = {
  assignments: FamilyAssignment[];
  rewardRequests: RewardRequest[];
  mealPlans: FamilyMealPlan[];
};
export type FamilyActions = {
  assignChallenge: (challengeId: number, progressKeys: string[]) => boolean;
  setAssignmentStatus: (id: string, status: FamilyAssignmentStatus, points: number) => boolean;
  removeAssignment: (id: string) => boolean;
  requestReward: (rewardId: number, progressKey: string, cost: number, totalStock: number) => boolean;
  setRewardRequestStatus: (id: string, status: RewardRequestStatus, totalStock?: number) => boolean;
  removeRewardRequest: (id: string) => boolean;
  saveMealPlan: (plan: Omit<FamilyMealPlan, 'id' | 'recipes'> & { id?: string }) => boolean;
  removeMealPlan: (id: string) => boolean;
  addPlanRecipe: (planId: string, recipe: MealPlanRecipe) => boolean;
  removePlanRecipe: (planId: string, recipe: MealPlanRecipe) => boolean;
};

type ManagementSection = 'retos' | 'recompensas' | 'planes' | 'actividades';
type DeleteTarget = { kind: 'reto' | 'asignacion' | 'recompensa' | 'canje' | 'plan'; id: number | string };
type ChallengeDraft = { id?: number; description: string; points: string; duration: ChallengeDurationId | null; starts: string; ends: string };
type RewardDraft = { id?: number; name: string; cost: string; quantity: string; status: 'activa' | 'inactiva' | 'agotada' };
type PlanDraft = { id?: string; progressKey: string; calories: string; starts: string; ends: string };

const EMPTY_CHALLENGE: ChallengeDraft = { description: '', points: '', duration: null, starts: '', ends: '' };
const newChallengeDraft = (): ChallengeDraft => ({
  ...EMPTY_CHALLENGE,
  duration: '7d',
  ...challengeDateRange('7d', localDateKey()),
});
const durationLabel = (id: ChallengeDurationId) => CHALLENGE_DURATIONS.find(option => option.id === id)?.label ?? id;
const EMPTY_REWARD: RewardDraft = { name: '', cost: '', quantity: '1', status: 'activa' };
const EMPTY_PLAN: PlanDraft = { progressKey: '', calories: '', starts: '', ends: '' };

const ASSIGNMENT_STATES: { id: FamilyAssignmentStatus; label: string }[] = [
  { id: 'asignado', label: 'Asignado' },
  { id: 'completado', label: 'Lo completó' },
  { id: 'verificado', label: 'Verificado' },
  { id: 'rechazado', label: 'Intentar de nuevo' },
];
const REWARD_STATES: RewardDraft['status'][] = ['activa', 'inactiva', 'agotada'];
const REQUEST_STATES: { id: RewardRequestStatus; label: string }[] = [
  { id: 'solicitado', label: 'Pedido' },
  { id: 'entregado', label: 'Entregado' },
  { id: 'cancelado', label: 'Cancelado' },
];
const MEAL_TYPES: MealPlanMeal[] = ['desayuno', 'colacion', 'comida', 'cena'];
const MEAL_LABELS: Record<MealPlanMeal, string> = {
  desayuno: 'Desayuno',
  colacion: 'Colación',
  comida: 'Comida',
  cena: 'Cena',
};

const capitalize = (value: string) => value.charAt(0).toLocaleUpperCase('es-MX') + value.slice(1);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function DatabaseManagement({
  userId,
  profiles,
  family,
  actions,
}: {
  userId: string;
  profiles: FamilyProfileOption[];
  family: FamilyRecords;
  actions: FamilyActions;
}) {
  const styles = useUiStyles();
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
  const [assignmentTargets, setAssignmentTargets] = useState<Record<number, string[]>>({});
  const [rewardDraft, setRewardDraft] = useState<RewardDraft>(EMPTY_REWARD);
  const [requestProfile, setRequestProfile] = useState('');
  const [requestReward, setRequestReward] = useState('');
  const [planDraft, setPlanDraft] = useState<PlanDraft>(EMPTY_PLAN);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planRecipeDate, setPlanRecipeDate] = useState('');
  const [planRecipeMeal, setPlanRecipeMeal] = useState<MealPlanMeal>('comida');
  const [planRecipeId, setPlanRecipeId] = useState('');
  // En móvil se ve primero la lista; cada formulario se abre solo cuando hace falta.
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);

  const reload = useCallback(async () => {
    const [data, loadedRecipes] = await Promise.all([loadNormalizedManagement(userId), loadDatabaseRecipes()]);
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

  const profileNames = useMemo(() => new Map(profiles.map(profile => [profile.progressKey, profile.name])), [profiles]);
  const recipeNames = useMemo(
    () => new Map(recipes.flatMap(recipe => recipe.databaseId ? [[recipe.databaseId, recipe.title] as const] : [])),
    [recipes],
  );
  const profileName = (progressKey: string) => profileNames.get(progressKey) ?? 'Perfil eliminado';

  // Cambios en Supabase (retos y recompensas).
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
  // Cambios en el espacio familiar (asignaciones, pedidos y planes).
  const local = (successMessage: string, operation: () => boolean) => {
    setError('');
    setNotice('');
    if (operation()) setNotice(successMessage);
    else setError('No se pudo guardar el cambio. Revisa tu conexión e intenta de nuevo.');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    if (target.kind === 'reto' && typeof target.id === 'number') void run('Se eliminó el reto.', () => deleteChallenge(userId, target.id as number));
    if (target.kind === 'recompensa' && typeof target.id === 'number') void run('Se eliminó la recompensa.', () => deleteReward(userId, target.id as number));
    if (target.kind === 'asignacion') local('Se quitó la asignación.', () => actions.removeAssignment(String(target.id)));
    if (target.kind === 'canje') local('Se eliminó el pedido.', () => actions.removeRewardRequest(String(target.id)));
    if (target.kind === 'plan') local('Se eliminó el plan.', () => actions.removeMealPlan(String(target.id)));
  };

  const renderChoices = <T extends string>(
    options: readonly T[],
    value: T | null,
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

  const renderSummary = (lines: string[]) => (
    <View accessibilityLiveRegion="polite" style={[styles.notice, { gap: 4 }]}>
      <Text style={styles.inputLabel}>Revisa antes de guardar</Text>
      {lines.map(line => <Text key={line} style={styles.noticeText}>{line}</Text>)}
    </View>
  );
  const dateRange = (starts: string, ends: string) => (
    starts && ends ? `${isoToText(starts)} al ${isoToText(ends)}` : 'Falta elegir las fechas'
  );

  const renderProfileChoices = (selected: string[], onChange: (next: string[]) => void, allowAll: boolean) => (
    profiles.length ? (
      <View style={styles.wrap}>
        {allowAll && profiles.length > 1 ? (
          <PillButton
            theme={theme}
            label="Todos"
            variant={selected.length === profiles.length ? 'primary' : 'ghost'}
            onPress={() => onChange(selected.length === profiles.length ? [] : profiles.map(profile => profile.progressKey))}
          />
        ) : null}
        {profiles.map(profile => (
          <PillButton
            key={profile.progressKey}
            theme={theme}
            label={profile.name}
            variant={selected.includes(profile.progressKey) ? 'primary' : 'ghost'}
            onPress={() => onChange(
              allowAll
                ? selected.includes(profile.progressKey)
                  ? selected.filter(key => key !== profile.progressKey)
                  : [...selected, profile.progressKey]
                : [profile.progressKey],
            )}
          />
        ))}
      </View>
    ) : <Text style={styles.muted}>Agrega un perfil infantil en Ajustes, sección Control parental.</Text>
  );

  const renderDeleteConfirmation = (target: DeleteTarget, description: string) => (
    deleteTarget?.kind === target.kind && deleteTarget.id === target.id ? (
      <Card>
        <Text style={styles.body}>{description}</Text>
        <View style={styles.horizontal}>
          <Button title="Cancelar" variant="outline" small onPress={() => setDeleteTarget(null)} />
          <Button title="Confirmar eliminación" variant="danger" small disabled={saving} onPress={handleDelete} />
        </View>
      </Card>
    ) : null
  );

  // ---------- Retos ----------
  const saveChallengeDraft = () => {
    void run(challengeDraft.id ? 'Se actualizó el reto.' : 'Se creó el reto.', async () => {
      await saveChallenge(userId, {
        descripcion_reto: challengeDraft.description,
        puntos_de_recompensa: Number(challengeDraft.points),
        fecha_inicio: challengeDraft.starts,
        fecha_limite: challengeDraft.ends,
      }, challengeDraft.id);
      setChallengeDraft(EMPTY_CHALLENGE);
      setShowChallengeForm(false);
    });
  };

  const renderChallengeSection = () => (
    <View style={{ gap: 16 }}>
      {showChallengeForm ? (
      <SectionCard theme={theme} role="tutor" title={challengeDraft.id ? 'Editar reto' : 'Crear reto'}>
        <Field label="Descripción del reto" value={challengeDraft.description} onChangeText={value => setChallengeDraft(current => ({ ...current, description: value }))} />
        <Field label="Puntos de recompensa" keyboardType="number-pad" value={challengeDraft.points} onChangeText={value => setChallengeDraft(current => ({ ...current, points: value }))} />
        <Text style={styles.inputLabel}>Duración del reto</Text>
        {renderChoices(
          CHALLENGE_DURATIONS.map(option => option.id),
          challengeDraft.duration,
          durationLabel,
          value => setChallengeDraft(current => ({
            ...current,
            duration: value,
            ...challengeDateRange(value, localDateKey(), current.id ? current.starts : undefined),
          })),
        )}
        <Text style={styles.muted}>
          {!challengeDraft.id
            ? 'El reto empieza hoy y el día de hoy cuenta.'
            : challengeDraft.ends < localDateKey()
              ? 'Este reto ya terminó. Elige una duración para reactivarlo desde hoy.'
              : challengeDraft.duration
                ? 'Si cambias la duración, se conserva su fecha de inicio.'
                : 'Este reto tiene fechas personalizadas. Elige una duración solo si quieres cambiarlas.'}
        </Text>
        {renderSummary([
          `Reto: ${challengeDraft.description.trim() || 'Falta la descripción'}`,
          `Da ${challengeDraft.points.trim() ? `${challengeDraft.points.trim()} puntos` : 'los puntos que indiques'} al verificarlo`,
          `Vigencia: ${challengeDraft.duration ? `${durationLabel(challengeDraft.duration)} · ` : ''}${dateRange(challengeDraft.starts, challengeDraft.ends)}`,
          challengeDraft.id
            ? 'Cambiar los puntos no modifica los que ya se otorgaron.'
            : 'Después de crearlo podrás elegir a qué perfiles asignarlo.',
        ])}
        <View style={styles.horizontal}>
          <Button title={saving ? 'Guardando…' : challengeDraft.id ? 'Guardar cambios' : 'Crear reto'} disabled={saving} onPress={saveChallengeDraft} />
          <Button title="Cancelar" variant="outline" disabled={saving} onPress={() => { setChallengeDraft(EMPTY_CHALLENGE); setShowChallengeForm(false); }} />
        </View>
      </SectionCard>
      ) : (
        <Button title="Nuevo reto" icon="add" onPress={() => { setChallengeDraft(newChallengeDraft()); setShowChallengeForm(true); }} />
      )}

      {snapshot?.challenges.map(challenge => {
        const targets = assignmentTargets[challenge.id_reto] ?? [];
        const assignments = family.assignments.filter(item => item.challengeId === challenge.id_reto);
        return (
          <SectionCard
            key={challenge.id_reto}
            theme={theme}
            role="tutor"
            title={challenge.descripcion_reto}
            subtitle={`${plural(challenge.puntos_de_recompensa, 'punto')} · ${isoToText(challenge.fecha_inicio)} al ${isoToText(challenge.fecha_limite)}`}
          >
            <View style={styles.horizontal}>
              <Button
                title="Editar"
                icon="edit"
                variant="outline"
                small
                onPress={() => {
                  const starts = challenge.fecha_inicio.slice(0, 10);
                  const ends = challenge.fecha_limite.slice(0, 10);
                  setChallengeDraft({
                    id: challenge.id_reto,
                    description: challenge.descripcion_reto,
                    points: String(challenge.puntos_de_recompensa),
                    duration: challengeDurationFor(starts, ends),
                    starts,
                    ends,
                  });
                  setShowChallengeForm(true);
                }}
              />
              <Button title="Eliminar" icon="close" variant="danger" small onPress={() => setDeleteTarget({ kind: 'reto', id: challenge.id_reto })} />
            </View>
            {renderDeleteConfirmation(
              { kind: 'reto', id: challenge.id_reto },
              'Se eliminan el reto y sus actividades, y los perfiles dejarán de verlo. Los puntos que ya ganaron se conservan.',
            )}

            <Text style={styles.cardTitle}>Asignar a</Text>
            {renderProfileChoices(targets, next => setAssignmentTargets(current => ({ ...current, [challenge.id_reto]: next })), true)}
            {targets.length ? (
              <Text style={styles.noticeText}>
                Se asignará a: {targets.map(profileName).join(', ')} · {plural(challenge.puntos_de_recompensa, 'punto')} al verificarlo.
              </Text>
            ) : null}
            <Button
              title={targets.length ? `Asignar a ${plural(targets.length, 'perfil', 'perfiles')}` : 'Elige a quién asignarlo'}
              small
              disabled={!targets.length}
              onPress={() => {
                const pending = targets.filter(key => !assignments.some(item => item.progressKey === key && item.status !== 'verificado'));
                if (!pending.length) {
                  setNotice('Esos perfiles ya tienen este reto en curso.');
                  return;
                }
                local(`Se asignó el reto a ${plural(pending.length, 'perfil', 'perfiles')}.`, () => actions.assignChallenge(challenge.id_reto, pending));
                setAssignmentTargets(current => ({ ...current, [challenge.id_reto]: [] }));
              }}
            />

            {assignments.map(assignment => (
              <Card key={assignment.id}>
                <View style={styles.between}>
                  <Text style={[styles.cardTitle, styles.flex]}>{profileName(assignment.progressKey)}</Text>
                  <Tag
                    title={ASSIGNMENT_STATES.find(item => item.id === assignment.status)?.label ?? assignment.status}
                    color={assignment.status === 'verificado' ? COLORS.green : assignment.status === 'completado' ? COLORS.orange : COLORS.blue}
                    icon={assignment.status === 'verificado' ? 'check' : assignment.status === 'completado' ? 'bell' : assignment.status === 'rechazado' ? 'repeat' : 'menu'}
                  />
                </View>
                <Text style={styles.muted}>
                  Asignado: {isoToText(assignment.assignedAt)}
                  {assignment.pointsAwarded ? ` · Ganó ${plural(assignment.pointsAwarded, 'punto')}` : ''}
                </Text>
                {renderChoices(
                  ASSIGNMENT_STATES.map(item => item.id),
                  assignment.status,
                  value => ASSIGNMENT_STATES.find(item => item.id === value)?.label ?? value,
                  value => local('Se actualizó el reto de este perfil.', () => actions.setAssignmentStatus(assignment.id, value, challenge.puntos_de_recompensa)),
                )}
                {assignment.status === 'verificado' && assignment.pointsAwarded ? (
                  <Text style={styles.muted}>Si cambias este estado se restarán los {assignment.pointsAwarded} puntos otorgados.</Text>
                ) : null}
                <Button title="Quitar asignación" small variant="danger" onPress={() => setDeleteTarget({ kind: 'asignacion', id: assignment.id })} />
                {renderDeleteConfirmation({ kind: 'asignacion', id: assignment.id }, 'Se quitará este reto del perfil. Los puntos que ya ganó se conservan.')}
              </Card>
            ))}
          </SectionCard>
        );
      })}
      {!snapshot?.challenges.length ? <Card><Text style={styles.body}>Todavía no hay retos. Crea el primero con “Nuevo reto” y luego elige a qué perfiles asignarlo.</Text></Card> : null}
    </View>
  );

  // ---------- Recompensas ----------
  const saveRewardDraft = () => {
    void run(rewardDraft.id ? 'Se actualizó la recompensa.' : 'Se creó la recompensa.', async () => {
      await saveReward(userId, {
        nombre_premio: rewardDraft.name,
        costo_en_puntos: Number(rewardDraft.cost),
        cantidad_disponible: Number(rewardDraft.quantity),
        estado: rewardDraft.status,
      }, rewardDraft.id);
      setRewardDraft(EMPTY_REWARD);
      setShowRewardForm(false);
    });
  };

  const selectedReward = snapshot?.rewards.find(reward => reward.id_recompensa === Number(requestReward));
  const requestPoints = profiles.find(profile => profile.progressKey === requestProfile)?.rewardPoints ?? 0;
  const rewardName = (rewardId: number) => snapshot?.rewards.find(reward => reward.id_recompensa === rewardId)?.nombre_premio ?? 'Recompensa';
  const stockLeft = (reward: { id_recompensa: number; cantidad_disponible: number }) => (
    rewardStockLeft(reward.cantidad_disponible, family.rewardRequests, reward.id_recompensa)
  );
  const draftTaken = rewardDraft.id
    ? family.rewardRequests.filter(item => item.rewardId === rewardDraft.id && item.status !== 'cancelado').length
    : 0;
  const changeRequestStatus = (request: RewardRequest, status: RewardRequestStatus) => {
    const total = snapshot?.rewards.find(reward => reward.id_recompensa === request.rewardId)?.cantidad_disponible ?? 0;
    const balance = profiles.find(profile => profile.progressKey === request.progressKey)?.rewardPoints ?? 0;
    if (!canChangeRewardRequest(balance, family.rewardRequests, request.id, status, total)) {
      setNotice('');
      setError('No se puede reactivar este pedido: ya no quedan unidades o no alcanzan los puntos para premios.');
      return;
    }
    local('Se actualizó el pedido.', () => actions.setRewardRequestStatus(request.id, status, total));
  };

  const renderRewardSection = () => (
    <View style={{ gap: 16 }}>
      {showRewardForm ? (
      <SectionCard theme={theme} role="tutor" title={rewardDraft.id ? 'Editar recompensa' : 'Crear recompensa'}>
        <Text style={styles.muted}>Las recompensas activas aparecen para todos los perfiles infantiles. Cada pedido aparta una unidad; si se cancela, vuelve a estar disponible.</Text>
        <Field label="Nombre del premio" value={rewardDraft.name} onChangeText={value => setRewardDraft(current => ({ ...current, name: value }))} />
        <View style={styles.horizontal}>
          <Field label="Costo en puntos" keyboardType="number-pad" value={rewardDraft.cost} onChangeText={value => setRewardDraft(current => ({ ...current, cost: value }))} style={styles.flex} />
          <Field label="Cantidad total" keyboardType="number-pad" value={rewardDraft.quantity} onChangeText={value => setRewardDraft(current => ({ ...current, quantity: value }))} style={styles.flex} />
        </View>
        <Text style={styles.inputLabel}>Estado</Text>
        {renderChoices(REWARD_STATES, rewardDraft.status, capitalize, value => setRewardDraft(current => ({ ...current, status: value })))}
        {renderSummary([
          `Premio: ${rewardDraft.name.trim() || 'Falta el nombre'}`,
          `Costo: ${rewardDraft.cost.trim() ? `${rewardDraft.cost.trim()} puntos` : 'falta indicarlo'} · Cantidad total: ${rewardDraft.quantity.trim() || '0'}`,
          rewardDraft.status === 'activa' ? 'Lo verán todos los perfiles infantiles.' : 'No se mostrará a los perfiles mientras no esté activa.',
          ...(rewardDraft.id ? [
            'Cambiar el costo no modifica los pedidos ya hechos.',
            `Ya hay ${plural(draftTaken, 'unidad pedida o entregada', 'unidades pedidas o entregadas')}; quedarían ${Math.max(0, (Number(rewardDraft.quantity) || 0) - draftTaken)}.`,
          ] : []),
        ])}
        <View style={styles.horizontal}>
          <Button title={saving ? 'Guardando…' : rewardDraft.id ? 'Guardar cambios' : 'Crear recompensa'} disabled={saving} onPress={saveRewardDraft} />
          <Button title="Cancelar" variant="outline" disabled={saving} onPress={() => { setRewardDraft(EMPTY_REWARD); setShowRewardForm(false); }} />
        </View>
      </SectionCard>
      ) : (
        <Button title="Nueva recompensa" icon="add" onPress={() => setShowRewardForm(true)} />
      )}

      {snapshot?.rewards.map(reward => (
        <SectionCard key={reward.id_recompensa} theme={theme} role="tutor" title={reward.nombre_premio} subtitle={`${plural(reward.costo_en_puntos, 'punto')} · Quedan ${stockLeft(reward)} de ${reward.cantidad_disponible} · ${reward.estado === 'activa' && stockLeft(reward) === 0 ? 'agotada' : reward.estado}`}>
          <View style={styles.horizontal}>
            <Button
              title="Editar"
              icon="edit"
              variant="outline"
              small
              onPress={() => {
                setRewardDraft({
                  id: reward.id_recompensa,
                  name: reward.nombre_premio,
                  cost: String(reward.costo_en_puntos),
                  quantity: String(reward.cantidad_disponible),
                  status: reward.estado,
                });
                setShowRewardForm(true);
              }}
            />
            <Button title="Eliminar" icon="close" variant="danger" small onPress={() => setDeleteTarget({ kind: 'recompensa', id: reward.id_recompensa })} />
          </View>
          {renderDeleteConfirmation({ kind: 'recompensa', id: reward.id_recompensa }, 'Se eliminará esta recompensa. Los pedidos anteriores se conservan. Si prefieres ocultarla, cámbiala a inactiva.')}
        </SectionCard>
      ))}
      {!snapshot?.rewards.length ? <Card><Text style={styles.body}>Todavía no hay recompensas. Crea una con “Nueva recompensa” para que los perfiles tengan una meta.</Text></Card> : null}

      <SectionCard theme={theme} role="tutor" title="Registrar un pedido">
        <Text style={styles.muted}>Los niños pueden pedir premios desde Logros. Aquí puedes registrar uno por ellos.</Text>
        <Text style={styles.inputLabel}>Perfil infantil</Text>
        {renderProfileChoices(requestProfile ? [requestProfile] : [], next => setRequestProfile(next[0] ?? ''), false)}
        <Text style={styles.inputLabel}>Recompensa activa</Text>
        {renderChoices(
          (snapshot?.rewards ?? []).filter(reward => reward.estado === 'activa' && stockLeft(reward) > 0).map(reward => String(reward.id_recompensa)),
          requestReward,
          value => rewardName(Number(value)),
          setRequestReward,
        )}
        {selectedReward && requestProfile ? renderSummary([
          `${profileName(requestProfile)} pedirá: ${selectedReward.nombre_premio}`,
          `Usa ${plural(selectedReward.costo_en_puntos, 'punto')} · Tiene ${plural(requestPoints, 'punto')} para premios`,
          ...(requestPoints < selectedReward.costo_en_puntos ? ['Todavía no le alcanzan los puntos para este premio.'] : []),
        ]) : null}
        <Button
          title="Registrar pedido"
          disabled={!requestProfile || !selectedReward || requestPoints < selectedReward.costo_en_puntos || stockLeft(selectedReward) < 1}
          onPress={() => {
            if (!selectedReward) return;
            local('Se registró el pedido.', () => actions.requestReward(selectedReward.id_recompensa, requestProfile, selectedReward.costo_en_puntos, selectedReward.cantidad_disponible));
            setRequestReward('');
          }}
        />
      </SectionCard>

      <SectionTitle title="Pedidos de premios" />
      {family.rewardRequests.map(request => (
        <SectionCard
          key={request.id}
          theme={theme}
          role="tutor"
          title={rewardName(request.rewardId)}
          subtitle={`${profileName(request.progressKey)} · ${isoToText(request.requestedAt)} · ${plural(request.cost, 'punto')}`}
        >
          {renderChoices(
            REQUEST_STATES.map(item => item.id),
            request.status,
            value => REQUEST_STATES.find(item => item.id === value)?.label ?? value,
            value => changeRequestStatus(request, value),
          )}
          <Button title="Eliminar pedido" small variant="danger" onPress={() => setDeleteTarget({ kind: 'canje', id: request.id })} />
          {renderDeleteConfirmation(
            { kind: 'canje', id: request.id },
            request.status === 'cancelado'
              ? 'Se quitará este pedido cancelado del historial. Sus puntos y su unidad ya estaban disponibles.'
              : 'Se eliminará este pedido; sus puntos y su unidad volverán a estar disponibles.',
          )}
        </SectionCard>
      ))}
      {!family.rewardRequests.length ? <Card><Text style={styles.body}>Todavía no hay pedidos. Cuando un perfil pida un premio desde Logros, aparecerá aquí y en tu inicio.</Text></Card> : null}
    </View>
  );

  // ---------- Planes ----------
  const savePlanDraft = () => {
    const calories = Number(planDraft.calories);
    if (!planDraft.progressKey || !Number.isSafeInteger(calories) || calories <= 0 || !ISO_DATE.test(planDraft.starts) || !ISO_DATE.test(planDraft.ends) || planDraft.ends < planDraft.starts) {
      setError('Elige un perfil y revisa la meta calórica y el periodo del plan.');
      return;
    }
    local(planDraft.id ? 'Se actualizó el plan.' : 'Se creó el plan.', () => actions.saveMealPlan({
      id: planDraft.id,
      progressKey: planDraft.progressKey,
      calories,
      starts: planDraft.starts,
      ends: planDraft.ends,
    }));
    setPlanDraft(EMPTY_PLAN);
    setShowPlanForm(false);
  };

  const addRecipe = (plan: FamilyMealPlan) => {
    if (planRecipeDate < plan.starts || planRecipeDate > plan.ends) {
      setError('La fecha de la receta debe estar dentro de la vigencia del plan.');
      return;
    }
    local('Se agregó la receta al plan.', () => actions.addPlanRecipe(plan.id, {
      date: planRecipeDate,
      meal: planRecipeMeal,
      recipeId: Number(planRecipeId),
    }));
  };

  const renderPlanSection = () => (
    <View style={{ gap: 16 }}>
      {showPlanForm ? (
      <SectionCard theme={theme} role="tutor" title={planDraft.id ? 'Editar plan alimenticio' : 'Crear plan alimenticio'}>
        <Text style={styles.muted}>La app no calcula metas calóricas. Registra aquí solo una meta que ya tengas indicada.</Text>
        <Text style={styles.inputLabel}>Perfil infantil</Text>
        {renderProfileChoices(planDraft.progressKey ? [planDraft.progressKey] : [], next => setPlanDraft(current => ({ ...current, progressKey: next[0] ?? '' })), false)}
        <Field label="Meta de calorías diarias" keyboardType="number-pad" value={planDraft.calories} onChangeText={value => setPlanDraft(current => ({ ...current, calories: value }))} />
        <DateField label="Fecha de inicio" value={planDraft.starts} onChange={value => setPlanDraft(current => ({ ...current, starts: value }))} />
        <DateField
          label="Fecha de fin"
          value={planDraft.ends}
          minDate={planDraft.starts || undefined}
          openTo={planDraft.starts || undefined}
          onChange={value => setPlanDraft(current => ({ ...current, ends: value }))}
        />
        {renderSummary([
          `Perfil: ${planDraft.progressKey ? profileName(planDraft.progressKey) : 'Falta elegirlo'}`,
          `Meta indicada: ${planDraft.calories.trim() ? `${planDraft.calories.trim()} kcal al día` : 'falta escribirla'}`,
          `Vigencia: ${dateRange(planDraft.starts, planDraft.ends)}`,
          ...(planDraft.id ? ['Las recetas que ya tiene el plan se conservan.'] : []),
        ])}
        <View style={styles.horizontal}>
          <Button title={planDraft.id ? 'Guardar cambios' : 'Crear plan'} disabled={!planDraft.progressKey} onPress={savePlanDraft} />
          <Button title="Cancelar" variant="outline" onPress={() => { setPlanDraft(EMPTY_PLAN); setShowPlanForm(false); }} />
        </View>
      </SectionCard>
      ) : (
        <Button title="Nuevo plan" icon="add" onPress={() => setShowPlanForm(true)} />
      )}

      {family.mealPlans.map(plan => (
        <SectionCard
          key={plan.id}
          theme={theme}
          role="tutor"
          title={`Plan · ${profileName(plan.progressKey)}`}
          subtitle={`${plan.calories} kcal diarias · ${isoToText(plan.starts)} al ${isoToText(plan.ends)}`}
        >
          <View style={styles.horizontal}>
            <Button
              title="Editar"
              icon="edit"
              variant="outline"
              small
              onPress={() => {
                setPlanDraft({ id: plan.id, progressKey: plan.progressKey, calories: String(plan.calories), starts: plan.starts, ends: plan.ends });
                setShowPlanForm(true);
              }}
            />
            <Button title="Recetas" icon="recipes" variant="secondary" small onPress={() => setActivePlanId(current => current === plan.id ? null : plan.id)} />
            <Button title="Eliminar" icon="close" variant="danger" small onPress={() => setDeleteTarget({ kind: 'plan', id: plan.id })} />
          </View>
          {renderDeleteConfirmation({ kind: 'plan', id: plan.id }, 'Se eliminará el plan con sus recetas. El perfil volverá a ver el menú de la semana. Sus puntos no cambian.')}
          {activePlanId === plan.id ? (
            <View style={{ gap: 10 }}>
              <Text style={styles.cardTitle}>Recetas del plan</Text>
              {plan.recipes.map(item => (
                <Card key={`${item.recipeId}-${item.date}-${item.meal}`}>
                  <Text style={styles.body}>{isoToText(item.date)} · {MEAL_LABELS[item.meal]} · {recipeNames.get(item.recipeId) ?? 'Receta'}</Text>
                  <Button title="Quitar receta" variant="danger" small onPress={() => local('Se quitó la receta del plan.', () => actions.removePlanRecipe(plan.id, item))} />
                </Card>
              ))}
              {!plan.recipes.length ? <Text style={styles.muted}>Todavía no tiene recetas.</Text> : null}
              <Text style={styles.inputLabel}>Agregar receta</Text>
              {recipes.length ? renderChoices(
                recipes.flatMap(recipe => recipe.databaseId ? [String(recipe.databaseId)] : []),
                planRecipeId,
                value => recipeNames.get(Number(value)) ?? value,
                setPlanRecipeId,
              ) : <Text style={styles.muted}>No hay recetas disponibles para asignar.</Text>}
              <DateField label="Fecha" value={planRecipeDate} minDate={plan.starts} maxDate={plan.ends} openTo={plan.starts} onChange={setPlanRecipeDate} />
              <Text style={styles.inputLabel}>Momento de comida</Text>
              {renderChoices(MEAL_TYPES, planRecipeMeal, value => MEAL_LABELS[value], setPlanRecipeMeal)}
              <Button title="Agregar al plan" disabled={!planRecipeId || !planRecipeDate} onPress={() => addRecipe(plan)} />
            </View>
          ) : null}
        </SectionCard>
      ))}
      {!family.mealPlans.length ? <Card><Text style={styles.body}>Todavía no hay planes. Son opcionales: crea uno solo si ya tienes una meta indicada por una persona profesional.</Text></Card> : null}
    </View>
  );

  if (loading && !snapshot) {
    return <Card><View style={styles.horizontal}><Icon name="activity" /><Text style={styles.body}>Cargando la gestión familiar…</Text></View></Card>;
  }

  return (
    <View style={{ gap: 16 }}>
      <SectionTitle title="Gestión de datos" subtitle="Administra retos, actividades, recompensas y planes alimenticios para todos tus perfiles infantiles." />
      {error ? (
        <View accessibilityRole="alert" style={styles.notice}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Reintentar" small variant="outline" onPress={() => void reload().then(() => setError('')).catch(cause => setError(friendlyError(cause, 'No se pudieron recargar los datos.')))} />
        </View>
      ) : null}
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
