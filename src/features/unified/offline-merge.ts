// Reglas puras del modo sin conexión: detectar fallas de red y combinar cambios hechos sin
// internet con lo que otro dispositivo guardó mientras tanto. No importa nada para probarse con `npm test`.

const NETWORK_PATTERN = /network request failed|failed to fetch|networkerror|network error|load failed|fetch failed|internet connection appears to be offline|timed out|timeout|offline/i;

/** true si el error viene de no tener conexión (y no de un dato inválido o un permiso). */
export function isNetworkFailure(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (typeof current === 'string') return NETWORK_PATTERN.test(current);
    if (typeof current !== 'object') return false;
    const record = current as Record<string, unknown>;
    if (record.name === 'AuthRetryableFetchError') return true;
    const text = [record.message, record.details, record.hint].filter(part => typeof part === 'string').join(' ');
    if (NETWORK_PATTERN.test(text)) return true;
    current = record.originalError ?? record.cause;
  }
  return false;
}

type PlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is PlainObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a).filter(key => a[key] !== undefined);
    const otherKeys = Object.keys(b).filter(key => b[key] !== undefined);
    return keys.length === otherKeys.length && keys.every(key => deepEqual(a[key], b[key]));
  }
  return false;
}

// Contadores que se suman: si los dos dispositivos agregaron agua o puntos, se conservan ambos aumentos.
const ADDITIVE_KEYS = new Set(['points', 'water']);

const hasId = (value: unknown): value is PlainObject & { id: string } =>
  isPlainObject(value) && typeof value.id === 'string';
const isPrimitive = (value: unknown) => ['string', 'number', 'boolean'].includes(typeof value);

function mergeObjects(base: PlainObject, local: PlainObject, remote: PlainObject): PlainObject {
  const keys = [...new Set([...Object.keys(remote), ...Object.keys(local), ...Object.keys(base)])];
  const result: PlainObject = {};
  for (const key of keys) {
    const value = mergeValue(base[key], local[key], remote[key], key);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function mergeArrays(base: unknown[], local: unknown[], remote: unknown[]): unknown[] {
  const all = [...base, ...local, ...remote];
  if (all.length && all.every(hasId)) {
    const find = (list: unknown[], id: string) => list.find(item => hasId(item) && item.id === id);
    const ids = [...new Set([...remote, ...local].map(item => (item as { id: string }).id))];
    return ids
      .map(id => mergeValue(find(base, id), find(local, id), find(remote, id)))
      .filter(item => item !== undefined);
  }
  if (all.every(isPrimitive)) {
    // Conjunto de tres vías: se respetan lo que agregó y lo que quitó cada lado.
    const removedLocally = base.filter(item => !local.includes(item));
    const addedLocally = local.filter(item => !base.includes(item) && !remote.includes(item));
    return [...remote.filter(item => !removedLocally.includes(item)), ...addedLocally];
  }
  return local;
}

function mergeValue(base: unknown, local: unknown, remote: unknown, key?: string): unknown {
  if (deepEqual(local, remote)) return local;
  if (deepEqual(local, base)) return remote;
  if (deepEqual(remote, base)) return local;
  // Ambos lados cambiaron. Si uno borró y el otro editó, se conserva lo editado para no perder datos.
  if (local === undefined) return remote;
  if (remote === undefined) return local;
  if (isPlainObject(local) && isPlainObject(remote)) {
    return mergeObjects(isPlainObject(base) ? base : {}, local, remote);
  }
  if (Array.isArray(local) && Array.isArray(remote)) {
    return mergeArrays(Array.isArray(base) ? base : [], local, remote);
  }
  if (key && ADDITIVE_KEYS.has(key) && typeof local === 'number' && typeof remote === 'number' && typeof base === 'number') {
    return Math.max(0, remote + (local - base));
  }
  // Mismo dato cambiado distinto en ambos lados: gana el de este dispositivo, que es el más reciente.
  return local;
}

/**
 * Combina los cambios locales con los remotos tomando como referencia la última versión que
 * ambos compartían (`base`). Sin base, todo lo distinto se trata como cambiado en ambos lados.
 */
export function mergeThreeWay<T>(base: T | null | undefined, local: T, remote: T): T {
  return mergeValue(base ?? {}, local, remote) as T;
}
