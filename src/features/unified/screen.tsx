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

import {
  ACTIVITIES,
  CHILD_AVATARS,
  RECIPES,
  WEEKDAYS,
  type Activity,
  type Recipe,
} from '@/constants/warrior-kids';
import { AVATAR_OPCIONES, type AvatarKey } from '@/constants/family-wellness';
import {
  CHILD_MOODS,
  COLORS,
  DIET_INGREDIENTS,
  EXERCISE_CATEGORIES,
  FAQ_ITEMS,
  FAMILY_DIET,
  FOOD_OPTIONS,
} from '@/features/unified/constants';
import {
  clearLegacyLocalData,
  type AccountRole,
  type AvatarSelection,
  type ChildProgress,
  type LocalAccount,
  type NutriChild,
  type ProfileLink,
  type UnifiedDailyLog,
  type UnifiedData,
  type WarriorChild,
  type WeeklyMeals,
} from '@/features/unified/model';
import {
  accountFromUser,
  deleteDatabaseChild,
  deleteEvidence,
  loadDatabaseRecipes,
  loadPhysicalActivityCatalog,
  loadCloudData,
  saveDatabaseChildProfile,
  saveCloudData,
  subscribeToCloudData,
  uploadEvidence,
  verifyTutorPassword,
  type PhysicalActivityCatalog,
} from '@/features/unified/cloud-data';
import { AchievementCelebration, BarChart, BottomBar, BottomSheet, FoodChip, HabitCard, HeroCard, ListRow, PillButton, SectionCard, TopBar, useReduceMotion } from '@/features/unified/design';
import { EvidencePhoto } from '@/features/unified/evidence-photo';
import { LoadingScreen, SESSION_START_MS, useLoadingTransition, useLoadingVisibility } from '@/features/unified/loading';
import { DatabaseManagement } from '@/features/unified/database-management';
import { PlatoDelBuenComer, SelectedFoodPills } from '@/features/unified/plato';
import { SoundCue, SoundEffectsProvider, type SoundCueName } from '@/features/unified/sound-effects';
import { BORDER, FOOD_GROUP_COLORS, RADIUS, SHADOW, SHARED, SPACE, tint, useAppTheme } from '@/features/unified/tokens';
import { getSupabaseClient } from '@/lib/supabase';
import {
  AvatarIllustration,
  Button,
  Card,
  Field,
  Icon,
  ProgressMeter,
  SectionTitle,
  styles,
  Tag,
  type AppIconName,
} from '@/features/unified/ui';
import { formatMinutes, plural } from '@/features/unified/format';
import { ageFromBirth, cleanText, errorReason, formatBirthDate, maskBirthDate, parseBirthDate, friendlyError, unique, userError } from '@/features/unified/utils';

