import type { User } from '@supabase/supabase-js';

import type { Recipe } from '@/constants/warrior-kids';
import type {
  ActivityManagementSnapshot,
  NormalizedManagementSnapshot,
  PhysicalActivityCatalog,
} from '@/features/unified/cloud-data';
import { isUnifiedData, type AccountRole, type UnifiedData } from '@/features/unified/model';
import { encryptedStorage } from '@/lib/encrypted-storage';

// Copia cifrada del espacio familiar en el teléfono para abrir y usar la app sin internet.
// Es una copia de trabajo: la fuente de verdad sigue siendo padres.datos_app en Supabase.

export type OfflineCache = {
  format: 1;
  userId: string;
  /** Estado actual en este teléfono, incluidos los cambios que aún no se suben. */
  data: UnifiedData;
  /** Última versión confirmada por la nube; sirve para combinar cambios sin perder ninguno. */
  base: UnifiedData | null;
  baseVersion: number;
  pending: boolean;
  catalog: PhysicalActivityCatalog[];
  recipes: Recipe[];
  family: NormalizedManagementSnapshot | null;
  challengeActivities: ActivityManagementSnapshot | null;
  role: AccountRole;
  selectedProfileKey: string | null;
  savedAt: string;
};

const LAST_USER_KEY = 'wk_offline_last_user';
const cacheKey = (userId: string) => `wk_offline_${userId}`;

/** false en web: allí no se guarda nada en el dispositivo. */
export const offlineCacheAvailable = encryptedStorage !== null;

function parse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadOfflineCache(userId: string): Promise<OfflineCache | null> {
  if (!encryptedStorage) return null;
  const value = parse(await encryptedStorage.getItem(cacheKey(userId))) as Partial<OfflineCache> | null;
  if (
    !value ||
    value.format !== 1 ||
    value.userId !== userId ||
    !isUnifiedData(value.data) ||
    (value.base !== null && !isUnifiedData(value.base)) ||
    typeof value.baseVersion !== 'number' ||
    (value.role !== 'tutor' && value.role !== 'child')
  ) {
    return null;
  }
  return {
    ...value,
    pending: value.pending === true,
    catalog: Array.isArray(value.catalog) ? value.catalog : [],
    recipes: Array.isArray(value.recipes) ? value.recipes : [],
    family: value.family ?? null,
    challengeActivities: value.challengeActivities ?? null,
    selectedProfileKey: typeof value.selectedProfileKey === 'string' ? value.selectedProfileKey : null,
  } as OfflineCache;
}

export async function saveOfflineCache(cache: OfflineCache, user: User): Promise<void> {
  if (!encryptedStorage) return;
  const previous = parse(await encryptedStorage.getItem(LAST_USER_KEY)) as { id?: unknown } | null;
  // Si en este teléfono entra otra cuenta, se borra la copia de la anterior.
  if (previous && typeof previous.id === 'string' && previous.id !== user.id) {
    await encryptedStorage.removeItem(cacheKey(previous.id));
  }
  await encryptedStorage.setItem(cacheKey(cache.userId), JSON.stringify(cache));
  await encryptedStorage.setItem(LAST_USER_KEY, JSON.stringify(user));
}

/** Cuenta con la que se abrió la app la última vez; solo existe si no se cerró sesión. */
export async function loadOfflineUser(): Promise<User | null> {
  if (!encryptedStorage) return null;
  const value = parse(await encryptedStorage.getItem(LAST_USER_KEY)) as User | null;
  return value && typeof value.id === 'string' && typeof value.email === 'string' ? value : null;
}

export async function clearOfflineCache(userId: string): Promise<void> {
  if (!encryptedStorage) return;
  await encryptedStorage.removeItem(cacheKey(userId));
  await encryptedStorage.removeItem(LAST_USER_KEY);
}
