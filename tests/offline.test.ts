import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { utf8Decode, utf8Encode } from '../src/lib/utf8.ts';
import { deepEqual, isNetworkFailure, mergeThreeWay } from '../src/features/unified/offline-merge.ts';

describe('UTF-8', () => {
  it('ida y vuelta con acentos, ñ y emojis', () => {
    const text = 'Niñez · cumpleaños ✓ 🍎 {"agua":3}';
    assert.equal(utf8Decode(utf8Encode(text)), text);
  });

  it('codifica igual que el estándar', () => {
    assert.deepEqual([...utf8Encode('ñ€😀')], [0xc3, 0xb1, 0xe2, 0x82, 0xac, 0xf0, 0x9f, 0x98, 0x80]);
  });

  it('soporta textos largos', () => {
    const text = 'Perfil de prueba · '.repeat(20000);
    assert.equal(utf8Decode(utf8Encode(text)), text);
  });
});

describe('fallas de red', () => {
  it('reconoce errores de conexión directos y envueltos', () => {
    assert.equal(isNetworkFailure(new TypeError('Network request failed')), true);
    assert.equal(isNetworkFailure({ message: 'TypeError: Failed to fetch', details: '' }), true);
    assert.equal(isNetworkFailure({ name: 'AuthRetryableFetchError', message: '' }), true);
    const wrapped = Object.assign(new Error('No se pudieron cargar los datos.'), { originalError: { message: 'TypeError: Network request failed' } });
    assert.equal(isNetworkFailure(wrapped), true);
  });

  it('no confunde errores de datos o permisos con falta de internet', () => {
    assert.equal(isNetworkFailure(new Error('Invalid login credentials')), false);
    assert.equal(isNetworkFailure({ message: 'new row violates row-level security policy', code: '42501' }), false);
    assert.equal(isNetworkFailure(null), false);
  });
});

describe('combinar cambios sin conexión', () => {
  const base = {
    dailyLogs: { 'perfil-a': { '2026-11-26': { water: 2, mood: null, foodGroups: ['cereales'] } } },
    childProgress: { 'perfil-a': { points: 50, badges: ['inicio'] } },
    rewardRequests: [{ id: 'p1', status: 'solicitado' }],
    themeMode: 'light',
  };

  it('si solo un lado cambió, se toma ese lado', () => {
    const local = { ...base, themeMode: 'dark' };
    assert.deepEqual(mergeThreeWay(base, local, base), local);
    assert.deepEqual(mergeThreeWay(base, base, local), local);
  });

  it('suma el agua y los puntos que agregó cada dispositivo', () => {
    const local = structuredClone(base);
    local.dailyLogs['perfil-a']['2026-11-26'].water = 3;
    local.childProgress['perfil-a'].points = 60;
    const remote = structuredClone(base);
    remote.dailyLogs['perfil-a']['2026-11-26'].water = 4;
    remote.childProgress['perfil-a'].points = 75;
    const merged = mergeThreeWay(base, local, remote);
    assert.equal(merged.dailyLogs['perfil-a']['2026-11-26'].water, 5);
    assert.equal(merged.childProgress['perfil-a'].points, 85);
  });

  it('combina campos distintos del mismo registro', () => {
    const local = structuredClone(base);
    (local.dailyLogs['perfil-a']['2026-11-26'] as { mood: string | null }).mood = 'feliz';
    const remote = structuredClone(base);
    remote.dailyLogs['perfil-a']['2026-11-26'].foodGroups = ['cereales', 'frutas'];
    const merged = mergeThreeWay(base, local, remote);
    assert.equal(merged.dailyLogs['perfil-a']['2026-11-26'].mood, 'feliz');
    assert.deepEqual(merged.dailyLogs['perfil-a']['2026-11-26'].foodGroups, ['cereales', 'frutas']);
  });

  it('une listas de valores respetando lo que cada lado agregó o quitó', () => {
    const local = structuredClone(base);
    local.childProgress['perfil-a'].badges = ['inicio', 'agua'];
    const remote = structuredClone(base);
    remote.childProgress['perfil-a'].badges = ['actividad'];
    assert.deepEqual(mergeThreeWay(base, local, remote).childProgress['perfil-a'].badges, ['actividad', 'agua']);
  });

  it('une listas con id y conserva los elementos nuevos de ambos lados', () => {
    const local = { ...base, rewardRequests: [{ id: 'p1', status: 'entregado' }, { id: 'p2', status: 'solicitado' }] };
    const remote = { ...base, rewardRequests: [{ id: 'p1', status: 'solicitado' }, { id: 'p3', status: 'solicitado' }] };
    assert.deepEqual(mergeThreeWay(base, local, remote).rewardRequests, [
      { id: 'p1', status: 'entregado' },
      { id: 'p3', status: 'solicitado' },
      { id: 'p2', status: 'solicitado' },
    ]);
  });

  it('respeta un borrado si el otro lado no tocó ese elemento', () => {
    const local = { ...base, rewardRequests: [] };
    assert.deepEqual(mergeThreeWay(base, local, base).rewardRequests, []);
    const remote = { ...base, themeMode: 'dark' };
    assert.deepEqual(mergeThreeWay(base, local, remote), { ...base, rewardRequests: [], themeMode: 'dark' });
  });

  it('no pierde lo editado si el otro lado lo borró', () => {
    const local = { ...base, rewardRequests: [{ id: 'p1', status: 'entregado' }] };
    const remote = { ...base, rewardRequests: [] };
    assert.deepEqual(mergeThreeWay(base, local, remote).rewardRequests, [{ id: 'p1', status: 'entregado' }]);
  });

  it('si el mismo dato cambió distinto en ambos lados, gana este dispositivo', () => {
    assert.equal(mergeThreeWay(base, { ...base, themeMode: 'dark' }, { ...base, themeMode: 'system' }).themeMode, 'dark');
  });

  it('sin base conserva lo de ambos lados', () => {
    const merged = mergeThreeWay(null, { a: 1, b: 2 }, { a: 3, c: 4 });
    assert.ok(deepEqual(merged, { a: 1, b: 2, c: 4 }));
  });
});
