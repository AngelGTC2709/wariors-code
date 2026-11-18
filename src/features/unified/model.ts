import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChildTheme = 'nina' | 'nino';
export type AccountRole = 'child' | 'tutor';
export type AccountSource = 'nutribot' | 'warrior-kids' | 'unified';
export type ActivityStatus = 'pending' | 'approved';

export type NutriUser = {
  nombre: string;
  correo: string;
  rol: 'menor' | 'tutor';
};

export type NutriChild = {
  id: string;
  databaseChildId?: number;
  nombre: string;
  genero: ChildTheme;
  peso: string;
  altura: string;
  edad?: string;
  nacimiento?: string;
  alergias: string[];
  noGusta: string[];
  otrasAlergias: string;
  otrosNoGusta: string;
  gusta?: string[];
  otrosGusta?: string;
  dictamen?: 'sano' | 'sobrepeso' | 'obesidad' | 'prediabetes' | 'diabetes2';
};

export type NutriData = {
  usuarios: NutriUser[];
  temaId: ChildTheme;
  ninos: NutriChild[];
};

export type WarriorDailyLog = {
  activities: Record<string, ActivityStatus>;
  water: number;
  foodGroups: string[];
  mood: string | null;
};

export type WarriorChild = {
  id: string;
  name: string;
  avatar: string;
  theme?: ChildTheme;
  points: number;
  badges: string[];
  days: Record<string, WarriorDailyLog>;
};

export type WarriorData = {
  tutor: { name: string; email: string } | null;
  children: WarriorChild[];
  selectedChildId: string | null;
  weeklyMenu: Record<string, string>;
  remindersEnabled: boolean;
  waterGoal: number;
  screenLimitMinutes: number;
};

export type LocalAccount = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  source: AccountSource;
};

export type UnifiedActivityLog = {
  status: ActivityStatus;
  duration: number;
  evidenceUri: string | null;
};

export type UnifiedDailyLog = {
  water: number;
  foodGroups: string[];
  mood: string | null;
  sleepHours: number | null;
  activities: Record<string, UnifiedActivityLog>;
};

export type ChildProgress = {
  points: number;
  badges: string[];
};

export type ProfileLink = {
  id: string;
  nutriId: string;
  warriorId: string;
  displayName: string;
  theme: ChildTheme;
};

export type AvatarSelection = {
  piel: number;
  cabello: number;
  ropa: number;
  accesorio: number;
  fondo: number;
};

export type WeeklyMeals = {
  desayuno: string | null;
  comida: string | null;
  cena: string | null;
};

// Gestión por perfil (todos los perfiles del tutor, sin depender de la tabla `hijos`).
// Los retos y recompensas se definen en Supabase; aquí se guarda a quién aplican y su avance.
export type FamilyAssignmentStatus = 'asignado' | 'completado' | 'verificado' | 'rechazado';
export type FamilyAssignment = {
  id: string;
  challengeId: number;
  progressKey: string;
  status: FamilyAssignmentStatus;
  assignedAt: string;
  updatedAt: string;
  pointsAwarded?: number;
};
export type RewardRequestStatus = 'solicitado' | 'entregado' | 'cancelado';
export type RewardRequest = {
  id: string;
  rewardId: number;
  progressKey: string;
  cost: number;
  status: RewardRequestStatus;
  requestedAt: string;
  updatedAt: string;
};
export type MealPlanMeal = 'desayuno' | 'colacion' | 'comida' | 'cena';
export type MealPlanRecipe = { date: string; meal: MealPlanMeal; recipeId: number };
export type FamilyMealPlan = {
  id: string;
  progressKey: string;
  calories: number;
  starts: string;
  ends: string;
  recipes: MealPlanRecipe[];
};

export type UnifiedData = {
  version: 1;
  nutribot: NutriData;
  warriorKids: WarriorData;
  accounts: LocalAccount[];
  profileLinks: ProfileLink[];
  archivedProfiles: string[];
  weeklyMeals: Record<string, WeeklyMeals>;
  avatarSelections: Record<string, AvatarSelection>;
  dailyLogs: Record<string, Record<string, UnifiedDailyLog>>;
  childProgress: Record<string, ChildProgress>;
  missionClaims: Record<string, Record<string, string[]>>;
  tutorPin: string | null;
  progressSharingEnabled: boolean;
  soundEnabled?: boolean;
  /** Apariencia: 'light' (por defecto), 'dark' o 'system' (según el teléfono). */
  themeMode?: 'system' | 'light' | 'dark';
  familyAssignments?: FamilyAssignment[];
  rewardRequests?: RewardRequest[];
  mealPlans?: FamilyMealPlan[];
};

