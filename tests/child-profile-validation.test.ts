import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CHILD_AGE_LIMITS,
  CHILD_HEIGHT_LIMITS_CM,
  CHILD_WEIGHT_LIMITS_KG,
  normalizeDecimal,
  USUAL_CAPTURE_RANGES,
  validateAge,
  validateChildProfile,
  validateInitialHealthSync,
  validateHeight,
  validateWeight,
} from '../src/features/unified/child-profile-validation.ts';

// Todos los valores son ficticios.
const valid = { age: '8', weight: '28.5', height: '128', collectMeasurements: true };

describe('edad', () => {
  it('acepta los límites y un valor intermedio', () => {
    assert.equal(validateAge(String(CHILD_AGE_LIMITS.min)).value, CHILD_AGE_LIMITS.min);
    assert.equal(validateAge(String(CHILD_AGE_LIMITS.max)).value, CHILD_AGE_LIMITS.max);
    assert.equal(validateAge(' 9 ').value, 9);
  });

  for (const value of ['', '   ', 'ocho', '0', '-5', '8.5', '8,5', '2', '18', '120']) {
    it(`rechaza ${JSON.stringify(value)}`, () => {
      const result = validateAge(value);
      assert.equal(result.value, null);
      assert.ok(result.error);
    });
  }
});

describe('sincronización inicial de salud', () => {
  const complete = {
    required: true,
    hasBirthDate: true,
    collectMeasurements: true,
    hasDiagnosis: true,
    didNotVisitSpecialist: false,
  };

  it('exige fecha, mediciones y una valoración explícita al sincronizar un perfil nuevo', () => {
    assert.ok(validateInitialHealthSync({ ...complete, hasBirthDate: false }));
    assert.ok(validateInitialHealthSync({ ...complete, collectMeasurements: false }));
    assert.ok(validateInitialHealthSync({ ...complete, hasDiagnosis: false }));
    assert.equal(validateInitialHealthSync(complete), null);
    assert.equal(validateInitialHealthSync({ ...complete, hasDiagnosis: false, didNotVisitSpecialist: true }), null);
  });

  it('no exige esos datos para perfiles sin sincronización inicial', () => {
    assert.equal(validateInitialHealthSync({
      required: false,
      hasBirthDate: false,
      collectMeasurements: false,
      hasDiagnosis: false,
      didNotVisitSpecialist: false,
    }), null);
  });
});

describe('peso', () => {
  it('acepta los límites y normaliza la coma decimal', () => {
    assert.equal(validateWeight(String(CHILD_WEIGHT_LIMITS_KG.min)).value, CHILD_WEIGHT_LIMITS_KG.min);
    assert.equal(validateWeight(String(CHILD_WEIGHT_LIMITS_KG.max)).value, CHILD_WEIGHT_LIMITS_KG.max);
    assert.equal(validateWeight('32,5').normalized, '32.5');
  });

  for (const value of ['', 'abc', '0', '-20', '9.99', '150.5', '1e2', '12.3.4', '30kg', '30.123']) {
    it(`rechaza ${JSON.stringify(value)}`, () => {
      const result = validateWeight(value);
      assert.equal(result.value, null);
      assert.ok(result.error);
    });
  }
});

describe('estatura', () => {
  it('acepta los límites', () => {
    assert.equal(validateHeight(String(CHILD_HEIGHT_LIMITS_CM.min)).value, CHILD_HEIGHT_LIMITS_CM.min);
    assert.equal(validateHeight(String(CHILD_HEIGHT_LIMITS_CM.max)).value, CHILD_HEIGHT_LIMITS_CM.max);
  });

  it('detecta una estatura escrita en metros', () => {
    const result = validateHeight('1.35');
    assert.equal(result.value, null);
    assert.match(result.error ?? '', /metros.*135/);
  });

  for (const value of ['', 'alto', '0', '-100', '79.9', '200.5', '12.3.4', '130cm']) {
    it(`rechaza ${JSON.stringify(value)}`, () => {
      const result = validateHeight(value);
      assert.equal(result.value, null);
      assert.ok(result.error);
    });
  }
});

