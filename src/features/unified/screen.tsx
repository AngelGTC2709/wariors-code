import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { User } from '@supabase/supabase-js';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as Linking from 'expo-linking';
import { getNetworkStateAsync, useNetworkState } from 'expo-network';

import {
  ACTIVITIES,
  CHILD_AVATARS,
  RECIPES,
  WEEKDAYS,
  type Activity,
  type Recipe,
} from '@/constants/warrior-kids';
import type { AvatarKey } from '@/constants/family-wellness';
import { AVATAR_BACKGROUNDS, AVATAR_CATALOG, AvatarFigure, isUnlocked, SKIN_TONES, type AvatarPart } from '@/features/unified/avatar';
import { CHILD_MOODS, DIET_INGREDIENTS, EXERCISE_CATEGORIES, FAQ_ITEMS, FAMILY_DIET, FOOD_OPTIONS, colorsFor } from '@/features/unified/constants';
import {
  clearLegacyLocalData,
  isUnifiedData,
  type AccountRole,
  type AvatarSelection,
  type ChildProgress,
  type LocalAccount,
  type NutriChild,
  type ProfileLink,
  type UnifiedDailyLog,
  type UnifiedData,
  type FamilyAssignment,
  type FamilyAssignmentStatus,
  type WarriorChild,
  type WeeklyMeals,
} from '@/features/unified/model';
import {
  accountFromUser,
  deleteDatabaseChild,
  deleteEvidence,
  loadActivityManagement,
  loadDatabaseRecipes,
  loadPhysicalActivityCatalog,
  loadCloudData,
  loadNormalizedManagement,
  saveDatabaseChildProfile,
  saveCloudData,
  subscribeToCloudData,
  uploadEvidence,
  verifyTutorPassword,
  isVersionConflict,
  type ActivityManagementSnapshot,
  type NormalizedManagementSnapshot,
  type PhysicalActivityCatalog,
} from '@/features/unified/cloud-data';
import { AchievementCelebration, BottomBar, BottomSheet, ChallengeRow, FoodChip, HabitCard, HabitProgress, HeroCard, DaySteps, HomeGrid, HomeTile, NextStepCard, ListRow, ChartTitle, DonutChart, PillBar, WaterWeekChart, PillButton, SectionCard, TopBar, useReduceMotion } from '@/features/unified/design';
import { EvidencePhoto } from '@/features/unified/evidence-photo';
import {
  clearOfflineCache,
  loadOfflineCache,
  loadOfflineUser,
  offlineCacheAvailable,
  saveOfflineCache,
  type OfflineCache,
} from '@/features/unified/offline-cache';
import { isNetworkFailure, mergeThreeWay } from '@/features/unified/offline-merge';
import { LoadingScreen, SESSION_START_MS, useLoadingTransition, useLoadingVisibility } from '@/features/unified/loading';
import { DatabaseManagement, type FamilyActions } from '@/features/unified/database-management';
import { PlatoDelBuenComer, SelectedFoodPills } from '@/features/unified/plato';
import { SoundCue, SoundEffectsProvider, type SoundCueName } from '@/features/unified/sound-effects';
import { appThemeFor, BORDER, DARK_SECTION_TONES, FOOD_GROUP_COLORS, foodGroupColorsFor, RADIUS, resolveThemeMode, SHADOW, SPACE, THEMES, ThemeModeContext, tint, sharedFor, type ThemeMode } from '@/features/unified/tokens';
import { getSupabaseClient } from '@/lib/supabase';
import {
  AvatarIllustration,
  Button,
  Card,
  Field,
  Icon,
  ProgressMeter,
  IconWeightContext,
  SectionTitle,
  Tag,
  UI_STYLES,
  type AppIconName,
} from '@/features/unified/ui';
import { CHILD_AGE_LIMITS, validateChildProfile, validateInitialHealthSync, type MeasurementField } from '@/features/unified/child-profile-validation';
import { DateField } from '@/features/unified/date-field';
import {
  assignableProfiles,
  assignmentPointDelta,
  canApproveActivity,
  canChangeRewardRequest,
  canRegisterActivity,
  canRequestReward,
  challengeActivitySteps,
  claimOnce,
  nextChildStep,
  rewardBalance,
  rewardStockLeft,
} from '@/features/unified/progress-rules';
import { formatMinutes, plural } from '@/features/unified/format';
import { ageFromBirth, cleanText, errorReason, formatBirthDate, parseBirthDate, friendlyError, unique, userError } from '@/features/unified/utils';

type AppTab = 'Familia' | 'Recetas' | 'Menú' | 'Gestión' | 'Logros' | 'Ajustes' | 'Ayuda';
type ChildHomeSection = 'habitos' | 'movimiento';
type PhotoDraft = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};
const ACHIEVEMENT_INFO: Record<string, { title: string; icon: AppIconName; description: string }> = {
  'primer-reto': { title: 'Primer reto', icon: 'check', description: 'Completaste tu primer reto.' },
  'familia-en-equipo': { title: 'Familia en equipo', icon: 'tutor', description: 'Compartiste un avance con tu familia.' },
  actividad: { title: 'En movimiento', icon: 'activity', description: 'Registraste una actividad.' },
  mision: { title: 'Reto cumplido', icon: 'achievements', description: 'Terminaste un reto diario.' },
};
type UnifiedProfile = {
  key: string;
  progressKey: string;
  name: string;
  theme: 'nina' | 'nino';
  avatar: string;
  /** Sexo registrado; `theme` es solo la paleta de colores elegida. */
  sex: 'nina' | 'nino';
  nutri: NutriChild | null;
  warrior: WarriorChild | null;
  link: ProfileLink | null;
};
type ProfileDraft = {
  name: string;
  theme: 'nina' | 'nino';
  avatar: string;
  colorTheme: 'nina' | 'nino';
  birthDate: string;
  age: string;
  collectMeasurements: boolean;
  confirmedUnusual: Partial<Record<MeasurementField, string>>;
  weight: string;
  height: string;
  allergies: string[];
  noLikes: string[];
  likes: string[];
  otherAllergies: string;
  otherNoLikes: string;
  otherLikes: string;
  diagnosis: NutriChild['dictamen'] | '';
  healthConsent: boolean;
  didNotVisitSpecialist: boolean;
};

function activityMinutesFromText(value: string): number {
  const minutes = Number(value.match(/\d+/)?.[0]);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 1;
}

function toActivity(catalog: PhysicalActivityCatalog): Activity {
  return {
    id: catalog.codigo,
    title: catalog.nombre,
    emoji: '',
    minutes: activityMinutesFromText(catalog.minutos_sesion),
    points: 15,
    instructions: catalog.como_se_hace,
  };
}

const EMPTY_LOG: UnifiedDailyLog = {
  water: 0,
  foodGroups: [],
  mood: null,
  sleepHours: null,
  activities: {},
};

const NAV_ITEMS = {
  tutor: [
    { id: 'Familia', icon: 'home', label: 'Familia' },
    { id: 'Recetas', icon: 'recipes', label: 'Recetas' },
    { id: 'Menú', icon: 'menu', label: 'Menú' },
    { id: 'Gestión', icon: 'shield', label: 'Gestión' },
    { id: 'Ajustes', icon: 'settings', label: 'Ajustes' },
  ],
  child: [
    { id: 'Familia', icon: 'home', label: 'Familia' },
    { id: 'Recetas', icon: 'recipes', label: 'Recetas' },
    { id: 'Logros', icon: 'achievements', label: 'Logros' },
    { id: 'Ajustes', icon: 'settings', label: 'Ajustes' },
    { id: 'Ayuda', icon: 'help', label: 'Ayuda' },
  ],
} as const satisfies Record<AccountRole, readonly { id: AppTab; icon: AppIconName; label: string }[]>;

// Estilos en versión clara y oscura; los componentes toman la del modo actual.
function createScreenStyles(mode: ThemeMode) {
  const COLORS = colorsFor(mode);
  const SHARED = sharedFor(mode);
  return StyleSheet.create({
  loginLogo: { width: 64, height: 64 },
  topBar: { paddingHorizontal: SPACE[16], paddingTop: SPACE[12], paddingBottom: SPACE[12] },
  sectionHeading: { gap: SPACE[4], marginTop: SPACE[4] },
  sleepSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE[12] },
  sleepBadge: { width: 72, height: 72, borderRadius: RADIUS.pildora, alignItems: 'center', justifyContent: 'center' },
  themeChoice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: SPACE[8], paddingHorizontal: SPACE[14], borderRadius: RADIUS.pildora, borderWidth: BORDER.tarjeta },
  reviewRow: { borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: SPACE[8], gap: SPACE[8] },
  allDone: { alignItems: 'center', gap: SPACE[6], padding: SPACE[16], borderRadius: RADIUS.md, backgroundColor: mode !== 'light' ? DARK_SECTION_TONES.revisar.fondo : '#FFF3C4', borderWidth: mode !== 'light' ? 1.5 : 0, borderColor: DARK_SECTION_TONES.revisar.borde },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SPACE[4] },
  moodCell: { width: '50%', padding: SPACE[4] },
  moodTile: { minHeight: 104, alignItems: 'center', justifyContent: 'center', gap: SPACE[6], padding: SPACE[12], borderRadius: RADIUS.md, borderWidth: 3 },
  moodCheck: { position: 'absolute', top: SPACE[6], right: SPACE[6], width: 26, height: 26, borderRadius: RADIUS.pildora, backgroundColor: SHARED.tarjeta, alignItems: 'center', justifyContent: 'center' },
  sleepSummary: { padding: SPACE[12], borderRadius: RADIUS.md },
  activityScene: { width: 56, alignItems: 'center', justifyContent: 'center' },
  activityScreen: { flex: 1 },
  activityContent: { padding: SPACE[20], gap: SPACE[16] },
  activitySceneLarge: { alignSelf: 'center' },
  achievementHero: { alignItems: 'center', borderRadius: RADIUS.hero, padding: SPACE[24], gap: SPACE[8] },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[12] },
  achievementItem: { width: '47%', alignItems: 'center', padding: SPACE[16], borderRadius: RADIUS.habito, gap: SPACE[8] },
  achievementMedal: { width: 68, height: 68, borderRadius: RADIUS.pildora, borderWidth: BORDER.avatar, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
  settingsTile: { minHeight: 72, borderRadius: RADIUS.habito, padding: SPACE[16], justifyContent: 'center' },
  avatarPreview: { alignItems: 'center', borderRadius: RADIUS.habito, padding: SPACE[20], gap: SPACE[8] },
  avatarTabs: { flexDirection: 'row', gap: SPACE[8] },
  avatarTab: { minHeight: 44, paddingHorizontal: SPACE[14], borderRadius: RADIUS.pildora, flexDirection: 'row', alignItems: 'center', gap: SPACE[6] },
  // Tres celdas por fila en cualquier ancho; el espacio entre tarjetas va dentro de cada celda.
  avatarOptions: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SPACE[4] },
  avatarCell: { width: '33.333%', padding: SPACE[4] },
  avatarItem: { flex: 1, minHeight: 124, alignItems: 'center', justifyContent: 'flex-end', gap: SPACE[4], padding: SPACE[8], borderRadius: RADIUS.md, borderWidth: BORDER.avatar },
  avatarSwatch: { width: 56, height: 56, borderRadius: RADIUS.pildora },
  avatarBadge: { position: 'absolute', top: SPACE[6], right: SPACE[6], width: 24, height: 24, borderRadius: RADIUS.pildora, backgroundColor: SHARED.tarjeta, alignItems: 'center', justifyContent: 'center' },
  helpLogo: { width: 120, height: 120, alignSelf: 'center' },
  summaryRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' },
  summaryCard: { width: '48%', backgroundColor: SHARED.tarjeta, borderRadius: RADIUS.tarjeta, padding: SPACE[16], gap: SPACE[4], ...SHADOW.tarjeta },
  selectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[8] },
  selectionPill: { minHeight: 44, paddingHorizontal: SPACE[16], borderRadius: RADIUS.pildora, justifyContent: 'center', alignItems: 'center' },
  ingredientPill: { borderRadius: RADIUS.pildora, paddingHorizontal: SPACE[8], paddingVertical: SPACE[4] },
  waterGlasses: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: 150, gap: SPACE[8] },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE[12], marginBottom: SPACE[12] },
  sheetContent: { gap: SPACE[12], paddingBottom: SPACE[12] },
  collapsibleHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE[16], borderRadius: RADIUS.habito },
  collapsibleContent: { gap: SPACE[12] },
  });
}
const SCREEN_STYLES = { light: createScreenStyles('light'), dark: createScreenStyles('dark'), darkNina: createScreenStyles('darkNina') };

const MEALS: { id: keyof WeeklyMeals; title: string; icon: AppIconName }[] = [
  { id: 'desayuno', title: 'Desayuno', icon: 'menu' },
  { id: 'comida', title: 'Comida', icon: 'food' },
  { id: 'cena', title: 'Cena', icon: 'sleep' },
];

const ACTIVITY_GUIDES: Record<string, { steps: readonly string[]; safety: string }> = {
  dance: {
    steps: [
      'Pon tu canción favorita y rebota con las rodillas.',
      'Sube un brazo y luego el otro, al ritmo.',
      'Si estás quieto y en un lugar seguro, cierra los ojos y siente la música.',
      'Mueve la cadera de lado a lado hasta que acabe la canción.',
    ],
    safety: 'Deja espacio libre a tu alrededor para no chocar con nada.',
  },
  animals: {
    steps: [
      'Camina como pingüino: brazos pegados y pasitos cortos.',
      'Agáchate como rana, con las manos al frente.',
      'Da un salto suave como rana, a tu ritmo.',
      'Estírate como gato y respira despacio.',
    ],
    safety: 'Salta sobre un piso que no resbale y con zapatos puestos.',
  },
  walk: {
    steps: [
      'Sal con un adulto a un lugar seguro.',
      'Camina despacio y observa como explorador.',
      'Busca 3 cosas de colores: una flor, una hoja y un insecto.',
      'Al regresar, cuenta qué descubriste.',
    ],
    safety: 'Siempre acompañado de un adulto y sin alejarte de su vista.',
  },
  stretch: {
    steps: [
      'Párate derecho y respira hondo.',
      'Abre los brazos como avión.',
      '¡Más alto! Sube los brazos y aguanta 5 segundos.',
      'Baja despacio y relájate.',
    ],
    safety: 'Si algo te duele, detente y avísale a un adulto.',
  },
};

const RECIPE_FILTERS = [
  { id: 'todas', label: 'Todas' },
  { id: 'desayuno', label: 'Desayunos' },
  { id: 'comida', label: 'Comidas' },
  { id: 'colacion', label: 'Colaciones' },
  { id: 'cena', label: 'Cenas' },
] as const;
const RECIPE_MEAL_LABELS: Record<NonNullable<Recipe['mealType']>, string> = {
  desayuno: 'Desayuno',
  colacion: 'Colación',
  comida: 'Comida',
  cena: 'Cena',
};

const RECIPE_INGREDIENT_GROUPS: Record<string, keyof typeof FOOD_GROUP_COLORS> = {
  'Tortillas de maíz': 'cereales',
  'Hongos o champiñones': 'frutas',
  'Quelites o espinaca': 'frutas',
  'Queso al gusto': 'animal',
  'Tostadas horneadas': 'cereales',
  Frijoles: 'leguminosas',
  Lechuga: 'frutas',
  Jitomate: 'frutas',
  Aguacate: 'frutas',
  Calabacitas: 'frutas',
  Elote: 'cereales',
  Cebolla: 'frutas',
  Avena: 'cereales',
  'Manzana o plátano': 'frutas',
};

const MISSION_POINTS: Record<string, number> = {
  'water-goal': 10,
  'colorful-plate': 10,
  'mood-check': 5,
};

const DIAGNOSES = [
  { id: 'sano', label: 'Sano' },
  { id: 'sobrepeso', label: 'Sobrepeso' },
  { id: 'obesidad', label: 'Obesidad' },
  { id: 'prediabetes', label: 'Prediabetes' },
  { id: 'diabetes2', label: 'Diabetes tipo 2' },
] as const;

const AVATAR_KEYS: AvatarKey[] = ['piel', 'cabello', 'ropa', 'accesorio', 'fondo'];
const AVATAR_LABELS: Record<AvatarKey, string> = {
  piel: 'Piel',
  cabello: 'Cabello',
  ropa: 'Ropa',
  accesorio: 'Accesorios',
  fondo: 'Fondo',
};
const AVATAR_HINTS: Record<AvatarPart, string> = {
  piel: '¡Elige tu color de piel!',
  cabello: '¡Prueba nuevos peinados!',
  ropa: '¡Combina tu atuendo!',
  accesorio: '¡Añade los toques finales!',
};
const AVATAR_TAB_ICONS: Record<AvatarKey, AppIconName> = {
  piel: 'profile',
  cabello: 'avatar',
  ropa: 'child',
  accesorio: 'sparkles',
  fondo: 'menu',
};
const EXERCISE_ICONS: Record<(typeof EXERCISE_CATEGORIES)[number]['id'], AppIconName> = {
  cardio: 'heart',
  fuerza: 'dumbbell',
  flexibilidad: 'waves',
  equilibrio: 'scale',
};

