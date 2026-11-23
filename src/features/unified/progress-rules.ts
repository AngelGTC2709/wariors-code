// Reglas puras de progreso: evitan registros y puntos duplicados y eligen el siguiente paso.
// Solo importa tipos para poder probarse directamente con `npm test`.
import type { FamilyAssignment, FamilyAssignmentStatus, RewardRequest } from './model';

/** Agrega un reto reclamado solo si no estaba. null = ya se había reclamado. */
export function claimOnce(claims: readonly string[], missionId: string): string[] | null {
  return claims.includes(missionId) ? null : [...claims, missionId];
}

/** Una actividad solo se registra si hoy no tiene registro pendiente ni aprobado. */
export function canRegisterActivity(existing: { status: string } | undefined): boolean {
  return !existing;
}

/** Solo una actividad pendiente puede aprobarse; así no se otorgan puntos dos veces. */
export function canApproveActivity(existing: { status: string } | undefined): boolean {
  return existing?.status === 'pending';
}

/** Puntos que hay que sumar o restar al cambiar el estado de un reto asignado. */
export function assignmentPointDelta(
  previous: FamilyAssignmentStatus,
  next: FamilyAssignmentStatus,
  challengePoints: number,
  awarded: number | undefined,
): number {
  if (previous === next) return 0;
  if (next === 'verificado') return challengePoints;
  if (previous === 'verificado') return -(awarded ?? 0);
  return 0;
}

/** Perfiles a los que sí se puede asignar: omite quienes ya tienen el reto en curso. */
export function assignableProfiles(
  assignments: readonly FamilyAssignment[],
  challengeId: number,
  progressKeys: readonly string[],
): string[] {
  return [...new Set(progressKeys)].filter(key => !assignments.some(item => (
    item.challengeId === challengeId && item.progressKey === key && item.status !== 'verificado'
  )));
}

/** Puntos disponibles para premios: acumulados menos pedidos no cancelados. */
export function rewardBalance(points: number, requests: readonly RewardRequest[], progressKey: string): number {
  const spent = requests
    .filter(item => item.progressKey === progressKey && item.status !== 'cancelado')
    .reduce((sum, item) => sum + item.cost, 0);
  return Math.max(0, points - spent);
}

/**
 * Unidades que quedan de un premio. `cantidad_disponible` es el total: cada pedido no cancelado
 * aparta una unidad y, si se cancela, regresa. Se deriva para no desincronizar dos almacenes.
 */
export function rewardStockLeft(total: number, requests: readonly RewardRequest[], rewardId: number): number {
  const taken = requests.filter(item => item.rewardId === rewardId && item.status !== 'cancelado').length;
  return Math.max(0, total - taken);
}

/** Un premio se puede pedir si quedan unidades, no hay otro pedido igual en curso y alcanzan los puntos. */
export function canRequestReward(
  points: number,
  requests: readonly RewardRequest[],
  progressKey: string,
  rewardId: number,
  cost: number,
  totalStock: number,
): boolean {
  const alreadyRequested = requests.some(item => (
    item.progressKey === progressKey && item.rewardId === rewardId && item.status === 'solicitado'
  ));
  return !alreadyRequested
    && rewardStockLeft(totalStock, requests, rewardId) > 0
    && rewardBalance(points, requests, progressKey) >= cost;
}

/** Reactivar un pedido cancelado vuelve a usar puntos y una unidad, así que ambos deben alcanzar. */
export function canChangeRewardRequest(
  balance: number,
  requests: readonly RewardRequest[],
  requestId: string,
  next: RewardRequest['status'],
  totalStock: number,
): boolean {
  const request = requests.find(item => item.id === requestId);
  if (!request) return false;
  if (request.status !== 'cancelado' || next === 'cancelado') return true;
  const duplicate = next === 'solicitado' && requests.some(item => (
    item.id !== request.id
    && item.progressKey === request.progressKey
    && item.rewardId === request.rewardId
    && item.status === 'solicitado'
  ));
  return !duplicate && balance >= request.cost && rewardStockLeft(totalStock, requests, request.rewardId) > 0;
}

export const CHALLENGE_DURATIONS = [
  { id: '1d', label: '1 día', days: 1 },
  { id: '3d', label: '3 días', days: 3 },
  { id: '5d', label: '5 días', days: 5 },
  { id: '7d', label: '7 días', days: 7 },
  { id: '2w', label: '2 semanas', days: 14 },
  { id: '1m', label: '1 mes', months: 1 },
] as const;
export type ChallengeDurationId = (typeof CHALLENGE_DURATIONS)[number]['id'];