type AppTab = 'Familia' | 'Recetas' | 'Menú' | 'Gestión' | 'Logros' | 'Ajustes' | 'Ayuda';
type ChildHomeSection = 'habitos' | 'semana' | 'movimiento' | 'nutribot';
type PhotoDraft = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};
const AVATAR_COLORS: Record<AvatarKey, string[]> = {
  piel: ['#F8D5B8', '#E6B98E', '#C88C61', '#A96845', '#805137', '#57392E'],
  cabello: ['#6F4939', '#B45D3D', '#302B32', '#D6C49A', '#784AA8', '#1C1B20'],
  ropa: ['#E66B9A', '#805AD5', '#2B6CB0', '#48A878', '#ED8936', '#344255'],
  accesorio: ['#ED64A6', '#805AD5', '#F6C445', '#48BB78', '#2B6CB0', '#ED8936'],
  fondo: ['#FFF0F5', '#F0FAF5', '#EAF4FF', '#F0EEFF', '#FFFBEA', '#F5F0FF'],
};
const ACHIEVEMENT_INFO: Record<string, { title: string; icon: AppIconName; description: string }> = {
  'primer-reto': { title: 'Primer reto', icon: 'check', description: 'Completaste tu primer reto.' },
  'familia-en-equipo': { title: 'Familia en equipo', icon: 'tutor', description: 'Compartiste un avance con tu familia.' },
  actividad: { title: 'En movimiento', icon: 'activity', description: 'Registraste una actividad.' },
  mision: { title: 'Reto cumplido', icon: 'achievements', description: 'Terminaste un reto diario.' },
};
const MOOD_ICONS: Record<string, AppIconName> = {
  feliz: 'mood',
  bien: 'check',
  tranquilo: 'mood',
  normal: 'mood',
  cansado: 'sleep',
  triste: 'mood',
  estresada: 'activity',
};
type UnifiedProfile = {
  key: string;
  progressKey: string;
  name: string;
  theme: 'nina' | 'nino';
  avatar: string;
  nutri: NutriChild | null;
  warrior: WarriorChild | null;
  link: ProfileLink | null;
};
type ProfileDraft = {
  name: string;
  theme: 'nina' | 'nino';
  avatar: string;
  birthDate: string;
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

const screenStyles = StyleSheet.create({
  loginLogo: { width: 64, height: 64 },
  topBar: { paddingHorizontal: SPACE[16], paddingTop: SPACE[12], paddingBottom: SPACE[12] },
  sectionHeading: { gap: SPACE[4], marginTop: SPACE[4] },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[8] },
  moodChoice: { width: '30%', minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: SPACE[4], borderRadius: RADIUS.md, borderWidth: BORDER.fino },
  moodIcon: { width: 44, height: 44, borderRadius: RADIUS.pildora, alignItems: 'center', justifyContent: 'center' },
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
  avatarOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[12] },
  avatarOption: { width: 52, height: 52, borderRadius: RADIUS.pildora, borderWidth: BORDER.avatar, alignItems: 'center', justifyContent: 'center' },
  avatarColor: { width: 38, height: 38, borderRadius: RADIUS.pildora, alignItems: 'center', justifyContent: 'center' },
  avatarCheck: { width: 22, height: 22, borderRadius: RADIUS.pildora, backgroundColor: SHARED.tarjeta, alignItems: 'center', justifyContent: 'center' },
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
  accesorio: 'Accesorio',
  fondo: 'Fondo',
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
  return { piel: 0, cabello: 0, ropa: theme === 'nina' ? 0 : 2, accesorio: 0, fondo: theme === 'nina' ? 0 : 2 };
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
  const result: UnifiedProfile[] = [];

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
  return result;
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
    avatar: CHILD_AVATARS[0],
    birthDate: '',
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
  };
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
  const nextWriteVersion = useRef(0);
  const pendingWrites = useRef(0);
  const writesBlocked = useRef(false);
  const loadGeneration = useRef(0);
  const authUserId = useRef<string | null>(null);
  const [role, setRole] = useState<AccountRole>('tutor');
  const [selectedProfileKey, setSelectedProfileKey] = useState<string | null>(null);
  const [showChildProfilePicker, setShowChildProfilePicker] = useState(false);
  const [tab, setTab] = useState<AppTab>('Familia');
  const [childHomeSections, setChildHomeSections] = useState<Record<ChildHomeSection, boolean>>({
    habitos: true, semana: false, movimiento: false, nutribot: false,
  });
  const [settingsSection, setSettingsSection] = useState<'main' | 'parental' | 'notifications' | 'help'>('main');
  const mainScrollRef = useRef<ScrollViewInstance>(null);
  // Cada pestaña o sección de ajustes abre desde arriba, no donde se quedó la anterior.
  useEffect(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab, settingsSection]);
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
  const [activityPhoto, setActivityPhoto] = useState<PhotoDraft | null>(null);
  const [activityError, setActivityError] = useState('');
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const activitySubmittingRef = useRef(false);
  const [reviewingKeys, setReviewingKeys] = useState<string[]>([]);
  const reviewingActivities = useRef(new Set<string>());
  const [sleepInput, setSleepInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ from: 'bot' | 'child'; text: string }[]>([
    { from: 'bot', text: '¡Hola! Soy NutriBot. Podemos hablar de hábitos, comida y cómo te sientes.' },
  ]);
  const [avatarCategory, setAvatarCategory] = useState<AvatarKey>('cabello');
  const [childSettingsSection, setChildSettingsSection] = useState<'main' | 'avatar'>('main');
  const [avatarDraft, setAvatarDraft] = useState<{
    profileKey: string;
    selection: AvatarSelection;
    changed: AvatarKey[];
  } | null>(null);
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    if (!authUser) return null;
    const generation = ++loadGeneration.current;
    try {
      const account = accountFromUser(authUser);
      const [loaded, catalog, recipes] = await Promise.all([
        loadCloudData(authUser, account),
        loadPhysicalActivityCatalog(),
        loadDatabaseRecipes(),
      ]);
      await clearLegacyLocalData();
      if (generation !== loadGeneration.current) return null;
      setLoadError('');
      dataVersion.current = loaded.version;
      nextWriteVersion.current = loaded.version;
      writesBlocked.current = false;
      dataRef.current = loaded.data;
      setData(loaded.data);
      setPhysicalActivities(catalog);
      setDatabaseRecipes(recipes);
      setSession(account);
      setStorageError('');
      return loaded;
    } catch (error) {
      if (generation === loadGeneration.current) {
        setLoadError(friendlyError(error, 'No se pudieron cargar los datos de tu espacio familiar.'));
      }
      return null;
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [authUser]);

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
        nextWriteVersion.current = 0;
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
    try {
      const supabase = getSupabaseClient();
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        if (active) applyAuthUser(currentSession?.user ?? null);
      });
      unsubscribe = () => authListener.subscription.unsubscribe();
      void Promise.resolve()
        .then(() => supabase.auth.getSession())
        .then(({ data: sessionData, error }) => {
          if (!active) return;
          if (error) throw error;
          applyAuthUser(sessionData.session?.user ?? null);
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
      nextWriteVersion.current = 0;
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
            if (!active || pendingWrites.current > 0 || nextSnapshot.version <= dataVersion.current) return;
            dataVersion.current = nextSnapshot.version;
            nextWriteVersion.current = nextSnapshot.version;
            dataRef.current = nextSnapshot.data;
            setData(nextSnapshot.data);
          },
          error => {
            if (active) setStorageError(error.message);
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
  }, [authReady, authUser, loadData]);

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
    const userId = authUser.id;
    const expectedVersion = nextWriteVersion.current;
    nextWriteVersion.current += 1;
    pendingWrites.current += 1;
    const pendingWrite = writeQueue.current.catch(() => undefined).then(async () => {
      const version = await saveCloudData(userId, next, expectedVersion);
      if (authUserId.current === userId) dataVersion.current = version;
    });
    writeQueue.current = pendingWrite;
    void pendingWrite.then(
      () => {
        if (authUserId.current === userId) setStorageError('');
      },
      error => {
        if (authUserId.current === userId) {
          writesBlocked.current = true;
          setStorageError(friendlyError(error, 'No se pudieron guardar los cambios en tu espacio familiar.'));
        }
      },
    ).finally(() => {
      pendingWrites.current -= 1;
    });
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
  const activityFor = (id: string) =>
    activityCatalog.find(activity => activity.id === id) ??
    ACTIVITIES.find(activity => activity.id === id);
  const currentProfile = profiles.find(profile => profile.key === selectedProfileKey) ?? null;
  const selectedProfile = currentProfile ?? (role === 'tutor' ? profiles[0] ?? null : null);
  const theme = useAppTheme(role, selectedProfile?.theme ?? 'nina');
  const loginTheme = useAppTheme('tutor', 'nina');
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
    setProfileDraft(profile
      ? {
          name: profile.name,
          theme: profile.theme,
          avatar: profile.avatar,
          birthDate: formatBirthDate(profile.nutri?.nacimiento),
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
    if (profileDraft.healthConsent && !birthDate) {
      setProfileError('Para sincronizar el perfil con la base de datos, registra su fecha de nacimiento.');
      return;
    }
    if (
      profileDraft.healthConsent &&
      Boolean(profileDraft.weight.trim()) !== Boolean(profileDraft.height.trim())
    ) {
      setProfileError('Para registrar una medición, captura peso y estatura o deja ambos campos vacíos.');
      return;
    }
    const weight = profileDraft.weight.trim() ? Number(profileDraft.weight) : null;
    const height = profileDraft.height.trim() ? Number(profileDraft.height) : null;
    if (
      profileDraft.healthConsent &&
      ((weight !== null && (!Number.isFinite(weight) || weight < 10 || weight > 150)) ||
        (height !== null && (!Number.isFinite(height) || height < 80 || height > 200)))
    ) {
      setProfileError('Revisa el peso (10 a 150 kg) y la estatura (80 a 200 cm).');
      return;
    }

    if (!dataRef.current || !authUser || writesBlocked.current) {
      setProfileError('Los datos todavía no están listos para guardar el perfil.');
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
          weight: profileDraft.weight,
          height: profileDraft.height,
          diagnosis: profileDraft.diagnosis,
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
              edad: undefined,
              peso: profileDraft.weight.trim(),
              altura: profileDraft.height.trim(),
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
              edad: undefined,
              peso: profileDraft.weight.trim(),
              altura: profileDraft.height.trim(),
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
        return {
          ...current,
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
        ? 'El perfil y sus datos autorizados se están guardando en la base de datos.'
        : 'El perfil se guardó en tu espacio familiar; los datos de salud no se sincronizaron con la base de datos.');
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
    updateData(current => {
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

  const setMood = (mood: string) => {
    if (!selectedProfile) return;
    updateDailyLog(selectedProfile, todayKey(), log => ({ ...log, mood }));
    setNotice('Gracias por compartir cómo te sientes.');
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

  const submitActivity = async () => {
    if (!selectedProfile || !activityModal || !data || activitySubmittingRef.current) return;
    const duration = Number(activityDuration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
      setActivityError('Escribe una duración en minutos entre 1 y 180.');
      return;
    }
    const todayActivity = getDailyLog(data, selectedProfile, todayKey()).activities[activityModal.id];
    if (todayActivity?.status === 'approved') {
      setActivityError('Esta actividad ya fue aprobada hoy. Elige otra para registrar.');
      return;
    }
    activitySubmittingRef.current = true;
    setActivitySubmitting(true);
    try {
      const evidenceUri = activityPhoto ? await storeEvidence(activityPhoto) : null;
      updateDailyLog(selectedProfile, todayKey(), log => ({
        ...log,
        activities: {
          ...log.activities,
          [activityModal.id]: { status: 'pending', duration, evidenceUri },
        },
      }));
      setActivityModal(null);
      setActivityPhoto(null);
      setActivityDuration('');
      setActivityError('');
      setNotice('Actividad enviada a la persona tutora para revisión.');
    } catch (error) {
      setActivityError(friendlyError(error, 'No se pudo guardar la foto de evidencia.'));
    } finally {
      activitySubmittingRef.current = false;
      setActivitySubmitting(false);
    }
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
    const log = data?.dailyLogs[profile.progressKey]?.[date];
    const activity = log?.activities[activityId];
    if (!activity || activity.status !== 'pending') return;
    if (approve) {
      const catalog = activityFor(activityId);
      updateDailyLog(profile, date, current => ({
        ...current,
        activities: { ...current.activities, [activityId]: { ...activity, status: 'approved' } },
      }));
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

  const claimMission = (missionId: string, points: number) => {
    if (!selectedProfile || !data) return;
    const date = todayKey();
    const claims = data.missionClaims[selectedProfile.progressKey]?.[date] ?? [];
    if (claims.includes(missionId)) return;
    updateData(current => ({
      ...current,
      missionClaims: {
        ...current.missionClaims,
        [selectedProfile.progressKey]: {
          ...(current.missionClaims[selectedProfile.progressKey] ?? {}),
          [date]: [...(current.missionClaims[selectedProfile.progressKey]?.[date] ?? []), missionId],
        },
      },
    }));
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

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    const lower = cleanText(text);
    const response = lower.includes('triste') || lower.includes('mal') || lower.includes('cansad')
      ? 'Gracias por contármelo. Hablar con una persona adulta de confianza puede ayudar; no tienes que resolverlo a solas.'
      : lower.includes('comida') || lower.includes('comer') || lower.includes('receta')
        ? '¡Qué buena pregunta! Podemos elegir alimentos de varios colores y disfrutar la comida en familia. ¿Qué ingrediente te gusta?'
        : lower.includes('agua')
          ? 'Tomar agua durante el día ayuda a mantener tu cuerpo hidratado. ¡Un vasito a la vez!'
          : '¡Gracias por compartirlo! Cada familia tiene hábitos distintos. Elige cambios pequeños que se sientan bien para ti.';
    setChatMessages(current => [...current, { from: 'child', text }, { from: 'bot', text: response }]);
    setChatInput('');
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
    const categories = AVATAR_KEYS.filter(key => key !== 'fondo');
    const randomized = {
      piel: Math.floor(Math.random() * AVATAR_OPCIONES.piel.length),
      cabello: Math.floor(Math.random() * AVATAR_OPCIONES.cabello.length),
      ropa: Math.floor(Math.random() * AVATAR_OPCIONES.ropa.length),
      accesorio: Math.floor(Math.random() * AVATAR_OPCIONES.accesorio.length),
    };
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
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
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
          <Text style={[styles.authNotice, { color: SHARED.textoInactivo }]}>
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
              aria-selected={selectedProfile?.key === profile.key}
              key={profile.key}
              onPress={() => setSelectedProfileKey(profile.key)}
              style={[
                styles.profileChip,
                { borderRadius: RADIUS.pildora },
                selectedProfile?.key === profile.key && { borderColor: theme.colors.acento, backgroundColor: theme.colors.acentoSuave },
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
      aria-selected={selected}
      onPress={onPress}
      style={[screenStyles.selectionPill, { backgroundColor: selected ? theme.colors.acento : theme.colors.tarjeta }]}
    >
      <Text style={[selected ? theme.type.tabActive : theme.type.tab, { color: selected ? theme.colors.sobreAcento : theme.colors.texto }]}>{label}</Text>
    </Pressable>
  );

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

  const renderFoodPreferences = () => profileAllergies.length || profileNoLikes.length || profileLikes.length ? (
    <View accessibilityRole="alert" style={styles.notice}>
      <Text style={styles.noticeText}>
        {profileAllergies.length ? `Alergias registradas: ${profileAllergies.map(id => FOOD_OPTIONS.find(food => food.id === id)?.name ?? id).join(', ')}. ` : ''}
        {profileNoLikes.length ? `No le gustan: ${profileNoLikes.map(id => FOOD_OPTIONS.find(food => food.id === id)?.name ?? id).join(', ')}. ` : ''}
        {profileLikes.length ? `Le gustan: ${profileLikes.map(id => FOOD_OPTIONS.find(food => food.id === id)?.name ?? id).join(', ')}. ` : ''}
        Revisa ingredientes y etiquetas; estas alertas no detectan contaminación cruzada ni sustituyen indicaciones profesionales.
      </Text>
    </View>
  ) : null;

  const renderRecipeAllergyWarning = (recipe: Recipe) => {
    const warnings = recipeWarnings(recipe, profileAllergies);
    if (!warnings.length) return null;
    return (
      <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: SHARED.errorFondo, borderColor: SHARED.errorBorde }]}>
        <Text style={[styles.noticeText, { color: COLORS.error }]}>
          Revisa estos ingredientes por alergias registradas: {warnings.map(id => FOOD_OPTIONS.find(item => item.id === id)?.name ?? id).join(', ')}.
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

  const renderChildHome = () => {
    if (!selectedProfile || !data) return renderNoProfile();
    const log = getDailyLog(data, selectedProfile, todayKey());
    const progress = getProgress(data, selectedProfile);
    const waterGoal = data.warriorKids.waterGoal;
    const claimList = data.missionClaims[selectedProfile.progressKey]?.[todayKey()] ?? [];
    const missions = [
      { id: 'water-goal', title: 'Hidrátate a tu ritmo', detail: 'Llega a tu meta de agua de hoy.', icon: 'water' as const, points: MISSION_POINTS['water-goal'], ready: log.water >= waterGoal },
      { id: 'colorful-plate', title: 'Plato con colores', detail: 'Registra dos grupos de alimentos.', icon: 'food' as const, points: MISSION_POINTS['colorful-plate'], ready: new Set(log.foodGroups.map(canonicalFoodGroup).filter(Boolean)).size >= 2 },
      { id: 'mood-check', title: 'Cuéntanos cómo estás', detail: 'Elige un ánimo para hoy.', icon: 'mood' as const, points: MISSION_POINTS['mood-check'], ready: Boolean(log.mood) },
    ];
    const approvedActivities = Object.values(log.activities).filter(activity => activity.status === 'approved').length;
    const section = (id: ChildHomeSection, title: string, children: ReactNode) => {
      const expanded = childHomeSections[id];
      return (
        <View style={screenStyles.collapsibleContent}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={title}
            aria-expanded={expanded}
            onPress={() => setChildHomeSections(current => ({ ...current, [id]: !current[id] }))}
            style={[screenStyles.collapsibleHeader, { backgroundColor: theme.colors.acentoSuave }]}
          >
            <Text style={[theme.type.h3, { color: theme.colors.texto }]}>{title}</Text>
            <Text style={[theme.type.h2, { color: theme.colors.acento }]}>{expanded ? '−' : '+'}</Text>
          </Pressable>
          {expanded ? <View style={screenStyles.collapsibleContent}>{children}</View> : null}
        </View>
      );
    };
    return (
      <>
        <HeroCard
          theme={theme}
          title={`¡Hola, ${selectedProfile.name}!`}
          subtitle={`${todayLabel()} · ${approvedActivities} ${approvedActivities === 1 ? 'actividad aprobada' : 'actividades aprobadas'} hoy. Cada pequeño paso cuenta.`}
          points={progress.points}
          actionLabel="Personalizar avatar"
          onAction={openAvatarEditor}
        />

        {section('habitos', 'Mis hábitos y retos', <>
        <View style={screenStyles.sectionHeading}>
          <Text style={[theme.type.h2, { color: theme.colors.texto }]}>Mis hábitos de hoy</Text>
          <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>Avanza con calma, a tu manera.</Text>
        </View>

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
        <Text style={[theme.type.counter, { color: theme.colors.textoSecundario }]}>
          {claimList.includes('water-goal')
            ? '¡Ya completaste el reto de agua de hoy!'
            : log.water >= waterGoal
              ? `Tu reto de agua está listo. Reclama ${MISSION_POINTS['water-goal']} puntos en Retos para hoy.`
              : `Al llegar a tu meta, podrás reclamar ${MISSION_POINTS['water-goal']} puntos en Retos para hoy.`}
        </Text>

        <SectionCard theme={theme} role="child" title="Colores en mi plato" subtitle="Marca los grupos que probaste hoy.">
          <View style={styles.wrap}>
            {([
              { id: 'frutas-verduras', label: 'Frutas y verduras', group: 'frutas' },
              { id: 'cereales', label: 'Cereales', group: 'cereales' },
              { id: 'leguminosas', label: 'Leguminosas', group: 'leguminosas' },
              { id: 'origen-animal', label: 'Origen animal', group: 'animal' },
            ] as const).map(group => (
              <FoodChip
                key={group.id}
                theme={theme}
                label={group.label}
                group={group.group}
                selected={log.foodGroups.some(value => canonicalFoodGroup(value) === group.id)}
                onPress={() => toggleFoodGroup(group.id)}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard theme={theme} role="child" title="¿Cómo te sientes?" subtitle="Puedes elegir más de una vez durante el día.">
          <View style={screenStyles.moodGrid}>
            {CHILD_MOODS.map(mood => (
              <Pressable
                accessibilityRole="button"
                aria-selected={log.mood === mood.id}
                key={mood.id}
                onPress={() => setMood(mood.id)}
                style={[screenStyles.moodChoice, { borderColor: log.mood === mood.id ? mood.color : 'transparent' }]}
              >
                <View style={[screenStyles.moodIcon, { backgroundColor: tint(mood.color, 0.15) }]}>
                  <Icon name={MOOD_ICONS[mood.id] ?? 'mood'} size={24} color={mood.color} />
                </View>
                <Text style={[theme.type.tab, { color: theme.colors.texto }]}>{mood.label}</Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        <SectionCard theme={theme} role="child" title="Mi descanso" subtitle="Registra cuántas horas dormiste anoche.">
          <View style={styles.horizontal}>
            <Field
              label="Horas de sueño"
              keyboardType="decimal-pad"
              onChangeText={setSleepInput}
              placeholder={log.sleepHours === null ? 'Ej. 9' : `${log.sleepHours} horas`}
              value={sleepInput}
              style={styles.flex}
            />
            <Button title="Guardar" small onPress={saveSleep} />
          </View>
          {log.sleepHours !== null ? (
            <Tag title={`Registraste ${log.sleepHours} horas`} color={COLORS.purple} icon="sleep" />
          ) : null}
        </SectionCard>

        <SectionCard theme={theme} role="child" title="Retos para hoy" subtitle="Se activan cuando completas el hábito.">
          {missions.map(mission => {
            const claimed = claimList.includes(mission.id);
            return (
              <ListRow
                key={mission.id}
                theme={theme}
                icon={mission.icon}
                iconColor={theme.colors.acento}
                title={mission.title}
                subtitle={mission.detail}
                trailing={<Button
                  title={claimed ? 'Listo' : `+${mission.points} puntos`}
                  small
                  variant={claimed ? 'success' : 'secondary'}
                  disabled={!mission.ready || claimed}
                  onPress={() => claimMission(mission.id, mission.points)}
                />}
              />
            );
          })}
        </SectionCard>

        </>)}

        {section('semana', 'Mis insignias', <>
        <SectionCard theme={theme} role="child" title="Lo que he logrado" subtitle="Tus insignias de hábitos y retos.">
          <View style={styles.wrap}>
            {unique(progress.badges).length ? unique(progress.badges).map(badge => (
              <Tag
                key={badge}
                title={ACHIEVEMENT_INFO[badge]?.title ?? badge.replace(/[-_]/g, ' ')}
                color={COLORS.orange}
                icon="achievements"
              />
            )) : <Text style={styles.muted}>Tus insignias aparecerán conforme completes retos.</Text>}
          </View>
          <Button title="Ver mis logros" small icon="achievements" variant="secondary" onPress={() => setTab('Logros')} />
        </SectionCard>

        </>)}

        {section('movimiento', 'Movimiento', <>
        <SectionCard theme={theme} role="child" title="Movimiento de hoy" subtitle="Tus actividades cambian cada día. Elige una segura y pide apoyo si lo necesitas.">
          {activitiesForDay(activityCatalog.filter(activity => {
            const catalog = catalogActivityFor(activity.id);
            const age = ageFromBirth(selectedProfile.nutri?.nacimiento);
            if (age === null || !catalog) return true;
            const [minimum, maximum] = catalog.grupo_edad.match(/\d+/g)?.map(Number) ?? [];
            return minimum !== undefined && maximum !== undefined && age >= minimum && age <= maximum;
          }), todayKey()).map(activity => {
            const saved = log.activities[activity.id];
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver actividad ${activity.title}`}
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
                  <Tag title="Aprobada" color={COLORS.green} />
                ) : saved?.status === 'pending' ? (
                  <Tag title="En revisión" color={COLORS.orange} />
                ) : (
                  <Text style={[theme.type.caption, { color: theme.colors.acento }]}>Ver actividad</Text>
                )}
              </Pressable>
            );
          })}
          {activityCatalog.length === 0 ? (
            <Text style={styles.muted}>El catálogo de actividades todavía no tiene registros.</Text>
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

        {section('nutribot', 'NutriBot', <>
        <SectionCard theme={theme} role="child" title="¿Platicamos con NutriBot?">
          <View style={styles.between}>
            <View style={styles.flex}>
              <Text style={styles.muted}>Respuestas educativas guardadas en la app; no es un servicio médico.</Text>
            </View>
            <Button title="Abrir" small icon="leaf" onPress={() => setChatOpen(true)} />
          </View>
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
          <Text style={[theme.type.h1, { color: theme.colors.sobreAcento, fontSize: 34, lineHeight: 40 }]}>{progress.points}</Text>
          <Text style={[theme.type.body, { color: theme.colors.sobreAcento }]}>puntos acumulados</Text>
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
    const weekDays = selectedProfile ? Array.from({ length: 7 }, (_, index) => {
      const date = dateOffsetKey(6 - index);
      const label = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '');
      return { label, log: getDailyLog(data, selectedProfile, date) };
    }) : [];
    const dayColors = ['#FFB5C5', '#FFD6A5', '#FDFFB6', '#B5EAD7', '#A0E7E5', '#B4B8F5', '#E0BBE4'];
    const foodSlices = [
      { id: 'frutas-verduras', label: 'Frutas y verduras', color: '#9BE5A8' },
      { id: 'cereales', label: 'Cereales', color: '#FFD98A' },
      { id: 'leguminosas', label: 'Leguminosas', color: '#C9B3F5' },
      { id: 'origen-animal', label: 'Origen animal', color: '#9CCBFF' },
    ].map(group => ({
      label: group.label,
      color: group.color,
      value: weekDays.filter(day => day.log.foodGroups.some(value => canonicalFoodGroup(value) === group.id)).length,
    })).map(item => ({ ...item, valueLabel: `${plural(item.value, 'día')} de 7` }));
    const moodCounts = CHILD_MOODS.map(mood => ({
      label: mood.label,
      color: tint(mood.color, 0.55),
      value: weekDays.filter(day => day.log.mood === mood.id).length,
    })).filter(item => item.value > 0).map(item => ({ ...item, valueLabel: plural(item.value, 'día') }));
    const waterGoal = data.warriorKids.waterGoal;
    const waterSlices = weekDays.map((day, index) => ({
      label: day.label, color: dayColors[index], value: day.log.water, valueLabel: `${day.log.water} de ${waterGoal}`,
    }));
    const sleepSlices = weekDays.map((day, index) => ({
      label: day.label, color: dayColors[index], value: day.log.sleepHours ?? 0,
      valueLabel: day.log.sleepHours === null ? 'Sin dato' : `${day.log.sleepHours} h`,
    }));
    const selectedNutri = selectedProfile?.nutri;
    const selectedAge = ageFromBirth(selectedNutri?.nacimiento);
    return (
      <>
        <HeroCard
          key={selectedProfile?.key ?? 'sin-perfil'}
          theme={theme}
          title={`¡Hola, ${session?.name ?? 'familia'}!`}
          subtitle={`Acompaña los hábitos de tu familia. Puntos del perfil: ${selectedProfile?.name ?? 'sin seleccionar'}.`}
          points={selectedProfile ? getProgress(data, selectedProfile).points : 0}
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
            <Text style={[theme.type.metric, { color: theme.colors.texto }]}>{data.progressSharingEnabled ? allPendingActivities.length : '—'}</Text>
          </View>
        </View>

        {renderTutorIntro('EN FAMILIA', 'Perfiles de la familia', 'Selecciona un perfil para revisar su resumen.')}
        {profiles.map(profile => {
          const log = getDailyLog(data, profile, todayKey());
          const progress = getProgress(data, profile);
          const claims = data.missionClaims[profile.progressKey]?.[todayKey()] ?? [];
          const missionPoints = claims.reduce((total, id) => total + (MISSION_POINTS[id] ?? 0), 0);
          const approvedCount = Object.values(log.activities).filter(item => item.status === 'approved').length;
          return (
            <SectionCard key={profile.key} theme={theme} role="tutor" title={profile.name}>
              <View style={styles.between}>
                <View style={styles.horizontal}>
                  {renderAvatar(profile, 'small')}
                  <View>
                    <View style={[styles.horizontal, { gap: SPACE[4] }]}>
                      <Icon name="points" size={12} color={COLORS.orange} />
                      <Text style={styles.muted}>{progress.points} puntos</Text>
                    </View>
                  </View>
                </View>
                <Button
                  title={selectedProfile?.key === profile.key ? 'Seleccionado' : 'Ver perfil'}
                  small
                  variant={selectedProfile?.key === profile.key ? 'secondary' : 'outline'}
                  onPress={() => {
                    if (role === 'tutor') setSelectedProfileKey(profile.key);
                  }}
                />
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
                    {log.water}/{data.warriorKids.waterGoal} vasos · {missionPoints} puntos en retos de hoy
                  </Text>
                </View>
              ) : null}
              <View style={{ gap: SPACE[4] }}>
                <Text style={styles.inputLabel}>Logros de {profile.name}</Text>
                {unique(progress.badges).length ? (
                  <View style={styles.wrap}>
                    {unique(progress.badges).map(badge => (
                      <Tag
                        key={badge}
                        title={ACHIEVEMENT_INFO[badge]?.title ?? badge.replace(/[-_]/g, ' ')}
                        color={COLORS.orange}
                        icon="achievements"
                      />
                    ))}
                  </View>
                ) : <Text style={styles.muted}>Aún no tiene insignias desbloqueadas.</Text>}
              </View>
              {data.progressSharingEnabled ? (
                <View style={styles.wrap}>
                  {log.mood ? <Tag title={`Ánimo: ${CHILD_MOODS.find(item => item.id === log.mood)?.label ?? log.mood}`} color={COLORS.purple} /> : null}
                  {log.sleepHours !== null ? <Tag title={`${log.sleepHours} horas de sueño`} color={COLORS.blue} icon="sleep" /> : null}
                  {log.foodGroups.length ? <Tag title={`${log.foodGroups.length} ${log.foodGroups.length === 1 ? 'grupo' : 'grupos'} de alimentos`} color={COLORS.green} icon="food" /> : null}
                  <Tag title={`${approvedCount} ${approvedCount === 1 ? 'actividad aprobada' : 'actividades aprobadas'} hoy`} color={COLORS.green} />
                </View>
              ) : null}
            </SectionCard>
          );
        })}

        {selectedProfile && data.progressSharingEnabled ? (
          <SectionCard theme={theme} role="tutor" title={`Resumen semanal de ${selectedProfile.name}`} subtitle="Registros de los últimos 7 días.">
            {selectedAge !== null || selectedNutri?.peso || selectedNutri?.altura ? (
              <View style={styles.wrap}>
                {selectedAge !== null ? <Tag title={ageLabel(selectedAge)} color={COLORS.pink} icon="profile" /> : null}
                {selectedNutri?.peso ? <Tag title={`${selectedNutri.peso} kg`} color={COLORS.purple} icon="scale" /> : null}
                {selectedNutri?.altura ? <Tag title={`${selectedNutri.altura} cm`} color={COLORS.blue} icon="height" /> : null}
              </View>
            ) : null}
            <BarChart theme={theme} title="Agua por día" note={`Vasos contra la meta de ${plural(waterGoal, 'vaso')} al día.`} items={waterSlices} max={waterGoal} emptyText="Aún no hay vasos de agua registrados." />
            <BarChart theme={theme} title="Grupos de alimentos" note="Días de la semana en que se registró cada grupo." items={foodSlices} max={7} labelWidth={112} emptyText="Aún no hay grupos de alimentos registrados." />
            <BarChart theme={theme} title="Ánimo" note="Días en que se eligió cada ánimo." items={moodCounts} max={7} labelWidth={112} emptyText="Aún no hay estados de ánimo registrados." />
            <BarChart theme={theme} title="Descanso por día" note="Referencia: 9 a 12 horas para niñas y niños de 6 a 12 años." items={sleepSlices} max={12} emptyText="Aún no hay horas de sueño registradas." />
          </SectionCard>
        ) : null}

        {!data.progressSharingEnabled ? (
          <Card style={{ backgroundColor: COLORS.paleOrange, borderColor: SHARED.advertenciaBorde }}>
            <Text style={styles.cardTitle}>Compartir progreso está desactivado</Text>
            <Text style={styles.noticeText}>
              Los detalles de hábitos, ánimo y actividades no se muestran aquí. Puedes cambiar esta preferencia en Ajustes; el cambio se guarda en tu espacio familiar.
            </Text>
          </Card>
        ) : (
          <SectionCard theme={theme} role="tutor" title="Actividades por revisar" subtitle="Aprueba los registros o pide que se vuelvan a enviar.">
            {pendingActivities.length ? pendingActivities.map(item => {
              const activity = activityFor(item.activityId);
              return (
                <View key={`${item.profile.key}-${item.date}-${item.activityId}`} style={{ borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: SPACE[8], gap: SPACE[8] }}>
                  <View style={styles.between}>
                    <View style={[styles.horizontal, styles.flex]}>
                      <Icon name="activity" size={22} color={COLORS.blue} />
                      <View style={styles.flex}>
                        <Text style={styles.inputLabel}>{item.profile.name} · {activity?.title ?? 'Actividad'}</Text>
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
                      title="Aprobar"
                      small
                      variant="success"
                      disabled={reviewingKeys.includes(`${item.profile.key}-${item.date}-${item.activityId}`)}
                      style={styles.flex}
                      onPress={() => void reviewActivity(item.profile, item.date, item.activityId, true)}
                    />
                  </View>
                </View>
              );
            }) : (
              <View style={styles.emptyState}>
                <Icon name="achievements" size={34} color={COLORS.orange} />
                <Text style={styles.body}>No hay actividades pendientes. ¡Gracias por acompañar!</Text>
              </View>
            )}
          </SectionCard>
        )}
        <SectionCard theme={theme} role="tutor" title="Accesos rápidos">
          <Button title="Agregar perfil infantil" icon="add" variant="secondary" onPress={() => createOrEditProfile(null)} />
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
    return (
      <>
        {renderFoodPreferences()}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }}>
          <View style={screenStyles.selectionRow}>
            {WEEKDAYS.map(day => (
              <View key={day}>{renderSelectionPill(day, day === dietDay, () => setDietDay(day))}</View>
            ))}
          </View>
        </ScrollView>
        {([
          { id: 'desayuno' as const, label: 'Desayuno', icon: 'menu' as const, text: diet.desayuno },
          { id: 'comida' as const, label: 'Comida', icon: 'food' as const, text: diet.comida },
          { id: 'cena' as const, label: 'Cena', icon: 'sleep' as const, text: diet.cena },
        ]).map(meal => {
          const tutorRecipe = recipes.find(item => item.id === tutorMeals?.[meal.id]);
          const matchingAllergies = tutorRecipe
            ? recipeWarnings(tutorRecipe, profileAllergies)
            : allergyIds.filter(id => ingredientIds[meal.id]?.includes(id));
          return (
            <SectionCard key={meal.id} theme={theme} role={role} title={meal.label}>
              <View style={styles.horizontal}>
                <Icon name={meal.icon} size={24} color={theme.colors.acento} />
                <View style={styles.flex}>
                  <Text style={[theme.type.body, { color: theme.colors.texto }]}>{tutorRecipe?.title ?? meal.text}</Text>
                  {tutorRecipe ? <Text style={styles.muted}>Elegida por tu familia en el menú de la semana.</Text> : null}
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
          <Text style={styles.body}>{diet.kids}</Text>
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
              <View key={day}>{renderSelectionPill(day, selectedDay === day, () => setSelectedDay(day))}</View>
            ))}
          </View>
        </ScrollView>
        <Text style={[theme.type.h3, { color: theme.colors.texto }]}>Menú del {selectedDay}</Text>
        {renderFoodPreferences()}
        {MEALS.map(meal => {
          const recipe = recipes.find(item => item.id === meals[meal.id]);
          const savedValue = meals[meal.id];
          const warnings = recipe ? recipeWarnings(recipe, profileAllergies) : [];
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
                      <Text style={styles.muted}>Todavía sin receta asignada</Text>
                    )}
                  </View>
                </View>
                {role === 'tutor' ? (
                  <Button
                    title={savedValue ? 'Cambiar' : 'Agregar'}
                    small
                    variant="outline"
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
                  {warnings.length ? <Text style={styles.errorText}>Revisa estos ingredientes: {warnings.map(id => FOOD_OPTIONS.find(item => item.id === id)?.name ?? id).join(', ')}.</Text> : null}
                  {dislikes.length ? <Text style={styles.noticeText}>Preferencias para evitar: {dislikes.map(id => FOOD_OPTIONS.find(item => item.id === id)?.name ?? id).join(', ')}.</Text> : null}
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
    if (!selectedProfile || !avatarDraft || avatarDraft.profileKey !== selectedProfile.key) return renderNoProfile();
    const options = AVATAR_OPCIONES[avatarCategory];
    const selection = avatarDraft.selection;
    return (
      <>
        <Button
          title="Volver a ajustes"
          icon="logout"
          variant="outline"
          onPress={() => { setAvatarDraft(null); setChildSettingsSection('main'); }}
        />
        <View style={[screenStyles.avatarPreview, { backgroundColor: theme.colors.acentoSuave }]}>
          <AvatarIllustration theme={selectedProfile.theme} selection={selection} />
          <Text style={[theme.type.h2, { color: theme.colors.texto }]}>{selectedProfile.name}</Text>
        </View>
        <SectionCard theme={theme} role="child" title="Personaliza tu avatar" subtitle="Elige cada detalle para crear tu personaje.">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }}>
            <View style={screenStyles.avatarTabs}>
              {AVATAR_KEYS.filter(key => key !== 'fondo').map(key => (
                <Pressable
                  accessibilityRole="tab"
                  aria-selected={avatarCategory === key}
                  key={key}
                  onPress={() => setAvatarCategory(key)}
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
            {options.map((_, index) => {
              const selected = selection[avatarCategory] === index;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${AVATAR_LABELS[avatarCategory]}, opción ${index + 1}`}
                  aria-selected={selected}
                  key={`${avatarCategory}-${index}`}
                  onPress={() => setAvatarPart(index)}
                  style={[screenStyles.avatarOption, { borderColor: selected ? theme.colors.acento : 'transparent' }]}
                >
                  <View style={[screenStyles.avatarColor, { backgroundColor: AVATAR_COLORS[avatarCategory][index] }]}>
                    {selected ? <View style={screenStyles.avatarCheck}><Icon name="check" size={16} color={theme.colors.texto} /></View> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <PillButton theme={theme} label="Guardar avatar" onPress={saveAvatar} />
          <PillButton theme={theme} label="Sorpréndeme" variant="ghost" onPress={surpriseAvatar} />
          <Text style={[theme.type.counter, { color: theme.colors.textoSecundario }]}>El avatar se guarda en el espacio privado de tu cuenta.</Text>
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
                  {(() => { const age = ageFromBirth(profile.nutri?.nacimiento); return age === null ? 'Sin fecha de nacimiento' : ageLabel(age); })()}
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
        {renderTutorIntro('TU ESPACIO', 'Ajustes y privacidad', 'Configura tu espacio familiar privado.')}
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
        <SectionCard theme={theme} role="tutor" title="Tu cuenta">
          <Text style={styles.body}>
            Tus perfiles y avances se guardan en el espacio privado de tu cuenta.
          </Text>
          <Text style={styles.muted}>Correo: {session?.email ?? 'sin sesión'}</Text>
          <Button title="Cerrar sesión" icon="logout" variant="outline" onPress={logout} />
        </SectionCard>
      </>
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
        { question: '¿Quién cuida mis datos?', answer: 'Tu cuenta familiar es privada. Si tienes dudas, habla con la persona tutora.' },
        { question: '¿Qué hace NutriBot?', answer: 'Te comparte respuestas preparadas sobre hábitos. Si algo te preocupa, habla con una persona adulta de confianza.' },
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
          NutriBot ofrece respuestas locales predefinidas para conversar sobre hábitos. No usa inteligencia artificial, no recibe mensajes por internet y no reemplaza a una persona profesional.
        </Text>
      </SectionCard>
      <SectionCard theme={theme} role="tutor" title="¿Qué pasa con mis datos anteriores?">
        <Text style={styles.body}>
          Cada cuenta tutora tiene un espacio privado en la nube. Los perfiles y avances solo son visibles para la cuenta que los creó.
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
                <SectionTitle title="Elige un color y revisa el avatar" subtitle="Podrás personalizar más detalles después." />
                <View style={[styles.horizontal, { justifyContent: 'center', paddingVertical: SPACE[4] }]}>
                  <AvatarIllustration
                    theme={profileDraft.theme}
                    selection={editingProfile ? data?.avatarSelections[editingProfile.key] : undefined}
                  />
                </View>
                <View style={styles.roleRow}>
                  {([
                    { id: 'nina' as const, label: 'Lavanda y rosa' },
                    { id: 'nino' as const, label: 'Azul y verde' },
                  ]).map(option => (
                    <Pressable
                      accessibilityRole="button"
                      aria-selected={profileDraft.theme === option.id}
                      key={option.id}
                      onPress={() => setProfileDraft(current => ({ ...current, theme: option.id }))}
                      style={[styles.roleChoice, profileDraft.theme === option.id && styles.roleChoiceActive]}
                    >
                      <AvatarIllustration theme={option.id} size="small" />
                      <Text style={[styles.roleChoiceText, profileDraft.theme === option.id && styles.roleChoiceTextActive]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {profileStep === 1 ? (
              <>
                <SectionTitle title="Sexo" subtitle="Elige la opción del perfil." />
                <View style={styles.roleRow}>
                  {([{ id: 'nina', label: 'Niña' }, { id: 'nino', label: 'Niño' }] as const).map(option => (
                    <Pressable key={option.id} accessibilityRole="button"
                      aria-selected={profileDraft.theme === option.id}
                      onPress={() => setProfileDraft(current => ({ ...current, theme: option.id }))}
                      style={[styles.roleChoice, profileDraft.theme === option.id && styles.roleChoiceActive]}>
                      <Text style={[styles.roleChoiceText, profileDraft.theme === option.id && styles.roleChoiceTextActive]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Field
                  label="Fecha de nacimiento"
                  keyboardType="number-pad"
                  maxLength={10}
                  onChangeText={value => setProfileDraft(current => ({ ...current, birthDate: maskBirthDate(value) }))}
                  placeholder="DD/MM/AAAA"
                  value={profileDraft.birthDate}
                />
                {profileDraft.birthDate ? (
                  <Text style={styles.muted}>
                    {parseBirthDate(profileDraft.birthDate) ? `Edad: ${ageLabel(ageFromBirth(parseBirthDate(profileDraft.birthDate) ?? undefined))}` : 'Escribe una fecha válida, por ejemplo 15/03/2016.'}
                  </Text>
                ) : null}
                <View style={styles.horizontal}>
                  <Field
                    label="Peso"
                    keyboardType="decimal-pad"
                    onChangeText={value => setProfileDraft(current => ({ ...current, weight: value }))}
                    placeholder="kg"
                    value={profileDraft.weight}
                    style={styles.flex}
                  />
                  <Field
                    label="Estatura"
                    keyboardType="decimal-pad"
                    onChangeText={value => setProfileDraft(current => ({ ...current, height: value }))}
                    placeholder="cm"
                    value={profileDraft.height}
                    style={styles.flex}
                  />
                </View>
                <SectionCard theme={theme} role="tutor" title="Consentimiento de datos de salud">
                  <View style={styles.between}>
                    <Text style={[styles.body, styles.flex]}>
                      Autorizo guardar este perfil y sus datos de salud en las tablas familiares de la base de datos.
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
                </SectionCard>
                <SectionTitle title="Dictamen del especialista" subtitle="Selecciona solo un dictamen proporcionado por una persona especialista." />
                <View style={screenStyles.selectionRow}>
                  <View>{renderSelectionPill('Sin registrar', !profileDraft.diagnosis, () => setProfileDraft(current => ({ ...current, diagnosis: '' })))}</View>
                  {DIAGNOSES.map(option => (
                    <View key={option.id}>
                      {renderSelectionPill(option.label, profileDraft.diagnosis === option.id, () => setProfileDraft(current => ({ ...current, diagnosis: option.id })))}
                    </View>
                  ))}
                </View>
                <Text style={styles.footer}>Estos datos servirán para asignar planes de alimentación y ejercicio; por ahora la app no los asigna automáticamente. No son un diagnóstico médico.</Text>
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
                      theme={profileDraft.theme}
                      selection={editingProfile ? data?.avatarSelections[editingProfile.key] : undefined}
                    />
                    <View style={styles.flex}>
                      <Text style={styles.cardTitle}>{profileDraft.name.trim() || 'Sin nombre'}</Text>
                      <Text style={styles.muted}>{profileDraft.theme === 'nina' ? 'Lavanda y rosa' : 'Azul y verde'}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <Text style={styles.body}>Fecha de nacimiento: {profileDraft.birthDate || 'No registrada'}</Text>
                  <Text style={styles.body}>Peso: {profileDraft.weight.trim() ? `${profileDraft.weight.trim()} kg` : 'No registrado'}</Text>
                  <Text style={styles.body}>Estatura: {profileDraft.height.trim() ? `${profileDraft.height.trim()} cm` : 'No registrada'}</Text>
                  <Text style={styles.body}>Sexo: {profileDraft.theme === 'nina' ? 'Niña' : 'Niño'}</Text>
                  <Text style={styles.body}>Dictamen: {DIAGNOSES.find(item => item.id === profileDraft.diagnosis)?.label ?? 'No registrado'}</Text>
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
                <Text style={styles.footer}>La información se guarda en el espacio privado de tu cuenta.</Text>
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
    const canRegister = role === 'child' && Boolean(selectedProfile) && !activityStatus;
    return (
    <Modal
      animationType="slide"
      onRequestClose={() => { cancelTransition(); setActivityModal(null); }}
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
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setActivityModal(null)}
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
            <View style={styles.horizontal}>
              <Button title={!activityStarted ? 'Empezar' : activityPlaying ? 'Pausa' : 'Reanudar'}
                icon={activityPlaying ? 'pause' : 'activity'}
                variant={activityPlaying ? 'outline' : 'primary'} style={styles.flex}
                onPress={() => { setActivityStarted(true); setActivityPlaying(current => !current); }} />
              <Button title="Repetir" icon="repeat" variant="outline" style={styles.flex}
                onPress={() => { setActivityElapsed(0); setActivityStarted(true); setActivityPlaying(true); }} />
            </View>
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
            <PillButton theme={theme} label="Ya la hice · Registrar" variant="ghost" disabled={!canRegister}
              onPress={() => {
                if (!canRegister) return;
                setActivityPlaying(false);
                if (activityElapsed > 0) setActivityDuration(String(minutesFromElapsed(activityElapsed)));
                setActivityStage('form');
              }} />
            {!canRegister ? (
              <Text style={[theme.type.counter, { color: theme.colors.textoSecundario }]}>
                {!selectedProfile ? 'Este perfil ya no está disponible. Pide ayuda a la persona tutora.' :
                  activityStatus === 'approved' ? 'Esta actividad ya fue aprobada hoy.' : 'Esta actividad ya está en revisión.'}
              </Text>
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
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setActivityModal(null)} style={styles.close}>
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
                label="¿Cuántos minutos?"
                keyboardType="number-pad"
                onChangeText={setActivityDuration}
                value={activityDuration}
              />
              <View style={styles.horizontal}>
                <Button title="Tomar foto" icon="camera" small variant="outline" style={styles.flex} onPress={() => void pickActivityPhoto('camera')} />
                <Button title="Elegir foto" icon="gallery" small variant="outline" style={styles.flex} onPress={() => void pickActivityPhoto('library')} />
              </View>
              {activityPhoto ? (
                <>
                  <Image accessible accessibilityLabel="Foto elegida como evidencia" onError={() => setActivityError('No se pudo mostrar la foto. Elige otra o regístrala sin foto.')} source={{ uri: activityPhoto.uri }} style={styles.imagePreview} resizeMode="cover" />
                  <View style={styles.between}>
                    <Text style={styles.muted}>Foto · guardada en el espacio privado de tu cuenta.</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Quitar foto"
                      hitSlop={{ top: 14, bottom: 12, left: 16, right: 16 }}
                      onPress={() => setActivityPhoto(null)}
                    >
                      <Text style={styles.linkText}>Quitar</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Text style={styles.footer}>Puedes registrar la actividad sin foto como evidencia.</Text>
              )}
              {activityError ? <Text accessibilityRole="alert" style={styles.errorText}>{activityError}</Text> : null}
              {!canRegister ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {!selectedProfile ? 'Este perfil ya no está disponible.' : 'Esta actividad ya fue registrada hoy.'}
                </Text>
              ) : null}
              <Button
                title={activitySubmitting ? 'Enviando…' : 'Enviar a revisión'}
                icon="send"
                disabled={!canRegister || activitySubmitting}
                onPress={() => void submitActivity()}
              />
              <Button title="Volver a la actividad" variant="outline" onPress={() => setActivityStage('details')} />
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
          <Text style={styles.footer}>Una persona adulta debe acompañar la preparación y revisar alergias, etiquetas y seguridad alimentaria.</Text>
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
              ? `Revisa estos ingredientes por alergias registradas: ${warnings.map(id => FOOD_OPTIONS.find(item => item.id === id)?.name ?? id).join(', ')}.`
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
              <Text style={styles.muted}>Respuestas locales predefinidas</Text>
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
          </ScrollView>
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
            <Button title="Enviar" small onPress={sendChatMessage} />
          </View>
          <Text style={styles.footer}>No es una persona ni servicio médico. Si algo te preocupa, platícalo con una persona adulta de confianza.</Text>
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
        return role === 'tutor' && authUser ? <DatabaseManagement userId={authUser.id} /> : null;
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
                points={getProgress(data, selectedProfile).points} avatar={renderAvatar(selectedProfile)} />
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
    </SafeAreaView>
  );
}
