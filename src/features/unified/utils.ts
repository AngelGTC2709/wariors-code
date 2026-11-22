export function cleanText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function unique(values: string[]): string[] {
  return [...new Set(values)];
}

type UserFacingError = Error & { userFacing: true; originalError?: unknown };

/** Error cuyo mensaje ya está en español y se puede mostrar tal cual. */
export function userError(message: string, originalError?: unknown): Error {
  return Object.assign(new Error(message), { userFacing: true as const, originalError });
}

function isUserFacingError(error: unknown): error is UserFacingError {
  return error instanceof Error && (error as Partial<UserFacingError>).userFacing === true;
}

function rawErrorText(error: unknown): string {
  if (!error || typeof error !== 'object') return typeof error === 'string' ? error : '';
  const { message, code, status, statusCode } = error as Record<string, unknown>;
  return [message, code, status, statusCode].filter(part => part !== undefined && part !== null).join(' ');
}

const ERROR_REASONS: [RegExp, string][] = [
  [/network request failed|failed to fetch|fetch failed|networkerror|load failed|timed? ?out|aborted|offline/i, 'Revisa tu conexión a internet e inténtalo de nuevo.'],
  [/rate.?limit|too many requests|for security purposes|\b429\b/i, 'Hubo demasiados intentos; espera un momento e inténtalo de nuevo.'],
  [/same_password|different from the old password/i, 'La nueva contraseña debe ser distinta a la anterior.'],
  [/weak_password|password should (be|contain)/i, 'Elige una contraseña más segura.'],
  [/payload too large|entity too large|maximum allowed size|\b413\b/i, 'El archivo es demasiado grande.'],
  [/jwt|refresh token|session.*(missing|expired|not found)|not authenticated/i, 'Tu sesión expiró; vuelve a iniciar sesión.'],
  [/EXPO_PUBLIC_SUPABASE/, 'Falta la configuración de conexión de la app.'],
];

/** Explicación humana de un error técnico conocido, o null si no se reconoce. */
export function errorReason(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; current && depth < 3; depth += 1) {
    if (!isUserFacingError(current)) {
      const text = rawErrorText(current);
      const match = ERROR_REASONS.find(([pattern]) => pattern.test(text));
      if (match) return match[1];
    }
    current = isUserFacingError(current) ? current.originalError : undefined;
  }
  return null;
}

/** Mensaje para la persona usuaria: nunca expone el texto técnico del error. */
export function friendlyError(error: unknown, fallback: string): string {
  const base = isUserFacingError(error) ? error.message : fallback;
  const reason = errorReason(error);
  return reason ? `${base} ${reason}` : base;
}

/** Convierte "DD/MM/AAAA" a "AAAA-MM-DD"; devuelve null si no es una fecha real y pasada. */
export function parseBirthDate(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  if (date.getTime() > Date.now() || year < 1900) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function formatBirthDate(iso: string | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/** Inserta las diagonales mientras se escribe la fecha. */
export function maskBirthDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

export function ageFromBirth(iso: string | undefined, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age >= 0 ? age : null;
}