export const NUTRI_STORAGE_KEY = 'nutribot-familiar-local-v1';
export const WARRIOR_STORAGE_KEY = 'warrior-kids-local-v1';
export const UNIFIED_STORAGE_KEY = 'familywellness-unified-local-v1';

const EMPTY_NUTRI_DATA: NutriData = {
  usuarios: [],
  temaId: 'nina',
  ninos: [],
};

const EMPTY_WARRIOR_DATA: WarriorData = {
  tutor: null,
  children: [],
  selectedChildId: null,
  weeklyMenu: {},
  remindersEnabled: false,
  waterGoal: 5,
  screenLimitMinutes: 30,
};

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const AVATAR_CATEGORIES = ['piel', 'cabello', 'ropa', 'accesorio', 'fondo'] as const;
const ACTIVITY_DURATIONS: Record<string, number> = {
  dance: 10,
  animals: 8,
  walk: 15,
  stretch: 5,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(item => typeof item === 'string');
}

function isNutriUser(value: unknown): value is NutriUser {
  if (!isRecord(value)) return false;
  return (
    typeof value.nombre === 'string' &&
    typeof value.correo === 'string' &&
    (value.rol === 'menor' || value.rol === 'tutor')
  );
}

function isNutriChild(value: unknown): value is NutriChild {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    (value.databaseChildId === undefined ||
      (typeof value.databaseChildId === 'number' && Number.isSafeInteger(value.databaseChildId) && value.databaseChildId > 0)) &&
    typeof value.nombre === 'string' &&
    (value.genero === 'nina' || value.genero === 'nino') &&
    typeof value.peso === 'string' &&
    typeof value.altura === 'string' &&
    (value.edad === undefined || typeof value.edad === 'string') &&
    (value.nacimiento === undefined || typeof value.nacimiento === 'string') &&
    isStringArray(value.alergias) &&
    isStringArray(value.noGusta) &&
    typeof value.otrasAlergias === 'string' &&
    typeof value.otrosNoGusta === 'string' &&
    (value.gusta === undefined || isStringArray(value.gusta)) &&
    (value.otrosGusta === undefined || typeof value.otrosGusta === 'string') &&
    (value.dictamen === undefined || value.dictamen === 'sano' || value.dictamen === 'sobrepeso' ||
      value.dictamen === 'obesidad' || value.dictamen === 'prediabetes' || value.dictamen === 'diabetes2')
  );
}

function isNutriData(value: unknown): value is NutriData {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.usuarios) &&
    value.usuarios.every(isNutriUser) &&
    (value.temaId === 'nina' || value.temaId === 'nino') &&
    Array.isArray(value.ninos) &&
    value.ninos.every(isNutriChild)
  );
}

function isWarriorDailyLog(value: unknown): value is WarriorDailyLog {
  if (!isRecord(value) || !isRecord(value.activities)) return false;
  return (
    Object.values(value.activities).every(status => status === 'pending' || status === 'approved') &&
    typeof value.water === 'number' &&
    Number.isFinite(value.water) &&
    isStringArray(value.foodGroups) &&
    (value.mood === null || typeof value.mood === 'string')
  );
}

function isWarriorChild(value: unknown): value is WarriorChild {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.avatar === 'string' &&
    (value.theme === undefined || value.theme === 'nina' || value.theme === 'nino') &&
    typeof value.points === 'number' &&
    Number.isFinite(value.points) &&
    isStringArray(value.badges) &&
    isRecord(value.days) &&
    Object.values(value.days).every(isWarriorDailyLog)
  );
}

function isWarriorData(value: unknown): value is WarriorData {
  if (!isRecord(value)) return false;
  const validTutor =
    value.tutor === null ||
    (isRecord(value.tutor) &&
      typeof value.tutor.name === 'string' &&
      typeof value.tutor.email === 'string');
  return (
    validTutor &&
    Array.isArray(value.children) &&
    value.children.every(isWarriorChild) &&
    (value.selectedChildId === null || typeof value.selectedChildId === 'string') &&
    isStringRecord(value.weeklyMenu) &&
    typeof value.remindersEnabled === 'boolean' &&
    typeof value.waterGoal === 'number' &&
    Number.isFinite(value.waterGoal) &&
    typeof value.screenLimitMinutes === 'number' &&
    Number.isFinite(value.screenLimitMinutes)
  );
}

