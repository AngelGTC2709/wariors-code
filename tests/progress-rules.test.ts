import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FamilyAssignment, RewardRequest } from '../src/features/unified/model.ts';
import {
  assignableProfiles,
  assignmentPointDelta,
  canApproveActivity,
  canChangeRewardRequest,
  canRegisterActivity,
  canRequestReward,
  challengeActivitySteps,
  challengeDateRange,
  challengeDurationFor,
  claimOnce,
  nextChildStep,
  rewardBalance,
  rewardStockLeft,
} from '../src/features/unified/progress-rules.ts';

const assignment = (progressKey: string, status: FamilyAssignment['status']): FamilyAssignment => ({
  id: `a-${progressKey}`,
  challengeId: 1,
  progressKey,
  status,
  assignedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});
const request = (status: RewardRequest['status'], cost = 50): RewardRequest => ({
  id: `r-${status}`,
  rewardId: 7,
  progressKey: 'perfil-prueba',
  cost,
  status,
  requestedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('sin duplicados', () => {
  it('un reto diario solo se reclama una vez', () => {
    const first = claimOnce([], 'water-goal');
    assert.deepEqual(first, ['water-goal']);
    assert.equal(claimOnce(first ?? [], 'water-goal'), null);
  });

  it('una actividad no se registra dos veces el mismo día', () => {
    assert.equal(canRegisterActivity(undefined), true);
    assert.equal(canRegisterActivity({ status: 'pending' }), false);
    assert.equal(canRegisterActivity({ status: 'approved' }), false);
  });

  it('una actividad aprobada no se vuelve a aprobar', () => {
    assert.equal(canApproveActivity({ status: 'pending' }), true);
    assert.equal(canApproveActivity({ status: 'approved' }), false);
    assert.equal(canApproveActivity(undefined), false);
  });

  it('no asigna el mismo reto a quien ya lo tiene en curso', () => {
    const existing = [assignment('uno', 'asignado'), assignment('dos', 'verificado')];
    assert.deepEqual(assignableProfiles(existing, 1, ['uno', 'dos', 'tres', 'tres']), ['dos', 'tres']);
  });

  it('no permite pedir el mismo premio mientras está en curso', () => {
    assert.equal(canRequestReward(100, [], 'perfil-prueba', 7, 50, 5), true);
    assert.equal(canRequestReward(100, [request('solicitado')], 'perfil-prueba', 7, 50, 5), false);
  });
});

describe('puntos', () => {
  it('verificar suma una vez y repetir el estado no suma', () => {
    assert.equal(assignmentPointDelta('completado', 'verificado', 50, undefined), 50);
    assert.equal(assignmentPointDelta('verificado', 'verificado', 50, 50), 0);
  });

  it('quitar la verificación resta lo que se otorgó, aunque el reto haya cambiado de puntos', () => {
    assert.equal(assignmentPointDelta('verificado', 'asignado', 80, 50), -50);
  });

  it('los cambios sin verificación no mueven puntos', () => {
    assert.equal(assignmentPointDelta('asignado', 'completado', 50, undefined), 0);
    assert.equal(assignmentPointDelta('completado', 'rechazado', 50, undefined), 0);
  });

  it('el saldo de premios ignora pedidos cancelados y nunca es negativo', () => {
    assert.equal(rewardBalance(100, [request('solicitado', 30), request('cancelado', 40)], 'perfil-prueba'), 70);
    assert.equal(rewardBalance(10, [request('entregado', 30)], 'perfil-prueba'), 0);
  });

  it('no permite pedir un premio sin puntos suficientes', () => {
    assert.equal(canRequestReward(40, [], 'perfil-prueba', 7, 50, 5), false);
  });
});

describe('existencias de premios', () => {
  const other = (status: RewardRequest['status']): RewardRequest => ({ ...request(status), id: `o-${status}`, progressKey: 'otro-perfil' });

  it('pedidos y entregas apartan unidades; los cancelados las regresan', () => {
    assert.equal(rewardStockLeft(3, [request('solicitado'), other('entregado')], 7), 1);
    assert.equal(rewardStockLeft(3, [request('cancelado')], 7), 3);
  });

  it('entregar un pedido no descuenta una segunda unidad', () => {
    assert.equal(rewardStockLeft(2, [request('solicitado')], 7), rewardStockLeft(2, [request('entregado')], 7));
  });

  it('no baja de cero si el total se reduce', () => {
    assert.equal(rewardStockLeft(1, [request('solicitado'), other('entregado')], 7), 0);
  });

  it('otro perfil no puede pedir la última unidad apartada', () => {
    assert.equal(canRequestReward(100, [other('solicitado')], 'perfil-prueba', 7, 50, 1), false);
  });

  it('reactivar un pedido exige unidades y puntos', () => {
    const cancelled = request('cancelado');
    assert.equal(canChangeRewardRequest(50, [cancelled], cancelled.id, 'solicitado', 1), true);
    assert.equal(canChangeRewardRequest(49, [cancelled], cancelled.id, 'solicitado', 1), false);
    assert.equal(canChangeRewardRequest(50, [cancelled, other('entregado')], cancelled.id, 'entregado', 1), false);
  });

  it('entregar o cancelar un pedido activo siempre se permite', () => {
    const active = request('solicitado');
    assert.equal(canChangeRewardRequest(0, [active], active.id, 'entregado', 0), true);
    assert.equal(canChangeRewardRequest(0, [active], active.id, 'cancelado', 0), true);
  });
});

describe('duración de retos', () => {
  const today = '2026-11-22';

  it('cuenta el día de inicio', () => {
    assert.deepEqual(challengeDateRange('1d', today), { starts: today, ends: today });
    assert.equal(challengeDateRange('3d', today).ends, '2026-11-24');
    assert.equal(challengeDateRange('5d', today).ends, '2026-11-26');
    assert.equal(challengeDateRange('7d', today).ends, '2026-11-28');
    assert.equal(challengeDateRange('2w', today).ends, '2026-12-05');
  });

  it('un mes termina un día antes de la misma fecha del mes siguiente', () => {
    assert.equal(challengeDateRange('1m', today).ends, '2026-12-21');
    assert.equal(challengeDateRange('1m', '2026-12-15').ends, '2027-01-14');
  });

  it('un mes corto no se desborda', () => {
    assert.equal(challengeDateRange('1m', '2027-01-31').ends, '2027-02-27');
  });

  it('al editar conserva el inicio si el reto sigue vigente', () => {
    assert.deepEqual(challengeDateRange('2w', today, '2026-11-20'), { starts: '2026-11-20', ends: '2026-12-03' });
  });

  it('si con esa duración ya habría terminado, empieza hoy', () => {
    assert.deepEqual(challengeDateRange('3d', today, '2026-11-01'), { starts: today, ends: '2026-11-24' });
  });

  it('reconoce la duración guardada y las fechas personalizadas', () => {
    assert.equal(challengeDurationFor('2026-11-22', '2026-11-28'), '7d');
    assert.equal(challengeDurationFor('2026-11-22', '2026-12-21'), '1m');
    assert.equal(challengeDurationFor('2026-11-22', '2026-11-29'), null);
  });
});

describe('actividades de un reto', () => {
  const catalog = {
    sports: [{ id_tipo_deporte: 1, nombre: 'Deporte de prueba' }],
    intensities: [{ id_intensidad: 2, nombre: 'Moderada' }],
    subjects: [{ id_materia: 3, nombre: 'Materia de prueba' }],
    physicalActivities: [
      { id_reto: 9, id_tipo_deporte: 1, id_intensidad: 2, distancia_km: 2, tiempo_minutos: 30 },
      { id_reto: 8, id_tipo_deporte: 1, id_intensidad: 2, distancia_km: null, tiempo_minutos: 10 },
    ],
    didacticActivities: [{ id_reto: 9, id_materia: 3, duracion_horas: 1, duracion_minutos: 15 }],
  };

  it('muestra solo las actividades de ese reto', () => {
    assert.deepEqual(challengeActivitySteps(catalog, 9), [
      { kind: 'fisica', text: 'Deporte de prueba · 30 min · 2 km · intensidad moderada' },
      { kind: 'didactica', text: 'Materia de prueba · 1 h 15 min' },
    ]);
  });

  it('sin catálogo o sin actividades no muestra nada', () => {
    assert.deepEqual(challengeActivitySteps(null, 9), []);
    assert.deepEqual(challengeActivitySteps(catalog, 99), []);
  });
});

describe('siguiente paso', () => {
  const base = {
    missions: [{ id: 'water-goal', title: 'Agua', points: 10, ready: false, claimed: false }],
    familyChallengeTitle: null,
    water: 0,
    waterGoal: 5,
    hasActivityToday: false,
    foodGroups: 0,
  };

  it('prioriza reclamar puntos listos', () => {
    const step = nextChildStep({ ...base, missions: [{ ...base.missions[0], ready: true }], familyChallengeTitle: 'Reto' });
    assert.equal(step.kind, 'claim');
  });

  it('sigue con el reto familiar y luego con el agua', () => {
    assert.equal(nextChildStep({ ...base, familyChallengeTitle: 'Reto' }).kind, 'family-challenge');
    assert.deepEqual(nextChildStep({ ...base, water: 3 }), { kind: 'water', missing: 2 });
  });

  it('sigue con movimiento y plato', () => {
    assert.equal(nextChildStep({ ...base, water: 5 }).kind, 'movement');
    assert.equal(nextChildStep({ ...base, water: 5, hasActivityToday: true }).kind, 'plate');
  });

  it('celebra cuando no queda nada, sin exigir registrar el ánimo', () => {
    assert.equal(nextChildStep({ ...base, water: 5, hasActivityToday: true, foodGroups: 2 }).kind, 'all-done');
  });
});
