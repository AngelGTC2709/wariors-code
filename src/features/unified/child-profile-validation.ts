// Validación de captura del perfil infantil. Sirve solo para detectar errores al escribir:
// no evalúa salud, no calcula estado nutricional y no recomienda cambios de peso o estatura.
// Este módulo no importa nada para poder probarse directamente con `npm test`.

export const CHILD_AGE_LIMITS = { min: 3, max: 17 } as const;
export const CHILD_WEIGHT_LIMITS_KG = { min: 10, max: 150 } as const;
export const CHILD_HEIGHT_LIMITS_CM = { min: 80, max: 200 } as const;

type UsualRange = { weightKg: readonly [number, number]; heightCm: readonly [number, number] };

// Rangos amplios a propósito: un valor fuera de ellos solo pide confirmar que se escribió bien.
// NO son una referencia de crecimiento ni deben mostrarse como "normal" o "anormal".
export const USUAL_CAPTURE_RANGES: Readonly<Record<number, UsualRange>> = {
  3: { weightKg: [10, 24], heightCm: [85, 110] },
  4: { weightKg: [11, 28], heightCm: [92, 118] },
  5: { weightKg: [13, 34], heightCm: [98, 125] },
  6: { weightKg: [14, 40], heightCm: [103, 133] },
  7: { weightKg: [16, 48], heightCm: [108, 140] },
  8: { weightKg: [18, 56], heightCm: [113, 146] },
  9: { weightKg: [20, 65], heightCm: [118, 152] },
  10: { weightKg: [22, 75], heightCm: [122, 158] },
  11: { weightKg: [24, 85], heightCm: [127, 165] },
  12: { weightKg: [27, 95], heightCm: [132, 172] },
  13: { weightKg: [30, 105], heightCm: [137, 180] },
  14: { weightKg: [33, 115], heightCm: [142, 187] },
  15: { weightKg: [36, 125], heightCm: [146, 192] },
  16: { weightKg: [38, 130], heightCm: [148, 195] },
  17: { weightKg: [40, 135], heightCm: [149, 197] },
};

export type MeasurementField = 'weight' | 'height';
export type ChildProfileField = 'age' | MeasurementField;

export type ChildProfileInput = {
  /** Edad en años tal como se escribió (o calculada desde la fecha de nacimiento). */
  age: string;
  weight: string;
  height: string;
  /** false si la persona tutora decidió no registrar peso ni estatura. */
  collectMeasurements: boolean;
  /** Valores poco habituales que la persona tutora ya confirmó, ya normalizados. */
  confirmedUnusual?: Partial<Record<MeasurementField, string>>;
};

export type ChildProfileValidation = {
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  /** Valores listos para guardar: punto decimal y sin espacios; vacíos si no se recopilan. */
  normalized: { weight: string; height: string };
  errors: Partial<Record<ChildProfileField, string>>;
  /** Valores válidos pero poco habituales para la edad. */
  unusual: Partial<Record<MeasurementField, string>>;
  /** Campos poco habituales que todavía no se han confirmado. */
  needsConfirmation: MeasurementField[];
  canSave: boolean;
};

const DECIMAL_FORMAT = /^\d{1,3}(?:[.,]\d{1,2})?$/;

/** Convierte "32,5" en "32.5". Devuelve null si el formato no es un número decimal simple. */
export function normalizeDecimal(text: string): string | null {
  const value = text.trim();
  if (!DECIMAL_FORMAT.test(value)) return null;
  return String(Number(value.replace(',', '.')));
}

export function validateAge(text: string): { value: number | null; error?: string } {
  const value = text.trim();
  const range = `entre ${CHILD_AGE_LIMITS.min} y ${CHILD_AGE_LIMITS.max} años`;
  if (!value) return { value: null, error: `Escribe la edad (${range}).` };
  if (!/^\d{1,3}$/.test(value)) return { value: null, error: `Escribe la edad solo con números enteros, ${range}.` };
  const age = Number(value);
  if (age < CHILD_AGE_LIMITS.min || age > CHILD_AGE_LIMITS.max) {
    return { value: null, error: `La edad debe estar ${range}.` };
  }
  return { value: age };
}

export function validateWeight(text: string): { value: number | null; normalized: string; error?: string } {
  const { min, max } = CHILD_WEIGHT_LIMITS_KG;
  if (!text.trim()) return { value: null, normalized: '', error: `Escribe el peso en kilogramos (${min} a ${max} kg).` };
  const normalized = normalizeDecimal(text);
  if (normalized === null) return { value: null, normalized: '', error: 'Escribe el peso solo con números, por ejemplo 32.5.' };
  const value = Number(normalized);
  if (value < min || value > max) return { value: null, normalized: '', error: `El peso debe estar entre ${min} y ${max} kg.` };
  return { value, normalized };
}

export function validateHeight(text: string): { value: number | null; normalized: string; error?: string } {
  const { min, max } = CHILD_HEIGHT_LIMITS_CM;
  if (!text.trim()) return { value: null, normalized: '', error: `Escribe la estatura en centímetros (${min} a ${max} cm).` };
  const normalized = normalizeDecimal(text);
  if (normalized === null) return { value: null, normalized: '', error: 'Escribe la estatura solo con números, por ejemplo 135.' };
  const value = Number(normalized);
  if (value > 0 && value < 3) {
    return { value: null, normalized: '', error: `Parece que está en metros. Escríbela en centímetros, por ejemplo ${Math.round(value * 100)}.` };
  }
  if (value < min || value > max) return { value: null, normalized: '', error: `La estatura debe estar entre ${min} y ${max} cm.` };
  return { value, normalized };
}

function unusualMessage(age: number): string {
  return `Es un valor poco habitual para ${age} años. Revisa que esté bien escrito o confírmalo. Esto no es una evaluación de salud.`;
}

export function validateChildProfile(input: ChildProfileInput): ChildProfileValidation {
  const errors: ChildProfileValidation['errors'] = {};
  const unusual: ChildProfileValidation['unusual'] = {};
  const age = validateAge(input.age);
  if (age.error) errors.age = age.error;

  let weightKg: number | null = null;
  let heightCm: number | null = null;
  const normalized = { weight: '', height: '' };

  if (input.collectMeasurements) {
    const weight = validateWeight(input.weight);
    const height = validateHeight(input.height);
    if (weight.error) errors.weight = weight.error;
    if (height.error) errors.height = height.error;
    weightKg = weight.value;
    heightCm = height.value;
    normalized.weight = weight.normalized;
    normalized.height = height.normalized;

    const usual = age.value === null ? undefined : USUAL_CAPTURE_RANGES[age.value];
    if (usual && age.value !== null) {
      if (weightKg !== null && (weightKg < usual.weightKg[0] || weightKg > usual.weightKg[1])) {
        unusual.weight = unusualMessage(age.value);
      }
      if (heightCm !== null && (heightCm < usual.heightCm[0] || heightCm > usual.heightCm[1])) {
        unusual.height = unusualMessage(age.value);
      }
    }
  }

  const needsConfirmation = (Object.keys(unusual) as MeasurementField[])
    .filter(field => input.confirmedUnusual?.[field] !== normalized[field]);

  return {
    age: age.value,
    weightKg,
    heightCm,
    normalized,
    errors,
    unusual,
    needsConfirmation,
    canSave: Object.keys(errors).length === 0 && needsConfirmation.length === 0,
  };
}