function isLocalAccount(value: unknown): value is LocalAccount {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (value.role === 'child' || value.role === 'tutor') &&
    (value.source === 'nutribot' || value.source === 'warrior-kids' || value.source === 'unified')
  );
}

function isProfileLink(value: unknown): value is ProfileLink {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.nutriId === 'string' &&
    typeof value.warriorId === 'string' &&
    typeof value.displayName === 'string' &&
    (value.theme === 'nina' || value.theme === 'nino')
  );
}

function isAvatarSelection(value: unknown): value is AvatarSelection {
  if (!isRecord(value)) return false;
  return AVATAR_CATEGORIES.every(category => {
    const index = value[category];
    // El catálogo del avatar (avatar.tsx) crece agregando elementos al final; 15 deja margen.
    return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index <= 15;
  });
}

function isWeeklyMeals(value: unknown): value is WeeklyMeals {
  if (!isRecord(value)) return false;
  return ['desayuno', 'comida', 'cena'].every(
    meal => value[meal] === null || typeof value[meal] === 'string',
  );
}

function isUnifiedActivityLog(value: unknown): value is UnifiedActivityLog {
  if (!isRecord(value)) return false;
  return (
    (value.status === 'pending' || value.status === 'approved') &&
    typeof value.duration === 'number' &&
    Number.isFinite(value.duration) &&
    value.duration >= 0 &&
    (value.evidenceUri === null || typeof value.evidenceUri === 'string')
  );
}

function isUnifiedDailyLog(value: unknown): value is UnifiedDailyLog {
  if (!isRecord(value) || !isRecord(value.activities)) return false;
  return (
    typeof value.water === 'number' &&
    Number.isFinite(value.water) &&
    isStringArray(value.foodGroups) &&
    (value.mood === null || typeof value.mood === 'string') &&
    (value.sleepHours === null ||
      (typeof value.sleepHours === 'number' &&
        Number.isFinite(value.sleepHours) &&
        value.sleepHours >= 0 &&
        value.sleepHours <= 24)) &&
    Object.values(value.activities).every(isUnifiedActivityLog)
  );
}