describe('normalizeDecimal', () => {
  it('quita ceros y espacios sin cambiar el valor', () => {
    assert.equal(normalizeDecimal(' 32.50 '), '32.5');
    assert.equal(normalizeDecimal('030'), '30');
    assert.equal(normalizeDecimal('NaN'), null);
    assert.equal(normalizeDecimal('Infinity'), null);
  });
});

describe('perfil completo', () => {
  it('permite guardar datos válidos', () => {
    const result = validateChildProfile(valid);
    assert.equal(result.canSave, true);
    assert.deepEqual(result.errors, {});
    assert.deepEqual(result.normalized, { weight: '28.5', height: '128' });
  });

  it('señala cada campo vacío por separado', () => {
    const result = validateChildProfile({ age: '', weight: '', height: '', collectMeasurements: true });
    assert.equal(result.canSave, false);
    assert.ok(result.errors.age);
    assert.ok(result.errors.weight);
    assert.ok(result.errors.height);
  });

  it('un error en un campo no afecta a los demás', () => {
    const result = validateChildProfile({ ...valid, weight: 'abc' });
    assert.ok(result.errors.weight);
    assert.equal(result.errors.age, undefined);
    assert.equal(result.errors.height, undefined);
    assert.equal(result.heightCm, 128);
  });

  it('permite no recopilar peso ni estatura, pero sigue pidiendo la edad', () => {
    const skipped = validateChildProfile({ age: '8', weight: '', height: '', collectMeasurements: false });
    assert.equal(skipped.canSave, true);
    assert.deepEqual(skipped.normalized, { weight: '', height: '' });
    assert.equal(validateChildProfile({ age: '', weight: '', height: '', collectMeasurements: false }).canSave, false);
  });

  it('no guarda valores anteriores cuando se deja de recopilar', () => {
    const result = validateChildProfile({ ...valid, collectMeasurements: false });
    assert.deepEqual(result.normalized, { weight: '', height: '' });
  });

  it('pide confirmar un peso poco habitual para la edad', () => {
    const result = validateChildProfile({ ...valid, age: '6', weight: '90' });
    assert.equal(result.canSave, false);
    assert.deepEqual(result.needsConfirmation, ['weight']);
    assert.equal(result.errors.weight, undefined);
  });

  it('pide confirmar una estatura poco habitual para la edad', () => {
    const result = validateChildProfile({ ...valid, age: '4', height: '170', weight: '20' });
    assert.deepEqual(result.needsConfirmation, ['height']);
  });

  it('acepta el valor poco habitual solo después de confirmarlo', () => {
    const result = validateChildProfile({ ...valid, age: '6', weight: '90', confirmedUnusual: { weight: '90' } });
    assert.equal(result.canSave, true);
    assert.ok(result.unusual.weight);
  });

  it('la confirmación deja de valer si el dato cambia', () => {
    const result = validateChildProfile({ ...valid, age: '6', weight: '91', confirmedUnusual: { weight: '90' } });
    assert.equal(result.canSave, false);
    assert.deepEqual(result.needsConfirmation, ['weight']);
  });

  it('el aviso no da diagnósticos ni recomendaciones', () => {
    const message = validateChildProfile({ ...valid, age: '6', weight: '90' }).unusual.weight ?? '';
    assert.doesNotMatch(message, /sobrepeso|obesidad|bajo peso|desnutri|dieta|debe(ría)? (bajar|subir)/i);
    assert.match(message, /no es una evaluación de salud/i);
  });

  it('hay un rango de captura para cada edad permitida, dentro de los límites generales', () => {
    for (let age = CHILD_AGE_LIMITS.min; age <= CHILD_AGE_LIMITS.max; age += 1) {
      const range = USUAL_CAPTURE_RANGES[age];
      assert.ok(range, `falta la edad ${age}`);
      assert.ok(range.weightKg[0] >= CHILD_WEIGHT_LIMITS_KG.min && range.weightKg[1] <= CHILD_WEIGHT_LIMITS_KG.max);
      assert.ok(range.heightCm[0] >= CHILD_HEIGHT_LIMITS_CM.min && range.heightCm[1] <= CHILD_HEIGHT_LIMITS_CM.max);
    }
  });
});