/** Fecha local del dispositivo en formato AAAA-MM-DD. */
export function localDateKey(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// El día de inicio cuenta: "3 días" desde el lunes termina el miércoles.
function durationEnd(starts: string, option: (typeof CHALLENGE_DURATIONS)[number]): string {
  if ('days' in option) return addDays(starts, option.days - 1);
  const date = new Date(`${starts}T00:00:00.000Z`);
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + option.months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return addDays(target.toISOString().slice(0, 10), -1);
}

/**
 * Fechas de un reto según la duración elegida. Al editar conserva el inicio, salvo que con esa
 * duración el reto ya hubiera terminado: entonces vuelve a empezar hoy.
 */
export function challengeDateRange(
  id: ChallengeDurationId,
  today: string,
  currentStart?: string,
): { starts: string; ends: string } {
  const option = CHALLENGE_DURATIONS.find(item => item.id === id) ?? CHALLENGE_DURATIONS[3];
  if (currentStart) {
    const ends = durationEnd(currentStart, option);
    if (ends >= today) return { starts: currentStart, ends };
  }
  return { starts: today, ends: durationEnd(today, option) };
}

/** Duración que corresponde a unas fechas guardadas; null si son personalizadas. */
export function challengeDurationFor(starts: string, ends: string): ChallengeDurationId | null {
  return CHALLENGE_DURATIONS.find(option => durationEnd(starts, option) === ends)?.id ?? null;
}

export type ChallengeActivityCatalog = {
  sports: readonly { id_tipo_deporte: number; nombre: string }[];
  intensities: readonly { id_intensidad: number; nombre: string }[];
  subjects: readonly { id_materia: number; nombre: string }[];
  physicalActivities: readonly {
    id_reto: number;
    id_tipo_deporte: number;
    id_intensidad: number;
    distancia_km: number | null;
    tiempo_minutos: number | null;
  }[];
  didacticActivities: readonly {
    id_reto: number;
    id_materia: number;
    duracion_horas: number;
    duracion_minutos: number;
  }[];
};
export type ChallengeActivityStep = { kind: 'fisica' | 'didactica'; text: string };

/** Actividades vinculadas a un reto, en texto sencillo para mostrarlas a la niñez. */
export function challengeActivitySteps(catalog: ChallengeActivityCatalog | null, challengeId: number): ChallengeActivityStep[] {
  if (!catalog) return [];
  const physical = catalog.physicalActivities
    .filter(activity => activity.id_reto === challengeId)
    .map((activity): ChallengeActivityStep => {
      const sport = catalog.sports.find(item => item.id_tipo_deporte === activity.id_tipo_deporte)?.nombre ?? 'Actividad física';
      const intensity = catalog.intensities.find(item => item.id_intensidad === activity.id_intensidad)?.nombre;
      const parts = [
        sport,
        activity.tiempo_minutos ? `${activity.tiempo_minutos} min` : null,
        activity.distancia_km ? `${activity.distancia_km} km` : null,
        intensity ? `intensidad ${intensity.toLocaleLowerCase('es-MX')}` : null,
      ];
      return { kind: 'fisica', text: parts.filter(Boolean).join(' · ') };
    });
  const didactic = catalog.didacticActivities
    .filter(activity => activity.id_reto === challengeId)
    .map((activity): ChallengeActivityStep => {
      const subject = catalog.subjects.find(item => item.id_materia === activity.id_materia)?.nombre ?? 'Actividad de estudio';
      const time = [
        activity.duracion_horas ? `${activity.duracion_horas} h` : null,
        activity.duracion_minutos ? `${activity.duracion_minutos} min` : null,
      ].filter(Boolean).join(' ');
      return { kind: 'didactica', text: time ? `${subject} · ${time}` : subject };
    });
  return [...physical, ...didactic];
}

export type ChildNextStep =
  | { kind: 'claim'; missionId: string; title: string; points: number }
  | { kind: 'family-challenge'; title: string }
  | { kind: 'water'; missing: number }
  | { kind: 'movement' }
  | { kind: 'plate' }
  | { kind: 'all-done' };

/** Elige una sola acción recomendada. El ánimo es opcional y nunca se presenta como pendiente. */
export function nextChildStep(input: {
  missions: readonly { id: string; title: string; points: number; ready: boolean; claimed: boolean }[];
  familyChallengeTitle: string | null;
  water: number;
  waterGoal: number;
  hasActivityToday: boolean;
  foodGroups: number;
}): ChildNextStep {
  const claimable = input.missions.find(mission => mission.ready && !mission.claimed);
  if (claimable) return { kind: 'claim', missionId: claimable.id, title: claimable.title, points: claimable.points };
  if (input.familyChallengeTitle) return { kind: 'family-challenge', title: input.familyChallengeTitle };
  if (input.water < input.waterGoal) return { kind: 'water', missing: input.waterGoal - input.water };
  if (!input.hasActivityToday) return { kind: 'movement' };
  if (input.foodGroups < 2) return { kind: 'plate' };
  return { kind: 'all-done' };
}