function isChildProgress(value: unknown): value is ChildProgress {
  if (!isRecord(value)) return false;
  return (
    typeof value.points === 'number' &&
    Number.isFinite(value.points) &&
    isStringArray(value.badges)
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isSafeCount = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function isFamilyAssignment(value: unknown): value is FamilyAssignment {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    isSafeCount(value.challengeId) &&
    typeof value.progressKey === 'string' &&
    ['asignado', 'completado', 'verificado', 'rechazado'].includes(value.status as string) &&
    typeof value.assignedAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    (value.pointsAwarded === undefined || isSafeCount(value.pointsAwarded));
}

function isRewardRequest(value: unknown): value is RewardRequest {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    isSafeCount(value.rewardId) &&
    typeof value.progressKey === 'string' &&
    isSafeCount(value.cost) &&
    ['solicitado', 'entregado', 'cancelado'].includes(value.status as string) &&
    typeof value.requestedAt === 'string' &&
    typeof value.updatedAt === 'string';
}

function isFamilyMealPlan(value: unknown): value is FamilyMealPlan {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.progressKey === 'string' &&
    isSafeCount(value.calories) &&
    typeof value.starts === 'string' && ISO_DATE.test(value.starts) &&
    typeof value.ends === 'string' && ISO_DATE.test(value.ends) &&
    Array.isArray(value.recipes) &&
    value.recipes.every(recipe => isRecord(recipe) &&
      typeof recipe.date === 'string' && ISO_DATE.test(recipe.date) &&
      ['desayuno', 'colacion', 'comida', 'cena'].includes(recipe.meal as string) &&
      isSafeCount(recipe.recipeId));
}

const isOptionalList = <T,>(value: unknown, check: (item: unknown) => item is T) =>
  value === undefined || (Array.isArray(value) && value.every(check));

export function isUnifiedData(value: unknown): value is UnifiedData {
  if (!isRecord(value)) return false;
  if (!(
    value.version === 1 &&
    isNutriData(value.nutribot) &&
    isWarriorData(value.warriorKids) &&
    Array.isArray(value.accounts) &&
    value.accounts.every(isLocalAccount) &&
    Array.isArray(value.profileLinks) &&
    value.profileLinks.every(isProfileLink) &&
    Array.isArray(value.archivedProfiles) &&
    isStringArray(value.archivedProfiles) &&
    isRecord(value.weeklyMeals) &&
    Object.values(value.weeklyMeals).every(isWeeklyMeals) &&
    isRecord(value.avatarSelections) &&
    Object.values(value.avatarSelections).every(isAvatarSelection) &&
    isRecord(value.dailyLogs) &&
    Object.values(value.dailyLogs).every(
      logs => isRecord(logs) && Object.values(logs).every(isUnifiedDailyLog),
    ) &&
    isRecord(value.childProgress) &&
    Object.values(value.childProgress).every(isChildProgress) &&
    isRecord(value.missionClaims) &&
    Object.values(value.missionClaims).every(
      dates => isRecord(dates) && Object.values(dates).every(isStringArray),
    ) &&
    (value.tutorPin === null || (typeof value.tutorPin === 'string' && /^\d{4,6}$/.test(value.tutorPin))) &&
    typeof value.progressSharingEnabled === 'boolean' &&
    (value.soundEnabled === undefined || typeof value.soundEnabled === 'boolean') &&
    (value.themeMode === undefined || value.themeMode === 'system' || value.themeMode === 'light' || value.themeMode === 'dark') &&
    isOptionalList(value.familyAssignments, isFamilyAssignment) &&
    isOptionalList(value.rewardRequests, isRewardRequest) &&
    isOptionalList(value.mealPlans, isFamilyMealPlan)
  )) return false;

  const nutriIds = new Set(value.nutribot.ninos.map(child => child.id));
  const warriorIds = new Set(value.warriorKids.children.map(child => child.id));
  const linkIds = new Set<string>();
  const linkedNutriIds = new Set<string>();
  const linkedWarriorIds = new Set<string>();
  for (const link of value.profileLinks) {
    if (
      !nutriIds.has(link.nutriId) ||
      !warriorIds.has(link.warriorId) ||
      linkIds.has(link.id) ||
      linkedNutriIds.has(link.nutriId) ||
      linkedWarriorIds.has(link.warriorId)
    ) return false;
    linkIds.add(link.id);
    linkedNutriIds.add(link.nutriId);
    linkedWarriorIds.add(link.warriorId);
  }
  return new Set(value.archivedProfiles).size === value.archivedProfiles.length;
}

function parseData(raw: string, key: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON inválido.';
    throw new Error(`No se pudo interpretar el almacenamiento “${key}”: ${message}`);
  }
}

function initialWeeklyMeals(warrior: WarriorData): Record<string, WeeklyMeals> {
  return Object.fromEntries(
    WEEKDAYS.map(day => [
      day,
      {
        desayuno: null,
        comida: warrior.weeklyMenu[day] ?? null,
        cena: null,
      },
    ]),
  );
}

function initialDailyLogs(warrior: WarriorData): Record<string, Record<string, UnifiedDailyLog>> {
  return Object.fromEntries(
    warrior.children.map(child => [
      profileRef('warrior-kids', child.id),
      Object.fromEntries(
        Object.entries(child.days).map(([date, day]) => [
          date,
          {
            water: day.water,
            foodGroups: [...day.foodGroups],
            mood: day.mood,
            sleepHours: null,
            activities: Object.fromEntries(
              Object.entries(day.activities).map(([activityId, status]) => [
                activityId,
                {
                  status,
                  duration: ACTIVITY_DURATIONS[activityId] ?? 0,
                  evidenceUri: null,
                },
              ]),
            ),
          },
        ]),
      ),
    ]),
  );
}

function initialChildProgress(nutri: NutriData, warrior: WarriorData): Record<string, ChildProgress> {
  const progress: Record<string, ChildProgress> = {};
  for (const child of nutri.ninos) {
    progress[profileRef('nutribot', child.id)] = { points: 0, badges: [] };
  }
  for (const child of warrior.children) {
    progress[profileRef('warrior-kids', child.id)] = {
      points: child.points,
      badges: [...child.badges],
    };
  }
  return progress;
}

function accountsFromSources(nutri: NutriData, warrior: WarriorData): LocalAccount[] {
  const accounts: LocalAccount[] = nutri.usuarios.map((user, index) => ({
    id: `nutribot-${index}-${user.correo}`,
    name: user.nombre,
    email: user.correo.trim().toLowerCase(),
    role: user.rol === 'tutor' ? 'tutor' : 'child',
    source: 'nutribot',
  }));
  if (warrior.tutor) {
    accounts.push({
      id: `warrior-kids-${warrior.tutor.email.trim().toLowerCase()}`,
      name: warrior.tutor.name,
      email: warrior.tutor.email.trim().toLowerCase(),
      role: 'tutor',
      source: 'warrior-kids',
    });
  }
  return accounts;
}

export function createEmptyUnifiedData(account: LocalAccount): UnifiedData {
  const nutribot: NutriData = {
    ...EMPTY_NUTRI_DATA,
    usuarios: [{ nombre: account.name, correo: account.email, rol: 'tutor' }],
  };
  const warriorKids: WarriorData = {
    ...EMPTY_WARRIOR_DATA,
    tutor: { name: account.name, email: account.email },
  };

  return {
    version: 1,
    nutribot,
    warriorKids,
    accounts: [account],
    profileLinks: [],
    archivedProfiles: [],
    weeklyMeals: initialWeeklyMeals(warriorKids),
    avatarSelections: {},
    dailyLogs: {},
    childProgress: {},
    missionClaims: {},
    tutorPin: null,
    progressSharingEnabled: true,
    soundEnabled: false,
    familyAssignments: [],
    rewardRequests: [],
    mealPlans: [],
  };
}

export async function clearLegacyLocalData(): Promise<void> {
  await AsyncStorage.multiRemove([
    NUTRI_STORAGE_KEY,
    WARRIOR_STORAGE_KEY,
    UNIFIED_STORAGE_KEY,
  ]);
}

export async function loadUnifiedData(): Promise<{ data: UnifiedData; migrated: boolean }> {
  const existing = await AsyncStorage.getItem(UNIFIED_STORAGE_KEY);
  if (existing !== null) {
    const parsed = parseData(existing, UNIFIED_STORAGE_KEY);
    if (!isUnifiedData(parsed)) {
      throw new Error('Los datos unificados no tienen el formato esperado. Se conservaron las fuentes originales.');
    }
    return { data: parsed, migrated: false };
  }

  const [nutriRaw, warriorRaw] = await Promise.all([
    AsyncStorage.getItem(NUTRI_STORAGE_KEY),
    AsyncStorage.getItem(WARRIOR_STORAGE_KEY),
  ]);
  const parsedNutri = nutriRaw === null ? EMPTY_NUTRI_DATA : parseData(nutriRaw, NUTRI_STORAGE_KEY);
  const parsedWarrior = warriorRaw === null ? EMPTY_WARRIOR_DATA : parseData(warriorRaw, WARRIOR_STORAGE_KEY);

  if (!isNutriData(parsedNutri)) {
    throw new Error(`Los datos de NutriBot no tienen el formato esperado. Se conservaron en “${NUTRI_STORAGE_KEY}”.`);
  }
  if (!isWarriorData(parsedWarrior)) {
    throw new Error(`Los datos de Warrior Kids no tienen el formato esperado. Se conservaron en “${WARRIOR_STORAGE_KEY}”.`);
  }

  return {
    data: {
      version: 1,
      nutribot: parsedNutri,
      warriorKids: parsedWarrior,
      accounts: accountsFromSources(parsedNutri, parsedWarrior),
      profileLinks: [],
      archivedProfiles: [],
      weeklyMeals: initialWeeklyMeals(parsedWarrior),
      avatarSelections: {},
      dailyLogs: initialDailyLogs(parsedWarrior),
      childProgress: initialChildProgress(parsedNutri, parsedWarrior),
      missionClaims: {},
      tutorPin: null,
      progressSharingEnabled: true,
      soundEnabled: false,
    },
    migrated: true,
  };
}

export async function saveUnifiedData(data: UnifiedData): Promise<void> {
  if (!isUnifiedData(data)) {
    throw new Error('No se guardaron los cambios porque el formato nuevo no pasó la validación.');
  }
  await AsyncStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(data));
}

export const createId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function profileRef(source: 'nutribot' | 'warrior-kids', id: string): string {
  return `${source}:${id}`;
}

export function activityEvidenceKey(childId: string, date: string, activityId: string): string {
  return `${childId}:${date}:${activityId}`;
}