function defaultAvatarSelection(theme: UnifiedProfile['theme']): AvatarSelection {
  return { piel: 0, cabello: theme === 'nina' ? 1 : 0, ropa: theme === 'nina' ? 0 : 2, accesorio: 0, fondo: theme === 'nina' ? 0 : 2 };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function profileReference(source: 'nutribot' | 'warrior-kids', id: string): string {
  return `${source}:${id}`;
}

function buildProfiles(data: UnifiedData): UnifiedProfile[] {
  const nutriById = new Map(data.nutribot.ninos.map(profile => [profile.id, profile]));
  const warriorById = new Map(data.warriorKids.children.map(profile => [profile.id, profile]));
  const usedNutri = new Set<string>();
  const usedWarrior = new Set<string>();
  const result: Omit<UnifiedProfile, 'sex'>[] = [];

  for (const link of data.profileLinks) {
    const nutri = nutriById.get(link.nutriId);
    const warrior = warriorById.get(link.warriorId);
    if (!nutri || !warrior || usedNutri.has(nutri.id) || usedWarrior.has(warrior.id)) continue;
    usedNutri.add(nutri.id);
    usedWarrior.add(warrior.id);
    const key = `linked:${link.id}`;
    if (data.archivedProfiles.includes(key)) continue;
    result.push({
      key,
      progressKey: profileReference('warrior-kids', warrior.id),
      name: link.displayName,
      theme: link.theme,
      avatar: warrior.avatar || CHILD_AVATARS[0],
      nutri,
      warrior,
      link,
    });
  }

  for (const nutri of data.nutribot.ninos) {
    if (usedNutri.has(nutri.id)) continue;
    const key = profileReference('nutribot', nutri.id);
    if (data.archivedProfiles.includes(key)) continue;
    result.push({
      key,
      progressKey: key,
      name: nutri.nombre,
      theme: nutri.genero,
      avatar: CHILD_AVATARS[0],
      nutri,
      warrior: null,
      link: null,
    });
  }

  for (const warrior of data.warriorKids.children) {
    if (usedWarrior.has(warrior.id)) continue;
    const key = profileReference('warrior-kids', warrior.id);
    if (data.archivedProfiles.includes(key)) continue;
    result.push({
      key,
      progressKey: key,
      name: warrior.name,
      theme: warrior.theme ?? 'nina',
      avatar: warrior.avatar || CHILD_AVATARS[0],
      nutri: null,
      warrior,
      link: null,
    });
  }
  // El color es una elección aparte; sin elección se conserva el que el perfil ya tenía.
  return result.map(profile => ({
    ...profile,
    sex: profile.theme,
    theme: data.profileColors?.[profile.progressKey] ?? profile.theme,
  }));
}

function todayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const DAILY_ACTIVITY_COUNT = 4;

// Toma un bloque distinto del catálogo cada día; recorre todas las actividades antes de repetir.
function activitiesForDay<T>(items: T[], dateKey: string, count = DAILY_ACTIVITY_COUNT): T[] {
  if (items.length <= count) return items;
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  const start = (dayNumber * count) % items.length;
  return Array.from({ length: count }, (_, index) => items[(start + index) % items.length]);
}

function dateOffsetKey(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function todayLabel(): string {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

function canonicalFoodGroup(value: string): string {
  const text = cleanText(value);
  if (text.includes('fruta') || text.includes('verdura') || text.includes('vegetal')) return 'frutas-verduras';
  if (text.includes('cereal') || text.includes('tortilla') || text.includes('pan')) return 'cereales';
  if (text.includes('leguminosa') || text.includes('frijol') || text.includes('lenteja')) return 'leguminosas';
  if (text.includes('animal') || text.includes('carne') || text.includes('huevo') || text.includes('pollo')) return 'origen-animal';
  return '';
}

function getDailyLog(
  data: UnifiedData,
  profile: UnifiedProfile,
  date: string,
): UnifiedDailyLog {
  const primary = data.dailyLogs[profile.progressKey]?.[date];
  if (primary) return primary;
  if (profile.link && profile.nutri) {
    return data.dailyLogs[profileReference('nutribot', profile.nutri.id)]?.[date] ?? EMPTY_LOG;
  }
  return EMPTY_LOG;
}

function getProgress(data: UnifiedData, profile: UnifiedProfile): ChildProgress {
  const imported = profile.warrior
    ? { points: profile.warrior.points, badges: profile.warrior.badges }
    : { points: 0, badges: [] };
  return data.childProgress[profile.progressKey] ?? imported;
}

function recipeCategory(recipe: Recipe): NonNullable<Recipe['mealType']> | null {
  if (recipe.mealType) return recipe.mealType;
  if (recipe.id.startsWith('database-recipe-')) return null;
  if (recipe.id === 'avena') return 'desayuno';
  if (recipe.id === 'frijoles') return 'colacion';
  return 'comida';
}

function recipeMatchesFilter(recipe: Recipe, filter: (typeof RECIPE_FILTERS)[number]['id'], search: string): boolean {
  const query = cleanText(search);
  const category = recipeCategory(recipe);
  return (filter === 'todas' || category === filter) &&
    (!query || cleanText([
      recipe.catalogCode,
      recipe.title,
      recipe.mealType,
      recipe.ageGroup,
      recipe.groups,
      recipe.ingredients.join(' '),
      recipe.portionsByGroup,
      recipe.note,
    ].filter(Boolean).join(' ')).includes(query));
}

function matchesConcern(text: string, concern: string): boolean {
  const option = FOOD_OPTIONS.find(item => item.id === concern);
  const terms = option ? [...option.keywords, option.name] : [concern];
  const contents = cleanText(text);
  return terms.some(term => {
    const normalized = cleanText(term);
    return normalized.length > 0 && contents.includes(normalized);
  });
}

function recipeWarnings(recipe: Recipe, concerns: string[]): string[] {
  return concerns.filter(concern => matchesConcern(`${recipe.title} ${recipe.ingredients.join(' ')}`, concern));
}

function getMealName(value: keyof WeeklyMeals): string {
  return MEALS.find(meal => meal.id === value)?.title ?? value;
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

// Redondea el cronómetro a minutos completos dentro del rango que acepta el registro (1 a 180).
function minutesFromElapsed(ms: number): number {
  return Math.min(180, Math.max(1, Math.round(ms / 60_000)));
}

function ageLabel(age: number | null): string {
  return age === null ? 'No registrada' : `${age} ${age === 1 ? 'año' : 'años'}`;
}

function emptyProfileDraft(): ProfileDraft {
  return {
    name: '',
    theme: 'nina',
    colorTheme: 'nina',
    avatar: CHILD_AVATARS[0],
    birthDate: '',
    age: '',
    collectMeasurements: true,
    confirmedUnusual: {},
    weight: '',
    height: '',
    allergies: [],
    noLikes: [],
    likes: [],
    otherAllergies: '',
    otherNoLikes: '',
    otherLikes: '',
    diagnosis: '',
    healthConsent: false,
    didNotVisitSpecialist: false,
  };
}

/** La edad se calcula de la fecha de nacimiento si existe; si no, se usa la que se escribió. */
function draftAge(draft: ProfileDraft): string {
  const birthDate = parseBirthDate(draft.birthDate);
  return birthDate ? String(ageFromBirth(birthDate) ?? '') : draft.age;
}

function validateProfileDraft(draft: ProfileDraft) {
  return validateChildProfile({
    age: draftAge(draft),
    weight: draft.weight,
    height: draft.height,
    collectMeasurements: draft.collectMeasurements,
    confirmedUnusual: draft.confirmedUnusual,
  });
}

/** Edad del perfil: fecha de nacimiento o, si no se registró, la edad escrita. */
function profileAge(nutri: NutriChild | null | undefined): number | null {
  const fromBirth = ageFromBirth(nutri?.nacimiento);
  if (fromBirth !== null) return fromBirth;
  const written = Number(nutri?.edad);
  return nutri?.edad && Number.isInteger(written) ? written : null;
}

function defaultMeals(): WeeklyMeals {
  return { desayuno: null, comida: null, cena: null };
}

export default function UnifiedApp() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [data, setData] = useState<UnifiedData | null>(null);
  const dataRef = useRef<UnifiedData | null>(null);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const [physicalActivities, setPhysicalActivities] = useState<PhysicalActivityCatalog[]>([]);
  const [databaseRecipes, setDatabaseRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [session, setSession] = useState<LocalAccount | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const dataVersion = useRef(0);
  const writesBlocked = useRef(false);
  const loadGeneration = useRef(0);
  const authUserId = useRef<string | null>(null);
  // Modo sin conexión: los cambios se aplican aquí al momento, se guardan cifrados en el teléfono
  // y se suben cuando hay internet. `baseRef` es la última versión confirmada por la nube.
  const network = useNetworkState();
  const networkOnline = network.isConnected !== false && network.isInternetReachable !== false;
  const [connectionLost, setConnectionLost] = useState(false);
  const offline = !networkOnline || connectionLost;
  const offlineRef = useRef(false);
  useEffect(() => {
    offlineRef.current = offline;
  }, [offline]);
  const baseRef = useRef<{ data: UnifiedData; version: number } | null>(null);
  const dirtyRef = useRef(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [syncEpoch, setSyncEpoch] = useState(0);
  const needsReconnectRef = useRef(false);
  const lastReconnectAttempt = useRef(0);
  // La app se abrió sin internet con la cuenta guardada; la sesión se confirma al volver la red.
  const offlineSessionRef = useRef(false);
  // Al iniciar sesión con contraseña se entra a Tutor; si no, se restaura el último modo.
  const freshLoginRef = useRef(false);
  const restoredDeviceFor = useRef<string | null>(null);
  const applyAuthUserRef = useRef<((user: User | null) => void) | null>(null);
  const cacheChain = useRef<Promise<void>>(Promise.resolve());
  const [role, setRole] = useState<AccountRole>('tutor');
  const [selectedProfileKey, setSelectedProfileKey] = useState<string | null>(null);
  // Tema claro u oscuro según la preferencia guardada (Ajustes) o el sistema.
  const systemScheme = useColorScheme();
  const baseThemeMode = resolveThemeMode(data?.themeMode, systemScheme);
  // En Niñez, una niña ve el oscuro con su paleta ciruela y rosa.
  const childIsGirl = role === 'child' && data !== null && selectedProfileKey !== null &&
    buildProfiles(data).find(profile => profile.key === selectedProfileKey)?.theme === 'nina';
  const themeMode: ThemeMode = baseThemeMode === 'dark' && childIsGirl ? 'darkNina' : baseThemeMode;
  // Versiones del modo actual de los colores y estilos del módulo.
  const styles = UI_STYLES[themeMode];
  const screenStyles = SCREEN_STYLES[themeMode];
  const COLORS = colorsFor(themeMode);
  const SHARED = sharedFor(themeMode);
  const FOOD_GROUP_COLORS = foodGroupColorsFor(themeMode);
  const [showChildProfilePicker, setShowChildProfilePicker] = useState(false);
  const [tab, setTab] = useState<AppTab>('Familia');
  // null = mosaicos del inicio de Niñez; si no, la sección abierta.
  const [childHomeView, setChildHomeView] = useState<ChildHomeSection | null>(null);
  const [settingsSection, setSettingsSection] = useState<'main' | 'parental' | 'notifications' | 'help'>('main');
  const mainScrollRef = useRef<ScrollViewInstance>(null);
  // Cada pestaña o sección de ajustes abre desde arriba, no donde se quedó la anterior.
  useEffect(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab, settingsSection, childHomeView]);
  const [profileStep, setProfileStep] = useState(0);

  const [registerMode, setRegisterMode] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [showTutorGate, setShowTutorGate] = useState(false);
  const [soundCue, setSoundCue] = useState<{ name: SoundCueName; id: number } | null>(null);
  const requestSoundCue = (name: SoundCueName) => setSoundCue(current => ({ name, id: (current?.id ?? 0) + 1 }));
  const clearSoundCue = useCallback(() => setSoundCue(null), []);
  const [tutorGatePassword, setTutorGatePassword] = useState('');
  const [tutorGateBusy, setTutorGateBusy] = useState(false);
  const [tutorGateError, setTutorGateError] = useState('');
  const [tutorGateLockUntil, setTutorGateLockUntil] = useState<number | null>(null);
  const [tutorGateLockRemaining, setTutorGateLockRemaining] = useState(0);
  const tutorGateFailedAttempts = useRef(0);

  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UnifiedProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfileDraft());
  const [profileError, setProfileError] = useState('');
  const [profileShowErrors, setProfileShowErrors] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileToArchive, setProfileToArchive] = useState<UnifiedProfile | null>(null);

  const [selectedDay, setSelectedDay] = useState(WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [selectedMeal, setSelectedMeal] = useState<keyof WeeklyMeals>('comida');
  const [menuPicker, setMenuPicker] = useState<{ day: string; meal: keyof WeeklyMeals } | null>(null);
  const [recipeFilter, setRecipeFilter] = useState<(typeof RECIPE_FILTERS)[number]['id']>('todas');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [menuRecipeFilter, setMenuRecipeFilter] = useState<(typeof RECIPE_FILTERS)[number]['id']>('todas');
  const [menuRecipeSearch, setMenuRecipeSearch] = useState('');
  const [dietMode, setDietMode] = useState(false);
  const [dietDay, setDietDay] = useState(WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [recipeDetails, setRecipeDetails] = useState<Recipe | null>(null);

  const [activityModal, setActivityModal] = useState<Activity | null>(null);
  const [activityStage, setActivityStage] = useState<'details' | 'form'>('details');
  const [activityPlaying, setActivityPlaying] = useState(false);
  const [activityStarted, setActivityStarted] = useState(false);
  const [activityElapsed, setActivityElapsed] = useState(0);
  const [activityDuration, setActivityDuration] = useState('');
  const [activitySaveFailed, setActivitySaveFailed] = useState(false);
  const activityUploadRef = useRef<{ uri: string; path: string } | null>(null);
  const [activityPhoto, setActivityPhoto] = useState<PhotoDraft | null>(null);
  const [activityError, setActivityError] = useState('');
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const activitySubmittingRef = useRef(false);
  const [reviewingKeys, setReviewingKeys] = useState<string[]>([]);
  const reviewingActivities = useRef(new Set<string>());
  const [sleepInput, setSleepInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatMessages, setChatMessages] = useState<{ from: 'bot' | 'child'; text: string }[]>([
    { from: 'bot', text: '¡Hola! Soy NutriBot. Podemos hablar de hábitos, comida y cómo te sientes.' },
  ]);
  const [avatarCategory, setAvatarCategory] = useState<AvatarPart>('cabello');
  // Aviso junto a las prendas cuando se toca una bloqueada.
  const [avatarHint, setAvatarHint] = useState('');
  const [childSettingsSection, setChildSettingsSection] = useState<'main' | 'avatar'>('main');
  const [avatarDraft, setAvatarDraft] = useState<{
    profileKey: string;
    selection: AvatarSelection;
    changed: AvatarKey[];
  } | null>(null);
  const [notice, setNotice] = useState('');

  // Sube los cambios pendientes. Sin internet no falla: quedan guardados y se reintentan después.
  // Si otro dispositivo guardó antes, combina ambos cambios y vuelve a intentar.
  const syncPending = useCallback(async () => {
    if (!authUser) return;
    const userId = authUser.id;
    for (let round = 0; round < 5; round += 1) {
      const local = dataRef.current;
      const base = baseRef.current;
      if (!dirtyRef.current || !local || !base || offlineRef.current || authUserId.current !== userId) return;
      try {
        const version = await saveCloudData(userId, local, base.version);
        if (authUserId.current !== userId) return;
        baseRef.current = { data: local, version };
        dataVersion.current = version;
        if (dataRef.current === local) {
          dirtyRef.current = false;
          setPendingSync(false);
        }
        setStorageError('');
      } catch (error) {
        if (isNetworkFailure(error)) {
          setConnectionLost(true);
          return;
        }
        if (!isVersionConflict(error)) throw error;
        let remote: Awaited<ReturnType<typeof loadCloudData>>;
        try {
          remote = await loadCloudData(authUser, accountFromUser(authUser));
        } catch (cause) {
          if (isNetworkFailure(cause)) {
            setConnectionLost(true);
            return;
          }
          throw cause;
        }
        if (authUserId.current !== userId) return;
        const current = dataRef.current ?? local;
        const merged = mergeThreeWay(base.data, current, remote.data);
        const next = isUnifiedData(merged) ? merged : current;
        baseRef.current = { data: remote.data, version: remote.version };
        dataVersion.current = remote.version;
        dataRef.current = next;
        setData(next);
      }
    }
  }, [authUser]);

  const scheduleSync = useCallback(() => {
    const userId = authUser?.id ?? null;
    const run = writeQueue.current.catch(() => undefined).then(syncPending);
    writeQueue.current = run;
    void run.catch(error => {
      if (authUserId.current === userId) {
        writesBlocked.current = true;
        setStorageError(friendlyError(error, 'No se pudieron guardar los cambios en tu espacio familiar.'));
      }
    });
    return run;
  }, [authUser, syncPending]);

  const loadData = useCallback(async () => {
    if (!authUser) return null;
    const generation = ++loadGeneration.current;
    const account = accountFromUser(authUser);
    await writeQueue.current.catch(() => undefined);
    const cached = await loadOfflineCache(authUser.id).catch(() => null);
    if (generation !== loadGeneration.current) return null;
    // Al abrir la app se vuelve al modo y perfil de la última vez (en Niñez se queda en Niñez).
    if (restoredDeviceFor.current !== authUser.id) {
      restoredDeviceFor.current = authUser.id;
      if (cached && !freshLoginRef.current) {
        setRole(cached.role);
        setSelectedProfileKey(cached.selectedProfileKey);
      }
      freshLoginRef.current = false;
    }
    try {
      const [loaded, catalog, recipes] = await Promise.all([
        loadCloudData(authUser, account),
        loadPhysicalActivityCatalog(),
        loadDatabaseRecipes(),
      ]);
      await clearLegacyLocalData();
      if (generation !== loadGeneration.current) return null;
      // Cambios hechos sin conexión (en memoria o en la copia del teléfono) se combinan con la nube.
      const localDraft = dirtyRef.current && dataRef.current && baseRef.current
        ? { data: dataRef.current, base: baseRef.current.data }
        : cached?.pending ? { data: cached.data, base: cached.base } : null;
      const merged = localDraft ? mergeThreeWay(localDraft.base, localDraft.data, loaded.data) : loaded.data;
      const current = isUnifiedData(merged) ? merged : localDraft?.data ?? loaded.data;
      setLoadError('');
      setConnectionLost(false);
      offlineSessionRef.current = false;
      baseRef.current = { data: loaded.data, version: loaded.version };
      dataVersion.current = loaded.version;
      writesBlocked.current = false;
      dirtyRef.current = Boolean(localDraft);
      setPendingSync(Boolean(localDraft));
      dataRef.current = current;
      setData(current);
      setPhysicalActivities(catalog);
      setDatabaseRecipes(recipes);
      setSession(account);
      setStorageError('');
      if (localDraft) void scheduleSync();
      return loaded;
    } catch (error) {
      if (generation !== loadGeneration.current) return null;
      if ((offlineRef.current || isNetworkFailure(error)) && (cached || dataRef.current)) {
        // Sin internet: se sigue con lo que ya hay en memoria o con la copia cifrada del teléfono.
        setConnectionLost(true);
        setLoadError('');
        if (!dataRef.current && cached) {
          baseRef.current = cached.base ? { data: cached.base, version: cached.baseVersion } : null;
          dataVersion.current = cached.baseVersion;
          dirtyRef.current = cached.pending;
          setPendingSync(cached.pending);
          dataRef.current = cached.data;
          setData(cached.data);
          setPhysicalActivities(cached.catalog);
          setDatabaseRecipes(cached.recipes);
          setFamily(cached.family);
          setChallengeActivities(cached.challengeActivities);
          setSession(account);
        }
        return null;
      }
      setLoadError(friendlyError(error, 'No se pudieron cargar los datos de tu espacio familiar.'));
      return null;
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [authUser, scheduleSync]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;
    const applyAuthUser = (user: User | null) => {
      const userId = user?.id ?? null;
      if (authUserId.current !== userId) {
        authUserId.current = userId;
        loadGeneration.current += 1;
        dataRef.current = null;
        setPhysicalActivities([]);
        setDatabaseRecipes([]);
        dataVersion.current = 0;
        baseRef.current = null;
        dirtyRef.current = false;
        setPendingSync(false);
        setConnectionLost(false);
        writesBlocked.current = false;
        setData(null);
        setSession(null);
        setStorageError('');
        setLoadError('');
        setLoading(Boolean(user));
        setAuthUser(user);
        tutorGateFailedAttempts.current = 0;
        setTutorGateLockUntil(null);
        setTutorGateLockRemaining(0);
        setShowTutorGate(false);
        setTutorGatePassword('');
        setTutorGateError('');
        if (user) {
          setRole('tutor');
          setTab('Familia');
          setSettingsSection('main');
        }
      } else if (!user) {
        setLoading(false);
      }
    };
    applyAuthUserRef.current = applyAuthUser;
    try {
      const supabase = getSupabaseClient();
      const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
        if (!active) return;
        // Abierta sin internet con la cuenta guardada: solo un cierre de sesión real la saca.
        if (!currentSession && offlineSessionRef.current && event !== 'SIGNED_OUT') return;
        applyAuthUser(currentSession?.user ?? null);
      });
      unsubscribe = () => authListener.subscription.unsubscribe();
      void Promise.resolve()
        .then(() => supabase.auth.getSession())
        .then(async ({ data: sessionData, error }) => {
          if (!active) return;
          let user = sessionData.session?.user ?? null;
          if (!user) {
            // Sin internet no se puede renovar la sesión: se abre con la cuenta guardada en el
            // teléfono, que solo existe si no se cerró sesión. Al volver la red se confirma.
            const cachedUser = await loadOfflineUser().catch(() => null);
            const noInternet = (error && isNetworkFailure(error)) || await getNetworkStateAsync()
              .then(state => state.isConnected === false || state.isInternetReachable === false)
              .catch(() => false);
            if (cachedUser && noInternet) {
              user = cachedUser;
              offlineSessionRef.current = true;
            } else if (error) {
              throw error;
            }
          }
          if (!active) return;
          applyAuthUser(user);
          if (offlineSessionRef.current) setConnectionLost(true);
          setAuthReady(true);
        })
        .catch(error => {
          if (!active) return;
          setLoadError(friendlyError(error, 'No se pudo restaurar tu sesión.'));
          setLoading(false);
          setAuthReady(true);
        });
    } catch (error) {
      void Promise.resolve().then(() => {
        if (!active) return;
        setLoadError(friendlyError(error, 'No se pudo iniciar la app.'));
        setLoading(false);
        setAuthReady(true);
      });
    }
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (tutorGateLockUntil === null) return;
    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((tutorGateLockUntil - Date.now()) / 1000));
      setTutorGateLockRemaining(seconds);
      if (seconds === 0) {
        tutorGateFailedAttempts.current = 0;
        setTutorGateLockUntil(null);
        setTutorGateError('');
      }
    };
    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [tutorGateLockUntil]);

  useEffect(() => {
    if (!authReady) return;
    if (!authUser) {
      loadGeneration.current += 1;
      dataRef.current = null;
      dataVersion.current = 0;
      baseRef.current = null;
      dirtyRef.current = false;
      writesBlocked.current = false;
      return;
    }

    let active = true;
    let channel: ReturnType<typeof subscribeToCloudData> | null = null;

    void loadData().then(snapshot => {
      if (!active || !snapshot) return;
      try {
        channel = subscribeToCloudData(
          authUser.id,
          nextSnapshot => {
            // Con cambios locales pendientes se ignora: se combinarán al subirlos.
            if (!active || dirtyRef.current || nextSnapshot.version <= dataVersion.current) return;
            dataVersion.current = nextSnapshot.version;
            baseRef.current = { data: nextSnapshot.data, version: nextSnapshot.version };
            dataRef.current = nextSnapshot.data;
            setData(nextSnapshot.data);
          },
          error => {
            if (active && !offlineRef.current) setStorageError(error.message);
          },
        );
      } catch (error) {
        setStorageError(friendlyError(error, 'No se pudo iniciar la sincronización en tiempo real.'));
      }
    });

    return () => {
      active = false;
      loadGeneration.current += 1;
      if (channel) void getSupabaseClient().removeChannel(channel);
    };
  }, [authReady, authUser, loadData, syncEpoch]);

  // Recuerda si hubo un corte para reconectar cuando vuelva la red.
  useEffect(() => {
    if (!networkOnline || connectionLost) needsReconnectRef.current = true;
  }, [networkOnline, connectionLost]);

  // Al volver internet: confirma la sesión, recarga, combina y sube lo pendiente.
  // Mientras siga fallando, se reintenta cada 20 segundos.
  useEffect(() => {
    if (!authUser || !networkOnline) return;
    let cancelled = false;
    const attempt = async () => {
      // Como mucho un intento cada 15 segundos, aunque el servidor siga sin responder.
      if (!needsReconnectRef.current || Date.now() - lastReconnectAttempt.current < 15_000) return;
      lastReconnectAttempt.current = Date.now();
      const result = await getSupabaseClient().auth.getSession()
        .catch(error => ({ data: { session: null }, error }));
      if (cancelled) return;
      if (result.error && isNetworkFailure(result.error)) return;
      if (!result.data.session || result.data.session.user.id !== authUser.id) {
        // La sesión ya no es válida: hay que iniciar sesión otra vez. Lo pendiente sigue
        // guardado en el teléfono y se subirá al entrar con la misma cuenta.
        offlineSessionRef.current = false;
        needsReconnectRef.current = false;
        applyAuthUserRef.current?.(null);
        setAuthNotice('Tu sesión venció. Inicia sesión otra vez; tus cambios sin subir siguen guardados en este teléfono.');
        return;
      }
      needsReconnectRef.current = false;
      offlineSessionRef.current = false;
      setConnectionLost(false);
      setSyncEpoch(value => value + 1);
    };
    void attempt();
    const timer = setInterval(() => { void attempt(); }, 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [authUser, networkOnline, connectionLost]);

  const updateData = (update: (current: UnifiedData) => UnifiedData) => {
    const current = dataRef.current;
    if (!current || !authUser) {
      setStorageError('Los datos todavía no están listos. Intenta de nuevo en un momento.');
      return false;
    }
    if (writesBlocked.current) {
      setStorageError('No se guardarán más cambios hasta volver a cargar tus datos.');
      return false;
    }
    const next = update(current);
    dataRef.current = next;
    setData(next);
    dirtyRef.current = true;
    setPendingSync(true);
    // Sin internet el cambio queda en el teléfono y se sube al volver la conexión.
    if (!offlineRef.current) void scheduleSync();
    return true;
  };

  const profiles = useMemo(() => (data ? buildProfiles(data) : []), [data]);
  const activityCatalog = useMemo(() => physicalActivities.map(toActivity), [physicalActivities]);
  const recipes = useMemo(() => {
    const databaseTitles = new Set(databaseRecipes.map(recipe => cleanText(recipe.title)));
    const mergedDatabaseRecipes = databaseRecipes.map(recipe => {
      const existing = RECIPES.find(item => cleanText(item.title) === cleanText(recipe.title));
      return existing
        ? {
            ...existing,
            databaseId: recipe.databaseId,
            title: recipe.title,
            catalogCode: recipe.catalogCode ?? existing.catalogCode,
            mealType: recipe.mealType ?? existing.mealType,
            ageGroup: recipe.ageGroup ?? existing.ageGroup,
            portionsByGroup: recipe.portionsByGroup ?? existing.portionsByGroup,
            preparationTimeMinutes: recipe.preparationTimeMinutes ?? existing.preparationTimeMinutes,
            caloriesPerPortion: recipe.caloriesPerPortion ?? existing.caloriesPerPortion,
            groups: recipe.catalogCode ? recipe.groups : recipe.groups || existing.groups,
            ingredients: recipe.ingredients.length ? recipe.ingredients : existing.ingredients,
            ingredientDetails: recipe.ingredientDetails,
            preparation: recipe.preparation || existing.preparation,
            note: recipe.note || existing.note,
          }
        : recipe;
    });
    return [
      ...mergedDatabaseRecipes,
      ...RECIPES.filter(recipe => !databaseTitles.has(cleanText(recipe.title))),
    ];
  }, [databaseRecipes]);
  // Las recetas locales solo se muestran si el catálogo de Supabase está vacío; siguen en `recipes`
  // para resolver menús que ya las tenían asignadas.
  const browsableRecipes = useMemo(
    () => (databaseRecipes.length ? recipes.filter(recipe => recipe.databaseId !== undefined) : recipes),
    [databaseRecipes.length, recipes],
  );
  const catalogActivityFor = (id: string) => physicalActivities.find(activity => activity.codigo === id);

  // Retos y recompensas se definen en Supabase (Gestión); a quién aplican, los pedidos y los
  // planes se guardan por perfil en datos_app, así que sirven para todos los perfiles.
  const [family, setFamily] = useState<NormalizedManagementSnapshot | null>(null);
  const [challengeActivities, setChallengeActivities] = useState<ActivityManagementSnapshot | null>(null);
  const familyUserId = authUser?.id ?? null;
  const refreshFamily = useCallback(async () => {
    if (!familyUserId) return;
    try {
      setFamily(await loadNormalizedManagement(familyUserId));
    } catch {
      // Si falla, se conservan los últimos datos; el resto de la app sigue funcionando.
    }
    try {
      setChallengeActivities(await loadActivityManagement(familyUserId));
    } catch {
      // Los retos se siguen mostrando aunque no carguen sus actividades.
    }
  }, [familyUserId]);
  const hasData = data !== null;
  useEffect(() => {
    if (hasData) void refreshFamily();
  }, [hasData, role, refreshFamily]);
  // Guarda la copia cifrada del teléfono cada vez que cambian los datos, el modo o los catálogos.
  useEffect(() => {
    if (!offlineCacheAvailable || !authUser || !data) return;
    const snapshot: OfflineCache = {
      format: 1,
      userId: authUser.id,
      data,
      base: baseRef.current?.data ?? null,
      baseVersion: baseRef.current?.version ?? dataVersion.current,
      pending: pendingSync || dirtyRef.current,
      catalog: physicalActivities,
      recipes: databaseRecipes,
      family,
      challengeActivities,
      role,
      selectedProfileKey,
      savedAt: new Date().toISOString(),
    };
    const user = authUser;
    cacheChain.current = cacheChain.current
      .then(() => saveOfflineCache(snapshot, user))
      .catch(error => {
        if (__DEV__) console.warn('No se pudo guardar la copia local cifrada.', error);
      });
  }, [authUser, data, pendingSync, physicalActivities, databaseRecipes, family, challengeActivities, role, selectedProfileKey]);
  const familyAssignments = data?.familyAssignments ?? [];
  const rewardRequests = data?.rewardRequests ?? [];
  const mealPlans = data?.mealPlans ?? [];
  // Puntos acumulados (desbloquean avatar y logros; los retos verificados ya están sumados).
  const pointsFor = (profile: UnifiedProfile) => (data ? getProgress(data, profile).points : 0);
  // Puntos disponibles para premios: acumulados menos los pedidos que no se cancelaron.
  const rewardBalanceFor = (profile: UnifiedProfile) => rewardBalance(pointsFor(profile), rewardRequests, profile.progressKey);
  const nowIso = () => new Date().toISOString();
  const shortDate = (date: string) =>
    new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(`${date.slice(0, 10)}T12:00:00`));
  const activityFor = (id: string) =>
    activityCatalog.find(activity => activity.id === id) ??
    ACTIVITIES.find(activity => activity.id === id);
  const currentProfile = profiles.find(profile => profile.key === selectedProfileKey) ?? null;
  const selectedProfile = currentProfile ?? (role === 'tutor' ? profiles[0] ?? null : null);
  const theme = appThemeFor(role, selectedProfile?.theme ?? 'nina', themeMode);
  const loginTheme = appThemeFor('tutor', 'nina', themeMode);
  const reduceMotion = useReduceMotion();
  const { transition, start: startTransition, cancel: cancelTransition } = useLoadingTransition(reduceMotion);
  const waitingForLoad = !fontError && !loadError && (loading || !fontsLoaded);
  const loadingVisible = useLoadingVisibility(waitingForLoad, authUser ? 0 : 300, authUser ? SESSION_START_MS : 600);

  useEffect(() => {
    if (!transition) return;
    const ownerMismatch = transition.kind === 'tutor'
      ? role !== 'tutor'
      : role !== 'child' || selectedProfile?.key !== transition.owner;
    if (waitingForLoad || fontError || loadError || storageError || !authUser || !data ||
        transition.userId !== authUser.id || ownerMismatch ||
        (transition.kind === 'actividad' && !activityModal)) {
      cancelTransition();
    }
  }, [transition, waitingForLoad, fontError, loadError, storageError, authUser, data, role, selectedProfile, activityModal, cancelTransition]);
  const profileAllergies = selectedProfile?.nutri
    ? unique([...selectedProfile.nutri.alergias, selectedProfile.nutri.otrasAlergias].filter(Boolean))
    : [];
  const profileNoLikes = selectedProfile?.nutri
    ? unique([...selectedProfile.nutri.noGusta, selectedProfile.nutri.otrosNoGusta].filter(Boolean))
    : [];
  const profileLikes = selectedProfile?.nutri
    ? unique([...(selectedProfile.nutri.gusta ?? []), selectedProfile.nutri.otrosGusta ?? ''].filter(Boolean))
    : [];

  const submitAuth = async () => {
    setAuthError('');
    setAuthNotice('');
    const email = authEmail.trim().toLocaleLowerCase('es-MX');
    if (!email || !email.includes('@')) {
      setAuthError('Escribe un correo electrónico válido.');
      return;
    }
    if (registerMode) {
      const name = authName.trim();
      if (name.length < 2) {
        setAuthError('Escribe tu nombre para crear tu cuenta.');
        return;
      }
    }
    if (authPassword.length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setAuthBusy(true);
    freshLoginRef.current = true;
    try {
      const supabase = getSupabaseClient();
      if (registerMode) {
        const { data: result, error } = await supabase.auth.signUp({
          email,
          password: authPassword,
          options: { data: { name: authName.trim() } },
        });
        if (error) throw error;
        if (!result.session) {
          setRegisterMode(false);
          setAuthPassword('');
          setAuthNotice('Cuenta creada. Revisa tu correo para confirmar la dirección y después inicia sesión.');
        } else {
          setAuthNotice('Tu cuenta se creó correctamente. Cargando tu espacio familiar…');
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password: authPassword });
      if (error) throw error;
      requestSoundCue('sesion');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido.';
      const normalized = message.toLocaleLowerCase('es-MX');
      if (normalized.includes('invalid login credentials')) {
        setAuthError('El correo o la contraseña no coinciden.');
      } else if (normalized.includes('email not confirmed')) {
        setAuthError('Confirma tu correo desde el mensaje que te enviamos antes de iniciar sesión.');
      } else if (normalized.includes('already registered') || normalized.includes('user already')) {
        setAuthError('Ese correo ya tiene una cuenta. Inicia sesión.');
      } else {
        setAuthError(friendlyError(error, 'No se pudo completar el acceso.'));
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const requestPasswordReset = async () => {
    setAuthError('');
    setAuthNotice('');
    const email = authEmail.trim().toLocaleLowerCase('es-MX');
    if (!email || !email.includes('@')) {
      setAuthError('Escribe un correo electrónico válido.');
      return;
    }

    setAuthBusy(true);
    try {
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL('reset-password'),
      });
      if (error) throw error;
      setAuthNotice('Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña.');
    } catch (error) {
      setAuthError(friendlyError(error, 'No se pudo enviar el correo de recuperación.'));
    } finally {
      setAuthBusy(false);
    }
  };

  const createOrEditProfile = (profile: UnifiedProfile | null) => {
    if (role !== 'tutor') return;
    setEditingProfile(profile);
    setProfileStep(0);
    setProfileError('');
    setProfileShowErrors(false);
    setProfileDraft(profile
      ? {
          name: profile.name,
          theme: profile.sex,
          colorTheme: profile.theme,
          avatar: profile.avatar,
          birthDate: formatBirthDate(profile.nutri?.nacimiento),
          age: profile.nutri?.edad ?? '',
          collectMeasurements: !profile.nutri?.sinMediciones,
          confirmedUnusual: {},
          weight: profile.nutri?.peso ?? '',
          height: profile.nutri?.altura ?? '',
          allergies: profile.nutri?.alergias ?? [],
          noLikes: profile.nutri?.noGusta ?? [],
          likes: profile.nutri?.gusta ?? [],
          otherAllergies: profile.nutri?.otrasAlergias ?? '',
          otherNoLikes: profile.nutri?.otrosNoGusta ?? '',
          otherLikes: profile.nutri?.otrosGusta ?? '',
          diagnosis: profile.nutri?.dictamen ?? '',
          healthConsent: Boolean(profile.nutri?.databaseChildId),
          didNotVisitSpecialist: false,
        }
      : emptyProfileDraft());
    setShowProfileEditor(true);
  };

  const saveProfile = async () => {
    if (role !== 'tutor') return;
    const name = profileDraft.name.trim();
    if (name.length < 2) {
      setProfileError('Escribe un nombre de al menos dos letras.');
      return;
    }
    const birthDate = parseBirthDate(profileDraft.birthDate);
    if (profileDraft.birthDate && !birthDate) {
      setProfileError('Escribe una fecha de nacimiento válida (DD/MM/AAAA).');
      return;
    }
    const syncError = validateInitialHealthSync({
      required: profileDraft.healthConsent && !editingProfile?.nutri?.databaseChildId,
      hasBirthDate: Boolean(birthDate),
      collectMeasurements: profileDraft.collectMeasurements,
      hasDiagnosis: Boolean(profileDraft.diagnosis),
      didNotVisitSpecialist: profileDraft.didNotVisitSpecialist,
    });
    if (syncError || (profileDraft.healthConsent && !birthDate)) {
      setProfileStep(1);
      setProfileError(syncError ?? 'Para guardar los datos de salud autorizados, registra su fecha de nacimiento.');
      return;
    }
    // La validación también corre aquí: ningún dato llega a guardarse sin pasarla.
    const validation = validateProfileDraft(profileDraft);
    if (!validation.canSave) {
      setProfileShowErrors(true);
      setProfileStep(1);
      setProfileError('Revisa los datos marcados antes de guardar. Lo demás que escribiste sigue aquí.');
      return;
    }
    const measurements = validation.normalized;
    const writtenAge = birthDate ? undefined : String(validation.age);
    const optedOut = profileDraft.collectMeasurements ? undefined : true;

    if (!dataRef.current || !authUser || writesBlocked.current) {
      setProfileError('Los datos todavía no están listos para guardar el perfil.');
      return;
    }
    if (offline && profileDraft.healthConsent && birthDate) {
      setProfileError('Sin conexión no se pueden guardar los datos de salud en la base de datos. Inténtalo cuando vuelva internet; lo que escribiste sigue aquí.');
      return;
    }

    setProfileSaving(true);
    setProfileError('');
    try {
      let databaseChildId = editingProfile?.nutri?.databaseChildId;
      if (profileDraft.healthConsent && birthDate && authUser) {
        const databaseName = editingProfile?.link && editingProfile.nutri
          ? editingProfile.nutri.nombre
          : name;
        const databaseTheme = editingProfile?.link && editingProfile.nutri
          ? editingProfile.nutri.genero
          : profileDraft.theme;
        databaseChildId = await saveDatabaseChildProfile({
          userId: authUser.id,
          databaseChildId,
          name: databaseName,
          birthDate,
          theme: databaseTheme,
          weight: measurements.weight,
          height: measurements.height,
          diagnosis: profileDraft.diagnosis,
          didNotVisitSpecialist: profileDraft.didNotVisitSpecialist,
          allergies: profileDraft.allergies,
          noLikes: profileDraft.noLikes,
          likes: profileDraft.likes,
          otherAllergies: profileDraft.otherAllergies,
          otherNoLikes: profileDraft.otherNoLikes,
          otherLikes: profileDraft.otherLikes,
          healthConsent: profileDraft.healthConsent,
        });
      }

      let updatedKey = editingProfile?.key ?? '';
      const queued = updateData(current => {
        const existing = editingProfile;
        const nutriId = existing?.nutri?.id ?? createId('nutri-child');
        const warriorId = existing?.warrior?.id ?? createId('warrior-child');
        const shouldLink = Boolean(existing?.link || (existing && (!existing.nutri || !existing.warrior)) || !existing);
        const linkId = existing?.link?.id ?? createId('profile-link');
        updatedKey = shouldLink ? `linked:${linkId}` : existing?.key ?? '';

        const nextNutri: NutriChild = existing?.nutri
          ? {
              ...existing.nutri,
              databaseChildId,
              nombre: existing.link ? existing.nutri.nombre : name,
              genero: existing.link ? existing.nutri.genero : profileDraft.theme,
              nacimiento: birthDate ?? undefined,
              edad: writtenAge,
              sinMediciones: optedOut,
              peso: measurements.weight,
              altura: measurements.height,
              alergias: profileDraft.allergies,
              noGusta: profileDraft.noLikes,
              otrasAlergias: profileDraft.otherAllergies.trim(),
              otrosNoGusta: profileDraft.otherNoLikes.trim(),
              gusta: profileDraft.likes,
              otrosGusta: profileDraft.otherLikes.trim(),
              dictamen: profileDraft.diagnosis || undefined,
            }
          : {
              id: nutriId,
              databaseChildId,
              nombre: name,
              genero: profileDraft.theme,
              nacimiento: birthDate ?? undefined,
              edad: writtenAge,
              sinMediciones: optedOut,
              peso: measurements.weight,
              altura: measurements.height,
              alergias: profileDraft.allergies,
              noGusta: profileDraft.noLikes,
              otrasAlergias: profileDraft.otherAllergies.trim(),
              otrosNoGusta: profileDraft.otherNoLikes.trim(),
              gusta: profileDraft.likes,
              otrosGusta: profileDraft.otherLikes.trim(),
              dictamen: profileDraft.diagnosis || undefined,
            };

        const nextWarrior: WarriorChild = existing?.warrior
          ? {
              ...existing.warrior,
              name: existing.link ? existing.warrior.name : name,
              theme: existing.link ? existing.warrior.theme : profileDraft.theme,
              avatar: profileDraft.avatar,
            }
          : {
              id: warriorId,
              name,
              avatar: profileDraft.avatar,
              theme: profileDraft.theme,
              points: 0,
              badges: [],
              days: {},
            };

        const profileLinks = current.profileLinks.filter(link =>
          existing?.link ? link.id !== existing.link.id : link.nutriId !== nutriId && link.warriorId !== warriorId,
        );
        if (shouldLink) {
          profileLinks.push({
            id: linkId,
            nutriId,
            warriorId,
            displayName: name,
            theme: profileDraft.theme,
          });
        }
        if (!updatedKey) updatedKey = profileReference(existing?.nutri ? 'nutribot' : 'warrior-kids', existing?.nutri?.id ?? existing?.warrior?.id ?? '');
        const progressKey = shouldLink ? profileReference('warrior-kids', warriorId) : existing?.progressKey ?? updatedKey;
        // Al vincular un perfil antiguo cambia su clave: se copia su avance para no perderlo.
        const previousKey = existing?.progressKey;
        const moved = previousKey && previousKey !== progressKey ? previousKey : null;
        const copyTo = <T,>(records: Record<string, T>): Record<string, T> => (
          moved && records[moved] !== undefined && records[progressKey] === undefined
            ? { ...records, [progressKey]: records[moved] }
            : records
        );
        const previousAvatar = existing ? current.avatarSelections[existing.key] : undefined;
        return {
          ...current,
          dailyLogs: copyTo(current.dailyLogs),
          childProgress: copyTo(current.childProgress),
          missionClaims: copyTo(current.missionClaims),
          avatarSelections: previousAvatar && updatedKey && !current.avatarSelections[updatedKey]
            ? { ...current.avatarSelections, [updatedKey]: previousAvatar }
            : current.avatarSelections,
          profileColors: { ...(current.profileColors ?? {}), [progressKey]: profileDraft.colorTheme },
          nutribot: {
            ...current.nutribot,
            ninos: existing?.nutri
              ? current.nutribot.ninos.map(child => child.id === nutriId ? nextNutri : child)
              : [...current.nutribot.ninos, nextNutri],
          },
          warriorKids: {
            ...current.warriorKids,
            children: existing?.warrior
              ? current.warriorKids.children.map(child => child.id === warriorId ? nextWarrior : child)
              : [...current.warriorKids.children, nextWarrior],
          },
          profileLinks,
        };
      });
      if (!queued) {
        setProfileError('No se pudo guardar el perfil. Revisa el aviso de conexión.');
        return;
      }
      setShowProfileEditor(false);
      setProfileStep(0);
      setEditingProfile(null);
      setSelectedProfileKey(updatedKey || null);
      setTab('Familia');
      setNotice(profileDraft.healthConsent
        ? `Perfil de ${name} guardado, con sus datos de salud autorizados.`
        : `Perfil de ${name} guardado en tu espacio familiar.`);
      if (!editingProfile) requestSoundCue('celebracion');
    } catch (error) {
      setProfileError(friendlyError(error, 'No se pudo guardar el perfil en la base de datos.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const toggleProfileFood = (field: 'allergies' | 'noLikes' | 'likes', value: string) => {
    setProfileDraft(current => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter(item => item !== value)
        : [...current[field], value],
    }));
  };

  const deleteProfile = async () => {
    if (role !== 'tutor' || !profileToArchive) return;
    const profile = profileToArchive;
    const keys = unique([
      profile.key,
      profile.progressKey,
      ...(profile.nutri ? [profileReference('nutribot', profile.nutri.id)] : []),
      ...(profile.warrior ? [profileReference('warrior-kids', profile.warrior.id)] : []),
    ]);
    const paths: string[] = [];
    for (const key of keys) {
      for (const log of Object.values(dataRef.current?.dailyLogs[key] ?? {})) {
        for (const activity of Object.values(log.activities)) {
          if (activity.evidenceUri && !activity.evidenceUri.startsWith('data:')) paths.push(activity.evidenceUri);
        }
      }
    }
    try {
      for (const path of paths) await deleteEvidence(path);
    } catch (error) {
      const reason = errorReason(error);
      setNotice(reason
        ? `No se eliminaron las fotos, así que el perfil se conservó. ${reason}`
        : 'No se eliminaron las fotos, así que el perfil se conservó.');
      return;
    }
    if (profile.nutri?.databaseChildId && authUser) {
      try {
        await deleteDatabaseChild(authUser.id, profile.nutri.databaseChildId);
      } catch (error) {
        setNotice(friendlyError(error, 'No se eliminó el perfil de la base de datos; se conservaron los datos familiares.'));
        return;
      }
    }
    const omit = <T,>(record: Record<string, T>) =>
      Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
    updateData(current => ({
      ...current,
      nutribot: {
        ...current.nutribot,
        ninos: current.nutribot.ninos.filter(child => child.id !== profile.nutri?.id),
      },
      warriorKids: {
        ...current.warriorKids,
        children: current.warriorKids.children.filter(child => child.id !== profile.warrior?.id),
        selectedChildId: current.warriorKids.selectedChildId === profile.warrior?.id
          ? null
          : current.warriorKids.selectedChildId,
      },
      profileLinks: current.profileLinks.filter(link => link.id !== profile.link?.id),
      archivedProfiles: current.archivedProfiles.filter(key => !keys.includes(key)),
      avatarSelections: omit(current.avatarSelections),
      dailyLogs: omit(current.dailyLogs),
      childProgress: omit(current.childProgress),
      missionClaims: omit(current.missionClaims),
    }));
    if (selectedProfileKey === profile.key) setSelectedProfileKey(null);
    setProfileToArchive(null);
    setNotice('El perfil y todos sus datos se eliminaron de forma permanente.');
  };

  const updateDailyLog = (
    profile: UnifiedProfile,
    date: string,
    update: (log: UnifiedDailyLog) => UnifiedDailyLog,
  ) => {
    return updateData(current => {
      const previous = current.dailyLogs[profile.progressKey]?.[date] ?? EMPTY_LOG;
      const nextLog = update(previous);
      const dailyLogs = {
        ...current.dailyLogs,
        [profile.progressKey]: {
          ...(current.dailyLogs[profile.progressKey] ?? {}),
          [date]: nextLog,
        },
      };
      const warriorKids = profile.warrior
        ? {
            ...current.warriorKids,
            children: current.warriorKids.children.map(child => child.id === profile.warrior?.id
              ? {
                  ...child,
                  days: {
                    ...child.days,
                    [date]: {
                      activities: Object.fromEntries(
                        Object.entries(nextLog.activities).map(([id, activity]) => [id, activity.status]),
                      ),
                      water: nextLog.water,
                      foodGroups: nextLog.foodGroups,
                      mood: nextLog.mood,
                    },
                  },
                }
              : child),
          }
        : current.warriorKids;
      return { ...current, dailyLogs, warriorKids };
    });
  };

  const updateProfileProgress = (
    profile: UnifiedProfile,
    update: (progress: ChildProgress) => ChildProgress,
  ) => {
    updateData(current => {
      const progress = getProgress(current, profile);
      const nextProgress = update(progress);
      return {
        ...current,
        childProgress: { ...current.childProgress, [profile.progressKey]: nextProgress },
        warriorKids: profile.warrior
          ? {
              ...current.warriorKids,
              children: current.warriorKids.children.map(child => child.id === profile.warrior?.id
                ? { ...child, points: nextProgress.points, badges: nextProgress.badges }
                : child),
            }
          : current.warriorKids,
      };
    });
  };

  const addWater = (amount: number) => {
    if (!selectedProfile) return;
    updateDailyLog(selectedProfile, todayKey(), log => ({ ...log, water: Math.max(0, log.water + amount) }));
  };

  const toggleFoodGroup = (group: string) => {
    if (!selectedProfile) return;
    updateDailyLog(selectedProfile, todayKey(), log => ({
      ...log,
      foodGroups: log.foodGroups.some(item => canonicalFoodGroup(item) === group)
        ? log.foodGroups.filter(item => canonicalFoodGroup(item) !== group)
        : [...log.foodGroups, group],
    }));
  };

  const setMood = (mood: string | null) => {
    if (!selectedProfile) return;
    const saved = updateDailyLog(selectedProfile, todayKey(), log => ({ ...log, mood }));
    if (saved) setNotice(mood ? 'Gracias por compartir cómo te sientes.' : 'Listo, quitamos tu respuesta de hoy.');
  };

  const saveSleep = () => {
    if (!selectedProfile) return;
    const hours = Number(sleepInput);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
      setNotice('Escribe una cantidad de horas válida, entre 0 y 24.');
      return;
    }
    updateDailyLog(selectedProfile, todayKey(), log => ({ ...log, sleepHours: hours }));
    setSleepInput('');
    setNotice('Registramos tus horas de sueño.');
  };

  useEffect(() => {
    if (!activityPlaying || !activityModal) return undefined;
    let last = Date.now();
    const flush = () => {
      const now = Date.now();
      const delta = now - last;
      last = now;
      setActivityElapsed(current => current + delta);
    };
    const id = setInterval(flush, 250);
    return () => { clearInterval(id); flush(); };
  }, [activityPlaying, activityModal]);

  // Borra una foto ya subida que al final no se usó (se canceló el envío o se quitó).
  const discardActivityUpload = () => {
    const pending = activityUploadRef.current;
    activityUploadRef.current = null;
    if (pending) void deleteEvidence(pending.path).catch(() => undefined);
  };

  const closeActivity = () => {
    if (activitySubmittingRef.current) return;
    discardActivityUpload();
    setActivitySaveFailed(false);
    setActivityPlaying(false);
    setActivityModal(null);
  };

  const removeActivityPhoto = () => {
    discardActivityUpload();
    setActivityPhoto(null);
  };

  const submitActivity = async () => {
    const current = dataRef.current;
    if (!selectedProfile || !activityModal || !current || activitySubmittingRef.current) return;
    const duration = Number(activityDuration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
      setActivityError('Escribe los minutos con números, de 1 a 180.');
      return;
    }
    const todayActivity = getDailyLog(current, selectedProfile, todayKey()).activities[activityModal.id];
    if (!canRegisterActivity(todayActivity)) {
      setActivityError(todayActivity?.status === 'approved'
        ? 'Esta actividad ya fue aprobada hoy. ¡Bien hecho! Puedes elegir otra.'
        : 'Esta actividad ya está en revisión.');
      return;
    }
    if (activityPhoto && offline) {
      setActivityError('Sin conexión no se puede subir la foto. Quítala para enviar sin foto; tus minutos siguen aquí.');
      return;
    }
    activitySubmittingRef.current = true;
    setActivitySubmitting(true);
    setActivityError('');
    setActivitySaveFailed(false);
    try {
      let evidenceUri: string | null = null;
      if (activityPhoto) {
        // Si un intento anterior ya subió esta foto, se reutiliza en vez de subirla otra vez.
        if (activityUploadRef.current?.uri !== activityPhoto.uri) {
          discardActivityUpload();
          activityUploadRef.current = { uri: activityPhoto.uri, path: await storeEvidence(activityPhoto) };
        }
        evidenceUri = activityUploadRef.current.path;
      }
      const queued = updateDailyLog(selectedProfile, todayKey(), log => ({
        ...log,
        activities: {
          ...log.activities,
          [activityModal.id]: { status: 'pending', duration, evidenceUri },
        },
      }));
      if (!queued) {
        setActivitySaveFailed(true);
        setActivityError('No se pudo guardar todavía. Tus minutos y tu foto siguen aquí.');
        return;
      }
      // Espera la confirmación de la nube antes de cerrar para no perder lo capturado.
      // Sin internet queda guardada en el teléfono y se envía al volver la conexión.
      await writeQueue.current;
      activityUploadRef.current = null;
      setActivityModal(null);
      setActivityPhoto(null);
      setActivityDuration('');
      setActivityError('');
      setNotice(dirtyRef.current
        ? '¡Actividad guardada en este teléfono! Se enviará a tu persona tutora cuando vuelva internet.'
        : '¡Actividad enviada! Tu persona tutora la revisará.');
    } catch (error) {
      setActivitySaveFailed(writesBlocked.current);
      setActivityError(friendlyError(error, 'No se pudo enviar. Tus minutos y tu foto siguen aquí; inténtalo de nuevo.'));
    } finally {
      activitySubmittingRef.current = false;
      setActivitySubmitting(false);
    }
  };

  // Tras un error de guardado: recarga los datos de la nube y reintenta con lo ya capturado.
  const retryActivityAfterReload = async () => {
    if (activitySubmittingRef.current) return;
    setActivityError('');
    const loaded = await loadData();
    if (!loaded) {
      setActivityError('Sigue sin haber conexión. Tus minutos y tu foto siguen aquí.');
      return;
    }
    setActivitySaveFailed(false);
    await submitActivity();
  };

  const storeEvidence = async (photo: PhotoDraft): Promise<string> => {
    if (!session) throw userError('Inicia sesión para guardar la evidencia.');
    return uploadEvidence(session.id, photo.uri, photo.fileName, photo.mimeType);
  };

  const pickActivityPhoto = async (source: 'camera' | 'library') => {
    setActivityError('');
    try {
      if (source === 'camera' && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setActivityError('Necesitas permitir el acceso a la cámara para tomar una foto.');
          return;
        }
      }
      if (source === 'library' && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setActivityError('Necesitas permitir el acceso a tus fotos para elegir evidencia.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
      };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) {
        setActivityError('No se recibió una imagen. Inténtalo otra vez.');
        return;
      }
      setActivityPhoto({
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
    } catch (error) {
      setActivityError(friendlyError(error, 'No se pudo abrir la cámara o la galería.'));
    }
  };

  const reviewActivity = async (profile: UnifiedProfile, date: string, activityId: string, approve: boolean) => {
    if (role !== 'tutor') return;
    const reviewKey = `${profile.key}-${date}-${activityId}`;
    if (reviewingActivities.current.has(reviewKey)) return;
    const log = dataRef.current?.dailyLogs[profile.progressKey]?.[date];
    const activity = log?.activities[activityId];
    if (!activity || !canApproveActivity(activity)) return;
    if (approve) {
      const catalog = activityFor(activityId);
      const saved = updateDailyLog(profile, date, current => ({
        ...current,
        activities: { ...current.activities, [activityId]: { ...activity, status: 'approved' } },
      }));
      if (!saved) return;
      updateProfileProgress(profile, current => ({
        ...current,
        points: current.points + (catalog?.points ?? 10),
        badges: unique([...current.badges, 'actividad']),
      }));
      setNotice(`Actividad aprobada: ${catalog?.points ?? 10} puntos para ${profile.name}.`);
      return;
    }
    if (activity.evidenceUri && !activity.evidenceUri.startsWith('data:')) {
      reviewingActivities.current.add(reviewKey);
      setReviewingKeys(current => [...current, reviewKey]);
      try {
        await deleteEvidence(activity.evidenceUri);
      } catch (error) {
        const reason = errorReason(error);
        setNotice(reason
          ? `No se eliminó la foto, así que el registro se conservó. ${reason}`
          : 'No se eliminó la foto, así que el registro se conservó.');
        return;
      } finally {
        reviewingActivities.current.delete(reviewKey);
        setReviewingKeys(current => current.filter(key => key !== reviewKey));
      }
    }
    updateDailyLog(profile, date, current => {
      const activities = { ...current.activities };
      delete activities[activityId];
      return { ...current, activities };
    });
    setNotice(activity.evidenceUri
      ? 'Se pidió volver a registrar la actividad. La foto se eliminó.'
      : 'Se pidió volver a registrar la actividad.');
  };

  // Cambia el estado del reto de un perfil y ajusta sus puntos al verificarlo o quitar la verificación.
  const setAssignmentStatus = (id: string, status: FamilyAssignmentStatus, points: number) => {
    const assignment = (dataRef.current?.familyAssignments ?? []).find(item => item.id === id);
    if (!assignment) return false;
    const profile = profiles.find(item => item.progressKey === assignment.progressKey);
    if (assignment.status === status) return true;
    const isVerified = status === 'verificado';
    const delta = assignmentPointDelta(assignment.status, status, points, assignment.pointsAwarded);
    const awarded = isVerified ? points : undefined;
    const saved = updateData(current => ({
      ...current,
      familyAssignments: (current.familyAssignments ?? []).map(item => (
        item.id === id ? { ...item, status, updatedAt: nowIso(), pointsAwarded: awarded } : item
      )),
    }));
    if (saved && profile && delta !== 0) {
      updateProfileProgress(profile, progress => ({
        ...progress,
        points: Math.max(0, progress.points + delta),
        badges: isVerified ? unique([...progress.badges, 'mision']) : progress.badges,
      }));
    }
    return saved;
  };

  const familyActions: FamilyActions = {
    assignChallenge: (challengeId, progressKeys) => updateData(current => ({
      ...current,
      familyAssignments: [
        ...(current.familyAssignments ?? []),
        ...assignableProfiles(current.familyAssignments ?? [], challengeId, progressKeys).map((progressKey): FamilyAssignment => ({
          id: createId('reto'),
          challengeId,
          progressKey,
          status: 'asignado',
          assignedAt: nowIso(),
          updatedAt: nowIso(),
        })),
      ],
    })),
    setAssignmentStatus,
    removeAssignment: id => updateData(current => ({
      ...current,
      familyAssignments: (current.familyAssignments ?? []).filter(item => item.id !== id),
    })),
    requestReward: (rewardId, progressKey, cost, totalStock) => {
      const current = dataRef.current;
      const profile = profiles.find(item => item.progressKey === progressKey);
      if (!current || !profile) return false;
      if (!canRequestReward(getProgress(current, profile).points, current.rewardRequests ?? [], progressKey, rewardId, cost, totalStock)) return false;
      return updateData(state => ({
        ...state,
        rewardRequests: [
          ...(state.rewardRequests ?? []),
          { id: createId('premio'), rewardId, progressKey, cost, status: 'solicitado', requestedAt: nowIso(), updatedAt: nowIso() },
        ],
      }));
    },
    setRewardRequestStatus: (id, status, totalStock) => {
      const current = dataRef.current;
      const requests = current?.rewardRequests ?? [];
      const request = requests.find(item => item.id === id);
      if (!current || !request) return false;
      const profile = profiles.find(item => item.progressKey === request.progressKey);
      const balance = profile ? rewardBalance(getProgress(current, profile).points, requests, request.progressKey) : 0;
      const stock = totalStock ?? family?.rewards.find(reward => reward.id_recompensa === request.rewardId)?.cantidad_disponible ?? 0;
      if (!canChangeRewardRequest(balance, requests, id, status, stock)) return false;
      return updateData(state => ({
        ...state,
        rewardRequests: (state.rewardRequests ?? []).map(item => (item.id === id ? { ...item, status, updatedAt: nowIso() } : item)),
      }));
    },
    removeRewardRequest: id => updateData(current => ({
      ...current,
      rewardRequests: (current.rewardRequests ?? []).filter(item => item.id !== id),
    })),
    saveMealPlan: plan => updateData(current => {
      const plans = current.mealPlans ?? [];
      const { id, ...values } = plan;
      return {
        ...current,
        mealPlans: id
          ? plans.map(item => (item.id === id ? { ...item, ...values } : item))
          : [...plans, { id: createId('plan'), recipes: [], ...values }],
      };
    }),
    removeMealPlan: id => updateData(current => ({
      ...current,
      mealPlans: (current.mealPlans ?? []).filter(item => item.id !== id),
    })),
    addPlanRecipe: (planId, recipe) => updateData(current => ({
      ...current,
      mealPlans: (current.mealPlans ?? []).map(item => (item.id === planId ? {
        ...item,
        // Una receta por fecha y momento de comida: la nueva reemplaza a la anterior.
        recipes: [...item.recipes.filter(entry => entry.date !== recipe.date || entry.meal !== recipe.meal), recipe],
      } : item)),
    })),
    removePlanRecipe: (planId, recipe) => updateData(current => ({
      ...current,
      mealPlans: (current.mealPlans ?? []).map(item => (item.id === planId ? {
        ...item,
        recipes: item.recipes.filter(entry => entry.date !== recipe.date || entry.meal !== recipe.meal || entry.recipeId !== recipe.recipeId),
      } : item)),
    })),
  };

  const claimMission = (missionId: string, points: number) => {
    const latest = dataRef.current;
    if (!selectedProfile || !latest) return;
    const date = todayKey();
    const key = selectedProfile.progressKey;
    const claims = claimOnce(latest.missionClaims[key]?.[date] ?? [], missionId);
    if (!claims) return;
    const saved = updateData(current => ({
      ...current,
      missionClaims: {
        ...current.missionClaims,
        [key]: { ...(current.missionClaims[key] ?? {}), [date]: claims },
      },
    }));
    if (!saved) return;
    updateProfileProgress(selectedProfile, progress => ({
      ...progress,
      points: progress.points + points,
      badges: unique([...progress.badges, 'mision']),
    }));
    setNotice(`¡Reto completado! Ganaste ${points} puntos.`);
  };

  const assignRecipe = (day: string, meal: keyof WeeklyMeals, recipeId: string | null) => {
    if (role !== 'tutor') return;
    updateData(current => ({
      ...current,
      weeklyMeals: {
        ...current.weeklyMeals,
        [day]: { ...(current.weeklyMeals[day] ?? defaultMeals()), [meal]: recipeId },
      },
    }));
    setMenuPicker(null);
    setNotice(`Receta agregada a ${getMealName(meal).toLocaleLowerCase('es-MX')} del ${day}.`);
  };

  const openMenuPicker = (day: string, meal: keyof WeeklyMeals) => {
    setMenuRecipeSearch('');
    setMenuRecipeFilter('todas');
    setMenuPicker({ day, meal });
  };

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatPending) return;
    if (offline) {
      setChatError('NutriBot necesita internet. Tu mensaje sigue aquí para cuando vuelva la conexión.');
      return;
    }
    setChatError('');
    setChatPending(true);
    const messages = [...chatMessages.slice(-8), { from: 'child' as const, text }].map(message => ({
      role: message.from === 'child' ? 'user' : 'model',
      text: message.text,
    }));

    try {
      const { data, error } = await getSupabaseClient().functions.invoke<unknown>('nutribot-chat', {
        body: { messages },
      });
      if (error) throw error;
      if (
        !data
        || typeof data !== 'object'
        || !('reply' in data)
        || typeof data.reply !== 'string'
        || !data.reply.trim()
      ) {
        throw new Error('La respuesta de NutriBot no tiene un formato válido.');
      }

      const reply = data.reply.trim();
      setChatMessages(current => [
        ...current,
        { from: 'child', text },
        { from: 'bot', text: reply },
      ]);
      setChatInput(current => current === text ? '' : current);
    } catch (error) {
      let message = friendlyError(error, 'No pude conectar con NutriBot. Inténtalo de nuevo.');
      if (
        error
        && typeof error === 'object'
        && 'context' in error
        && error.context instanceof Response
      ) {
        const payload: unknown = await error.context.clone().json().catch(() => null);
        if (
          payload
          && typeof payload === 'object'
          && 'error' in payload
          && typeof payload.error === 'string'
        ) {
          message = payload.error;
        }
      }
      setChatError(message);
    } finally {
      setChatPending(false);
    }
  };

  const toggleSharing = (value: boolean) => {
    if (role !== 'tutor') return;
    updateData(current => ({ ...current, progressSharingEnabled: value }));
  };

  const changeWaterGoal = (amount: number) => {
    if (role !== 'tutor') return;
    updateData(current => ({
      ...current,
      warriorKids: {
        ...current.warriorKids,
        waterGoal: Math.max(1, Math.min(12, current.warriorKids.waterGoal + amount)),
      },
    }));
  };

  const openAvatarEditor = () => {
    if (role !== 'child' || !selectedProfile || !data) return;
    setAvatarDraft({
      profileKey: selectedProfile.key,
      selection: { ...(data.avatarSelections[selectedProfile.key] ?? defaultAvatarSelection(selectedProfile.theme)) },
      changed: [],
    });
    setAvatarCategory('piel');
    setAvatarHint('');
    setChildSettingsSection('avatar');
    setTab('Ajustes');
  };

  const setAvatarPart = (index: number) => {
    setAvatarDraft(current => current ? {
      ...current,
      selection: { ...current.selection, [avatarCategory]: index },
      changed: current.changed.includes(avatarCategory) ? current.changed : [...current.changed, avatarCategory],
    } : current);
  };

  const surpriseAvatar = () => {
    if (!data || !selectedProfile) return;
    const points = pointsFor(selectedProfile);
    const categories = AVATAR_KEYS.filter(key => key !== 'fondo');
    // Solo elige entre lo que el perfil ya desbloqueó.
    const pick = (part: AvatarPart) => {
      const unlocked = AVATAR_CATALOG[part].map((item, index) => ({ item, index })).filter(({ item }) => isUnlocked(item, points));
      return unlocked[Math.floor(Math.random() * unlocked.length)]?.index ?? 0;
    };
    const randomized = { piel: pick('piel'), cabello: pick('cabello'), ropa: pick('ropa'), accesorio: pick('accesorio') };
    setAvatarHint('');
    setAvatarDraft(current => current ? {
      ...current,
      selection: { ...current.selection, ...randomized },
      changed: categories,
    } : current);
  };

  const saveAvatar = () => {
    if (role !== 'child' || !selectedProfile || !avatarDraft || avatarDraft.profileKey !== selectedProfile.key) return;
    if (!dataRef.current || !authUser) {
      setStorageError('Los datos todavía no están listos. Intenta de nuevo en un momento.');
      return;
    }
    if (writesBlocked.current) {
      setStorageError('No se guardarán más cambios hasta volver a cargar tus datos.');
      return;
    }
    if (!buildProfiles(dataRef.current).some(profile => profile.key === avatarDraft.profileKey)) {
      setNotice('Este perfil ya no está disponible. Pide ayuda a la persona tutora.');
      return;
    }
    if (avatarDraft.changed.length) {
      const queued = updateData(current => {
        const selection = { ...(current.avatarSelections[avatarDraft.profileKey] ?? defaultAvatarSelection(selectedProfile.theme)) };
        avatarDraft.changed.forEach(key => { selection[key] = avatarDraft.selection[key]; });
        return { ...current, avatarSelections: { ...current.avatarSelections, [avatarDraft.profileKey]: selection } };
      });
      if (queued) setNotice('¡Tu avatar quedó listo!');
    }
    setAvatarDraft(null);
    setChildSettingsSection('main');
  };

  const logout = async () => {
    if (role !== 'tutor') return;
    setAuthError('');
    if (dirtyRef.current) {
      setNotice(offlineRef.current
        ? 'Tienes cambios sin subir. Conéctate a internet para subirlos antes de cerrar sesión.'
        : 'Se están subiendo tus cambios. Espera un momento y vuelve a intentarlo.');
      return;
    }
    const userId = authUser?.id;
    try {
      // Sin internet solo se cierra la sesión en este teléfono.
      const { error } = await getSupabaseClient().auth.signOut(offlineRef.current ? { scope: 'local' } : undefined);
      if (error) throw error;
      if (userId) {
        cacheChain.current = cacheChain.current.then(() => clearOfflineCache(userId)).catch(() => undefined);
        await cacheChain.current;
      }
      setLoadError('');
      setRegisterMode(false);
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
      setAuthNotice('');
      setSelectedProfileKey(null);
      setSoundCue(null);
      setRole('tutor');
      setTab('Familia');
    } catch (error) {
      const message = friendlyError(error, 'No se pudo cerrar la sesión.');
      setAuthError(message);
      setStorageError(message);
    }
  };

  const closeTutorGate = () => {
    if (tutorGateBusy) return;
    setShowTutorGate(false);
    setTutorGatePassword('');
    setTutorGateError('');
  };

  const requestRoleChange = (nextRole: AccountRole) => {
    if (nextRole === role) return;
    if (nextRole === 'child') {
      if (profiles.length === 0) {
        setNotice('Primero crea un perfil infantil.');
        return;
      }
      if (profiles.length > 1) {
        setShowChildProfilePicker(true);
        return;
      }
      enterChildMode(profiles[0].key);
      return;
    }

    if (offline) {
      setNotice('Para volver a Tutor se necesita internet, porque así se verifica la contraseña. Mientras tanto puedes seguir en Niñez.');
      return;
    }
    if (tutorGateLockUntil !== null && Date.now() < tutorGateLockUntil) {
      setTutorGateLockRemaining(Math.max(1, Math.ceil((tutorGateLockUntil - Date.now()) / 1000)));
      setTutorGateError('');
    } else {
      setTutorGateLockRemaining(0);
      setTutorGateError('');
    }
    setTutorGatePassword('');
    setShowTutorGate(true);
  };

  const enterChildMode = (profileKey: string) => {
    if (authUser) startTransition('perfil', profileKey, authUser.id);
    setNotice('');
    setSelectedProfileKey(profileKey);
    setRole('child');
    setTab('Familia');
    setChildSettingsSection('main');
    setAvatarDraft(null);
    setShowChildProfilePicker(false);
    setShowProfileEditor(false);
    setProfileToArchive(null);
    setMenuPicker(null);
    requestSoundCue('rol');
  };

  const cancelChildProfilePicker = () => {
    setShowChildProfilePicker(false);
  };

  const confirmTutorGate = async () => {
    if (role !== 'child' || tutorGateBusy) return;
    if (tutorGateLockUntil !== null && Date.now() < tutorGateLockUntil) {
      setTutorGateLockRemaining(Math.max(1, Math.ceil((tutorGateLockUntil - Date.now()) / 1000)));
      return;
    }
    if (tutorGateLockUntil !== null) {
      tutorGateFailedAttempts.current = 0;
      setTutorGateLockUntil(null);
      setTutorGateLockRemaining(0);
    }
    const email = session?.email.trim();
    const userId = authUser?.id;
    if (!email || !userId) {
      setTutorGateError('No encontramos una sesión tutora activa para verificar.');
      setTutorGatePassword('');
      return;
    }
    if (!tutorGatePassword) {
      setTutorGateError('Escribe la contraseña de la cuenta tutora.');
      return;
    }

    setTutorGateBusy(true);
    setTutorGateError('');
    try {
      await verifyTutorPassword(email, tutorGatePassword, userId);
      tutorGateFailedAttempts.current = 0;
      setNotice('');
      setRole('tutor');
      setTab('Familia');
      setShowTutorGate(false);
      setTutorGateError('');
      startTransition('tutor', userId, userId);
      requestSoundCue('rol');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/network|fetch|timeout|offline|aborted/i.test(message)) {
        setTutorGateError('No se pudo verificar la contraseña. Revisa tu conexión a internet e inténtalo de nuevo.');
        return;
      }
      tutorGateFailedAttempts.current += 1;
      if (tutorGateFailedAttempts.current >= 5) {
        setTutorGateLockUntil(Date.now() + 30_000);
        setTutorGateLockRemaining(30);
        setTutorGateError('');
      } else if (/invalid login credentials|invalid credentials/i.test(message)) {
        setTutorGateError('La contraseña no es correcta. Inténtalo de nuevo.');
      } else {
        setTutorGateError('No se pudo verificar la contraseña. Inténtalo de nuevo.');
      }
    } finally {
      setTutorGateBusy(false);
      setTutorGatePassword('');
    }
  };

  const retryConnection = () => {
    setLoadError('');
    if (authUser) {
      setLoading(true);
      void loadData();
      return;
    }
    setLoading(true);
    try {
      void getSupabaseClient().auth.getSession().then(({ data: sessionData, error }) => {
        if (error) throw error;
        setAuthUser(sessionData.session?.user ?? null);
        setAuthReady(true);
        setLoading(false);
      }).catch(error => {
        setLoadError(friendlyError(error, 'No se pudo restaurar tu sesión.'));
        setLoading(false);
      });
    } catch (error) {
      setLoadError(friendlyError(error, 'No se pudo iniciar la app.'));
      setLoading(false);
    }
  };

  const renderBrand = () => (
    <View style={styles.brandLockup}>
      <Image source={require('@/assets/images/wk-logo.png')} style={screenStyles.loginLogo} resizeMode="contain" />
      <View>
        <Text style={styles.brandTitle}>Warrior Kids</Text>
        <Text style={styles.brandCaption}>CRECEMOS EN FAMILIA</Text>
      </View>
    </View>
  );

  const renderLogin = () => (
    <SafeAreaView style={[styles.authRoot, { backgroundColor: loginTheme.colors.hero }]}>
      <KeyboardAvoidingView
        style={[styles.shell, { backgroundColor: loginTheme.colors.hero }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
          {renderBrand()}
          <Text style={styles.authTitle}>{registerMode ? '¡Qué gusto conocerte!' : 'Hola de nuevo'}</Text>
          <Text style={styles.authSubtitle}>
            {registerMode
              ? 'Crea una cuenta para guardar el espacio de tu familia.'
              : 'Inicia sesión para ver los perfiles de tu familia.'}
          </Text>
          <View style={styles.authCard}>
            {registerMode ? (
              <Field
                autoCapitalize="words"
                label="Nombre"
                onChangeText={setAuthName}
                placeholder="¿Cómo te llamas?"
                returnKeyType="next"
                value={authName}
              />
            ) : null}
            <Field
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Correo electrónico"
              onChangeText={setAuthEmail}
              placeholder="familia@ejemplo.com"
              returnKeyType="next"
              value={authEmail}
            />
            <Field
              autoCapitalize="none"
              autoComplete={registerMode ? 'new-password' : 'current-password'}
              label="Contraseña"
              onChangeText={setAuthPassword}
              onSubmitEditing={submitAuth}
              returnKeyType="done"
              secureTextEntry
              value={authPassword}
            />
            {authError ? <Text accessibilityRole="alert" style={styles.errorText}>{authError}</Text> : null}
            {authNotice ? <Text accessibilityRole="alert" style={styles.authNotice}>{authNotice}</Text> : null}
            <PillButton
              theme={loginTheme}
              label={authBusy ? 'Conectando…' : registerMode ? 'Crear cuenta' : 'Iniciar sesión'}
              disabled={authBusy}
              onPress={() => void submitAuth()}
            />
            {!registerMode ? (
              <Pressable
                accessibilityRole="button"
                disabled={authBusy}
                onPress={requestPasswordReset}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={authBusy}
              onPress={() => {
                setRegisterMode(value => !value);
                setAuthError('');
                setAuthNotice('');
              }}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                {registerMode ? 'Ya tengo una cuenta' : 'Crear una cuenta tutora'}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.authNotice, { color: SHARED.textoSecundario }]}>
            Cada cuenta tutora tiene su propio espacio familiar. Los datos se guardan en la nube y no se comparten con otras cuentas.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const renderTutorProfileStrip = () => (
    role === 'tutor' && profiles.length > 0 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profileStripScroll}>
        <View style={styles.profileStrip}>
          {profiles.map(profile => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Perfil de ${profile.name}${selectedProfile?.key === profile.key ? ', seleccionado' : ''}`}
              aria-selected={selectedProfile?.key === profile.key}
              key={profile.key}
              onPress={() => setSelectedProfileKey(profile.key)}
              style={[
                styles.profileChip,
                { borderRadius: RADIUS.pildora },
                // Borde más grueso: la selección no depende solo del color.
                selectedProfile?.key === profile.key && {
                  borderWidth: 2,
                  paddingVertical: SPACE[8] - 1,
                  paddingHorizontal: SPACE[12] - 1,
                  borderColor: theme.colors.acento,
                  backgroundColor: theme.colors.acentoSuave,
                },
              ]}
            >
              <AvatarIllustration
                theme={profile.theme}
                selection={data?.avatarSelections[profile.key]}
                size="small"
              />
              <Text style={[theme.type.tabActive, { color: theme.colors.texto }]}>{profile.name}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar perfil infantil"
            onPress={() => createOrEditProfile(null)}
            style={[styles.profileChip, { borderStyle: 'dashed', borderRadius: RADIUS.pildora }]}
          >
            <Text style={[theme.type.tabActive, { color: theme.colors.texto }]}>＋ Perfil</Text>
          </Pressable>
        </View>
      </ScrollView>
    ) : null
  );

  const renderTutorIntro = (eyebrow: string, title: string, subtitle: string) => (
    <View style={screenStyles.sectionHeading}>
      <Text style={[theme.type.caption, { color: theme.colors.acento }]}>{eyebrow}</Text>
      <Text role="heading" aria-level={1} style={[theme.type.h1, { color: theme.colors.texto }]}>{title}</Text>
      <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>{subtitle}</Text>
    </View>
  );

  const renderSelectionPill = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={selected ? `${label}, seleccionado` : label}
      aria-selected={selected}
      onPress={onPress}
      style={[screenStyles.selectionPill, { backgroundColor: selected ? theme.colors.acento : theme.colors.tarjeta }]}
    >
      <View style={[styles.horizontal, { gap: SPACE[4] }]}>
        {selected ? <Icon name="save" size={14} color={theme.colors.sobreAcento} /> : null}
        <Text style={[selected ? theme.type.tabActive : theme.type.tab, { color: selected ? theme.colors.sobreAcento : theme.colors.texto }]}>{label}</Text>
      </View>
    </Pressable>
  );

  // Día de la semana con la marca "hoy" para ubicarse rápido.
  const dayPillLabel = (day: string) => (WEEKDAYS[(new Date().getDay() + 6) % 7] === day ? `${day} (hoy)` : day);

  const renderIngredientPills = (ingredients: string[], concerns: string[] = []) => (
    <View style={styles.wrap}>
      {ingredients.map(ingredient => {
        const group = RECIPE_INGREDIENT_GROUPS[ingredient];
        const matchesAllergy = concerns.some(concern => matchesConcern(ingredient, concern));
        const colors = matchesAllergy
          ? { fondo: SHARED.errorFondo, texto: COLORS.error }
          : group ? FOOD_GROUP_COLORS[group] : { fondo: theme.colors.apagada, texto: theme.colors.textoSecundario };
        return (
          <View key={ingredient} style={[screenStyles.ingredientPill, { backgroundColor: colors.fondo }, matchesAllergy && { borderWidth: BORDER.fino, borderColor: SHARED.error }]}>
            <Text style={[theme.type.counter, { color: colors.texto }]}>{ingredient}</Text>
          </View>
        );
      })}
    </View>
  );

  const foodNames = (ids: string[]) => ids.map(id => FOOD_OPTIONS.find(food => food.id === id)?.name ?? id).join(', ');

  // Alergias y gustos son cosas distintas. Las alertas solo orientan: nunca confirman que algo sea seguro.
  const renderFoodPreferences = () => (
    <View style={{ gap: SPACE[8] }}>
      {profileAllergies.length ? (
        <View accessibilityRole="alert" style={[styles.notice, styles.horizontal, { backgroundColor: SHARED.errorFondo, borderColor: SHARED.errorBorde }]}>
          <Icon name="warning" size={18} color={COLORS.error} />
          <Text style={[styles.noticeText, styles.flex]}>Alergias registradas: {foodNames(profileAllergies)}.</Text>
        </View>
      ) : null}
      {profileNoLikes.length || profileLikes.length ? (
        <View style={[styles.notice, styles.horizontal]}>
          <Icon name="heart" size={18} color={COLORS.orange} />
          <Text style={[styles.noticeText, styles.flex]}>
            Preferencias (no son alergias):{profileNoLikes.length ? ` no le gusta ${foodNames(profileNoLikes)}.` : ''}{profileLikes.length ? ` Le gusta ${foodNames(profileLikes)}.` : ''}
          </Text>
        </View>
      ) : null}
      <Text style={styles.footer}>
        Las alertas son orientativas. Que no aparezca una alerta no significa que la receta sea segura: revisa ingredientes, etiquetas y posible contaminación cruzada.
      </Text>
    </View>
  );

  const renderRecipeAllergyWarning = (recipe: Recipe) => {
    const warnings = recipeWarnings(recipe, profileAllergies);
    if (!warnings.length) return null;
    return (
      <View accessibilityRole="alert" style={[styles.notice, styles.horizontal, { backgroundColor: SHARED.errorFondo, borderColor: SHARED.errorBorde }]}>
        <Icon name="warning" size={18} color={COLORS.error} />
        <Text style={[styles.noticeText, styles.flex, { color: COLORS.error }]}>
          Posible coincidencia con alergias registradas: {foodNames(warnings)}. Revísala con una persona adulta.
        </Text>
      </View>
    );
  };

  const renderAvatar = (profile: UnifiedProfile, size: 'large' | 'small' = 'large') => {
    return (
      <AvatarIllustration
        theme={profile.theme}
        selection={data?.avatarSelections[profile.key]}
        size={size}
      />
    );
  };

  const renderNoProfile = () => (
    <Card>
      <View style={styles.emptyState}>
        <Icon name="child" size={34} color={COLORS.blue} />
        <Text style={styles.cardTitle}>
          {role === 'child' && selectedProfileKey
            ? 'Este perfil ya no está disponible'
            : 'Todavía no hay un perfil infantil'}
        </Text>
        <Text style={[styles.body, { textAlign: 'center' }]}>
          {role === 'child' && selectedProfileKey
            ? 'Pide a la persona tutora que elija otro.'
            : 'Crea un perfil para llevar el registro de hábitos y actividades de tu familia.'}
        </Text>
        {role === 'tutor' ? (
          <Button title="Crear perfil infantil" icon="add" onPress={() => createOrEditProfile(null)} />
        ) : !selectedProfileKey ? (
          <Text style={styles.muted}>Pídele a la persona tutora que cree tu perfil.</Text>
        ) : null}
      </View>
    </Card>
  );

  // Retos que la persona tutora asignó desde Gestión.
  const renderFamilyChallenges = (profile: UnifiedProfile) => {
    if (!family) return null;
    const today = todayKey();
    const lastWeek = dateOffsetKey(7);
    const items = familyAssignments
      .filter(item => item.progressKey === profile.progressKey)
      .map(item => ({ item, challenge: family.challenges.find(challenge => challenge.id_reto === item.challengeId) }))
      .filter(({ item, challenge }) => challenge && (
        item.status === 'completado' ||
        (item.status === 'verificado' && item.updatedAt.slice(0, 10) >= lastWeek) ||
        (item.status !== 'verificado' && challenge.fecha_inicio.slice(0, 10) <= today && challenge.fecha_limite.slice(0, 10) >= today)
      ));
    if (!items.length) return null;
    return (
      <SectionCard theme={theme} role="child" title="Retos de tu familia" subtitle="Tu tutor los preparó para ti. Cuando lo logres, avísale.">
        {items.map(({ item, challenge }) => {
          if (!challenge) return null;
          const points = item.pointsAwarded ?? challenge.puntos_de_recompensa;
          const steps = challengeActivitySteps(challengeActivities, challenge.id_reto);
          return (
            <View key={item.id} style={{ gap: SPACE[4] }}>
            <ListRow
              theme={theme}
              icon="achievements"
              iconColor={theme.colors.puntos}
              title={challenge.descripcion_reto}
              subtitle={item.status === 'rechazado'
                ? `Tu tutor te pidió intentarlo otra vez · ${plural(points, 'punto')}`
                : `Hasta el ${shortDate(challenge.fecha_limite)} · ${plural(points, 'punto')}`}
              trailing={item.status === 'completado' ? (
                <Tag title="En revisión" color={COLORS.orange} icon="bell" />
              ) : item.status === 'verificado' ? (
                <Tag title={`+${points}`} color={COLORS.green} icon="check" />
              ) : (
                <Button
                  title="¡Lo logré!"
                  small
                  disabled={role !== 'child'}
                  onPress={() => {
                    if (setAssignmentStatus(item.id, 'completado', challenge.puntos_de_recompensa)) {
                      setNotice('¡Bien hecho! Tu tutor revisará tu reto.');
                    }
                  }}
                />
              )}
            />
            {steps.length ? (
              <View
                accessible
                accessibilityLabel={`Para lograrlo: ${steps.map(step => step.text).join('. ')}`}
                style={{ gap: SPACE[4] }}
              >
                <Text style={[theme.type.caption, { color: theme.colors.texto }]}>Para lograrlo:</Text>
                {steps.map(step => (
                  <View key={`${step.kind}-${step.text}`} style={styles.horizontal}>
                    <Icon name={step.kind === 'fisica' ? 'activity' : 'sparkles'} size={16} color={theme.colors.acento} />
                    <Text style={[theme.type.counter, styles.flex, { color: theme.colors.textoSecundario }]}>{step.text}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            </View>
          );
        })}
      </SectionCard>
    );
  };

  // Premios de Gestión: se piden con los puntos para premios y la persona tutora los entrega.
  const renderFamilyRewards = (profile: UnifiedProfile) => {
    if (!family) return null;
    const balance = rewardBalanceFor(profile);
    const mine = rewardRequests.filter(item => item.progressKey === profile.progressKey);
    const isRequested = (rewardId: number) => mine.some(item => item.rewardId === rewardId && item.status === 'solicitado');
    const rewards = family.rewards.filter(reward =>
      (reward.estado === 'activa' && rewardStockLeft(reward.cantidad_disponible, rewardRequests, reward.id_recompensa) > 0)
      || isRequested(reward.id_recompensa));
    const delivered = mine.filter(item => item.status === 'entregado').slice(-3);
    if (!rewards.length && !delivered.length) return null;
    return (
      <SectionCard theme={theme} role="child" title="Premios de tu familia" subtitle={`Puedes usar ${plural(balance, 'punto')} en premios.`}>
        {rewards.map(reward => {
          const missing = reward.costo_en_puntos - balance;
          return (
            <View key={reward.id_recompensa} style={{ gap: SPACE[8] }}>
              <PillBar
                theme={theme}
                icon="chest"
                color={theme.colors.puntos}
                text={`${reward.nombre_premio} · ${plural(reward.costo_en_puntos, 'punto')}`}
                ratio={reward.costo_en_puntos > 0 ? balance / reward.costo_en_puntos : 1}
              />
              {isRequested(reward.id_recompensa) ? (
                <Tag title="Pedido · espera a tu tutor" color={COLORS.orange} icon="bell" />
              ) : missing <= 0 ? (
                <Button
                  title="Pedir este premio"
                  small
                  icon="chest"
                  disabled={role !== 'child'}
                  onPress={() => {
                    if (familyActions.requestReward(reward.id_recompensa, profile.progressKey, reward.costo_en_puntos, reward.cantidad_disponible)) {
                      setNotice('¡Listo! Tu tutor verá que pediste este premio.');
                    }
                  }}
                />
              ) : (
                <Text style={styles.muted}>Te {missing === 1 ? 'falta 1 punto' : `faltan ${missing} puntos`}.</Text>
              )}
            </View>
          );
        })}
        {delivered.length ? (
          <View style={styles.wrap}>
            {delivered.map(item => (
              <Tag
                key={item.id}
                title={`Recibiste: ${family.rewards.find(reward => reward.id_recompensa === item.rewardId)?.nombre_premio ?? 'premio'}`}
                color={COLORS.green}
                icon="check"
              />
            ))}
          </View>
        ) : null}
        <Text style={[theme.type.counter, { color: theme.colors.textoSecundario }]}>
          Pedir un premio usa tus puntos para premios. Tus logros y tu avatar no cambian.
        </Text>
      </SectionCard>
    );
  };

  // Explica de forma sencilla cómo se ganan los puntos y para qué sirven.
  const renderPointsHelp = (profile: UnifiedProfile) => {
    const points = pointsFor(profile);
    const nextUnlock = Object.values(AVATAR_CATALOG).flat()
      .filter(item => item.cost > points)
      .sort((a, b) => a.cost - b.cost)[0];
    return (
      <SectionCard theme={theme} role="child" title="¿Para qué son mis puntos?">
        <Text style={[theme.type.body, { color: theme.colors.texto }]}>
          Ganas puntos al reclamar tus retos y cuando tu persona tutora aprueba una actividad. Sirven para desbloquear cosas de tu avatar y pedir premios.
        </Text>
        {nextUnlock ? (
          <View style={styles.horizontal}>
            <Icon name="avatar" size={18} color={theme.colors.acento} />
            <Text style={[theme.type.counter, styles.flex, { color: theme.colors.textoSecundario }]}>
              Con {plural(nextUnlock.cost - points, 'punto')} más desbloqueas: {nextUnlock.label}.
            </Text>
          </View>
        ) : null}
        <Text style={[theme.type.counter, { color: theme.colors.textoSecundario }]}>No pierdes puntos por saltarte un día.</Text>
      </SectionCard>
    );
  };

  const renderChildHome = () => {
    if (!selectedProfile || !data) return renderNoProfile();
    const log = getDailyLog(data, selectedProfile, todayKey());
    const progress = getProgress(data, selectedProfile);
    const waterGoal = data.warriorKids.waterGoal;
    const claimList = data.missionClaims[selectedProfile.progressKey]?.[todayKey()] ?? [];
    const missions = [
      { id: 'water-goal', title: 'Hidrátate a tu ritmo', detail: 'Llega a tu meta de agua de hoy.', icon: 'water' as const, points: MISSION_POINTS['water-goal'], ready: log.water >= waterGoal },
      { id: 'colorful-plate', title: 'Plato con colores', detail: 'Registra dos grupos de alimentos.', icon: 'food' as const, points: MISSION_POINTS['colorful-plate'], ready: new Set(log.foodGroups.map(canonicalFoodGroup).filter(Boolean)).size >= 2 },
      { id: 'mood-check', title: 'Cuéntanos cómo estás', detail: 'Si quieres, elige cómo te sientes.', icon: 'mood' as const, points: MISSION_POINTS['mood-check'], ready: Boolean(log.mood) },
    ];
    const approvedActivities = Object.values(log.activities).filter(activity => activity.status === 'approved').length;
    const age = profileAge(selectedProfile.nutri);
    const todaysActivities = activitiesForDay(activityCatalog.filter(activity => {
      const catalog = catalogActivityFor(activity.id);
      // Una edad fuera del rango infantil es un dato por corregir: no debe dejar sin actividades.
      if (age === null || age < CHILD_AGE_LIMITS.min || age > CHILD_AGE_LIMITS.max || !catalog) return true;
      const [minimum, maximum] = catalog.grupo_edad.match(/\d+/g)?.map(Number) ?? [];
      return minimum !== undefined && maximum !== undefined && age >= minimum && age <= maximum;
    }), todayKey());
    const claimedMissions = missions.filter(mission => claimList.includes(mission.id)).length;
    const badgeCount = unique(progress.badges).length;
    const foodCount = new Set(log.foodGroups.map(canonicalFoodGroup).filter(Boolean)).size;
    const hasActivityToday = Object.keys(log.activities).length > 0;
    const today = todayKey();
    const openFamilyChallenge = family ? familyAssignments
      .filter(item => item.progressKey === selectedProfile.progressKey && (item.status === 'asignado' || item.status === 'rechazado'))
      .map(item => family.challenges.find(challenge => challenge.id_reto === item.challengeId))
      .find(challenge => challenge && challenge.fecha_inicio.slice(0, 10) <= today && challenge.fecha_limite.slice(0, 10) >= today) : undefined;
    const step = nextChildStep({
      missions: missions.map(mission => ({ ...mission, claimed: claimList.includes(mission.id) })),
      familyChallengeTitle: openFamilyChallenge?.descripcion_reto ?? null,
      water: log.water,
      waterGoal,
      hasActivityToday,
      foodGroups: foodCount,
    });
    const stepCard = step.kind === 'claim'
      ? { title: `¡${step.points} puntos listos!`, detail: `Lograste “${step.title}”. Tócalo para guardarlos.`, icon: 'points' as const, actionLabel: `Reclamar +${step.points}`, onAction: () => claimMission(step.missionId, step.points) }
      : step.kind === 'family-challenge'
        ? { title: 'Tienes un reto familiar', detail: step.title, icon: 'achievements' as const, actionLabel: 'Ver mi reto', onAction: () => setChildHomeView('habitos') }
        : step.kind === 'water'
          ? { title: 'Toma un vaso de agua', detail: `${step.missing === 1 ? 'Te falta 1 vaso' : `Te faltan ${step.missing} vasos`} para tu meta de hoy. Sin prisa.`, icon: 'water' as const, actionLabel: 'Ya tomé un vaso', onAction: () => addWater(1) }
          : step.kind === 'movement'
            ? { title: 'Elige un movimiento', detail: 'Hay actividades nuevas para hoy. Escoge la que te guste.', icon: 'activity' as const, actionLabel: 'Ver actividades', onAction: () => setChildHomeView('movimiento') }
            : step.kind === 'plate'
              ? { title: 'Colores en tu plato', detail: 'Marca los grupos de alimentos que probaste hoy.', icon: 'food' as const, actionLabel: 'Marcar mi plato', onAction: () => setChildHomeView('habitos') }
              : { title: '¡Qué gran día!', detail: 'Ya diste tus pasos de hoy. Descansar también cuenta.', icon: 'sparkles' as const, actionLabel: 'Ver mis logros', onAction: () => setTab('Logros') };
    const daySteps = [
      { label: 'Agua', icon: 'water' as const, done: log.water >= waterGoal },
      { label: 'Plato', icon: 'food' as const, done: foodCount >= 2 },
      { label: 'Movimiento', icon: 'activity' as const, done: hasActivityToday },
    ];
    const doneSteps = daySteps.filter(item => item.done).length;
    const dayMessage = doneSteps === daySteps.length
      ? '¡Completaste tus 3 pasos de hoy!'
      : doneSteps === 0
        ? 'Hoy es un buen día para empezar, a tu ritmo.'
        : `¡Vas muy bien! Ya llevas ${doneSteps} de ${daySteps.length} pasos.`;
    // Vista de una sección: botón para volver a los mosaicos y su contenido.
    const section = (id: ChildHomeSection, title: string, children: ReactNode) => (
      childHomeView === id ? (
        <View style={screenStyles.collapsibleContent}>
          <Button title="Volver al inicio" icon="home" variant="outline" onPress={() => setChildHomeView(null)} />
          <Text role="heading" aria-level={1} style={[theme.type.h1, { color: theme.colors.texto }]}>{title}</Text>
          {children}
        </View>
      ) : null
    );
    return (
      <>
        {childHomeView === null ? (
          <>
            <HeroCard
              theme={theme}
              title={`¡Hola, ${selectedProfile.name}!`}
              subtitle={`${todayLabel()}${approvedActivities ? ` · ¡${plural(approvedActivities, 'actividad aprobada', 'actividades aprobadas')} hoy!` : ''} Cada pequeño paso cuenta.`}
              points={pointsFor(selectedProfile)}
              actionLabel="Personalizar avatar"
              onAction={openAvatarEditor}
            />
            <NextStepCard theme={theme} {...stepCard} />
            <DaySteps theme={theme} steps={daySteps} message={dayMessage} />
            <HomeGrid>
              <HomeTile
                theme={theme}
                title="Mis hábitos y retos"
                subtitle={`${claimedMissions} de ${missions.length} retos hoy`}
                icon="water"
                color={theme.colors.acento}
                tone="habitos"
                onPress={() => setChildHomeView('habitos')}
              />
              <HomeTile
                theme={theme}
                title="Mis logros"
                subtitle={badgeCount ? plural(badgeCount, 'insignia') : 'Tu primera insignia te espera'}
                icon="achievements"
                color={theme.colors.logros}
                tone="logros"
                onPress={() => setTab('Logros')}
              />
              <HomeTile
                theme={theme}
                title="Movimiento"
                subtitle={`${plural(todaysActivities.length, 'actividad', 'actividades')} para hoy`}
                icon="activity"
                color={theme.colors.completado}
                tone="movimiento"
                onPress={() => setChildHomeView('movimiento')}
              />
              <HomeTile
                theme={theme}
                title="NutriBot"
                subtitle="Platica sobre hábitos"
                icon="leaf"
                color={theme.colors.puntos}
                tone="nutribot"
                onPress={() => setChatOpen(true)}
              />
            </HomeGrid>
            {renderPointsHelp(selectedProfile)}
          </>
        ) : null}

        {section('habitos', 'Mis hábitos y retos', <>
        <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>Tus hábitos de hoy. Avanza con calma, a tu manera.</Text>

        <HabitCard
          theme={theme}
          title="Agua"
          icon="water"
          iconColor={theme.colors.agua}
          value={log.water}
          goal={waterGoal}
          onDecrease={() => addWater(-1)}
          onIncrease={() => addWater(1)}
          points={MISSION_POINTS['water-goal']}
        />
        <View style={styles.horizontal}>
          <Icon
            name={claimList.includes('water-goal') ? 'check' : log.water >= waterGoal ? 'achievements' : 'water'}
            size={16}
            color={claimList.includes('water-goal') ? theme.colors.completado : log.water >= waterGoal ? theme.colors.puntos : theme.colors.agua}
          />
          <Text style={[theme.type.counter, styles.flex, { color: theme.colors.textoSecundario }]}>
            {claimList.includes('water-goal')
              ? '¡Completaste tu reto de agua de hoy!'
              : log.water >= waterGoal
                ? `¡Llegaste a tu meta! Reclama ${MISSION_POINTS['water-goal']} puntos en Retos para hoy.`
                : log.water === 0
                  ? 'Empieza con un vaso de agua cuando quieras.'
                  : `¡Vas muy bien! Te ${waterGoal - log.water === 1 ? 'falta 1 vaso' : `faltan ${waterGoal - log.water} vasos`} para tu meta.`}
          </Text>
        </View>

        <SectionCard theme={theme} role="child" title="Colores en mi plato" subtitle="Marca los grupos que probaste hoy.">
          <View style={styles.wrap}>
            {([
              { id: 'frutas-verduras', label: 'Frutas y verduras', group: 'frutas', icon: 'produce' },
              { id: 'cereales', label: 'Cereales', group: 'cereales', icon: 'cereal' },
              { id: 'leguminosas', label: 'Leguminosas', group: 'leguminosas', icon: 'legume' },
              { id: 'origen-animal', label: 'Origen animal', group: 'animal', icon: 'animal' },
            ] as const).map(group => (
              <FoodChip
                key={group.id}
                theme={theme}
                label={group.label}
                icon={group.icon}
                group={group.group}
                selected={log.foodGroups.some(value => canonicalFoodGroup(value) === group.id)}
                onPress={() => toggleFoodGroup(group.id)}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard theme={theme} role="child" title="¿Cómo te sientes? (opcional)" subtitle="Si quieres, toca una opción. Puedes cambiarla o quitarla. Solo la ve tu persona tutora.">
          <View style={screenStyles.moodGrid}>
            {CHILD_MOODS.filter(mood => !('retired' in mood)).map(mood => {
              const selected = log.mood === mood.id;
              return (
                <View key={mood.id} style={screenStyles.moodCell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={mood.label}
                    aria-selected={selected}
                    onPress={() => setMood(mood.id)}
                    style={[
                      screenStyles.moodTile,
                      { backgroundColor: mood.color, borderColor: selected ? theme.colors.texto : 'transparent' },
                    ]}
                  >
                    <Icon name={mood.icon} size={40} color={mood.ink} />
                    <Text style={[theme.type.h3, { color: mood.ink, textAlign: 'center' }]}>{mood.label}</Text>
                    {selected ? (
                      <View style={screenStyles.moodCheck}><Icon name="save" size={16} color={theme.colors.texto} /></View>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
          {log.mood === 'triste' || log.mood === 'cansado' || log.mood === 'enojado' ? (
            <View style={styles.horizontal}>
              <Icon name="heart" size={16} color={theme.colors.puntos} />
              <Text style={[theme.type.counter, styles.flex, { color: theme.colors.textoSecundario }]}>
                Gracias por contarnos. Todas las emociones están bien. Si quieres, platícalo con una persona adulta de confianza.
              </Text>
            </View>
          ) : null}
          {log.mood ? <Button title="Quitar mi respuesta" small variant="outline" onPress={() => setMood(null)} /> : null}
        </SectionCard>

        <SectionCard theme={theme} role="child" title="Mi descanso" subtitle="¿Cuántas horas dormiste anoche?">
          <View style={[styles.horizontal, screenStyles.sleepSummary, { backgroundColor: tint(COLORS.purple, 0.12) }]}>
            <Icon name="sleep" size={32} color={COLORS.purple} />
            <Text style={[theme.type.h3, styles.flex, { color: theme.colors.texto }]}>
              {log.sleepHours === null ? 'Aún no registras tu descanso' : `${log.sleepHours} h registradas`}
            </Text>
          </View>
          <View style={styles.horizontal}>
            <Field
              label="Horas de sueño"
              keyboardType="decimal-pad"
              onChangeText={setSleepInput}
              placeholder={log.sleepHours === null ? 'Ej. 9' : `${log.sleepHours} horas`}
              value={sleepInput}
              style={styles.flex}
            />
            <Button title="Registrar" small icon="sleep" onPress={saveSleep} />
          </View>
        </SectionCard>

        <SectionCard theme={theme} role="child" title="Retos para hoy" subtitle="Completa el hábito y reclama tus puntos.">
          <View style={styles.horizontal}>
            {claimedMissions === missions.length ? <Icon name="sparkles" size={16} color={theme.colors.puntos} /> : null}
            <Text style={[theme.type.counter, styles.flex, { color: theme.colors.textoSecundario }]}>
              {claimedMissions === missions.length ? '¡Completaste todos los retos de hoy!' : `${claimedMissions} de ${missions.length} retos completados`}
            </Text>
          </View>
          <HabitProgress value={claimedMissions} max={missions.length} color={theme.colors.completado} />
          {missions.map(mission => (
            <ChallengeRow
              key={mission.id}
              theme={theme}
              icon={mission.icon}
              title={mission.title}
              detail={mission.detail}
              points={mission.points}
              ready={mission.ready}
              claimed={claimList.includes(mission.id)}
              onClaim={() => claimMission(mission.id, mission.points)}
            />
          ))}
        </SectionCard>

        {renderFamilyChallenges(selectedProfile)}

        </>)}

        {section('movimiento', 'Movimiento', <>
        <SectionCard theme={theme} role="child" title="Movimiento de hoy" subtitle="Tus actividades cambian cada día. Elige una segura y pide apoyo si lo necesitas.">
          {todaysActivities.map(activity => {
            const saved = log.activities[activity.id];
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver actividad ${activity.title}${saved?.status === 'approved' ? ', aprobada' : saved?.status === 'pending' ? ', en revisión' : ''}`}
                key={activity.id}
                onPress={() => {
                  setActivityModal(activity);
                  setActivityStage('details');
                  setActivityPlaying(false);
                  setActivityStarted(false);
                  setActivityElapsed(0);
                  setActivityDuration(String(activity.minutes));
                  setActivityPhoto(null);
                  setActivityError('');
                }}
                style={[styles.between, { paddingVertical: SPACE[4], minHeight: 48 }]}
              >
                <View style={[styles.horizontal, styles.flex]}>
                  <Icon name="activity" size={28} color={theme.colors.acento} />
                  <View style={styles.flex}>
                    <Text style={styles.inputLabel}>{activity.title}</Text>
                    <Text style={styles.muted}>
                      {formatMinutes(catalogActivityFor(activity.id)?.minutos_sesion ?? activity.minutes)}
                      {catalogActivityFor(activity.id) ? ` · ${catalogActivityFor(activity.id)?.grupo_edad}` : ''}
                    </Text>
                  </View>
                </View>
                {saved?.status === 'approved' ? (
                  <Tag title="Aprobada" color={COLORS.green} icon="check" />
                ) : saved?.status === 'pending' ? (
                  <Tag title="En revisión" color={COLORS.orange} icon="bell" />
                ) : (
                  <Text style={[theme.type.caption, { color: theme.colors.acento }]}>Ver actividad</Text>
                )}
              </Pressable>
            );
          })}
          {todaysActivities.length === 0 ? (
            <Text style={styles.body}>
              {activityCatalog.length === 0
                ? 'Todavía no hay actividades. Vuelve pronto.'
                : 'Hoy no hay actividades para tu edad. Pide a tu persona tutora una idea para moverte.'}
            </Text>
          ) : null}
        </SectionCard>

        <SectionCard theme={theme} role="child" title="Muévete con cuidado" subtitle="Ideas sencillas para disfrutar en familia.">
          {EXERCISE_CATEGORIES.map(category => (
            <View key={category.id} style={{ paddingVertical: SPACE[4] }}>
              <View style={styles.horizontal}>
                <Icon name={EXERCISE_ICONS[category.id]} size={16} color={category.color} />
                <Text style={styles.inputLabel}>{category.label}</Text>
              </View>
              <Text style={styles.muted}>
                {category.items.slice(0, 2).map(item => item.title).join(' · ')}
              </Text>
            </View>
          ))}
          <Text style={styles.footer}>Elige actividades que se sientan cómodas. Detente si algo duele y pide ayuda a una persona adulta.</Text>
        </SectionCard>

        </>)}

      </>
    );
  };

  const renderAchievements = () => {
    if (!data || !selectedProfile) return renderNoProfile();
    const progress = getProgress(data, selectedProfile);
    const badges = unique(progress.badges);
    return (
      <>
        <View style={screenStyles.sectionHeading}>
          <Text role="heading" aria-level={1} style={[theme.type.h1, { color: theme.colors.texto }]}>Mis logros</Text>
          <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>Cada hábito que practicas suma a tu camino.</Text>
        </View>
        <View style={[screenStyles.achievementHero, { backgroundColor: theme.colors.hero }]}>
          <Icon name="points" size={30} color={theme.colors.puntos} />
          <Text style={[theme.type.h1, { color: theme.colors.sobreHero, fontSize: 34, lineHeight: 40 }]}>{pointsFor(selectedProfile)}</Text>
          <Text style={[theme.type.body, { color: theme.colors.sobreHero }]}>puntos acumulados</Text>
        </View>
        <SectionCard
          theme={theme}
          role="child"
          title="Insignias desbloqueadas"
          subtitle={badges.length ? `Tienes ${badges.length} ${badges.length === 1 ? 'logro' : 'logros'}.` : 'Al completar retos aparecerán aquí.'}
        >
          {badges.length ? (
            <View style={screenStyles.achievementGrid}>
              {badges.map(badge => {
                const achievement = ACHIEVEMENT_INFO[badge];
                return (
                  <View key={badge} style={[screenStyles.achievementItem, { backgroundColor: tint(theme.colors.logros, 0.08) }]}>
                    <View style={[screenStyles.achievementMedal, { borderColor: theme.colors.logros, backgroundColor: tint(theme.colors.logros, 0.15) }]}>
                      <Icon name={achievement?.icon ?? 'achievements'} size={30} color={theme.colors.logros} />
                    </View>
                    <Text style={[theme.type.h3, screenStyles.centered, { color: theme.colors.texto }]}>{achievement?.title ?? badge.replace(/[-_]/g, ' ')}</Text>
                    <Text style={[theme.type.counter, screenStyles.centered, { color: theme.colors.textoSecundario }]}>{achievement?.description ?? 'Logro guardado en tu perfil.'}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="achievements" size={34} color={theme.colors.logros} />
              <Text style={[theme.type.h3, { color: theme.colors.texto }]}>Tu primera insignia está por llegar</Text>
              <Text style={[theme.type.body, screenStyles.centered, { color: theme.colors.textoSecundario }]}>Completa tus retos diarios para ir reuniendo logros.</Text>
            </View>
          )}
        </SectionCard>
        {renderPointsHelp(selectedProfile)}
        {renderFamilyRewards(selectedProfile)}
      </>
    );
  };

  const renderTutorHome = () => {
    if (!data) return null;
    if (!profiles.length) return renderNoProfile();
    const allPendingActivities = profiles.flatMap(profile =>
      Object.entries(data.dailyLogs[profile.progressKey] ?? {}).flatMap(([date, log]) =>
        Object.entries(log.activities)
          .filter(([, activity]) => activity.status === 'pending')
          .map(([activityId, activity]) => ({ profile, date, activityId, activity })),
      ),
    );
    const pendingActivities = allPendingActivities.slice(0, 8);
    const profileForKey = (progressKey: string) => profiles.find(profile => profile.progressKey === progressKey);
    const challengeReviews = familyAssignments
      .filter(item => item.status === 'completado')
      .map(item => ({ item, challenge: family?.challenges.find(challenge => challenge.id_reto === item.challengeId), profile: profileForKey(item.progressKey) }))
      .filter(review => review.challenge && review.profile);
    const rewardReviews = rewardRequests
      .filter(item => item.status === 'solicitado')
      .map(item => ({ item, reward: family?.rewards.find(reward => reward.id_recompensa === item.rewardId), profile: profileForKey(item.progressKey) }))
      .filter(review => review.profile);
    const reviewCount = allPendingActivities.length + challengeReviews.length + rewardReviews.length;
    const weekDays = selectedProfile ? Array.from({ length: 7 }, (_, index) => {
      const date = dateOffsetKey(6 - index);
      const label = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '');
      return { label, log: getDailyLog(data, selectedProfile, date) };
    }) : [];
    // Resumen semanal del perfil seleccionado (últimos 7 días).
    const waterGoal = data.warriorKids.waterGoal;
    const dayLabel = (label: string) => label.charAt(0).toLocaleUpperCase('es-MX') + label.slice(1);
    const groupsPerDay = weekDays.map(day => new Set(day.log.foodGroups.map(canonicalFoodGroup).filter(Boolean)));
    const waterDays = weekDays.filter(day => day.log.water >= waterGoal).length;
    const foodDays = groupsPerDay.filter(groups => groups.size > 0).length;
    const foodItems = ([
      { id: 'frutas-verduras', label: 'Frutas y verduras', color: '#5CC27A', icon: 'produce' },
      { id: 'cereales', label: 'Cereales', color: '#F2B544', icon: 'cereal' },
      { id: 'leguminosas', label: 'Leguminosas', color: '#9C7BE0', icon: 'legume' },
      { id: 'origen-animal', label: 'Origen animal', color: '#F28A7A', icon: 'animal' },
    ] as const).map(group => {
      const days = groupsPerDay.filter(groups => groups.has(group.id)).length;
      return { label: group.label, color: group.color, icon: group.icon, value: days, valueLabel: plural(days, 'día') };
    });
    const moodDays = weekDays.filter(day => day.log.mood).length;
    const moodRows = CHILD_MOODS
      .map(mood => ({ mood, days: weekDays.filter(day => day.log.mood === mood.id).length }))
      .filter(item => item.days > 0)
      .sort((a, b) => b.days - a.days);
    const sleepRows = weekDays
      .filter(day => day.log.sleepHours !== null)
      .map(day => ({ label: dayLabel(day.label), hours: day.log.sleepHours ?? 0 }));
    const selectedNutri = selectedProfile?.nutri;
    const selectedAge = profileAge(selectedNutri);
    return (
      <>
        <HeroCard
          key={selectedProfile?.key ?? 'sin-perfil'}
          theme={theme}
          title={`¡Hola, ${session?.name ?? 'familia'}!`}
          subtitle={`Acompaña los hábitos de tu familia. Puntos del perfil: ${selectedProfile?.name ?? 'sin seleccionar'}.`}
          points={selectedProfile ? pointsFor(selectedProfile) : 0}
          actionLabel="Control parental"
          onAction={() => { setSettingsSection('parental'); setTab('Ajustes'); }}
        />
        <View style={screenStyles.summaryRow}>
          <View style={screenStyles.summaryCard}>
            <Text style={[theme.type.counter, { color: theme.colors.textoSecundario }]}>Perfiles infantiles</Text>
            <Text style={[theme.type.metric, { color: theme.colors.texto }]}>{profiles.length}</Text>
          </View>
          <View style={screenStyles.summaryCard}>
            <Text style={[theme.type.counter, { color: theme.colors.textoSecundario }]}>Por revisar</Text>
            <Text style={[theme.type.metric, { color: theme.colors.texto }]}>{data.progressSharingEnabled ? reviewCount : '—'}</Text>
          </View>
        </View>

        {!data.progressSharingEnabled ? (
          <Card style={{ backgroundColor: COLORS.paleOrange, borderColor: SHARED.advertenciaBorde }}>
            <Text style={styles.cardTitle}>Compartir progreso está desactivado</Text>
            <Text style={styles.noticeText}>
              Los detalles de hábitos, ánimo y actividades no se muestran aquí. Puedes cambiar esta preferencia en Ajustes; el cambio se guarda en tu espacio familiar.
            </Text>
          </Card>
        ) : (
          <SectionCard theme={theme} role="tutor" title={reviewCount ? `Por revisar (${reviewCount})` : 'Por revisar'} subtitle={reviewCount ? 'Actividades, retos y premios que esperan tu respuesta.' : 'Aquí verás lo que necesite tu respuesta.'}>
            {challengeReviews.map(({ item, challenge, profile }) => {
              const points = challenge?.puntos_de_recompensa ?? 0;
              return (
                <View key={`reto-${item.id}`} style={screenStyles.reviewRow}>
                  <View style={styles.horizontal}>
                    <Icon name="achievements" size={22} color={COLORS.orange} />
                    <View style={styles.flex}>
                      <Text style={styles.inputLabel}>{profile?.name ?? 'Perfil'} · Reto: {challenge?.descripcion_reto ?? 'Reto'}</Text>
                      <View style={styles.wrap}><Tag title="Reto · en revisión" color={COLORS.orange} icon="bell" /></View>
                      <Text style={styles.muted}>Dice que ya lo logró. Al verificar recibe {plural(points, 'punto')}.</Text>
                    </View>
                  </View>
                  <View style={styles.horizontal}>
                    <Button
                      title="Pedir de nuevo"
                      small
                      variant="outline"
                      style={styles.flex}
                      onPress={() => { if (setAssignmentStatus(item.id, 'rechazado', points)) setNotice('Le pediste intentar el reto de nuevo.'); }}
                    />
                    <Button
                      title="Verificar"
                      small
                      variant="success"
                      style={styles.flex}
                      onPress={() => { if (setAssignmentStatus(item.id, 'verificado', points)) setNotice(`Reto verificado: +${points} puntos.`); }}
                    />
                  </View>
                </View>
              );
            })}
            {rewardReviews.map(({ item, reward, profile }) => (
              <View key={`premio-${item.id}`} style={screenStyles.reviewRow}>
                <View style={styles.horizontal}>
                  <Icon name="chest" size={22} color={COLORS.orange} />
                  <View style={styles.flex}>
                    <Text style={styles.inputLabel}>{profile?.name ?? 'Perfil'} · Premio: {reward?.nombre_premio ?? 'Premio'}</Text>
                    <View style={styles.wrap}><Tag title="Premio · pedido" color={COLORS.orange} icon="bell" /></View>
                    <Text style={styles.muted}>Usa {plural(item.cost, 'punto')} para premios. Si cancelas, regresan.</Text>
                  </View>
                </View>
                <View style={styles.horizontal}>
                  <Button
                    title="Cancelar"
                    small
                    variant="outline"
                    style={styles.flex}
                    onPress={() => { if (familyActions.setRewardRequestStatus(item.id, 'cancelado')) setNotice('Se canceló el pedido; los puntos regresan.'); }}
                  />
                  <Button
                    title="Entregado"
                    small
                    variant="success"
                    style={styles.flex}
                    onPress={() => { if (familyActions.setRewardRequestStatus(item.id, 'entregado')) setNotice('Premio marcado como entregado.'); }}
                  />
                </View>
              </View>
            ))}
            {pendingActivities.map(item => {
              const activity = activityFor(item.activityId);
              return (
                <View key={`${item.profile.key}-${item.date}-${item.activityId}`} style={{ borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: SPACE[8], gap: SPACE[8] }}>
                  <View style={styles.between}>
                    <View style={[styles.horizontal, styles.flex]}>
                      <Icon name="activity" size={22} color={COLORS.blue} />
                      <View style={styles.flex}>
                        <Text style={styles.inputLabel}>{item.profile.name} · {activity?.title ?? 'Actividad'}</Text>
                        <View style={styles.wrap}><Tag title="Actividad · en revisión" color={COLORS.orange} icon="bell" /></View>
                        <Text style={styles.muted}>{new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${item.date}T12:00:00`))} · {item.activity.duration} min</Text>
                      </View>
                    </View>
                  </View>
                  {item.activity.evidenceUri ? (
                    <EvidencePhoto path={item.activity.evidenceUri} />
                  ) : <Text style={styles.muted}>Sin foto adjunta.</Text>}
                  <View style={styles.horizontal}>
                    <Button
                      title="Pedir de nuevo"
                      small
                      variant="outline"
                      disabled={reviewingKeys.includes(`${item.profile.key}-${item.date}-${item.activityId}`)}
                      style={styles.flex}
                      onPress={() => void reviewActivity(item.profile, item.date, item.activityId, false)}
                    />
                    <Button
                      title={`Aprobar +${activity?.points ?? 10}`}
                      accessibilityLabel={`Aprobar actividad de ${item.profile.name} y dar ${activity?.points ?? 10} puntos`}
                      small
                      variant="success"
                      disabled={reviewingKeys.includes(`${item.profile.key}-${item.date}-${item.activityId}`)}
                      style={styles.flex}
                      onPress={() => void reviewActivity(item.profile, item.date, item.activityId, true)}
                    />
                  </View>
                </View>
              );
            })}
            {allPendingActivities.length > pendingActivities.length ? (
              <Text style={styles.muted}>Y {plural(allPendingActivities.length - pendingActivities.length, 'actividad más', 'actividades más')}: aparecerán al revisar estas.</Text>
            ) : null}
            {reviewCount === 0 ? (
              <View style={screenStyles.allDone}>
                <Icon name="achievements" size={40} color={COLORS.orange} />
                <Text style={[theme.type.h3, { color: theme.colors.texto }]}>¡Todo al día!</Text>
                <Text style={[styles.body, { textAlign: 'center' }]}>No hay actividades pendientes. ¡Gracias por acompañar!</Text>
              </View>
            ) : null}
          </SectionCard>
        )}
        {selectedProfile && data.progressSharingEnabled ? (
          <SectionCard theme={theme} role="tutor" title={`Resumen semanal de ${selectedProfile.name}`} subtitle="Registros de los últimos 7 días.">
            {selectedAge !== null || selectedNutri?.peso || selectedNutri?.altura ? (
              <View style={styles.wrap}>
                {selectedAge !== null ? <Tag title={ageLabel(selectedAge)} color={COLORS.pink} icon="profile" /> : null}
                {selectedNutri?.peso ? <Tag title={`${selectedNutri.peso} kg`} color={COLORS.purple} icon="scale" /> : null}
                {selectedNutri?.altura ? <Tag title={`${selectedNutri.altura} cm`} color={COLORS.blue} icon="height" /> : null}
              </View>
            ) : null}
            <ChartTitle theme={theme} title="Agua por día (vasos)" note={`Meta: ${plural(waterGoal, 'vaso')} al día. La alcanzó ${waterDays} de 7 días.`} />
            <WaterWeekChart theme={theme} days={weekDays.map(day => ({ label: dayLabel(day.label).slice(0, 2), value: day.log.water }))} goal={waterGoal} />

            <ChartTitle theme={theme} title="Grupos de alimentos (días)" note={`Días en que marcó cada grupo. Registró alimentos ${foodDays} de 7 días.`} />
            <DonutChart theme={theme} items={foodItems} center={`${foodDays} de 7\ndías`} emptyText="Aún no hay grupos de alimentos registrados." />

            <ChartTitle theme={theme} title="Ánimo (días, opcional)" note={`Lo compartió ${moodDays} de 7 días. No es un diagnóstico: úsalo para platicar en familia.`} />
            {moodRows.length ? moodRows.map(({ mood, days }) => (
              <PillBar key={mood.id} theme={theme} icon={mood.icon} color={mood.color} text={`${mood.label}: ${plural(days, 'día')}`} ratio={days / 7} />
            )) : <Text style={styles.muted}>Aún no hay estados de ánimo registrados.</Text>}

            <ChartTitle theme={theme} title="Descanso por día (horas)" note="Solo los días registrados. Referencia general: 9 a 12 horas." />
            {sleepRows.length ? (
              <View style={screenStyles.sleepSummaryRow}>
                <View style={[screenStyles.sleepBadge, { backgroundColor: '#3E3A7A' }]}>
                  <Icon name="moonStars" size={36} color="#FFD84D" />
                </View>
                <View style={[styles.flex, { gap: SPACE[8] }]}>
                  {sleepRows.map(row => (
                    <PillBar key={row.label} theme={theme} icon="sleep" color={COLORS.purple} text={`${row.label}: ${row.hours} h`} ratio={row.hours / 12} />
                  ))}
                </View>
              </View>
            ) : <Text style={styles.muted}>Aún no hay horas de sueño registradas.</Text>}
          </SectionCard>
        ) : null}

        {renderTutorIntro('EN FAMILIA', 'Perfiles de la familia', 'Selecciona un perfil para revisar su resumen.')}
        {profiles.map(profile => {
          const log = getDailyLog(data, profile, todayKey());
          const progress = getProgress(data, profile);
          const claims = data.missionClaims[profile.progressKey]?.[todayKey()] ?? [];
          const missionPoints = claims.reduce((total, id) => total + (MISSION_POINTS[id] ?? 0), 0);
          const approvedCount = Object.values(log.activities).filter(item => item.status === 'approved').length;
          const isSelected = selectedProfile?.key === profile.key;
          return (
            <Pressable
              key={profile.key}
              accessibilityRole="button"
              accessibilityHint={isSelected ? undefined : 'Muestra el resumen de este perfil'}
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                if (role === 'tutor') setSelectedProfileKey(profile.key);
              }}
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
            <SectionCard
              theme={theme}
              role="tutor"
              title={profile.name}
              style={isSelected ? { borderWidth: 2, borderColor: theme.colors.acento } : undefined}
            >
              <View style={styles.between}>
                <View style={styles.horizontal}>
                  {renderAvatar(profile, 'small')}
                  <View>
                    <View style={[styles.horizontal, { gap: SPACE[4] }]}>
                      <Icon name="points" size={12} color={COLORS.orange} />
                      <Text style={styles.muted}>{pointsFor(profile)} puntos</Text>
                    </View>
                  </View>
                </View>
                <View
                  style={{
                    paddingVertical: SPACE[8],
                    paddingHorizontal: SPACE[12],
                    borderRadius: RADIUS.pildora,
                    borderWidth: BORDER.fino,
                    borderColor: isSelected ? theme.colors.acento : COLORS.line,
                    backgroundColor: isSelected ? theme.colors.acento : 'transparent',
                  }}
                >
                  <Text style={[theme.type.caption, { color: isSelected ? '#000000' : theme.colors.texto }]}>
                    {isSelected ? 'Seleccionado' : 'Ver perfil'}
                  </Text>
                </View>
              </View>
              {data.progressSharingEnabled ? (
                <View style={styles.horizontal}>
                  <View
                    accessible
                    accessibilityLabel={`${log.water} de ${data.warriorKids.waterGoal} vasos de agua`}
                    style={screenStyles.waterGlasses}
                  >
                    {Array.from({ length: Math.max(0, Math.min(12, Math.ceil(data.warriorKids.waterGoal))) }, (_, index) => (
                      <Icon key={index} name="water" size={18} color={index < log.water ? theme.colors.agua : theme.colors.textoInactivo} />
                    ))}
                  </View>
                  <Text style={[theme.type.counter, styles.flex, { color: theme.colors.textoSecundario }]}>
                    {log.water}/{data.warriorKids.waterGoal} vasos · +{missionPoints} pts en retos
                  </Text>
                </View>
              ) : null}
              {(() => {
                const mood = CHILD_MOODS.find(item => item.id === log.mood);
                const badges = unique(progress.badges);
                const hasToday = data.progressSharingEnabled && (Boolean(mood) || log.sleepHours !== null || log.foodGroups.length > 0 || approvedCount > 0);
                if (!badges.length && !hasToday) {
                  return <Text style={styles.muted}>No se registra actividad del día de hoy.</Text>;
                }
                return (
                  <View style={styles.wrap}>
                    {badges.map(badge => (
                      <Tag
                        key={badge}
                        title={ACHIEVEMENT_INFO[badge]?.title ?? badge.replace(/[-_]/g, ' ')}
                        color={COLORS.orange}
                        icon={ACHIEVEMENT_INFO[badge]?.icon ?? 'achievements'}
                      />
                    ))}
                    {data.progressSharingEnabled && mood ? <Tag title={`Ánimo: ${mood.label}`} color={COLORS.purple} icon={mood.icon} /> : null}
                    {data.progressSharingEnabled && log.sleepHours !== null ? <Tag title={`${log.sleepHours} h de sueño`} color={COLORS.blue} icon="sleep" /> : null}
                    {data.progressSharingEnabled && log.foodGroups.length ? <Tag title={`${plural(log.foodGroups.length, 'grupo')} de alimentos`} color={COLORS.green} icon="food" /> : null}
                    {data.progressSharingEnabled && approvedCount ? <Tag title={`${plural(approvedCount, 'actividad aprobada', 'actividades aprobadas')} hoy`} color={COLORS.green} icon="activity" /> : null}
                  </View>
                );
              })()}
            </SectionCard>
            </Pressable>
          );
        })}

        <SectionCard theme={theme} role="tutor" title="Accesos rápidos">
          <Button title="Agregar perfil infantil" icon="add" onPress={() => createOrEditProfile(null)} />
          <Button title="Ver recetas" icon="recipes" variant="outline" onPress={() => setTab('Recetas')} />
          <Button title="Abrir menú" icon="menu" variant="outline" onPress={() => setTab('Menú')} />
        </SectionCard>
      </>
    );
  };

  const renderDietPlan = () => {
    const diet = FAMILY_DIET.find(item => item.dia === dietDay) ?? FAMILY_DIET[0];
    if (!diet) return null;
    const allergyIds = profileAllergies.filter(value => FOOD_OPTIONS.some(food => food.id === value));
    const ingredientIds = DIET_INGREDIENTS[dietDay] ?? {};
    // Si la persona tutora asignó una receta en Menú, se muestra esa; si no, la sugerencia general del día.
    const tutorMeals = data?.weeklyMeals[dietDay];
    // Plan alimenticio de Gestión: tiene prioridad porque es personal del perfil.
    const dayDate = dateOffsetKey(((new Date().getDay() + 6) % 7) - WEEKDAYS.indexOf(dietDay));
    const activePlan = selectedProfile
      ? mealPlans.find(plan => plan.progressKey === selectedProfile.progressKey && plan.starts <= dayDate && plan.ends >= dayDate)
      : undefined;
    const planRecipeFor = (meal: 'desayuno' | 'colacion' | 'comida' | 'cena') => {
      const entry = activePlan?.recipes.find(item => item.date === dayDate && item.meal === meal);
      return entry ? recipes.find(recipe => recipe.databaseId === entry.recipeId) : undefined;
    };
    const snackRecipe = planRecipeFor('colacion');
    return (
      <>
        {renderFoodPreferences()}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }}>
          <View style={screenStyles.selectionRow}>
            {WEEKDAYS.map(day => (
              <View key={day}>{renderSelectionPill(dayPillLabel(day), day === dietDay, () => setDietDay(day))}</View>
            ))}
          </View>
        </ScrollView>
        {([
          { id: 'desayuno' as const, label: 'Desayuno', icon: 'menu' as const, text: diet.desayuno },
          { id: 'comida' as const, label: 'Comida', icon: 'food' as const, text: diet.comida },
          { id: 'cena' as const, label: 'Cena', icon: 'sleep' as const, text: diet.cena },
        ]).map(meal => {
          const planRecipe = planRecipeFor(meal.id);
          const tutorRecipe = planRecipe ?? recipes.find(item => item.id === tutorMeals?.[meal.id]);
          const matchingAllergies = tutorRecipe
            ? recipeWarnings(tutorRecipe, profileAllergies)
            : allergyIds.filter(id => ingredientIds[meal.id]?.includes(id));
          return (
            <SectionCard key={meal.id} theme={theme} role={role} title={meal.label}>
              <View style={styles.horizontal}>
                <Icon name={meal.icon} size={24} color={theme.colors.acento} />
                <View style={styles.flex}>
                  <Text style={[theme.type.body, { color: theme.colors.texto }]}>{tutorRecipe?.title ?? meal.text}</Text>
                  {tutorRecipe ? <Text style={styles.muted}>{planRecipe ? 'Parte de tu plan alimenticio.' : 'Elegida por tu familia en el menú de la semana.'}</Text> : null}
                </View>
              </View>
              {tutorRecipe ? (
                <Button title="Ver preparación" small variant="secondary" onPress={() => setRecipeDetails(tutorRecipe)} />
              ) : null}
              {matchingAllergies.length ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>
                    Este menú incluye ingredientes relacionados con: {matchingAllergies.map(id => FOOD_OPTIONS.find(item => item.id === id)?.name ?? id).join(', ')}.
                  </Text>
                </View>
              ) : null}
            </SectionCard>
          );
        })}
        <Card style={{ backgroundColor: COLORS.paleGreen, borderColor: SHARED.exitoBorde }}>
          <Text style={styles.cardTitle}>Una idea para niñas y niños</Text>
          <Text style={styles.body}>{snackRecipe?.title ?? diet.kids}</Text>
        </Card>
        <Text style={styles.footer}>
          Menú educativo general, no personalizado ni prescripción nutricional. Revisa ingredientes y etiquetas; ante alergias, consulta a una persona profesional de salud.
        </Text>
      </>
    );
  };

  const renderRecipes = () => {
    if (!data) return null;
    const filteredRecipes = browsableRecipes.filter(recipe => recipeMatchesFilter(recipe, recipeFilter, recipeSearch));
    return (
      <>
        {renderTutorIntro('COCINA EN FAMILIA', 'Recetas con color', 'Ideas sencillas para disfrutar y aprender juntos.')}
        <View style={screenStyles.selectionRow}>
          {renderSelectionPill('Recetas', !dietMode, () => setDietMode(false))}
          {renderSelectionPill('Plan semanal', dietMode, () => setDietMode(true))}
        </View>
        {dietMode ? renderDietPlan() : (
          <>
            <Field
              label="Buscar receta o ingrediente"
              onChangeText={setRecipeSearch}
              placeholder="Ej. avena, frijoles…"
              value={recipeSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }}>
              <View style={screenStyles.selectionRow}>
                {RECIPE_FILTERS.map(filter => (
                  <View key={filter.id}>
                    {renderSelectionPill(filter.label, recipeFilter === filter.id, () => setRecipeFilter(filter.id))}
                  </View>
                ))}
              </View>
            </ScrollView>
            {renderFoodPreferences()}
            {filteredRecipes.length ? filteredRecipes.map(recipe => {
              const warnings = recipeWarnings(recipe, profileAllergies);
              const dislikes = recipeWarnings(recipe, profileNoLikes);
              const subtitle = [
                recipe.catalogCode ? `Clave ${recipe.catalogCode}` : '',
                recipe.mealType ? RECIPE_MEAL_LABELS[recipe.mealType] : '',
                recipe.ageGroup,
                recipe.groups,
              ].filter(Boolean).join(' · ');
              return (
                <SectionCard key={recipe.id} theme={theme} role={role} title={recipe.title} subtitle={subtitle}>
                  {renderIngredientPills(recipe.ingredients)}
                  {warnings.length ? (
                    <Text style={styles.errorText}>
                      Revisa estos ingredientes: {warnings.map(id => FOOD_OPTIONS.find(item => item.id === id)?.name ?? id).join(', ')}.
                    </Text>
                  ) : null}
                  {dislikes.length ? (
                    <Text style={styles.noticeText}>
                      Preferencias para evitar: {dislikes.map(id => FOOD_OPTIONS.find(item => item.id === id)?.name ?? id).join(', ')}.
                    </Text>
                  ) : null}
                  <View style={styles.between}>
                    <Text style={[styles.muted, styles.flex]}>{recipe.note}</Text>
                    <Button title="Ver receta" small variant="secondary" onPress={() => setRecipeDetails(recipe)} />
                  </View>
                </SectionCard>
              );
            }) : (
              <Card>
                <View style={styles.emptyState}>
                  <Icon name="search" size={34} color={COLORS.muted} />
                  <Text style={styles.body}>No encontramos recetas con esos filtros.</Text>
                  <Button title="Limpiar búsqueda" small variant="outline" onPress={() => { setRecipeSearch(''); setRecipeFilter('todas'); }} />
                </View>
              </Card>
            )}
            <Text style={styles.footer}>
              Una persona adulta debe acompañar el uso de cuchillos, fuego y alimentos que puedan causar alergias.
            </Text>
          </>
        )}
      </>
    );
  };

  const renderWeeklyMenu = () => {
    if (role !== 'tutor') return renderAchievements();
    if (!data) return null;
    const meals = data.weeklyMeals[selectedDay] ?? defaultMeals();
    return (
      <>
        {renderTutorIntro('ORGANIZACIÓN FAMILIAR', 'Menú de la semana', 'Planeen tres momentos de comida para cada día.')}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }}>
          <View style={screenStyles.selectionRow}>
            {WEEKDAYS.map(day => (
              <View key={day}>{renderSelectionPill(dayPillLabel(day), selectedDay === day, () => setSelectedDay(day))}</View>
            ))}
          </View>
        </ScrollView>
        <Text style={[theme.type.h3, { color: theme.colors.texto }]}>Menú del {selectedDay}</Text>
        {renderFoodPreferences()}
        {MEALS.map(meal => {
          const recipe = recipes.find(item => item.id === meals[meal.id]);
          const savedValue = meals[meal.id];
          const dislikes = recipe ? recipeWarnings(recipe, profileNoLikes) : [];
          return (
            <SectionCard key={meal.id} theme={theme} role="tutor" title={meal.title}>
              <View style={styles.between}>
                <View style={[styles.horizontal, styles.flex]}>
                  <Icon name={meal.icon} size={24} color={theme.colors.acento} />
                  <View style={styles.flex}>
                    {recipe ? (
                      <Text style={styles.body}>{recipe.title}</Text>
                    ) : savedValue ? (
                      <Text style={styles.body}>{savedValue}</Text>
                    ) : (
                      <Text style={styles.body}>Aún no hay receta. Agrega una o déjalo libre.</Text>
                    )}
                  </View>
                </View>
                {role === 'tutor' ? (
                  <Button
                    title={savedValue ? 'Cambiar' : 'Agregar receta'}
                    accessibilityLabel={`${savedValue ? 'Cambiar' : 'Agregar'} receta de ${meal.title} del ${selectedDay}`}
                    icon={savedValue ? 'edit' : 'add'}
                    small
                    variant={savedValue ? 'outline' : 'secondary'}
                    onPress={() => {
                      setSelectedMeal(meal.id);
                      openMenuPicker(selectedDay, meal.id);
                    }}
                  />
                ) : null}
              </View>
              {recipe ? (
                <>
                  {renderIngredientPills(recipe.ingredients)}
                  {renderRecipeAllergyWarning(recipe)}
                  {dislikes.length ? <Text style={styles.noticeText}>Preferencia: no le gusta {foodNames(dislikes)}.</Text> : null}
                  <Button title="Ver preparación" small variant="secondary" onPress={() => setRecipeDetails(recipe)} />
                </>
              ) : null}
            </SectionCard>
          );
        })}
        {role === 'tutor' ? (
          <Button title={`Elegir receta para ${getMealName(selectedMeal).toLocaleLowerCase('es-MX')}`} icon="add" onPress={() => openMenuPicker(selectedDay, selectedMeal)} />
        ) : null}
      </>
    );
  };

  const renderAvatarEditor = () => {
    if (!data || !selectedProfile || !avatarDraft || avatarDraft.profileKey !== selectedProfile.key) return renderNoProfile();
    const points = pointsFor(selectedProfile);
    const items = AVATAR_CATALOG[avatarCategory];
    const selection = avatarDraft.selection;
    return (
      <>
        <Button
          title="Volver a ajustes"
          icon="logout"
          variant="outline"
          onPress={() => { setAvatarDraft(null); setChildSettingsSection('main'); }}
        />
        <View style={[screenStyles.avatarPreview, { backgroundColor: AVATAR_BACKGROUNDS[selection.fondo] ?? theme.colors.acentoSuave }]}>
          <View accessible accessibilityRole="image" accessibilityLabel={`Avatar de ${selectedProfile.name}`}>
            <AvatarFigure selection={selection} variant="full" width={132} />
          </View>
          <Text style={[theme.type.h2, { color: theme.colors.texto }]}>{selectedProfile.name}</Text>
          <View style={styles.horizontal}>
            <Icon name="points" size={16} color={theme.colors.puntos} />
            <Text style={[theme.type.counter, { color: theme.colors.texto }]}>Tienes {plural(points, 'punto')}</Text>
          </View>
        </View>
        <SectionCard theme={theme} role="child" title="Personaliza tu avatar" subtitle={AVATAR_HINTS[avatarCategory]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }}>
            <View style={screenStyles.avatarTabs}>
              {(['piel', 'cabello', 'ropa', 'accesorio'] as const).map(key => (
                <Pressable
                  accessibilityRole="tab"
                  aria-selected={avatarCategory === key}
                  key={key}
                  onPress={() => { setAvatarCategory(key); setAvatarHint(''); }}
                  style={[screenStyles.avatarTab, { backgroundColor: avatarCategory === key ? theme.colors.acento : theme.colors.apagada }]}
                >
                  <Icon name={AVATAR_TAB_ICONS[key]} size={16} color={avatarCategory === key ? theme.colors.sobreAcento : theme.colors.texto} />
                  <Text style={[theme.type.tabActive, { color: avatarCategory === key ? theme.colors.sobreAcento : theme.colors.texto }]}>
                    {AVATAR_LABELS[key]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={screenStyles.avatarOptions}>
            {items.map((item, index) => {
              const selected = selection[avatarCategory] === index;
              const unlocked = isUnlocked(item, points);
              const preview = { ...selection, [avatarCategory]: index };
              return (
                <View key={`${avatarCategory}-${index}`} style={screenStyles.avatarCell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={unlocked ? item.label : `${item.label}, se desbloquea con ${item.cost} puntos`}
                  aria-selected={selected}
                  aria-disabled={!unlocked}
                  onPress={() => {
                    if (unlocked) {
                      setAvatarHint('');
                      setAvatarPart(index);
                    } else {
                      setAvatarHint(`Junta ${item.cost} puntos para desbloquear ${item.label}. ¡Te ${item.cost - points === 1 ? 'falta 1 punto' : `faltan ${item.cost - points} puntos`}!`);
                    }
                  }}
                  style={[
                    screenStyles.avatarItem,
                    {
                      borderColor: selected ? theme.colors.acento : theme.colors.bordeSutil,
                      backgroundColor: unlocked ? SHARED.tarjeta : SHARED.apagada,
                    },
                  ]}
                >
                  <View style={{ opacity: unlocked ? 1 : 0.45 }}>
                    {avatarCategory === 'piel' ? (
                      <View style={[screenStyles.avatarSwatch, { backgroundColor: SKIN_TONES[index]?.color }]} />
                    ) : (
                      <AvatarFigure selection={preview} variant={avatarCategory === 'ropa' ? 'torso' : 'bust'} width={60} />
                    )}
                  </View>
                  {!unlocked ? (
                    <View style={screenStyles.avatarBadge}><Icon name="lock" size={14} color={theme.colors.textoSecundario} /></View>
                  ) : selected ? (
                    <View style={[screenStyles.avatarBadge, { backgroundColor: theme.colors.acento }]}><Icon name="save" size={14} color={theme.colors.sobreAcento} /></View>
                  ) : null}
                  <Text numberOfLines={2} style={[theme.type.tab, { textAlign: 'center', color: unlocked ? theme.colors.texto : theme.colors.textoSecundario }]}>
                    {unlocked ? item.label : `${item.label} · ${item.cost} pts`}
                  </Text>
                </Pressable>
                </View>
              );
            })}
          </View>
          {avatarHint ? (
            <View accessibilityLiveRegion="polite" style={styles.horizontal}>
              <Icon name="lock" size={16} color={theme.colors.puntos} />
              <Text style={[theme.type.counter, styles.flex, { color: theme.colors.texto }]}>{avatarHint}</Text>
            </View>
          ) : null}
          <PillButton theme={theme} label="¡Guardar mi estilo!" onPress={saveAvatar} />
          <PillButton theme={theme} label="Sorpréndeme" variant="ghost" onPress={surpriseAvatar} />
          <Text style={[theme.type.counter, { color: theme.colors.textoSecundario }]}>
            Las prendas con candado se desbloquean solas cuando juntas sus puntos. Tus puntos no se gastan.
          </Text>
        </SectionCard>
      </>
    );
  };

  const renderTutorSettings = () => {
    if (!data) return null;
    return (
      <>
        {settingsSection === 'parental' ? (
          <>
        <SectionCard theme={theme} role="tutor" title="Perfiles infantiles" subtitle="Edita el nombre, la fecha de nacimiento y los datos de cada perfil.">
          {profiles.length ? profiles.map(profile => (
            <View key={profile.key} style={styles.profileRow}>
              {renderAvatar(profile, 'small')}
              <View style={styles.flex}>
                <Text style={styles.inputLabel}>{profile.name}</Text>
                <Text style={styles.muted}>
                  {(() => { const age = profileAge(profile.nutri); return age === null ? 'Falta registrar su edad' : ageLabel(age); })()}
                </Text>
              </View>
              <Button title="Editar" small variant="outline" onPress={() => createOrEditProfile(profile)} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Eliminar perfil ${profile.name}`}
                onPress={() => setProfileToArchive(profile)}
                style={styles.close}
              >
                <Icon name="close" size={16} color={COLORS.error} />
              </Pressable>
            </View>
          )) : (
            <Text style={styles.muted}>No hay perfiles activos. Los perfiles ocultos no se borran.</Text>
          )}
          <Button title="Crear perfil infantil" icon="add" variant="secondary" onPress={() => createOrEditProfile(null)} />
        </SectionCard>
          </>
        ) : null}

        {settingsSection === 'notifications' ? (
        <SectionCard theme={theme} role="tutor" title="Metas de hábitos" subtitle="Ajustes de tu espacio familiar.">
          <View style={[styles.between, { paddingVertical: SPACE[4] }]}>
            <View style={styles.flex}>
              <Text style={styles.inputLabel}>Meta diaria de agua</Text>
              <Text style={styles.muted}>Vasos · ajusta la meta para la familia.</Text>
            </View>
            <View style={styles.horizontal}>
              <Button
                title="−"
                accessibilityLabel="Bajar la meta de agua"
                small
                variant="outline"
                disabled={data.warriorKids.waterGoal <= 1}
                onPress={() => changeWaterGoal(-1)}
              />
              <Text style={styles.cardTitle}>{data.warriorKids.waterGoal}</Text>
              <Button
                title="+"
                accessibilityLabel="Subir la meta de agua"
                small
                variant="outline"
                disabled={data.warriorKids.waterGoal >= 12}
                onPress={() => changeWaterGoal(1)}
              />
            </View>
          </View>
        </SectionCard>
        ) : null}
        {settingsSection === 'parental' ? (
          <>
        <SectionCard theme={theme} role="tutor" title="Tiempo de pantalla">
          <View style={styles.between}>
            <View style={styles.flex}>
              <Text style={styles.inputLabel}>Tiempo de pantalla sugerido</Text>
              <Text style={styles.muted}>Preferencia para conversar en familia.</Text>
            </View>
            <View style={styles.horizontal}>
              <Button
                title="−"
                accessibilityLabel="Bajar 15 minutos el tiempo de pantalla"
                small
                variant="outline"
                disabled={data.warriorKids.screenLimitMinutes <= 0}
                onPress={() => updateData(current => ({
                  ...current,
                  warriorKids: { ...current.warriorKids, screenLimitMinutes: Math.max(0, current.warriorKids.screenLimitMinutes - 15) },
                }))}
              />
              <Text style={styles.inputLabel}>{data.warriorKids.screenLimitMinutes} min</Text>
              <Button
                title="+"
                accessibilityLabel="Subir 15 minutos el tiempo de pantalla"
                small
                variant="outline"
                onPress={() => updateData(current => ({
                  ...current,
                  warriorKids: { ...current.warriorKids, screenLimitMinutes: Math.min(300, current.warriorKids.screenLimitMinutes + 15) },
                }))}
              />
            </View>
          </View>
        </SectionCard>

        <SectionCard theme={theme} role="tutor" title="Mostrar avances en el espacio tutor">
          <View style={styles.between}>
            <Text style={[styles.body, styles.flex]}>
              {data.progressSharingEnabled
                ? 'La persona tutora puede revisar hábitos y actividades de los perfiles.'
                : 'Los detalles no se muestran en el espacio tutor.'}
            </Text>
            <Switch
              accessibilityLabel="Mostrar progreso en el espacio tutor"
              value={data.progressSharingEnabled}
              onValueChange={toggleSharing}
              trackColor={{ true: COLORS.blue }}
            />
          </View>
          <Text style={styles.footer}>Esta preferencia se guarda en tu espacio familiar.</Text>
        </SectionCard>
          </>
        ) : null}
      </>
    );
  };

  const renderSettings = () => {
    if (!data || role !== 'tutor') return null;
    if (settingsSection !== 'main') {
      return (
        <>
          <PillButton theme={theme} label="Volver a ajustes" variant="ghost" onPress={() => setSettingsSection('main')} />
          {settingsSection === 'help' ? renderHelp() : renderTutorSettings()}
        </>
      );
    }
    return (
      <>
        {renderTutorIntro('TU ESPACIO', 'Ajustes y privacidad', 'Configura tu espacio familiar.')}
        {([
          { id: 'parental', title: 'Control parental', subtitle: 'Perfiles, avances y seguridad.', icon: 'shield', color: theme.colors.acento },
          { id: 'notifications', title: 'Metas de hábitos', subtitle: 'Meta diaria de agua para la familia.', icon: 'water', color: theme.colors.agua },
          { id: 'help', title: 'Ayuda', subtitle: 'Respuestas para usar la app en familia.', icon: 'help', color: theme.colors.logros },
        ] as const).map(item => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            key={item.id}
            onPress={() => setSettingsSection(item.id)}
            style={[screenStyles.settingsTile, { backgroundColor: tint(item.color, 0.12) }]}
          >
            <ListRow theme={theme} icon={item.icon} iconColor={item.color} title={item.title} subtitle={item.subtitle}
              trailing={<Icon name="next" size={18} color={theme.colors.texto} />} />
          </Pressable>
        ))}
        {renderAppearance('tutor')}
        <SectionCard theme={theme} role="tutor" title="Tu cuenta">
          <Text style={styles.body}>
            Tus perfiles y avances se guardan en la nube, en el espacio de tu cuenta.
          </Text>
          <Text style={styles.muted}>Correo: {session?.email ?? 'sin sesión'}</Text>
          <Button title="Cerrar sesión" icon="logout" variant="outline" onPress={logout} />
        </SectionCard>
      </>
    );
  };

  // Apariencia: claro, oscuro o según el sistema. Se guarda en el espacio familiar.
  const renderAppearance = (cardRole: 'tutor' | 'child') => {
    if (!data) return null;
    const current = data.themeMode ?? 'light';
    const options = [
      { id: 'light', label: 'Claro', icon: 'sun' },
      { id: 'dark', label: 'Oscuro', icon: 'moonStars' },
      { id: 'system', label: 'Automático', icon: 'settings' },
    ] as const;
    return (
      <SectionCard theme={theme} role={cardRole} title="Apariencia" subtitle="Elige el tema de la app. Automático sigue el modo del teléfono.">
        <View accessibilityRole="radiogroup" style={styles.wrap}>
          {options.map(option => {
            const selected = current === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityLabel={`Tema ${option.label.toLocaleLowerCase('es-MX')}`}
                aria-checked={selected}
                onPress={() => updateData(state => ({ ...state, themeMode: option.id }))}
                style={[
                  screenStyles.themeChoice,
                  { borderColor: selected ? theme.colors.acento : theme.colors.bordeSutil, backgroundColor: selected ? theme.colors.acentoSuave : theme.colors.tarjeta },
                ]}
              >
                <Icon name={option.icon} size={20} color={selected ? theme.colors.acento : theme.colors.textoSecundario} />
                <Text style={[theme.type.tabActive, { color: theme.colors.texto }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>
    );
  };

  const renderChildAvatarSettings = () => {
    if (!data || !selectedProfile) return renderNoProfile();
    if (childSettingsSection === 'avatar') return renderAvatarEditor();
    return (
      <>
        <View style={screenStyles.sectionHeading}>
          <Text role="heading" aria-level={1} style={[theme.type.h1, { color: theme.colors.texto }]}>Mis ajustes</Text>
          <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>Elige cómo quieres usar tu espacio.</Text>
        </View>
        <View style={[screenStyles.settingsTile, { backgroundColor: theme.colors.acentoSuave }]}>
          <ListRow
            theme={theme}
            icon="music"
            iconColor={theme.colors.acento}
            title="Efectos de sonido"
            subtitle="Sonidos suaves al tocar y celebrar tus logros."
            trailing={(
              <Switch
                accessibilityLabel="Activar efectos de sonido"
                value={data.soundEnabled ?? false}
                onValueChange={value => {
                  updateData(current => ({ ...current, soundEnabled: value }));
                }}
                trackColor={{ true: theme.colors.acento }}
              />
            )}
          />
        </View>
        {renderAppearance('child')}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cambiar de personaje"
          onPress={openAvatarEditor}
          style={[screenStyles.settingsTile, { backgroundColor: tint(theme.colors.logros, 0.12) }]}
        >
          <ListRow
            theme={theme}
            icon="avatar"
            iconColor={theme.colors.logros}
            title="Cambiar de personaje"
            subtitle="Personaliza tu avatar."
            trailing={<Icon name="next" size={18} color={theme.colors.texto} />}
          />
        </Pressable>
        <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>Los demás ajustes los cuida la persona tutora.</Text>
      </>
    );
  };

  const renderHelp = () => role === 'child' ? (
    <>
      <View style={screenStyles.sectionHeading}>
        <Text role="heading" aria-level={1} style={[theme.type.h1, { color: theme.colors.texto }]}>¿Necesitas ayuda?</Text>
        <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>Estamos para acompañarte.</Text>
      </View>
      <Image source={require('@/assets/images/wk-logo.png')} style={screenStyles.helpLogo} resizeMode="contain" />
      {[
        { question: '¿Cómo registro mi agua?', answer: 'Toca +1 cuando tomes un vaso. Puedes corregirlo con el botón −.' },
        { question: '¿Cómo gano puntos?', answer: 'Completa y reclama tus retos. La persona tutora también puede aprobar tus actividades.' },
        { question: '¿Quién ve lo que registro?', answer: 'Tu persona tutora puede ver tus hábitos, tu ánimo, tus actividades y tus fotos. Si tienes dudas, platícalo con esa persona.' },
        { question: '¿Qué es NutriBot?', answer: 'Es un programa de inteligencia artificial de Google que platica sobre hábitos. No es una persona ni un médico. No le escribas tu nombre, dónde vives ni datos personales. Si algo te preocupa, habla con una persona adulta de confianza.' },
      ].map(item => (
        <SectionCard key={item.question} theme={theme} role="child" title={item.question}>
          <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>{item.answer}</Text>
        </SectionCard>
      ))}
    </>
  ) : (
    <>
      {renderTutorIntro('ESTAMOS PARA ACOMPAÑARTE', 'Ayuda y privacidad', 'Respuestas claras para usar la app en familia.')}
      {FAQ_ITEMS.map(item => (
        <SectionCard key={item.question} theme={theme} role="tutor" title={item.question}>
          <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>{item.answer}</Text>
        </SectionCard>
      ))}
      <SectionCard theme={theme} role="tutor" title="Sobre NutriBot">
        <Text style={styles.body}>
          NutriBot usa inteligencia artificial de Google: los mensajes que se escriben en el chat se envían por internet para generar la respuesta y la app no los guarda. No reemplaza a una persona profesional. Pide a tus hijas e hijos que no escriban datos personales.
        </Text>
      </SectionCard>
      <SectionCard theme={theme} role="tutor" title="¿Dónde se guardan los datos?">
        <Text style={styles.body}>
          Perfiles, avances y fotos se guardan en la nube (Supabase), en el espacio de tu cuenta, y se accede con tu correo y contraseña. La app no agrega cifrado propio a estos datos.
        </Text>
      </SectionCard>
      <Text style={styles.footer}>Warrior Kids · Hecho para acompañar hábitos saludables con cariño.</Text>
    </>
  );

  const renderProfileModal = () => (
    <BottomSheet
      theme={theme}
      visible={role === 'tutor' && showProfileEditor}
      onClose={() => setShowProfileEditor(false)}
    >
          <View style={styles.modalHeader}>
            <Text role="heading" aria-level={2} style={styles.modalTitle}>{editingProfile ? 'Editar perfil infantil' : 'Nuevo perfil infantil'}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={() => { setShowProfileEditor(false); setProfileStep(0); }}
              style={styles.close}
            >
              <Icon name="close" size={18} color={COLORS.ink} />
            </Pressable>
          </View>
          <Text style={styles.inputLabel}>Fase {profileStep + 1} de 6 · {[
            'Avatar, nombre y color',
            'Datos y dictamen',
            'Alergias',
            'No le gustan',
            'Le gustan',
            'Resumen y confirmación',
          ][profileStep]}</Text>
          <ProgressMeter value={profileStep + 1} max={6} color={COLORS.pink} />
          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: SPACE[12], paddingTop: SPACE[12], paddingBottom: SPACE[8] }}>
            {editingProfile?.link ? (
              <View style={styles.notice}>
                <Text style={styles.inputLabel}>Vínculo conservado</Text>
                <Text style={styles.noticeText}>
                  NutriBot: “{editingProfile.nutri?.nombre}” · Warrior Kids: “{editingProfile.warrior?.name}”. El nombre de abajo solo cambia cómo se muestra en esta app.
                </Text>
              </View>
            ) : null}

            {profileStep === 0 ? (
              <>
                <Field
                  autoCapitalize="words"
                  label="Nombre mostrado"
                  onChangeText={value => { setProfileError(''); setProfileDraft(current => ({ ...current, name: value })); }}
                  placeholder="Nombre del perfil"
                  value={profileDraft.name}
                />
                <SectionTitle title="Elige sus colores" subtitle="Cualquier paleta es para cualquier persona. Podrás personalizar más detalles después." />
                <View style={[styles.horizontal, { justifyContent: 'center', paddingVertical: SPACE[4] }]}>
                  <AvatarIllustration
                    theme={profileDraft.colorTheme}
                    selection={editingProfile ? data?.avatarSelections[editingProfile.key] : undefined}
                  />
                </View>
                <View accessibilityRole="radiogroup" accessibilityLabel="Paleta de colores" style={styles.roleRow}>
                  {([
                    { id: 'nina' as const, label: 'Lavanda y rosa', fill: THEMES.lia.acento },
                    { id: 'nino' as const, label: 'Azul y verde', fill: THEMES.oli.acento },
                  ]).map(option => {
                    const selected = profileDraft.colorTheme === option.id;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Paleta ${option.label}`}
                        aria-checked={selected}
                        key={option.id}
                        onPress={() => setProfileDraft(current => ({ ...current, colorTheme: option.id }))}
                        style={[styles.roleChoice, selected && [styles.roleChoiceActive, { backgroundColor: option.fill }]]}
                      >
                        <AvatarIllustration theme={option.id} size="small" />
                        <Text style={[styles.roleChoiceText, selected && styles.roleChoiceTextOnColor]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {profileStep === 1 ? (
              <>
                {(() => {
                  const validation = validateProfileDraft(profileDraft);
                  const birthIso = parseBirthDate(profileDraft.birthDate);
                  const shown = profileShowErrors ? validation.errors : {};
                  const updateMeasure = (field: MeasurementField, value: string) => {
                    setProfileError('');
                    setProfileDraft(current => ({ ...current, [field]: value }));
                  };
                  const renderUnusual = (field: MeasurementField) => {
                    const message = validation.unusual[field];
                    if (!message) return null;
                    const confirmed = !validation.needsConfirmation.includes(field);
                    return (
                      <View accessibilityLiveRegion="polite" style={[styles.notice, { gap: SPACE[8] }]}>
                        <View style={styles.horizontal}>
                          <Icon name={confirmed ? 'check' : 'warning'} size={18} color={confirmed ? COLORS.green : COLORS.orange} />
                          <Text style={[styles.noticeText, styles.flex]}>
                            {confirmed ? 'Confirmaste que este dato es correcto.' : message}
                          </Text>
                        </View>
                        {!confirmed ? (
                          <Button
                            title="Sí, el dato es correcto"
                            small
                            variant="outline"
                            accessibilityLabel={`Confirmar que ${field === 'weight' ? 'el peso' : 'la estatura'} está bien escrito`}
                            onPress={() => setProfileDraft(current => ({
                              ...current,
                              confirmedUnusual: { ...current.confirmedUnusual, [field]: validation.normalized[field] },
                            }))}
                          />
                        ) : null}
                      </View>
                    );
                  };
                  return (
                    <>
                      <SectionTitle title="Edad" subtitle={`Obligatoria, de ${CHILD_AGE_LIMITS.min} a ${CHILD_AGE_LIMITS.max} años. Ayuda a mostrar actividades y recetas para su edad.`} />
                      <DateField
                        label="Fecha de nacimiento (opcional)"
                        value={birthIso ?? ''}
                        maxDate={todayKey()}
                        openTo={dateOffsetKey(365 * 8)}
                        hint="Si la registras, la edad se calcula sola cada año."
                        onChange={iso => { setProfileError(''); setProfileDraft(current => ({ ...current, birthDate: formatBirthDate(iso) })); }}
                      />
                      <Field
                        label="Edad (años)"
                        keyboardType="number-pad"
                        maxLength={2}
                        editable={!birthIso}
                        placeholder={`${CHILD_AGE_LIMITS.min} a ${CHILD_AGE_LIMITS.max}`}
                        value={draftAge(profileDraft)}
                        hint={birthIso ? 'Calculada con la fecha de nacimiento.' : undefined}
                        error={shown.age}
                        onChangeText={value => { setProfileError(''); setProfileDraft(current => ({ ...current, age: value })); }}
                      />

                      <SectionTitle title="Peso y estatura" subtitle="Se muestran solo a la persona tutora en el resumen del perfil. La app no evalúa la salud ni da recomendaciones." />
                      <View style={styles.between}>
                        <Text style={[styles.body, styles.flex]}>Registrar peso y estatura</Text>
                        <Switch
                          accessibilityLabel="Registrar peso y estatura"
                          value={profileDraft.collectMeasurements}
                          onValueChange={value => { setProfileError(''); setProfileDraft(current => ({ ...current, collectMeasurements: value })); }}
                          trackColor={{ true: COLORS.blue }}
                        />
                      </View>
                      {profileDraft.collectMeasurements ? (
                        <>
                          <Field
                            label="Peso (kg)"
                            keyboardType="decimal-pad"
                            placeholder="Ej. 28.5"
                            value={profileDraft.weight}
                            error={shown.weight}
                            onChangeText={value => updateMeasure('weight', value)}
                          />
                          {renderUnusual('weight')}
                          <Field
                            label="Estatura (cm)"
                            keyboardType="decimal-pad"
                            placeholder="Ej. 128"
                            value={profileDraft.height}
                            error={shown.height}
                            onChangeText={value => updateMeasure('height', value)}
                          />
                          {renderUnusual('height')}
                        </>
                      ) : (
                        <Text style={styles.muted}>
                          {profileDraft.weight.trim() || profileDraft.height.trim()
                            ? 'Al guardar se quitarán el peso y la estatura de este perfil en la app. Si estaban sincronizados, las mediciones anteriores siguen en la base de datos.'
                            : 'No se pedirán peso ni estatura para este perfil.'}
                        </Text>
                      )}
                    </>
                  );
                })()}
                <SectionTitle title="Sexo" subtitle="Se usa solo al guardar los datos de salud autorizados. No cambia los colores del perfil." />
                <View accessibilityRole="radiogroup" accessibilityLabel="Sexo" style={styles.roleRow}>
                  {([{ id: 'nina', label: 'Niña' }, { id: 'nino', label: 'Niño' }] as const).map(option => {
                    const selected = profileDraft.theme === option.id;
                    return (
                      <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={option.label}
                        aria-checked={selected}
                        onPress={() => setProfileDraft(current => ({ ...current, theme: option.id }))}
                        style={[styles.roleChoice, selected && [styles.roleChoiceActive, { backgroundColor: theme.colors.acento }]]}>
                        <Text style={[styles.roleChoiceText, selected && styles.roleChoiceTextOnColor]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <SectionCard theme={theme} role="tutor" title="Consentimiento de datos de salud">
                  <View style={styles.between}>
                    <Text style={[styles.body, styles.flex]}>
                      Opcional. Autorizo guardar también sus datos de salud en las tablas de la base de datos en la nube.
                    </Text>
                    <Switch
                      accessibilityLabel="Autorizar la sincronización de datos de salud"
                      disabled={Boolean(editingProfile?.nutri?.databaseChildId)}
                      value={profileDraft.healthConsent}
                      onValueChange={value => setProfileDraft(current => ({ ...current, healthConsent: value }))}
                      trackColor={{ true: COLORS.blue }}
                    />
                  </View>
                  <Text style={styles.footer}>
                    Los perfiles anteriores no se migran sin esta autorización. Si no la activas, se conservarán en el espacio familiar actual.
                  </Text>
                  {profileDraft.healthConsent && !editingProfile?.nutri?.databaseChildId ? (
                    <Text style={styles.footer}>Para sincronizar un perfil nuevo se requieren fecha de nacimiento, peso, estatura y valoración inicial.</Text>
                  ) : null}
                </SectionCard>
                <SectionTitle title="Dictamen del especialista (opcional)" subtitle="Registra solo uno que ya te haya dado una persona especialista. La app no lo calcula." />
                <View style={screenStyles.selectionRow}>
                  <View>{renderSelectionPill('Sin registrar', !profileDraft.diagnosis && !profileDraft.didNotVisitSpecialist, () => setProfileDraft(current => ({ ...current, diagnosis: '', didNotVisitSpecialist: false })))}</View>
                  {profileDraft.healthConsent && !editingProfile?.nutri?.databaseChildId ? (
                    <View>{renderSelectionPill('No acudió al especialista', profileDraft.didNotVisitSpecialist, () => setProfileDraft(current => ({ ...current, diagnosis: '', didNotVisitSpecialist: true })))}</View>
                  ) : null}
                  {DIAGNOSES.map(option => (
                    <View key={option.id}>
                      {renderSelectionPill(option.label, profileDraft.diagnosis === option.id, () => setProfileDraft(current => ({ ...current, diagnosis: option.id, didNotVisitSpecialist: false })))}
                    </View>
                  ))}
                </View>
                <Text style={styles.footer}>La app no usa este dato para asignar planes ni hace diagnósticos.</Text>
              </>
            ) : null}

            {profileStep >= 2 && profileStep <= 4 ? (
              <>
                <SectionTitle
                  title={profileStep === 2 ? 'Alergias' : profileStep === 3 ? 'No le gustan' : 'Le gustan'}
                  subtitle="Elige un grupo para seleccionar alimentos."
                />
                <PlatoDelBuenComer
                  key={profileStep}
                  theme={theme}
                  values={profileStep === 2 ? profileDraft.allergies : profileStep === 3 ? profileDraft.noLikes : profileDraft.likes}
                  onToggle={id => toggleProfileFood(profileStep === 2 ? 'allergies' : profileStep === 3 ? 'noLikes' : 'likes', id)}
                  other={profileStep === 2 ? profileDraft.otherAllergies : profileStep === 3 ? profileDraft.otherNoLikes : profileDraft.otherLikes}
                  onChangeOther={value => setProfileDraft(current => ({
                    ...current,
                    [profileStep === 2 ? 'otherAllergies' : profileStep === 3 ? 'otherNoLikes' : 'otherLikes']: value,
                  }))}
                />
                {profileStep === 2 ? <Text style={styles.footer}>Confirma siempre ingredientes y etiquetas con una persona adulta.</Text> : null}
              </>
            ) : null}

            {profileStep === 5 ? (
              <>
                <SectionTitle title="Revisa antes de guardar" subtitle="Confirma la información del perfil infantil." />
                <Card style={styles.cardTight}>
                  <View style={[styles.horizontal, { alignItems: 'center' }]}>
                    <AvatarIllustration
                      theme={profileDraft.colorTheme}
                      selection={editingProfile ? data?.avatarSelections[editingProfile.key] : undefined}
                    />
                    <View style={styles.flex}>
                      <Text style={styles.cardTitle}>{profileDraft.name.trim() || 'Sin nombre'}</Text>
                      <Text style={styles.muted}>Colores: {profileDraft.colorTheme === 'nina' ? 'lavanda y rosa' : 'azul y verde'}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <Text style={styles.body}>Edad: {draftAge(profileDraft) ? `${draftAge(profileDraft)} años` : 'Falta registrarla'}</Text>
                  <Text style={styles.body}>Fecha de nacimiento: {profileDraft.birthDate || 'No registrada'}</Text>
                  <Text style={styles.body}>Peso: {!profileDraft.collectMeasurements ? 'No se registra' : profileDraft.weight.trim() ? `${profileDraft.weight.trim()} kg` : 'Falta registrarlo'}</Text>
                  <Text style={styles.body}>Estatura: {!profileDraft.collectMeasurements ? 'No se registra' : profileDraft.height.trim() ? `${profileDraft.height.trim()} cm` : 'Falta registrarla'}</Text>
                  <Text style={styles.body}>Sexo: {profileDraft.theme === 'nina' ? 'Niña' : 'Niño'}</Text>
                  <Text style={styles.body}>Dictamen: {profileDraft.didNotVisitSpecialist && profileDraft.healthConsent && !editingProfile?.nutri?.databaseChildId ? 'No acudió al especialista' : DIAGNOSES.find(item => item.id === profileDraft.diagnosis)?.label ?? 'No registrado'}</Text>
                  <Text style={styles.body}>Sincronización de salud: {profileDraft.healthConsent ? 'Autorizada' : 'No autorizada'}</Text>
                </Card>
                <Card style={styles.cardTight}>
                  <Text style={styles.inputLabel}>Alergias</Text>
                  <SelectedFoodPills values={profileDraft.allergies} other={profileDraft.otherAllergies} />
                  <Text style={styles.inputLabel}>No le gustan</Text>
                  <SelectedFoodPills values={profileDraft.noLikes} other={profileDraft.otherNoLikes} />
                  <Text style={styles.inputLabel}>Le gustan</Text>
                  <SelectedFoodPills values={profileDraft.likes} other={profileDraft.otherLikes} />
                </Card>
                <Text style={styles.footer}>Se guarda en la nube, en el espacio de tu cuenta. Solo se accede con tu correo y contraseña.</Text>
              </>
            ) : null}

            {profileError ? <Text accessibilityRole="alert" style={styles.errorText}>{profileError}</Text> : null}
            <View style={styles.between}>
              <Button
                title="Anterior"
                icon="logout"
                variant="outline"
                disabled={profileStep === 0}
                onPress={() => { setProfileError(''); setProfileStep(current => Math.max(0, current - 1)); }}
              />
              {profileStep < 5 ? (
                <Button
                  title="Continuar"
                  icon="check"
                  onPress={() => {
                    if (profileStep === 0 && profileDraft.name.trim().length < 2) {
                      setProfileError('Escribe un nombre de al menos dos letras.');
                      return;
                    }
                    if (profileStep === 1 && profileDraft.birthDate && !parseBirthDate(profileDraft.birthDate)) {
                      setProfileError('Escribe una fecha de nacimiento válida (DD/MM/AAAA).');
                      return;
                    }
                    if (profileStep === 1) {
                      const syncError = validateInitialHealthSync({
                        required: profileDraft.healthConsent && !editingProfile?.nutri?.databaseChildId,
                        hasBirthDate: Boolean(parseBirthDate(profileDraft.birthDate)),
                        collectMeasurements: profileDraft.collectMeasurements,
                        hasDiagnosis: Boolean(profileDraft.diagnosis),
                        didNotVisitSpecialist: profileDraft.didNotVisitSpecialist,
                      });
                      if (syncError) {
                        setProfileError(syncError);
                        return;
                      }
                    }
                    if (profileStep === 1 && !validateProfileDraft(profileDraft).canSave) {
                      setProfileShowErrors(true);
                      setProfileError('Revisa los datos marcados para continuar. Lo demás que escribiste sigue aquí.');
                      return;
                    }
                    setProfileError('');
                    setProfileStep(current => Math.min(5, current + 1));
                  }}
                />
              ) : (
                <Button
                    title={profileSaving ? 'Guardando…' : editingProfile ? 'Guardar cambios' : 'Crear perfil'}
                  icon="save"
                    disabled={profileSaving}
                  onPress={saveProfile}
                />
              )}
            </View>
          </ScrollView>
    </BottomSheet>
  );

  const renderActivityModal = () => {
    const catalogActivity = activityModal ? catalogActivityFor(activityModal.id) : undefined;
    const guide = catalogActivity
      ? { steps: [catalogActivity.como_se_hace], safety: catalogActivity.precauciones }
      : activityModal ? ACTIVITY_GUIDES[activityModal.id] : undefined;
    const activityStatus = activityModal && selectedProfile && data
      ? getDailyLog(data, selectedProfile, todayKey()).activities[activityModal.id]?.status
      : undefined;
    const canRegister = role === 'child' && Boolean(selectedProfile) && (!activityStatus || activitySaveFailed);
    return (
    <Modal
      animationType="slide"
      onRequestClose={() => { cancelTransition(); closeActivity(); }}
      transparent
      visible={Boolean(activityModal)}
    >
      {activityModal && transition?.kind === 'actividad' && transition.userId === authUser?.id &&
        role === 'child' && transition.owner === selectedProfile?.key && !reduceMotion && !storageError ? (
        <SafeAreaView style={[screenStyles.activityScreen, { backgroundColor: theme.colors.fondoInicio }]}>
          {transition.visible ? <LoadingScreen variant="actividad" theme={theme} activity={activityModal.id} /> : null}
        </SafeAreaView>
      ) : activityModal && activityStage === 'details' ? (
        <SafeAreaView style={[screenStyles.activityScreen, { backgroundColor: theme.colors.fondoInicio }]}>
          <View style={[screenStyles.sheetHeader, { paddingHorizontal: SPACE[20], paddingTop: SPACE[12] }]}>
            <Text style={[theme.type.h2, styles.flex, { color: theme.colors.texto }]}>{activityModal.title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar actividad" onPress={closeActivity}
              style={[styles.close, { minWidth: 44, minHeight: 44 }]}>
              <Icon name="close" size={18} color={theme.colors.texto} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={screenStyles.activityContent}>
            <Icon name="activity" size={72} color={theme.colors.acento} />
            <Text accessibilityLabel={`Tiempo transcurrido ${formatElapsed(activityElapsed)}`} accessibilityRole="timer"
              style={[theme.type.metric, { color: theme.colors.texto, textAlign: 'center' }]}>
              {formatElapsed(activityElapsed)}
            </Text>
            <Text accessibilityLiveRegion="polite" style={[theme.type.counter, { color: theme.colors.textoSecundario, textAlign: 'center' }]}>
              {!activityStarted ? 'Cuando quieras, toca Empezar.' : activityPlaying ? 'En curso. Ve a tu ritmo.' : 'En pausa. Sigue cuando quieras.'}
            </Text>
            <View style={styles.horizontal}>
              <Button title={!activityStarted ? 'Empezar' : activityPlaying ? 'Pausar' : 'Reanudar'}
                icon={activityPlaying ? 'pause' : 'activity'}
                accessibilityLabel={!activityStarted ? 'Empezar cronómetro' : activityPlaying ? 'Pausar cronómetro' : 'Reanudar cronómetro'}
                variant={activityPlaying ? 'outline' : 'primary'} style={styles.flex}
                onPress={() => { setActivityStarted(true); setActivityPlaying(current => !current); }} />
              {activityStarted ? (
                <Button title="Reiniciar" icon="repeat" variant="outline" style={styles.flex}
                  accessibilityLabel="Reiniciar cronómetro a cero"
                  onPress={() => { setActivityElapsed(0); setActivityPlaying(false); setActivityStarted(false); }} />
              ) : null}
            </View>
            {canRegister ? (
              <PillButton theme={theme} label={activityStarted ? 'Terminé · Registrar' : 'Ya la hice · Registrar'}
                variant={activityStarted && !activityPlaying ? 'primary' : 'ghost'}
                onPress={() => {
                  setActivityPlaying(false);
                  if (activityElapsed > 0) setActivityDuration(String(minutesFromElapsed(activityElapsed)));
                  setActivityStage('form');
                }} />
            ) : (
              <View style={styles.horizontal}>
                <Icon name={activityStatus === 'approved' ? 'check' : 'bell'} size={18} color={activityStatus === 'approved' ? COLORS.green : COLORS.orange} />
                <Text style={[theme.type.counter, styles.flex, { color: theme.colors.textoSecundario }]}>
                  {!selectedProfile ? 'Este perfil ya no está disponible. Pide ayuda a la persona tutora.' :
                    activityStatus === 'approved' ? '¡Ya la aprobaron hoy! Buen trabajo.' : 'Ya la enviaste. Tu persona tutora la revisará.'}
                </Text>
              </View>
            )}
            <View style={styles.wrap}>
              <Tag
                title={`${formatMinutes(catalogActivity?.minutos_sesion ?? activityModal.minutes)}${catalogActivity ? ' por sesión' : ''}`}
                color={theme.colors.acento}
              />
              <Tag title={`${activityModal.points} puntos`} color={theme.colors.puntos} icon="points" />
            </View>
            {catalogActivity ? (
              <SectionCard theme={theme} role="child" title="Recomendación de la actividad">
                <Text style={styles.body}>Edad: {catalogActivity.grupo_edad}</Text>
                <Text style={styles.body}>Tipo: {catalogActivity.tipo.replace(/_/g, ' ')}</Text>
                <Text style={styles.body}>Capacidades: {catalogActivity.capacidad_fisica}</Text>
                <Text style={styles.body}>Intensidad: {catalogActivity.intensidad}</Text>
                <Text style={styles.body}>Frecuencia: {catalogActivity.dias_por_semana}</Text>
                <Text style={styles.body}>Supervisión: {catalogActivity.supervision}</Text>
                <Text style={styles.body}>Material: {catalogActivity.material}</Text>
                <Text style={styles.body}>Espacio: {catalogActivity.espacio}</Text>
              </SectionCard>
            ) : null}
            <SectionCard theme={theme} role="child" title="Así se hace">
              {guide ? guide.steps.map((step, index) => (
                <Text key={step} style={[theme.type.body, { color: theme.colors.texto }]}>{index + 1}. {step}</Text>
              )) : <Text accessibilityRole="alert" style={styles.errorText}>No hay una guía disponible para esta actividad.</Text>}
            </SectionCard>
            {guide ? (
              <SectionCard theme={theme} role="child" title="Consejo de seguridad">
                <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>{guide.safety}</Text>
              </SectionCard>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      ) : (
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.horizontal}>
              <Icon name="activity" size={20} color={COLORS.blue} />
              <Text role="heading" aria-level={2} style={styles.modalTitle}>Registrar actividad</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancelar registro y cerrar" aria-disabled={activitySubmitting} disabled={activitySubmitting} onPress={closeActivity} style={styles.close}>
              <Icon name="close" size={18} color={COLORS.ink} />
            </Pressable>
          </View>
          {activityModal ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: SPACE[12], paddingBottom: SPACE[8] }}>
              <Text style={styles.body}>{activityModal.title}</Text>
              <Text style={styles.muted}>
                {catalogActivity
                  ? `Tiempo sugerido por la guía: ${formatMinutes(catalogActivity.minutos_sesion, 'minutos')}.`
                  : activityModal.instructions}
              </Text>
              {activityElapsed > 0 ? (
                <Text style={styles.muted}>
                  Tu cronómetro marcó {formatElapsed(activityElapsed)}. Puedes corregir los minutos si hace falta.
                </Text>
              ) : null}
              <Field
                label="¿Cuántos minutos? (1 a 180)"
                keyboardType="number-pad"
                onChangeText={value => { setActivityError(''); setActivityDuration(value); }}
                value={activityDuration}
              />
              <SectionTitle
                title="Foto (opcional)"
                subtitle={offline
                  ? 'Sin conexión no se pueden subir fotos. Envíala sin foto: tus minutos se guardan en este teléfono y se mandan al volver internet.'
                  : 'Puedes enviar sin foto. Si agregas una, se guarda en la nube de tu cuenta familiar y solo la ve tu persona tutora. Se borra si te pide repetir la actividad.'}
              />
              {offline && !activityPhoto ? null : activityPhoto ? (
                <>
                  <Image accessible accessibilityLabel="Foto elegida como evidencia" onError={() => setActivityError('No se pudo mostrar la foto. Elige otra o envía sin foto.')} source={{ uri: activityPhoto.uri }} style={styles.imagePreview} resizeMode="cover" />
                  <Button title="Quitar foto" icon="close" small variant="danger" disabled={activitySubmitting} onPress={removeActivityPhoto} />
                </>
              ) : (
                <View style={styles.horizontal}>
                  <Button title="Tomar foto" icon="camera" small variant="outline" style={styles.flex} disabled={activitySubmitting} onPress={() => void pickActivityPhoto('camera')} />
                  <Button title="Elegir foto" icon="gallery" small variant="outline" style={styles.flex} disabled={activitySubmitting} onPress={() => void pickActivityPhoto('library')} />
                </View>
              )}
              {activityError ? (
                <View style={styles.horizontal}>
                  <Icon name="warning" size={16} color={COLORS.error} />
                  <Text accessibilityRole="alert" style={[styles.errorText, styles.flex]}>{activityError}</Text>
                </View>
              ) : null}
              {!canRegister ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {!selectedProfile ? 'Este perfil ya no está disponible.' : 'Esta actividad ya se registró hoy.'}
                </Text>
              ) : null}
              {activitySaveFailed ? (
                <Button
                  title={activitySubmitting ? 'Enviando…' : 'Recargar e intentar de nuevo'}
                  icon="repeat"
                  disabled={activitySubmitting}
                  onPress={() => void retryActivityAfterReload()}
                />
              ) : (
                <Button
                  title={activitySubmitting ? 'Enviando…' : activityPhoto ? 'Enviar con foto' : 'Enviar sin foto'}
                  icon="send"
                  disabled={!canRegister || activitySubmitting}
                  onPress={() => void submitActivity()}
                />
              )}
              <Button title="Volver a la actividad" variant="outline" disabled={activitySubmitting} onPress={() => setActivityStage('details')} />
            </ScrollView>
          ) : null}
        </View>
      </View>
      )}
    </Modal>
    );
  };

  const renderRecipeModal = () => (
    <BottomSheet theme={theme} visible={Boolean(recipeDetails)} onClose={() => setRecipeDetails(null)}>
      <View style={screenStyles.sheetHeader}>
        <View style={styles.flex}>
          <Text style={[theme.type.h2, { color: theme.colors.texto }]}>{recipeDetails?.title}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setRecipeDetails(null)} style={[styles.close, { minWidth: 44, minHeight: 44 }]}>
          <Icon name="close" size={18} color={theme.colors.texto} />
        </Pressable>
      </View>
      {recipeDetails ? (
        <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={screenStyles.sheetContent}>
          {recipeDetails.catalogCode ? <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>Clave: {recipeDetails.catalogCode}</Text> : null}
          {recipeDetails.mealType ? <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>Tipo de comida: {RECIPE_MEAL_LABELS[recipeDetails.mealType]}</Text> : null}
          {recipeDetails.ageGroup ? <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>Grupo de edad: {recipeDetails.ageGroup}</Text> : null}
          <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>{recipeDetails.groups}</Text>
          {recipeDetails.preparationTimeMinutes !== undefined || recipeDetails.caloriesPerPortion !== undefined ? (
            <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>
              {recipeDetails.preparationTimeMinutes === undefined ? '' : `Preparación: ${recipeDetails.preparationTimeMinutes} min`}
              {recipeDetails.preparationTimeMinutes !== undefined && recipeDetails.caloriesPerPortion !== undefined ? ' · ' : ''}
              {recipeDetails.caloriesPerPortion === undefined || recipeDetails.caloriesPerPortion === null ? '' : `${recipeDetails.caloriesPerPortion} kcal por porción`}
            </Text>
          ) : null}
          {renderFoodPreferences()}
          {renderRecipeAllergyWarning(recipeDetails)}
          <Text style={[theme.type.h3, { color: theme.colors.texto }]}>Ingredientes</Text>
          {renderIngredientPills(recipeDetails.ingredients, profileAllergies)}
          {recipeDetails.ingredientDetails?.some(ingredient => ingredient.quantity) ? (
            <View>
              {recipeDetails.ingredientDetails.filter(ingredient => ingredient.quantity).map(ingredient => (
                <Text key={ingredient.name} style={[theme.type.body, { color: theme.colors.textoSecundario }]}>
                  {ingredient.name}: {ingredient.quantity}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={[theme.type.h3, { color: theme.colors.texto }]}>Preparación</Text>
          <Text style={[theme.type.body, { color: theme.colors.texto }]}>{recipeDetails.preparation}</Text>
          {recipeDetails.portionsByGroup ? (
            <>
              <Text style={[theme.type.h3, { color: theme.colors.texto }]}>Porciones por grupo</Text>
              <Text style={[theme.type.body, { color: theme.colors.texto }]}>{recipeDetails.portionsByGroup}</Text>
            </>
          ) : null}
          <View style={styles.notice}><Text style={styles.noticeText}>{recipeDetails.note}</Text></View>
          <Text style={styles.footer}>Una persona adulta debe acompañar la preparación y revisar alergias, etiquetas y posible contaminación cruzada. Que no aparezca una alerta no significa que sea segura.</Text>
        </ScrollView>
      ) : null}
    </BottomSheet>
  );

  const renderMenuPickerModal = () => (
    <BottomSheet theme={theme} visible={role === 'tutor' && Boolean(menuPicker)} onClose={() => setMenuPicker(null)}>
      <View style={screenStyles.sheetHeader}>
        <Text style={[theme.type.h2, styles.flex, { color: theme.colors.texto }]}>
          Elegir receta · {menuPicker ? `${menuPicker.day}, ${getMealName(menuPicker.meal)}` : ''}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setMenuPicker(null)} style={[styles.close, { minWidth: 44, minHeight: 44 }]}>
          <Icon name="close" size={18} color={theme.colors.texto} />
        </Pressable>
      </View>
      {menuPicker ? (
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={screenStyles.sheetContent} keyboardShouldPersistTaps="handled">
          {renderFoodPreferences()}
          <Field
            label="Buscar receta o ingrediente"
            onChangeText={setMenuRecipeSearch}
            placeholder="Ej. avena, frijoles…"
            value={menuRecipeSearch}
          />
          <View style={screenStyles.selectionRow}>
            {RECIPE_FILTERS.map(filter => (
              <View key={filter.id}>
                {renderSelectionPill(filter.label, menuRecipeFilter === filter.id, () => setMenuRecipeFilter(filter.id))}
              </View>
            ))}
          </View>
          {browsableRecipes.filter(recipe => recipeMatchesFilter(recipe, menuRecipeFilter, menuRecipeSearch)).map(recipe => {
            const warnings = recipeWarnings(recipe, profileAllergies);
            const warningText = warnings.length
              ? `Posible coincidencia con alergias registradas: ${foodNames(warnings)}.`
              : '';
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={warningText ? `Asignar ${recipe.title}. ${warningText}` : `Asignar ${recipe.title}`}
                key={recipe.id}
                onPress={() => assignRecipe(menuPicker.day, menuPicker.meal, recipe.id)}
              >
                <SectionCard theme={theme} role="tutor" title={recipe.title} subtitle={recipe.groups}>
                  {renderIngredientPills(recipe.ingredients, profileAllergies)}
                  {renderRecipeAllergyWarning(recipe)}
                </SectionCard>
              </Pressable>
            );
          })}
          {!browsableRecipes.some(recipe => recipeMatchesFilter(recipe, menuRecipeFilter, menuRecipeSearch)) ? (
            <View style={styles.emptyState}>
              <Text style={styles.body}>No encontramos recetas con esos filtros.</Text>
              <Button title="Limpiar búsqueda" small variant="outline" onPress={() => { setMenuRecipeSearch(''); setMenuRecipeFilter('todas'); }} />
            </View>
          ) : null}
          <PillButton theme={theme} label="Quitar receta asignada" variant="ghost" onPress={() => assignRecipe(menuPicker.day, menuPicker.meal, null)} />
        </ScrollView>
      ) : null}
    </BottomSheet>
  );

  const renderChatModal = () => (
    <BottomSheet theme={theme} visible={chatOpen} onClose={() => setChatOpen(false)}>
          <View style={styles.modalHeader}>
            <View style={styles.flex}>
              <View style={styles.horizontal}>
                <Icon name="leaf" size={18} color={COLORS.green} />
                <Text role="heading" aria-level={2} style={styles.modalTitle}>NutriBot Familiar</Text>
              </View>
              <Text style={styles.muted}>Con IA de Google · no compartas datos personales</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setChatOpen(false)} style={styles.close}>
              <Icon name="close" size={18} color={COLORS.ink} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 330 }} contentContainerStyle={{ gap: SPACE[8], paddingVertical: SPACE[4] }}>
            {chatMessages.map((message, index) => (
              <View
                key={`${index}-${message.from}`}
                style={{
                  alignSelf: message.from === 'child' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  padding: SPACE[12],
                  borderRadius: RADIUS.md,
                  backgroundColor: message.from === 'child' ? COLORS.paleBlue : COLORS.white,
                  borderWidth: 1,
                  borderColor: COLORS.line,
                }}
              >
                <Text style={styles.body}>{message.text}</Text>
              </View>
            ))}
            {chatPending ? (
              <View style={styles.horizontal}>
                <ActivityIndicator size="small" color={COLORS.green} />
                <Text style={styles.muted}>NutriBot está pensando…</Text>
              </View>
            ) : null}
          </ScrollView>
          {chatError ? <Text accessibilityRole="alert" style={styles.errorText}>{chatError}</Text> : null}
          <View style={styles.horizontal}>
            <Field
              label="Escribe un mensaje"
              onChangeText={setChatInput}
              onSubmitEditing={sendChatMessage}
              placeholder="¿De qué quieres platicar?"
              returnKeyType="send"
              value={chatInput}
              style={styles.flex}
            />
            <Button
              title="Enviar"
              small
              disabled={!chatInput.trim() || chatPending || offline}
              onPress={() => { void sendChatMessage(); }}
            />
          </View>
          <Text style={styles.footer}>Tus mensajes se envían a Google para generar respuestas y no se guardan en la app. No compartas datos personales. No es un servicio médico; si algo te preocupa, platícalo con una persona adulta de confianza.</Text>
    </BottomSheet>
  );

  const renderArchiveModal = () => (
    <BottomSheet theme={theme} visible={role === 'tutor' && Boolean(profileToArchive)} onClose={() => setProfileToArchive(null)}>
          <Text role="heading" aria-level={2} style={styles.modalTitle}>¿Eliminar este perfil?</Text>
          <Text style={[styles.body, { marginVertical: SPACE[12] }]}>
            “{profileToArchive?.name}” se eliminará con todos sus datos, avances y fotos de evidencia. Esta acción no se puede deshacer.
          </Text>
          <View style={styles.horizontal}>
            <Button title="Cancelar" variant="outline" style={styles.flex} onPress={() => setProfileToArchive(null)} />
            <Button title="Eliminar perfil" variant="danger" style={styles.flex} onPress={deleteProfile} />
          </View>
    </BottomSheet>
  );

  const renderTutorGateModal = () => (
    <BottomSheet theme={theme} visible={role === 'child' && showTutorGate} onClose={closeTutorGate}>
          <View style={styles.modalHeader}>
            <Text role="heading" aria-level={2} style={styles.modalTitle}>Acceso al espacio tutor</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              disabled={tutorGateBusy}
              onPress={closeTutorGate}
              style={styles.close}
            >
              <Icon name="close" size={18} color={COLORS.ink} />
            </Pressable>
          </View>
          <Text style={[styles.body, { marginBottom: SPACE[12] }]}>
            Confirma la contraseña de la cuenta tutora para continuar.
          </Text>
          <Field
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect={false}
            editable={!tutorGateBusy && tutorGateLockRemaining === 0}
            label="Contraseña"
            onChangeText={value => {
              setTutorGatePassword(value);
              setTutorGateError('');
            }}
            onSubmitEditing={() => void confirmTutorGate()}
            returnKeyType="done"
            secureTextEntry
            value={tutorGatePassword}
          />
          {tutorGateLockRemaining > 0 ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              Demasiados intentos. Espera {tutorGateLockRemaining} segundos para volver a intentar.
            </Text>
          ) : tutorGateError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>{tutorGateError}</Text>
          ) : null}
          {tutorGateBusy ? (
            <View style={[styles.horizontal, { justifyContent: 'center', marginBottom: SPACE[12] }]}>
              <ActivityIndicator size="small" color={COLORS.blue} />
              <Text style={styles.muted}>Verificando contraseña…</Text>
            </View>
          ) : null}
          <View style={styles.horizontal}>
            <Button
              title="Cancelar"
              variant="outline"
              style={styles.flex}
              disabled={tutorGateBusy}
              onPress={closeTutorGate}
            />
            <Button
              title="Confirmar"
              style={styles.flex}
              disabled={tutorGateBusy || tutorGateLockRemaining > 0 || !tutorGatePassword}
              onPress={() => void confirmTutorGate()}
            />
          </View>
    </BottomSheet>
  );

  const renderChildProfilePickerModal = () => (
    <BottomSheet theme={theme} visible={role === 'tutor' && showChildProfilePicker} onClose={cancelChildProfilePicker}>
          <Text role="heading" aria-level={2} style={styles.modalTitle}>¿Quién va a usar la app?</Text>
          <Text style={[styles.body, { marginTop: SPACE[6], marginBottom: SPACE[12] }]}>
            Elige el perfil infantil para esta sesión.
          </Text>
          <View style={{ gap: SPACE[8] }}>
            {profiles.map(profile => (
              <Pressable
                accessibilityRole="button"
                aria-selected={selectedProfileKey === profile.key}
                key={profile.key}
                onPress={() => {
                  if (role === 'tutor' && profiles.some(item => item.key === profile.key)) {
                    enterChildMode(profile.key);
                  }
                }}
                style={[
                  styles.profileChip,
                  { minHeight: 58, justifyContent: 'flex-start' },
                  selectedProfileKey === profile.key && styles.profileChipActive,
                ]}
              >
                <AvatarIllustration
                  theme={profile.theme}
                  selection={data?.avatarSelections[profile.key]}
                  size="small"
                />
                <Text style={styles.profileChipText}>{profile.name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.horizontal, { marginTop: SPACE[14] }]}>
            <Button
              title="Cancelar"
              variant="outline"
              style={styles.flex}
              onPress={cancelChildProfilePicker}
            />
          </View>
    </BottomSheet>
  );

  const renderTabContent = () => {
    switch (tab) {
      case 'Familia':
        return role === 'tutor' ? renderTutorHome() : renderChildHome();
      case 'Recetas':
        return renderRecipes();
      case 'Menú':
        return role === 'tutor' ? renderWeeklyMenu() : null;
      case 'Gestión':
        if (role === 'tutor' && offline) {
          return (
            <Card>
              <View style={styles.horizontal}>
                <Icon name="offline" size={22} color={COLORS.orange} />
                <Text role="heading" aria-level={2} style={[styles.cardTitle, styles.flex]}>Gestión necesita internet</Text>
              </View>
              <Text style={styles.body}>
                Los retos, recompensas y actividades se guardan en la base de datos. Cuando vuelva la conexión podrás crearlos o editarlos aquí.
              </Text>
              <Text style={styles.muted}>Mientras tanto, en Familia puedes revisar y aprobar lo pendiente.</Text>
            </Card>
          );
        }
        return role === 'tutor' && authUser ? (
          <DatabaseManagement
            userId={authUser.id}
            profiles={profiles.map(profile => ({ progressKey: profile.progressKey, name: profile.name, rewardPoints: rewardBalanceFor(profile) }))}
            family={{ assignments: familyAssignments, rewardRequests, mealPlans }}
            actions={familyActions}
          />
        ) : null;
      case 'Logros':
        return role === 'child' ? renderAchievements() : null;
      case 'Ajustes':
        if (role === 'child') return renderChildAvatarSettings();
        return renderSettings();
      case 'Ayuda':
        return role === 'child' ? renderHelp() : null;
      default:
        return null;
    }
  };

  if (fontError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Icon name="warning" size={34} color={COLORS.orange} />
          <Text style={styles.cardTitle}>No se pudieron cargar las tipografías</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>Cierra y vuelve a abrir la app.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Icon name="warning" size={34} color={COLORS.orange} />
          <Text style={styles.cardTitle}>No se pudo conectar con tu espacio familiar</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>{loadError}</Text>
          <Button title="Intentar de nuevo" onPress={retryConnection} />
          {authUser && role === 'tutor' ? <Button title="Cerrar sesión" variant="outline" onPress={logout} /> : null}
        </View>
      </SafeAreaView>
    );
  }

  if (waitingForLoad || loadingVisible) {
    const metadataName = authUser?.user_metadata?.name;
    const name = typeof metadataName === 'string' && metadataName.trim()
      ? metadataName.trim()
      : authUser?.email?.split('@')[0];
    const loadingContent = (
      <SafeAreaView style={[styles.safe, { backgroundColor: authUser ? loginTheme.colors.fondoInicio : loginTheme.colors.hero }]}>
        {loadingVisible ? (
          <LoadingScreen variant={authUser ? 'sesion' : 'entrada'} theme={loginTheme} name={name} fontsLoaded={fontsLoaded} />
        ) : null}
      </SafeAreaView>
    );
    // El sonido de inicio de sesión debe sonar mientras se muestra la pantalla de carga.
    return data && !waitingForLoad ? (
      <SoundEffectsProvider enabled={data.soundEnabled ?? false}>
        <SoundCue cue={soundCue} onPlayed={clearSoundCue} />
        {loadingContent}
      </SoundEffectsProvider>
    ) : loadingContent;
  }

  if (!session) return renderLogin();

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.cardTitle}>No hay datos disponibles en tu espacio familiar</Text>
          <Button title="Volver a intentar" onPress={() => { setLoading(true); void loadData(); }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.fondoInicio }]}>
    <ThemeModeContext.Provider value={themeMode}>
    <IconWeightContext.Provider value={role === 'child' ? 'duotone' : 'regular'}>
    <SoundEffectsProvider enabled={data.soundEnabled ?? false}>
      <SoundCue cue={soundCue} onPlayed={clearSoundCue} />
      <View style={[styles.shell, { backgroundColor: theme.colors.fondoInicio }]}>
        <View style={screenStyles.topBar}>
          <TopBar
            theme={theme}
            role={role}
            onSelectChild={() => {
              setSettingsSection('main');
              requestRoleChange('child');
            }}
            onRequestTutor={() => {
              setSettingsSection('main');
              requestRoleChange('tutor');
            }}
            childName={selectedProfile?.name}
            avatar={role === 'child' && selectedProfile ? renderAvatar(selectedProfile, 'small') : undefined}
          />
        </View>
        {renderTutorProfileStrip()}
        <ScrollView
          ref={mainScrollRef}
          key={role}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {offline ? (
            <View accessibilityLiveRegion="polite" style={[styles.notice, { gap: SPACE[4] }]}>
              <View style={styles.horizontal}>
                <Icon name="offline" size={18} color={COLORS.orange} />
                <Text style={[styles.cardTitle, styles.flex]}>Sin conexión</Text>
              </View>
              <Text style={styles.noticeText}>
                {role === 'child'
                  ? 'Puedes seguir jugando. Tu avance se guarda en este teléfono y se envía cuando vuelva internet.'
                  : offlineCacheAvailable
                    ? 'Puedes seguir usando la app. Los cambios se guardan cifrados en este teléfono y se suben cuando vuelva internet.'
                    : 'Puedes seguir usando la app mientras esta pestaña siga abierta. Si la cierras antes de que vuelva internet, se pierden los cambios sin subir.'}
              </Text>
              {role === 'tutor' ? (
                <Text style={styles.muted}>Gestión, fotos, NutriBot y volver a Tutor desde Niñez necesitan internet.</Text>
              ) : null}
            </View>
          ) : pendingSync ? (
            <View accessibilityLiveRegion="polite" style={[styles.notice, styles.horizontal]}>
              <ActivityIndicator size="small" color={COLORS.orange} />
              <Text style={[styles.noticeText, styles.flex]}>Subiendo tus cambios…</Text>
            </View>
          ) : null}
          {storageError ? (
            <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: SHARED.errorFondo, borderColor: SHARED.errorBorde, gap: SPACE[8] }]}>
              <Text style={[styles.noticeText, { color: COLORS.error }]}>No se guardó el último cambio: {storageError}</Text>
              <Button
                title="Recargar datos"
                small
                variant="outline"
                onPress={() => { void loadData(); }}
              />
            </View>
          ) : null}
          {notice ? (
            <Pressable accessibilityRole="button" accessibilityLiveRegion="polite" onPress={() => setNotice('')} style={styles.banner}>
              <Text style={styles.bannerText}>{notice}  ·  Toca para cerrar</Text>
            </Pressable>
          ) : null}
          {renderTabContent()}
        </ScrollView>
        <BottomBar
          theme={theme}
          items={NAV_ITEMS[role]}
          activeId={tab}
          onSelect={id => {
            const item = NAV_ITEMS[role].find(candidate => candidate.id === id);
            if (!item) {
              if (__DEV__) console.error(`Pestaña no disponible para el rol actual: ${id}`);
              return;
            }
            setSettingsSection('main');
            if (role === 'child') {
              setChildHomeView(null);
              setChildSettingsSection('main');
              setAvatarDraft(null);
            }
            setTab(item.id);
          }}
        />
        {transition?.kind === 'tutor' && transition.userId === authUser?.id &&
          role === 'tutor' && !reduceMotion && !storageError ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.fondoInicio }]}>
            {transition.visible ? (
              <LoadingScreen variant="sesion" theme={theme} name={typeof authUser?.user_metadata?.name === 'string' ? authUser.user_metadata.name : authUser?.email?.split('@')[0]} />
            ) : null}
          </View>
        ) : null}
        {transition?.kind === 'perfil' && transition.userId === authUser?.id &&
          role === 'child' && selectedProfile?.key === transition.owner && !reduceMotion && !storageError ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.fondoInicio }]}>
            {transition.visible ? (
              <LoadingScreen variant="perfil" theme={theme} name={selectedProfile.name}
                points={pointsFor(selectedProfile)} avatar={renderAvatar(selectedProfile)} />
            ) : null}
          </View>
        ) : null}
        {role === 'child' && data && selectedProfile ? (
          <AchievementCelebration
            theme={theme}
            profileKey={selectedProfile.key}
            badges={unique(getProgress(data, selectedProfile).badges)}
            describe={badge => ({
              title: ACHIEVEMENT_INFO[badge]?.title ?? badge.replace(/[-_]/g, ' '),
              icon: ACHIEVEMENT_INFO[badge]?.icon ?? 'achievements',
            })}
          />
        ) : null}
      </View>
      {renderProfileModal()}
      {renderActivityModal()}
      {renderRecipeModal()}
      {renderMenuPickerModal()}
      {renderChatModal()}
      {renderArchiveModal()}
      {renderTutorGateModal()}
      {renderChildProfilePickerModal()}
    </SoundEffectsProvider>
    </IconWeightContext.Provider>
    </ThemeModeContext.Provider>
    </SafeAreaView>
  );
}
