// Ayudas de formato para textos visibles en la app.

/** "1 día", "3 días". Si no se indica el plural, agrega "s". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Muestra una duración del catálogo en minutos sin repetir la unidad.
 * El catálogo trae textos como "20 a 30" o "45 a 60 en bloques de 15 a 20 min".
 */
export function formatMinutes(value: string | number, unit = 'min'): string {
  const text = String(value).trim();
  if (/\bmin(uto)?s?\b/i.test(text)) return text.replace(/\bmin(uto)?s?\b/gi, unit);
  if (/\(.*\)\s*$/.test(text)) return text.replace(/\s*(\(.*\))\s*$/, ` ${unit} $1`);
  return `${text} ${unit}`;
}
