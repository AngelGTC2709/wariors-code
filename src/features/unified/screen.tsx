import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { User } from '@supabase/supabase-js';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
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
  deleteEvidence,
  loadCloudData,
  saveCloudData,
  subscribeToCloudData,
  uploadEvidence,
} from '@/features/unified/cloud-data';
import { EvidencePhoto } from '@/features/unified/evidence-photo';
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
  TYPE,
  type AppIconName,
} from '@/features/unified/ui';
import { cleanText, unique } from '@/features/unified/utils';

type AppTab = 'Familia' | 'Recetas' | 'Menú' | 'Logros' | 'Ajustes' | 'Ayuda';
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
const AVATAR_OPTION_ICONS: AppIconName[] = ['sparkles', 'mood', 'achievements', 'food', 'points', 'avatar'];

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
  age: string;
  weight: string;
  height: string;
  allergies: string[];
  noLikes: string[];
  otherAllergies: string;
  otherNoLikes: string;
};

const EMPTY_LOG: UnifiedDailyLog = {
  water: 0,
  foodGroups: [],
  mood: null,
  sleepHours: null,
  activities: {},
};

const NAV_ITEMS: { id: AppTab; icon: AppIconName; label: string }[] = [
  { id: 'Familia', icon: 'home', label: 'Familia' },
  { id: 'Recetas', icon: 'recipes', label: 'Recetas' },
  { id: 'Menú', icon: 'menu', label: 'Menú' },
  { id: 'Ajustes', icon: 'settings', label: 'Ajustes' },
  { id: 'Ayuda', icon: 'help', label: 'Ayuda' },
];

const MEALS: { id: keyof WeeklyMeals; title: string; icon: AppIconName }[] = [
  { id: 'desayuno', title: 'Desayuno', icon: 'menu' },
  { id: 'comida', title: 'Comida', icon: 'food' },
  { id: 'cena', title: 'Cena', icon: 'sleep' },
];

const ACTIVITY_CATALOG: Activity[] = ACTIVITIES;

const RECIPE_FILTERS = [
  { id: 'todas', label: 'Todas' },
  { id: 'desayuno', label: 'Desayunos' },
  { id: 'comida', label: 'Comidas' },
  { id: 'colacion', label: 'Colaciones' },
] as const;

const AVATAR_KEYS: AvatarKey[] = ['piel', 'cabello', 'ropa', 'accesorio', 'fondo'];
const AVATAR_LABELS: Record<AvatarKey, string> = {
  piel: 'Piel',
  cabello: 'Cabello',
  ropa: 'Ropa',
  accesorio: 'Accesorio',
  fondo: 'Fondo',
};

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

function recipeCategory(recipe: Recipe): 'desayuno' | 'comida' | 'colacion' {
  if (recipe.id === 'avena') return 'desayuno';
  if (recipe.id === 'frijoles') return 'colacion';
  return 'comida';
}

function recipeWarnings(recipe: Recipe, concerns: string[]): string[] {
  const contents = cleanText(`${recipe.title} ${recipe.ingredients.join(' ')}`);
  return concerns.filter(concern => {
    const option = FOOD_OPTIONS.find(item => item.id === concern);
    const terms = option ? [...option.keywords, option.name] : [concern];
    return terms.some(term => contents.includes(cleanText(term)));
  });
}

function getMealName(value: keyof WeeklyMeals): string {
  return MEALS.find(meal => meal.id === value)?.title ?? value;
}

function getLinkedNutri(data: UnifiedData, nutriId: string): boolean {
  return data.profileLinks.some(link => link.nutriId === nutriId);
}

function getLinkedWarrior(data: UnifiedData, warriorId: string): boolean {
  return data.profileLinks.some(link => link.warriorId === warriorId);
}

function emptyProfileDraft(): ProfileDraft {
  return {
    name: '',
    theme: 'nina',
    avatar: CHILD_AVATARS[0],
    age: '',
    weight: '',
    height: '',
    allergies: [],
    noLikes: [],
    otherAllergies: '',
    otherNoLikes: '',
  };
}

function defaultMeals(): WeeklyMeals {
  return { desayuno: null, comida: null, cena: null };
}

export default function UnifiedApp() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [data, setData] = useState<UnifiedData | null>(null);
  const dataRef = useRef<UnifiedData | null>(null);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
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
  const [tab, setTab] = useState<AppTab>('Familia');
  const [profileStep, setProfileStep] = useState(0);

  const [registerMode, setRegisterMode] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UnifiedProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfileDraft());
  const [profileError, setProfileError] = useState('');
  const [profileToArchive, setProfileToArchive] = useState<UnifiedProfile | null>(null);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [selectedNutriId, setSelectedNutriId] = useState('');
  const [selectedWarriorId, setSelectedWarriorId] = useState('');
  const [linkDisplayName, setLinkDisplayName] = useState('');
  const [linkTheme, setLinkTheme] = useState<'nina' | 'nino'>('nina');
  const [linkError, setLinkError] = useState('');

  const [selectedDay, setSelectedDay] = useState(WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [selectedMeal, setSelectedMeal] = useState<keyof WeeklyMeals>('comida');
  const [menuPicker, setMenuPicker] = useState<{ day: string; meal: keyof WeeklyMeals } | null>(null);
  const [recipeFilter, setRecipeFilter] = useState<(typeof RECIPE_FILTERS)[number]['id']>('todas');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [dietMode, setDietMode] = useState(false);
  const [dietDay, setDietDay] = useState(WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [recipeDetails, setRecipeDetails] = useState<Recipe | null>(null);

  const [activityModal, setActivityModal] = useState<Activity | null>(null);
  const [activityDuration, setActivityDuration] = useState('');
  const [activityPhoto, setActivityPhoto] = useState<PhotoDraft | null>(null);
  const [activityError, setActivityError] = useState('');
  const [sleepInput, setSleepInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ from: 'bot' | 'child'; text: string }[]>([
    { from: 'bot', text: '¡Hola! Soy NutriBot. Podemos hablar de hábitos, comida y cómo te sientes.' },
  ]);
  const [avatarCategory, setAvatarCategory] = useState<AvatarKey>('cabello');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    if (!authUser) return null;
    const generation = ++loadGeneration.current;
    try {
      const account = accountFromUser(authUser);
      const loaded = await loadCloudData(authUser, account);
      await clearLegacyLocalData();
      if (generation !== loadGeneration.current) return null;
      setLoadError('');
      dataVersion.current = loaded.version;
      nextWriteVersion.current = loaded.version;
      writesBlocked.current = false;
      dataRef.current = loaded.data;
      setData(loaded.data);
      setSession(account);
      setRole('tutor');
      setStorageError('');
      return loaded;
    } catch (error) {
      if (generation === loadGeneration.current) {
        setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los datos de Supabase.');
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
      if (authUserId.current !== (user?.id ?? null)) {
        authUserId.current = user?.id ?? null;
        loadGeneration.current += 1;
        dataRef.current = null;
        dataVersion.current = 0;
        nextWriteVersion.current = 0;
        writesBlocked.current = false;
        setData(null);
        setSession(null);
        setStorageError('');
        setLoadError('');
        setLoading(Boolean(user));
      } else if (!user) {
        setLoading(false);
      }
      setAuthUser(user);
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
          setLoadError(error instanceof Error ? error.message : 'No se pudo restaurar la sesión de Supabase.');
          setLoading(false);
          setAuthReady(true);
        });
    } catch (error) {
      void Promise.resolve().then(() => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'No se pudo configurar Supabase.');
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
        setStorageError(error instanceof Error ? error.message : 'No se pudo iniciar la sincronización en tiempo real.');
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
      return;
    }
    if (writesBlocked.current) {
      setStorageError('No se guardarán más cambios hasta volver a cargar los datos de Supabase.');
      return;
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
          setStorageError(error instanceof Error ? error.message : 'No se pudieron guardar los cambios en Supabase.');
        }
      },
    ).finally(() => {
      pendingWrites.current -= 1;
    });
  };

  const profiles = useMemo(() => (data ? buildProfiles(data) : []), [data]);
  const currentProfile = profiles.find(profile => profile.key === selectedProfileKey) ?? null;
  const selectedProfile = currentProfile ?? (role === 'tutor' ? profiles[0] ?? null : null);
  const profileAllergies = selectedProfile?.nutri
    ? unique([...selectedProfile.nutri.alergias, selectedProfile.nutri.otrasAlergias].filter(Boolean))
    : [];
  const profileNoLikes = selectedProfile?.nutri
    ? unique([...selectedProfile.nutri.noGusta, selectedProfile.nutri.otrosNoGusta].filter(Boolean))
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
        setAuthError(`No se pudo completar el acceso con Supabase: ${message}`);
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
      const message = error instanceof Error ? error.message : 'Error desconocido.';
      setAuthError(`No se pudo enviar el correo de recuperación: ${message}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const createOrEditProfile = (profile: UnifiedProfile | null) => {
    setEditingProfile(profile);
    setProfileStep(0);
    setProfileError('');
    setProfileDraft(profile
      ? {
          name: profile.name,
          theme: profile.theme,
          avatar: profile.avatar,
          age: profile.nutri?.edad ?? '',
          weight: profile.nutri?.peso ?? '',
          height: profile.nutri?.altura ?? '',
          allergies: profile.nutri?.alergias ?? [],
          noLikes: profile.nutri?.noGusta ?? [],
          otherAllergies: profile.nutri?.otrasAlergias ?? '',
          otherNoLikes: profile.nutri?.otrosNoGusta ?? '',
        }
      : emptyProfileDraft());
    setShowProfileEditor(true);
  };

  const saveProfile = () => {
    const name = profileDraft.name.trim();
    if (name.length < 2) {
      setProfileError('Escribe un nombre de al menos dos letras.');
      return;
    }
    let updatedKey = editingProfile?.key ?? '';
    updateData(current => {
      const existing = editingProfile;
      const nutriId = existing?.nutri?.id ?? createId('nutri-child');
      const warriorId = existing?.warrior?.id ?? createId('warrior-child');
      const shouldLink = Boolean(existing?.link || (existing && (!existing.nutri || !existing.warrior)) || !existing);
      const linkId = existing?.link?.id ?? createId('profile-link');
      updatedKey = shouldLink ? `linked:${linkId}` : existing?.key ?? '';

      const nextNutri: NutriChild = existing?.nutri
        ? {
            ...existing.nutri,
            nombre: existing.link ? existing.nutri.nombre : name,
            genero: existing.link ? existing.nutri.genero : profileDraft.theme,
            edad: profileDraft.age.trim(),
            peso: profileDraft.weight.trim(),
            altura: profileDraft.height.trim(),
            alergias: profileDraft.allergies,
            noGusta: profileDraft.noLikes,
            otrasAlergias: profileDraft.otherAllergies.trim(),
            otrosNoGusta: profileDraft.otherNoLikes.trim(),
          }
        : {
            id: nutriId,
            nombre: name,
            genero: profileDraft.theme,
            edad: profileDraft.age.trim(),
            peso: profileDraft.weight.trim(),
            altura: profileDraft.height.trim(),
            alergias: profileDraft.allergies,
            noGusta: profileDraft.noLikes,
            otrasAlergias: profileDraft.otherAllergies.trim(),
            otrosNoGusta: profileDraft.otherNoLikes.trim(),
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
    setShowProfileEditor(false);
    setProfileStep(0);
    setEditingProfile(null);
    setSelectedProfileKey(updatedKey || null);
    setTab('Familia');
    setNotice(editingProfile ? 'El perfil se actualizó en tu espacio familiar.' : 'Perfil infantil creado en tu espacio familiar.');
  };

  const toggleProfileFood = (field: 'allergies' | 'noLikes', value: string) => {
    setProfileDraft(current => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter(item => item !== value)
        : [...current[field], value],
    }));
  };

  const archiveProfile = () => {
    if (!profileToArchive) return;
    const key = profileToArchive.key;
    updateData(current => ({
      ...current,
      archivedProfiles: unique([...current.archivedProfiles, key]),
    }));
    if (selectedProfileKey === key) setSelectedProfileKey(null);
    setProfileToArchive(null);
    setNotice('El perfil se ocultó de la aplicación. Sus datos se conservaron en tu espacio familiar.');
  };

  const unlinkProfile = (profile: UnifiedProfile) => {
    if (!profile.link) return;
    updateData(current => ({
      ...current,
      profileLinks: current.profileLinks.filter(link => link.id !== profile.link?.id),
    }));
    setSelectedProfileKey(null);
    setNotice('Los perfiles se separaron. Sus datos de origen se conservaron.');
  };

  const openLinkEditor = () => {
    if (!data) return;
    const nutri = data.nutribot.ninos.find(child => !getLinkedNutri(data, child.id));
    const warrior = data.warriorKids.children.find(child => !getLinkedWarrior(data, child.id));
    setSelectedNutriId(nutri?.id ?? '');
    setSelectedWarriorId(warrior?.id ?? '');
    setLinkDisplayName(nutri?.nombre ?? warrior?.name ?? '');
    setLinkTheme(nutri?.genero ?? warrior?.theme ?? 'nina');
    setLinkError('');
    setShowLinkEditor(true);
  };

  const saveProfileLink = () => {
    if (!data || !selectedNutriId || !selectedWarriorId) {
      setLinkError('Elige un perfil de cada lista para vincularlos.');
      return;
    }
    const nutri = data.nutribot.ninos.find(child => child.id === selectedNutriId);
    const warrior = data.warriorKids.children.find(child => child.id === selectedWarriorId);
    const displayName = linkDisplayName.trim();
    if (!nutri || !warrior || !displayName) {
      setLinkError('Revisa los perfiles y el nombre que se mostrará en la aplicación.');
      return;
    }
    if (getLinkedNutri(data, nutri.id) || getLinkedWarrior(data, warrior.id)) {
      setLinkError('Uno de estos perfiles ya está vinculado. Primero separa el vínculo existente.');
      return;
    }
    const id = createId('profile-link');
    updateData(current => ({
      ...current,
      profileLinks: [...current.profileLinks, {
        id,
        nutriId: nutri.id,
        warriorId: warrior.id,
        displayName,
        theme: linkTheme,
      }],
    }));
    setSelectedProfileKey(`linked:${id}`);
    setShowLinkEditor(false);
    setNotice('Perfiles vinculados manualmente. Los datos distintos de cada origen se conservaron.');
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
    setNotice('Tu registro de sueño quedó guardado en tu espacio familiar.');
  };

  const submitActivity = async () => {
    if (!selectedProfile || !activityModal || !data) return;
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
      setActivityError(error instanceof Error ? error.message : 'No se pudo guardar la evidencia en Supabase.');
    }
  };

  const storeEvidence = async (photo: PhotoDraft): Promise<string> => {
    if (!session) throw new Error('Inicia sesión para guardar la evidencia.');
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
      setActivityError(error instanceof Error ? error.message : 'No se pudo abrir la cámara o la galería.');
    }
  };

  const reviewActivity = async (profile: UnifiedProfile, date: string, activityId: string, approve: boolean) => {
    const log = data?.dailyLogs[profile.progressKey]?.[date];
    const activity = log?.activities[activityId];
    if (!activity || activity.status !== 'pending') return;
    if (approve) {
      const catalog = ACTIVITY_CATALOG.find(item => item.id === activityId);
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
      try {
        await deleteEvidence(activity.evidenceUri);
      } catch (error) {
        setNotice(error instanceof Error
          ? `No se eliminó la foto, así que el registro se conservó: ${error.message}`
          : 'No se eliminó la foto, así que el registro se conservó.');
        return;
      }
    }
    updateDailyLog(profile, date, current => {
      const activities = { ...current.activities };
      delete activities[activityId];
      return { ...current, activities };
    });
    setNotice('Se pidió volver a registrar la actividad. La evidencia se eliminó de Supabase.');
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

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    const lower = cleanText(text);
    const response = lower.includes('triste') || lower.includes('mal') || lower.includes('cansad')
      ? 'Gracias por contármelo. Hablar con una persona adulta de confianza puede ayudar; no tienes que resolverlo a solas.'
      : lower.includes('comida') || lower.includes('comer') || lower.includes('receta')
        ? '¡Qué buena pregunta! Podemos elegir alimentos de varios colores y disfrutar la comida en familia. ¿Qué ingrediente te gusta?'
        : lower.includes('agua')
          ? 'Tomar agua durante el día ayuda a mantenerte hidratado/a. ¡Un vasito a la vez!'
          : '¡Gracias por compartirlo! Cada familia tiene hábitos distintos. Elige cambios pequeños que se sientan bien para ti.';
    setChatMessages(current => [...current, { from: 'child', text }, { from: 'bot', text: response }]);
    setChatInput('');
  };

  const toggleSharing = (value: boolean) => {
    updateData(current => ({ ...current, progressSharingEnabled: value }));
  };

  const changeWaterGoal = (amount: number) => {
    updateData(current => ({
      ...current,
      warriorKids: {
        ...current.warriorKids,
        waterGoal: Math.max(1, Math.min(12, current.warriorKids.waterGoal + amount)),
      },
    }));
  };

  const toggleReminder = (value: boolean) => {
    updateData(current => ({
      ...current,
      warriorKids: { ...current.warriorKids, remindersEnabled: value },
    }));
  };

  const setAvatarPart = (index: number) => {
    if (!selectedProfile) return;
    updateData(current => {
      const existing = current.avatarSelections[selectedProfile.key]
        ?? { piel: 0, cabello: 0, ropa: 0, accesorio: 0, fondo: 0 };
      return {
        ...current,
        avatarSelections: {
          ...current.avatarSelections,
          [selectedProfile.key]: { ...existing, [avatarCategory]: index },
        },
      };
    });
  };

  const logout = async () => {
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
      setTab('Familia');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cerrar la sesión de Supabase.';
      setAuthError(message);
      setStorageError(message);
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
        setLoadError(error instanceof Error ? error.message : 'No se pudo restaurar la sesión de Supabase.');
        setLoading(false);
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo configurar Supabase.');
      setLoading(false);
    }
  };

  const renderBrand = () => (
    <View style={styles.brandLockup}>
      <View style={styles.brandMark}><Icon name="child" size={29} color={COLORS.white} /></View>
      <View>
        <Text style={styles.brandTitle}>Warrior Kids</Text>
        <Text style={styles.brandCaption}>CRECEMOS EN FAMILIA</Text>
      </View>
    </View>
  );

  const renderLogin = () => (
    <SafeAreaView style={styles.authRoot}>
      <KeyboardAvoidingView
        style={[styles.shell, { backgroundColor: COLORS.navy }]}
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
            <Button
              title={authBusy ? 'Conectando…' : registerMode ? 'Crear cuenta' : 'Iniciar sesión'}
              icon={registerMode ? 'add' : 'logout'}
              disabled={authBusy}
              onPress={submitAuth}
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
                {registerMode ? 'Ya tengo una cuenta' : 'Crear una cuenta de tutor'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.authNotice}>
            Cada cuenta tutora tiene su propio espacio familiar. Los datos se sincronizan con Supabase y no se comparten con otras cuentas.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.headerMark}><Icon name="child" size={21} color={COLORS.blueDeep} /></View>
          <View style={styles.flex}>
            <Text style={styles.headerTitle}>Warrior Kids</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {session?.name ? `Hola, ${session.name}` : 'Crecer en familia'}
            </Text>
          </View>
        </View>
        <View style={styles.roleSwitch}>
          {([
            { id: 'child' as const, label: 'Niñez' },
            { id: 'tutor' as const, label: 'Tutor' },
          ]).map(option => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: role === option.id }}
              key={option.id}
              onPress={() => {
                setRole(option.id);
                if (option.id === 'child' && !selectedProfileKey && profiles.length === 1) {
                  setSelectedProfileKey(profiles[0].key);
                }
                setTab('Familia');
              }}
              style={[styles.roleSwitchItem, role === option.id && styles.roleSwitchActive]}
            >
              <Text style={[styles.roleSwitchText, role === option.id && styles.roleSwitchTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {profiles.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={styles.profileStrip}>
            {profiles.map(profile => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedProfile?.key === profile.key }}
                key={profile.key}
                onPress={() => setSelectedProfileKey(profile.key)}
                style={[styles.profileChip, selectedProfile?.key === profile.key && styles.profileChipActive]}
              >
                <AvatarIllustration
                  theme={profile.theme}
                  selection={data?.avatarSelections[profile.key]}
                  size="small"
                />
                <Text style={styles.profileChipText}>{profile.name}</Text>
              </Pressable>
            ))}
            {role === 'tutor' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => createOrEditProfile(null)}
                style={[styles.profileChip, { borderStyle: 'dashed' }]}
              >
                <Text style={styles.profileChipText}>＋ Perfil</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </>
  );

  const renderPageIntro = (eyebrow: string, title: string, subtitle: string) => (
    <View style={styles.pageIntro}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );

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
        <Text style={styles.cardTitle}>Todavía no hay un perfil infantil</Text>
        <Text style={[styles.body, { textAlign: 'center' }]}>
          Crea un perfil para llevar el registro de hábitos y actividades de tu familia.
        </Text>
        {role === 'tutor' ? (
          <Button title="Crear perfil infantil" icon="add" onPress={() => createOrEditProfile(null)} />
        ) : (
          <Text style={styles.muted}>Pídele a la persona tutora que cree o vincule tu perfil.</Text>
        )}
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
      { id: 'water-goal', title: 'Hidrátate a tu ritmo', detail: 'Llega a tu meta de agua de hoy.', icon: 'water' as const, points: 10, ready: log.water >= waterGoal },
      { id: 'colorful-plate', title: 'Plato con colores', detail: 'Registra dos grupos de alimentos.', icon: 'food' as const, points: 10, ready: new Set(log.foodGroups.map(canonicalFoodGroup).filter(Boolean)).size >= 2 },
      { id: 'mood-check', title: 'Cuéntanos cómo estás', detail: 'Elige un ánimo para hoy.', icon: 'mood' as const, points: 5, ready: Boolean(log.mood) },
    ];
    const approvedActivities = Object.values(log.activities).filter(activity => activity.status === 'approved').length;
    const recentDays = Array.from({ length: 7 }, (_, index) => {
      const date = dateOffsetKey(6 - index);
      const daily = getDailyLog(data, selectedProfile, date);
      const count = Number(daily.water > 0) +
        Number(daily.foodGroups.length > 0) +
        Number(Boolean(daily.mood)) +
        Number(daily.sleepHours !== null) +
        Object.values(daily.activities).filter(activity => activity.status === 'approved').length;
      const label = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '');
      return { date, label, count };
    });
    const maxRecentCount = Math.max(1, ...recentDays.map(day => day.count));
    return (
      <>
        <Card style={{ backgroundColor: COLORS.navy, borderColor: COLORS.navy, padding: 17 }}>
          <View style={styles.horizontal}>
            {renderAvatar(selectedProfile)}
            <View style={styles.flex}>
              <Text style={[styles.eyebrow, { color: '#A8D4FF' }]}>{todayLabel()}</Text>
              <Text style={[styles.title, { color: COLORS.white, fontSize: 25 }]}>¡Hola, {selectedProfile.name}!</Text>
              <Text style={{ color: '#D5E0F0', fontFamily: TYPE.body, fontSize: 11, marginTop: 3 }}>
                Cada pequeño paso cuenta.
              </Text>
              <View style={{ marginTop: 9 }}>
                <Button
                  small
                  title="Personalizar avatar"
                  icon="avatar"
                  variant="secondary"
                  onPress={() => setTab('Ajustes')}
                  style={{ alignSelf: 'flex-start' }}
                />
              </View>
            </View>
          </View>
          <View style={[styles.horizontal, { marginTop: 4 }]}>
            <Icon name="points" size={17} color={COLORS.yellow} />
            <Text style={{ color: COLORS.white, fontFamily: TYPE.bold, fontSize: 13 }}>{progress.points} puntos</Text>
            <Text style={{ color: '#A8B4C7', fontFamily: TYPE.body, fontSize: 10 }}>· {approvedActivities} actividades aprobadas hoy</Text>
          </View>
        </Card>

        <View style={styles.sectionRow}>
          <View>
            <Text style={styles.sectionTitle}>Mis hábitos de hoy</Text>
            <Text style={styles.sectionHint}>Avanza con calma, a tu manera.</Text>
          </View>
          <Text style={styles.muted}>{todayLabel()}</Text>
        </View>

        <Card>
          <View style={styles.between}>
            <View style={styles.horizontal}>
              <Icon name="water" size={24} color={COLORS.blue} />
              <View>
                <Text style={styles.cardTitle}>Agua</Text>
                <Text style={styles.muted}>{log.water} de {waterGoal} vasos</Text>
              </View>
            </View>
            <View style={styles.horizontal}>
              <Button title="−" small variant="outline" onPress={() => addWater(-1)} disabled={log.water <= 0} />
              <Button title="+ 1" small onPress={() => addWater(1)} />
            </View>
          </View>
          <ProgressMeter value={log.water} max={waterGoal} color={COLORS.blue} />
        </Card>

        <Card>
          <SectionTitle title="Colores en mi plato" subtitle="Marca los grupos que probaste hoy." />
          <View style={styles.wrap}>
            {[
              { id: 'frutas-verduras', label: 'Frutas y verduras', color: COLORS.green },
              { id: 'cereales', label: 'Cereales', color: COLORS.orange },
              { id: 'leguminosas', label: 'Leguminosas', color: COLORS.purple },
              { id: 'origen-animal', label: 'Origen animal', color: COLORS.blue },
            ].map(group => (
              <Tag
                key={group.id}
                title={group.label}
                color={group.color}
                selected={log.foodGroups.some(value => canonicalFoodGroup(value) === group.id)}
                onPress={() => toggleFoodGroup(group.id)}
              />
            ))}
          </View>
        </Card>

        <Card>
          <SectionTitle title="¿Cómo te sientes?" subtitle="Puedes elegir más de una vez durante el día." />
          <View style={[styles.between, { flexWrap: 'wrap' }]}>
            {CHILD_MOODS.map(mood => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: log.mood === mood.id }}
                key={mood.id}
                onPress={() => setMood(mood.id)}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  width: '30%',
                  paddingVertical: 8,
                  borderRadius: 14,
                  backgroundColor: log.mood === mood.id ? `${mood.color}20` : 'transparent',
                  borderWidth: 1,
                  borderColor: log.mood === mood.id ? mood.color : 'transparent',
                }}
              >
                <Icon name={MOOD_ICONS[mood.id] ?? 'mood'} size={24} color={mood.color} />
                <Text style={[styles.muted, { color: COLORS.ink }]}>{mood.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <SectionTitle title="Mi descanso" subtitle="Registra cuántas horas dormiste anoche." />
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
        </Card>

        <Card>
          <SectionTitle title="Retos para hoy" subtitle="Se activan cuando completas el hábito." />
          {missions.map(mission => {
            const claimed = claimList.includes(mission.id);
            return (
              <View key={mission.id} style={[styles.between, { paddingVertical: 4 }]}>
                <View style={[styles.horizontal, styles.flex]}>
                  <Icon name={mission.icon} size={23} color={COLORS.blue} />
                  <View style={styles.flex}>
                    <Text style={styles.inputLabel}>{mission.title}</Text>
                    <Text style={styles.muted}>{mission.detail}</Text>
                  </View>
                </View>
                <Button
                  title={claimed ? 'Listo' : `+${mission.points} XP`}
                  small
                  variant={claimed ? 'success' : 'secondary'}
                  disabled={!mission.ready || claimed}
                  onPress={() => claimMission(mission.id, mission.points)}
                />
              </View>
            );
          })}
        </Card>

        <Card>
          <SectionTitle title="Mi semana" subtitle="Hábitos y actividades registradas en los últimos 7 días." />
          <View style={[styles.between, { alignItems: 'flex-end' }]}>
            {recentDays.map(day => (
              <View key={day.date} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <Text style={[styles.muted, { fontSize: 8 }]}>{day.label}</Text>
                <View style={{ width: 18, height: 50, backgroundColor: '#EDF2F7', borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' }}>
                  <View style={{ height: Math.max(4, (day.count / maxRecentCount) * 50), backgroundColor: COLORS.blue, borderRadius: 7 }} />
                </View>
                <Text style={[styles.muted, { fontSize: 8 }]}>{day.count}</Text>
              </View>
            ))}
          </View>
          {selectedProfile.nutri && (selectedProfile.nutri.peso || selectedProfile.nutri.altura) ? (
            <View style={styles.wrap}>
              {selectedProfile.nutri.edad ? <Tag title={`${selectedProfile.nutri.edad} años`} color={COLORS.pink} icon="profile" /> : null}
              {selectedProfile.nutri.peso ? <Tag title={`${selectedProfile.nutri.peso} kg`} color={COLORS.purple} icon="scale" /> : null}
              {selectedProfile.nutri.altura ? <Tag title={`${selectedProfile.nutri.altura} cm`} color={COLORS.blue} icon="height" /> : null}
            </View>
          ) : null}
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
        </Card>

        <Card>
          <SectionTitle title="Movimiento a tu manera" subtitle="Elige una actividad segura y pide apoyo si lo necesitas." />
          {ACTIVITY_CATALOG.map(activity => {
            const saved = log.activities[activity.id];
            return (
              <View key={activity.id} style={[styles.between, { paddingVertical: 6 }]}>
                <View style={[styles.horizontal, styles.flex]}>
                  <Icon name="activity" size={23} color={COLORS.blue} />
                  <View style={styles.flex}>
                    <Text style={styles.inputLabel}>{activity.title}</Text>
                    <Text style={styles.muted}>{activity.minutes} min · {activity.points} puntos</Text>
                  </View>
                </View>
                {saved?.status === 'approved' ? (
                  <Tag title="Aprobada" color={COLORS.green} />
                ) : saved?.status === 'pending' ? (
                  <Tag title="En revisión" color={COLORS.orange} />
                ) : (
                  <Button
                    title="Registrar"
                    small
                    variant="outline"
                    onPress={() => {
                      setActivityModal(activity);
                      setActivityDuration(String(activity.minutes));
                      setActivityPhoto(null);
                      setActivityError('');
                    }}
                  />
                )}
              </View>
            );
          })}
        </Card>

        <Card style={{ backgroundColor: COLORS.palePurple, borderColor: '#E9D8FD' }}>
          <SectionTitle title="Muévete con cuidado" subtitle="Ideas sencillas para disfrutar en familia." />
          {EXERCISE_CATEGORIES.map(category => (
            <View key={category.id} style={{ paddingVertical: 3 }}>
              <View style={styles.horizontal}>
                <Icon name="activity" size={16} color={category.color} />
                <Text style={styles.inputLabel}>{category.label}</Text>
              </View>
              <Text style={styles.muted}>
                {category.items.slice(0, 2).map(item => item.title).join(' · ')}
              </Text>
            </View>
          ))}
          <Text style={styles.footer}>Elige actividades que se sientan cómodas. Detente si algo duele y pide ayuda a una persona adulta.</Text>
        </Card>

        <Card>
          <View style={styles.between}>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>¿Platicamos con NutriBot?</Text>
              <Text style={styles.muted}>Respuestas educativas guardadas en la app; no es un servicio médico.</Text>
            </View>
            <Button title="Abrir" small icon="leaf" onPress={() => setChatOpen(true)} />
          </View>
        </Card>
      </>
    );
  };

  const renderAchievements = () => {
    if (!data || !selectedProfile) return renderNoProfile();
    const progress = getProgress(data, selectedProfile);
    const badges = unique(progress.badges);
    return (
      <>
        {renderPageIntro('MIS AVANCES', 'Mis logros', 'Cada hábito que practicas suma a tu camino.') }
        <Card style={{ backgroundColor: COLORS.navy, borderColor: COLORS.navy, alignItems: 'center', paddingVertical: 22 }}>
          <Icon name="points" size={30} color={COLORS.yellow} />
          <Text style={[styles.title, { color: COLORS.white, fontSize: 34, marginTop: 4 }]}>{progress.points}</Text>
          <Text style={{ color: '#D5E0F0', fontFamily: TYPE.medium, fontSize: 12 }}>puntos acumulados</Text>
        </Card>
        <SectionTitle
          title="Insignias desbloqueadas"
          subtitle={badges.length ? `Tienes ${badges.length} ${badges.length === 1 ? 'logro' : 'logros'}.` : 'Al completar retos aparecerán aquí.'}
        />
        {badges.length ? badges.map(badge => {
          const achievement = ACHIEVEMENT_INFO[badge];
          return (
            <Card key={badge} style={[styles.cardTight, styles.horizontal]}>
              <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paleOrange }}>
                <Icon name={achievement?.icon ?? 'achievements'} size={22} color={COLORS.orange} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{achievement?.title ?? badge.replace(/[-_]/g, ' ')}</Text>
                <Text style={styles.muted}>{achievement?.description ?? 'Logro guardado en tu perfil.'}</Text>
              </View>
            </Card>
          );
        }) : (
          <Card>
            <View style={styles.emptyState}>
              <Icon name="achievements" size={34} color={COLORS.orange} />
              <Text style={styles.cardTitle}>Tu primera insignia está por llegar</Text>
              <Text style={[styles.body, { textAlign: 'center' }]}>Completa tus retos diarios para ir reuniendo logros.</Text>
            </View>
          </Card>
        )}
      </>
    );
  };

  const renderTutorHome = () => {
    if (!data) return null;
    if (!profiles.length) return renderNoProfile();
    const pendingActivities = profiles.flatMap(profile =>
      Object.entries(data.dailyLogs[profile.progressKey] ?? {}).flatMap(([date, log]) =>
        Object.entries(log.activities)
          .filter(([, activity]) => activity.status === 'pending')
          .map(([activityId, activity]) => ({ profile, date, activityId, activity })),
      ),
    ).slice(0, 8);
    return (
      <>
        <Card style={{ backgroundColor: COLORS.navy, borderColor: COLORS.navy }}>
          <Text style={[styles.eyebrow, { color: '#A8D4FF' }]}>ESPACIO DE ACOMPAÑAMIENTO</Text>
          <Text style={[styles.title, { color: COLORS.white, fontSize: 25 }]}>Hola, {session?.name ?? 'familia'}</Text>
          <Text style={{ color: '#D5E0F0', fontFamily: TYPE.body, fontSize: 11, lineHeight: 17, marginTop: 4 }}>
            Un espacio para acompañar hábitos con cariño, sin competir.
          </Text>
          <View style={[styles.horizontal, { marginTop: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#A8B4C7', fontFamily: TYPE.medium, fontSize: 9 }}>PERFILES INFANTILES</Text>
              <Text style={{ color: COLORS.white, fontFamily: TYPE.heading, fontSize: 21 }}>{profiles.length}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#A8B4C7', fontFamily: TYPE.medium, fontSize: 9 }}>POR REVISAR</Text>
              <Text style={{ color: COLORS.white, fontFamily: TYPE.heading, fontSize: 21 }}>
                {data.progressSharingEnabled ? pendingActivities.length : '—'}
              </Text>
            </View>
          </View>
        </Card>

        <SectionTitle title="Perfiles de la familia" subtitle="Selecciona un perfil para revisar su resumen." />
        {profiles.map(profile => {
          const log = getDailyLog(data, profile, todayKey());
          const progress = getProgress(data, profile);
          return (
            <Card key={profile.key} style={styles.cardTight}>
              <View style={styles.between}>
                <View style={styles.horizontal}>
                  {renderAvatar(profile, 'small')}
                  <View>
                    <Text style={styles.cardTitle}>{profile.name}</Text>
                    <View style={[styles.horizontal, { gap: 5 }]}>
                      <Icon name="points" size={12} color={COLORS.orange} />
                      <Text style={styles.muted}>{progress.points} puntos</Text>
                      <Text style={styles.muted}>· {log.water}/{data.warriorKids.waterGoal} vasos de agua</Text>
                    </View>
                  </View>
                </View>
                <Button
                  title={selectedProfile?.key === profile.key ? 'Seleccionado' : 'Ver perfil'}
                  small
                  variant={selectedProfile?.key === profile.key ? 'secondary' : 'outline'}
                  onPress={() => setSelectedProfileKey(profile.key)}
                />
              </View>
              <View style={{ gap: 5 }}>
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
                  {log.sleepHours !== null ? <Tag title={`${log.sleepHours} h de sueño`} color={COLORS.blue} icon="sleep" /> : null}
                  {log.foodGroups.length ? <Tag title={`${log.foodGroups.length} grupos de alimentos`} color={COLORS.green} icon="food" /> : null}
                  <Tag title={`${Object.values(log.activities).filter(item => item.status === 'approved').length} actividades aprobadas hoy`} color={COLORS.green} />
                </View>
              ) : null}
            </Card>
          );
        })}

        {!data.progressSharingEnabled ? (
          <Card style={{ backgroundColor: COLORS.paleOrange, borderColor: '#FEEBC8' }}>
            <Text style={styles.cardTitle}>Compartir progreso está desactivado</Text>
            <Text style={styles.noticeText}>
              Los detalles de hábitos, ánimo y actividades no se muestran aquí. Puedes cambiar esta preferencia en Ajustes; el cambio se guarda en tu espacio familiar.
            </Text>
          </Card>
        ) : (
          <Card>
            <SectionTitle title="Actividades por revisar" subtitle="Aprueba los registros o pide que se vuelvan a enviar." />
            {pendingActivities.length ? pendingActivities.map(item => {
              const activity = ACTIVITY_CATALOG.find(candidate => candidate.id === item.activityId);
              return (
                <View key={`${item.profile.key}-${item.date}-${item.activityId}`} style={{ borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 10, gap: 8 }}>
                  <View style={styles.between}>
                    <View style={[styles.horizontal, styles.flex]}>
                      <Icon name="activity" size={22} color={COLORS.blue} />
                      <View style={styles.flex}>
                        <Text style={styles.inputLabel}>{item.profile.name} · {activity?.title ?? 'Actividad'}</Text>
                        <Text style={styles.muted}>{item.date} · {item.activity.duration} min</Text>
                      </View>
                    </View>
                  </View>
                  {item.activity.evidenceUri ? (
                    <EvidencePhoto path={item.activity.evidenceUri} />
                  ) : <Text style={styles.muted}>Sin foto adjunta.</Text>}
                  <View style={styles.horizontal}>
                    <Button
                      title="Pedir corrección"
                      small
                      variant="outline"
                      style={styles.flex}
                      onPress={() => void reviewActivity(item.profile, item.date, item.activityId, false)}
                    />
                    <Button
                      title="Aprobar"
                      small
                      variant="success"
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
          </Card>
        )}
        <Button
          title="Agregar perfil infantil"
        icon="add"
          variant="secondary"
          onPress={() => createOrEditProfile(null)}
        />
      </>
    );
  };

  const renderDietPlan = () => {
    const diet = FAMILY_DIET.find(item => item.dia === dietDay) ?? FAMILY_DIET[0];
    if (!diet) return null;
    const allergyIds = profileAllergies.filter(value => FOOD_OPTIONS.some(food => food.id === value));
    const ingredientIds = DIET_INGREDIENTS[dietDay] ?? {};
    return (
      <>
        {profileAllergies.length ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Preferencias de alergia registradas: {profileAllergies.join(', ')}. Las alertas del menú son orientativas; revisa todas las etiquetas e ingredientes con una persona adulta.
            </Text>
          </View>
        ) : null}
        <View style={styles.tabRow}>
          {WEEKDAYS.map(day => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: day === dietDay }}
              key={day}
              onPress={() => setDietDay(day)}
              style={[styles.tabChip, day === dietDay && styles.tabChipActive]}
            >
              <Text style={[styles.tabChipText, day === dietDay && styles.tabChipTextActive]}>
                {day.slice(0, 3)}
              </Text>
            </Pressable>
          ))}
        </View>
        {([
          { id: 'desayuno' as const, label: 'Desayuno', icon: 'menu' as const, text: diet.desayuno },
          { id: 'comida' as const, label: 'Comida', icon: 'food' as const, text: diet.comida },
          { id: 'cena' as const, label: 'Cena', icon: 'sleep' as const, text: diet.cena },
        ]).map(meal => {
          const matchingAllergies = allergyIds.filter(id => ingredientIds[meal.id]?.includes(id));
          return (
            <Card key={meal.id}>
              <View style={styles.horizontal}>
                <Icon name={meal.icon} size={24} color={COLORS.blue} />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{meal.label}</Text>
                  <Text style={styles.body}>{meal.text}</Text>
                </View>
              </View>
              {matchingAllergies.length ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>
                    Este menú incluye ingredientes relacionados con: {matchingAllergies.map(id => FOOD_OPTIONS.find(item => item.id === id)?.name ?? id).join(', ')}.
                  </Text>
                </View>
              ) : null}
            </Card>
          );
        })}
        <Card style={{ backgroundColor: COLORS.paleGreen, borderColor: '#C6F6D5' }}>
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
    const filteredRecipes = RECIPES.filter(recipe => {
      const byCategory = recipeFilter === 'todas' || recipeCategory(recipe) === recipeFilter;
      const query = cleanText(recipeSearch);
      const byQuery = !query || cleanText(`${recipe.title} ${recipe.ingredients.join(' ')}`).includes(query);
      return byCategory && byQuery;
    });
    return (
      <>
        {renderPageIntro('COCINA EN FAMILIA', 'Recetas con color', 'Ideas sencillas para disfrutar y aprender juntos.')}
        <View style={styles.roleRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !dietMode }}
            onPress={() => setDietMode(false)}
            style={[styles.roleChoice, !dietMode && styles.roleChoiceActive]}
          >
            <Icon name="recipes" size={16} color={!dietMode ? COLORS.blueDeep : COLORS.muted} />
            <Text style={[styles.roleChoiceText, !dietMode && styles.roleChoiceTextActive]}>Recetas</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: dietMode }}
            onPress={() => setDietMode(true)}
            style={[styles.roleChoice, dietMode && styles.roleChoiceActive]}
          >
            <Icon name="menu" size={16} color={dietMode ? COLORS.blueDeep : COLORS.muted} />
            <Text style={[styles.roleChoiceText, dietMode && styles.roleChoiceTextActive]}>Plan semanal</Text>
          </Pressable>
        </View>
        {dietMode ? renderDietPlan() : (
          <>
            <Field
              label="Buscar receta o ingrediente"
              onChangeText={setRecipeSearch}
              placeholder="Ej. avena, frijoles..."
              value={recipeSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={styles.tabRow}>
                {RECIPE_FILTERS.map(filter => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: recipeFilter === filter.id }}
                    key={filter.id}
                    onPress={() => setRecipeFilter(filter.id)}
                    style={[styles.tabChip, recipeFilter === filter.id && styles.tabChipActive]}
                  >
                    <Text style={[styles.tabChipText, recipeFilter === filter.id && styles.tabChipTextActive]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            {profileAllergies.length || profileNoLikes.length ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  {profileAllergies.length ? `Alergias registradas: ${profileAllergies.join(', ')}. ` : ''}
                  {profileNoLikes.length ? `Preferencias para evitar: ${profileNoLikes.join(', ')}. ` : ''}
                  Revisa ingredientes y etiquetas con una persona adulta; las recetas no detectan contaminación cruzada ni sustituyen indicaciones profesionales.
                </Text>
              </View>
            ) : null}
            {filteredRecipes.length ? filteredRecipes.map(recipe => {
              const warnings = recipeWarnings(recipe, profileAllergies);
              return (
                <Card key={recipe.id} style={styles.cardTight}>
                  <View style={styles.horizontal}>
                    <Icon name="recipes" size={28} color={COLORS.blue} />
                    <View style={styles.flex}>
                      <Text style={styles.cardTitle}>{recipe.title}</Text>
                      <Text style={styles.muted}>{recipe.groups}</Text>
                    </View>
                  </View>
                  <View style={styles.wrap}>
                    {recipe.ingredients.slice(0, 4).map(ingredient => <Tag key={ingredient} title={ingredient} color={COLORS.green} />)}
                  </View>
                  {warnings.length ? (
                    <Text style={styles.errorText}>
                      Revisa estos ingredientes: {warnings.map(id => FOOD_OPTIONS.find(item => item.id === id)?.name ?? id).join(', ')}.
                    </Text>
                  ) : null}
                  <View style={styles.between}>
                    <Text style={[styles.muted, styles.flex]}>{recipe.note}</Text>
                    <Button title="Ver receta" small variant="secondary" onPress={() => setRecipeDetails(recipe)} />
                  </View>
                </Card>
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
        {renderPageIntro('ORGANIZACIÓN FAMILIAR', 'Menú de la semana', 'Planeen tres momentos de comida para cada día.')}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={styles.tabRow}>
            {WEEKDAYS.map(day => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedDay === day }}
                key={day}
                onPress={() => setSelectedDay(day)}
                style={[styles.tabChip, selectedDay === day && styles.tabChipActive]}
              >
                <Text style={[styles.tabChipText, selectedDay === day && styles.tabChipTextActive]}>{day.slice(0, 3)}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        {selectedProfile?.nutri ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {profileAllergies.length ? `Alergias registradas: ${profileAllergies.join(', ')}. ` : ''}
              {profileNoLikes.length ? `Preferencias: ${profileNoLikes.join(', ')}. ` : ''}
              Revisa ingredientes y etiquetas para {selectedProfile.name} antes de servir.
            </Text>
          </View>
        ) : null}
        {MEALS.map(meal => {
          const recipe = RECIPES.find(item => item.id === meals[meal.id]);
          const savedValue = meals[meal.id];
          return (
            <Card key={meal.id}>
              <View style={styles.between}>
                <View style={styles.horizontal}>
                  <Icon name={meal.icon} size={24} color={COLORS.blue} />
                  <View>
                    <Text style={styles.cardTitle}>{meal.title}</Text>
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
                      setMenuPicker({ day: selectedDay, meal: meal.id });
                    }}
                  />
                ) : null}
              </View>
              {recipe ? (
                <View style={styles.wrap}>
                  {recipe.ingredients.slice(0, 3).map(ingredient => <Tag key={ingredient} title={ingredient} color={COLORS.green} />)}
                  <Button title="Ver preparación" small variant="secondary" onPress={() => setRecipeDetails(recipe)} />
                </View>
              ) : null}
            </Card>
          );
        })}
        <Card style={{ backgroundColor: COLORS.paleBlue, borderColor: '#C6D9F0' }}>
          <Text style={styles.cardTitle}>¿Ya tenías recetas guardadas?</Text>
          <Text style={styles.body}>
            Las recetas semanales de Warrior Kids se conservaron como comida del día. Puedes agregar desayuno y cena sin reemplazar esa información.
          </Text>
        </Card>
        {role === 'tutor' ? (
          <Button title="Elegir una receta" icon="add" onPress={() => setMenuPicker({ day: selectedDay, meal: selectedMeal })} />
        ) : null}
      </>
    );
  };

  const renderAvatarEditor = () => {
    if (!selectedProfile) return null;
    const options = AVATAR_OPCIONES[avatarCategory];
    const selection = data?.avatarSelections[selectedProfile.key];
    return (
      <Card>
        <SectionTitle title="Personaliza tu avatar" subtitle="Elige cada detalle para crear tu personaje." />
        <View style={[styles.horizontal, { justifyContent: 'center', paddingVertical: 5 }]}>
          {renderAvatar(selectedProfile)}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={styles.tabRow}>
            {AVATAR_KEYS.map(key => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: avatarCategory === key }}
                key={key}
                onPress={() => setAvatarCategory(key)}
                style={[styles.tabChip, avatarCategory === key && styles.tabChipActive]}
              >
                <Text style={[styles.tabChipText, avatarCategory === key && styles.tabChipTextActive]}>
                  {AVATAR_LABELS[key]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={styles.wrap}>
          {options.map((_, index) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selection?.[avatarCategory] === index }}
              key={`${avatarCategory}-${index}`}
              onPress={() => setAvatarPart(index)}
              style={{
                width: 52,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                backgroundColor: selection?.[avatarCategory] === index ? COLORS.paleBlue : COLORS.white,
                borderWidth: 1,
                borderColor: selection?.[avatarCategory] === index ? COLORS.blue : COLORS.line,
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: avatarCategory === 'ropa' ? 9 : 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: AVATAR_COLORS[avatarCategory][index],
                }}
              >
                {avatarCategory === 'accesorio' ? (
                  <Icon name={AVATAR_OPTION_ICONS[index] ?? 'sparkles'} size={17} color={COLORS.white} />
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
        <Text style={styles.footer}>El avatar se guarda en el espacio privado de tu cuenta.</Text>
      </Card>
    );
  };

  const renderTutorSettings = () => {
    if (!data) return null;
    const unlinkedNutri = data.nutribot.ninos.filter(child => !getLinkedNutri(data, child.id));
    const unlinkedWarrior = data.warriorKids.children.filter(child => !getLinkedWarrior(data, child.id));
    return (
      <>
        <Card>
          <SectionTitle title="Perfiles infantiles" subtitle="Editar conserva los datos originales de cada registro." />
          {profiles.length ? profiles.map(profile => (
            <View key={profile.key} style={styles.profileRow}>
              {renderAvatar(profile, 'small')}
              <View style={styles.flex}>
                <Text style={styles.inputLabel}>{profile.name}</Text>
                <Text style={styles.muted}>
                  {profile.link ? 'Vinculado · conserva ambos orígenes' : profile.nutri ? 'Importado de NutriBot' : 'Importado de Warrior Kids'}
                </Text>
              </View>
              <Button title="Editar" small variant="outline" onPress={() => createOrEditProfile(profile)} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ocultar perfil ${profile.name}`}
                onPress={() => setProfileToArchive(profile)}
                style={{ padding: 7 }}
              >
                <Icon name="close" size={16} color={COLORS.error} />
              </Pressable>
            </View>
          )) : (
            <Text style={styles.muted}>No hay perfiles activos. Los perfiles ocultos no se borran.</Text>
          )}
          <Button title="Crear perfil infantil" icon="add" variant="secondary" onPress={() => createOrEditProfile(null)} />
        </Card>

        <Card>
          <SectionTitle title="Vincular perfiles existentes" subtitle="Solo se unirán si tú seleccionas cada registro." />
          <Text style={styles.body}>
            Si hay diferencias en nombres o temas, las fuentes se mantienen intactas y el nombre de la app se guarda por separado.
          </Text>
          {data.profileLinks.map(link => {
            const nutri = data.nutribot.ninos.find(child => child.id === link.nutriId);
            const warrior = data.warriorKids.children.find(child => child.id === link.warriorId);
            if (!nutri || !warrior) return null;
            return (
              <View key={link.id} style={styles.notice}>
                <View style={styles.horizontal}>
                  <Icon name="link" size={14} color={COLORS.blue} />
                  <Text style={styles.inputLabel}>{link.displayName}</Text>
                </View>
                <Text style={styles.noticeText}>NutriBot: “{nutri.nombre}” · Warrior Kids: “{warrior.name}”</Text>
                <Button
                  title="Separar perfiles"
                  small
                  variant="outline"
                  onPress={() => {
                    const profile = profiles.find(item => item.link?.id === link.id);
                    if (profile) unlinkProfile(profile);
                  }}
                />
              </View>
            );
          })}
          {unlinkedNutri.length || unlinkedWarrior.length ? (
            <Button title="Vincular dos perfiles" icon="link" variant="outline" onPress={openLinkEditor} />
          ) : (
            <Text style={styles.muted}>No hay perfiles sin vincular de ambos orígenes.</Text>
          )}
        </Card>

        <Card>
          <SectionTitle title="Preferencias de bienestar" subtitle="Ajustes de tu espacio familiar." />
          <View style={[styles.between, { paddingVertical: 4 }]}>
            <View style={styles.flex}>
              <Text style={styles.inputLabel}>Meta diaria de agua</Text>
              <Text style={styles.muted}>Vasos · ajusta la meta para la familia.</Text>
            </View>
            <View style={styles.horizontal}>
              <Button
                title="−"
                small
                variant="outline"
                disabled={data.warriorKids.waterGoal <= 1}
                onPress={() => changeWaterGoal(-1)}
              />
              <Text style={styles.cardTitle}>{data.warriorKids.waterGoal}</Text>
              <Button
                title="+"
                small
                variant="outline"
                disabled={data.warriorKids.waterGoal >= 12}
                onPress={() => changeWaterGoal(1)}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.between}>
            <View style={styles.flex}>
              <Text style={styles.inputLabel}>Recordatorios</Text>
              <Text style={styles.muted}>Preferencia guardada en la nube; no programa alertas del sistema.</Text>
            </View>
            <Switch
              accessibilityLabel="Activar preferencia de recordatorios"
              value={data.warriorKids.remindersEnabled}
              onValueChange={toggleReminder}
              trackColor={{ true: COLORS.blue }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.between}>
            <View style={styles.flex}>
              <Text style={styles.inputLabel}>Tiempo de pantalla sugerido</Text>
              <Text style={styles.muted}>Preferencia para conversar en familia.</Text>
            </View>
            <View style={styles.horizontal}>
              <Button
                title="−"
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
                small
                variant="outline"
                onPress={() => updateData(current => ({
                  ...current,
                  warriorKids: { ...current.warriorKids, screenLimitMinutes: Math.min(300, current.warriorKids.screenLimitMinutes + 15) },
                }))}
              />
            </View>
          </View>
        </Card>

        <Card>
          <SectionTitle title="Seguridad de la cuenta" subtitle="Inicio de sesión protegido por Supabase Auth." />
          <Text style={styles.body}>
            La contraseña no se guarda en la tabla de padres. Cada tutor solo puede consultar y actualizar los datos asociados a su cuenta.
          </Text>
        </Card>

        <Card>
          <SectionTitle title="Mostrar avances en el espacio tutor" />
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
          <Text style={styles.footer}>Esta preferencia se sincroniza con Supabase.</Text>
        </Card>
      </>
    );
  };

  const renderSettings = () => {
    if (!data) return null;
    return (
      <>
        {renderPageIntro('TU ESPACIO', 'Ajustes y privacidad', 'Configura tu espacio familiar privado.')}
        {role === 'child' ? (
          <>
            {renderAvatarEditor()}
            <Card>
              <Text style={styles.cardTitle}>Hábitos de la familia</Text>
              <Text style={styles.body}>
                Meta de agua: {data.warriorKids.waterGoal} vasos · tiempo de pantalla sugerido: {data.warriorKids.screenLimitMinutes} minutos.
              </Text>
              <Text style={styles.muted}>Pídele a la persona tutora que ajuste estas preferencias.</Text>
            </Card>
          </>
        ) : renderTutorSettings()}
        <Card>
          <SectionTitle title="Tus datos en la nube" />
          <Text style={styles.body}>
            Tus perfiles y avances se guardan en el espacio privado de tu cuenta de Supabase.
          </Text>
          <Text style={styles.muted}>Correo: {session?.email ?? 'sin sesión'}</Text>
          <Button title="Cerrar sesión" icon="logout" variant="outline" onPress={logout} />
        </Card>
      </>
    );
  };

  const renderHelp = () => (
    <>
      {renderPageIntro('ESTAMOS PARA ACOMPAÑARTE', 'Ayuda y privacidad', 'Respuestas claras para usar la app en familia.')}
      {FAQ_ITEMS.map(item => (
        <Card key={item.question} style={styles.cardTight}>
          <Text style={styles.cardTitle}>{item.question}</Text>
          <Text style={styles.body}>{item.answer}</Text>
        </Card>
      ))}
      <Card style={{ backgroundColor: COLORS.paleBlue, borderColor: '#C6D9F0' }}>
        <Text style={styles.cardTitle}>Sobre NutriBot</Text>
        <Text style={styles.body}>
          NutriBot ofrece respuestas locales predefinidas para conversar sobre hábitos. No usa inteligencia artificial, no recibe mensajes por internet y no reemplaza a una persona profesional.
        </Text>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>¿Qué pasa con mis datos anteriores?</Text>
        <Text style={styles.body}>
          Cada cuenta tutora tiene un espacio privado en la nube. Los perfiles y avances solo son visibles para la cuenta que los creó.
        </Text>
      </Card>
      <Text style={styles.footer}>Warrior Kids · Hecho para acompañar hábitos saludables con cariño.</Text>
    </>
  );

  const renderProfileModal = () => (
    <Modal
      animationType="slide"
      onRequestClose={() => setShowProfileEditor(false)}
      transparent
      visible={showProfileEditor}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingProfile ? 'Editar perfil infantil' : 'Nuevo perfil infantil'}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={() => { setShowProfileEditor(false); setProfileStep(0); }}
              style={styles.close}
            >
              <Icon name="close" size={18} color={COLORS.ink} />
            </Pressable>
          </View>
          <Text style={styles.inputLabel}>Fase {profileStep + 1} de 5 · {[
            'Avatar, nombre y color',
            'Edad, peso y estatura',
            'Alergias',
            'Alimentos a prevenir y otra información',
            'Resumen y confirmación',
          ][profileStep]}</Text>
          <ProgressMeter value={profileStep + 1} max={5} color={COLORS.pink} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 12, paddingBottom: 8 }}>
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
                <View style={[styles.horizontal, { justifyContent: 'center', paddingVertical: 5 }]}>
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
                      accessibilityState={{ selected: profileDraft.theme === option.id }}
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
                <Field
                  label="Edad (años, opcional)"
                  keyboardType="number-pad"
                  onChangeText={value => setProfileDraft(current => ({ ...current, age: value }))}
                  placeholder="Ej. 8"
                  value={profileDraft.age}
                />
                <View style={styles.horizontal}>
                  <Field
                    label="Peso (opcional)"
                    keyboardType="decimal-pad"
                    onChangeText={value => setProfileDraft(current => ({ ...current, weight: value }))}
                    placeholder="kg"
                    value={profileDraft.weight}
                    style={styles.flex}
                  />
                  <Field
                    label="Estatura (opcional)"
                    keyboardType="decimal-pad"
                    onChangeText={value => setProfileDraft(current => ({ ...current, height: value }))}
                    placeholder="cm"
                    value={profileDraft.height}
                    style={styles.flex}
                  />
                </View>
                <Text style={styles.footer}>Estos datos son opcionales y solo están disponibles en tu cuenta. No sirven para diagnóstico médico.</Text>
              </>
            ) : null}

            {profileStep === 2 ? (
              <>
                <SectionTitle title="Alergias o ingredientes que evitar" subtitle="Selecciona lo que la familia necesita tener presente." />
                <View style={styles.wrap}>
                  {FOOD_OPTIONS.map(food => (
                    <Tag
                      key={food.id}
                      title={food.name}
                      icon="food"
                      color={COLORS.orange}
                      selected={profileDraft.allergies.includes(food.id)}
                      onPress={() => toggleProfileFood('allergies', food.id)}
                    />
                  ))}
                </View>
                <Field
                  label="Otra alergia o ingrediente"
                  onChangeText={value => setProfileDraft(current => ({ ...current, otherAllergies: value }))}
                  placeholder="Escribe otro ingrediente"
                  value={profileDraft.otherAllergies}
                />
                <Text style={styles.footer}>Confirma siempre ingredientes y etiquetas con una persona adulta.</Text>
              </>
            ) : null}

            {profileStep === 3 ? (
              <>
                <SectionTitle title="Alimentos a prevenir" subtitle="Registra preferencias o alimentos que la familia prefiera evitar." />
                <View style={styles.wrap}>
                  {FOOD_OPTIONS.map(food => (
                    <Tag
                      key={food.id}
                      title={food.name}
                      icon="food"
                      color={COLORS.purple}
                      selected={profileDraft.noLikes.includes(food.id)}
                      onPress={() => toggleProfileFood('noLikes', food.id)}
                    />
                  ))}
                </View>
                <Field
                  label="Otra información o alimento"
                  onChangeText={value => setProfileDraft(current => ({ ...current, otherNoLikes: value }))}
                  placeholder="Escribe una nota para la persona tutora"
                  value={profileDraft.otherNoLikes}
                />
              </>
            ) : null}

            {profileStep === 4 ? (
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
                  <Text style={styles.body}>Edad: {profileDraft.age.trim() || 'No registrada'}</Text>
                  <Text style={styles.body}>Peso: {profileDraft.weight.trim() ? `${profileDraft.weight.trim()} kg` : 'No registrado'}</Text>
                  <Text style={styles.body}>Estatura: {profileDraft.height.trim() ? `${profileDraft.height.trim()} cm` : 'No registrada'}</Text>
                </Card>
                <Card style={styles.cardTight}>
                  <Text style={styles.inputLabel}>Alergias</Text>
                  <Text style={styles.body}>
                    {[...profileDraft.allergies.map(id => FOOD_OPTIONS.find(food => food.id === id)?.name ?? id), profileDraft.otherAllergies.trim()]
                      .filter(Boolean).join(', ') || 'Ninguna registrada'}
                  </Text>
                  <Text style={styles.inputLabel}>Alimentos a prevenir</Text>
                  <Text style={styles.body}>
                    {[...profileDraft.noLikes.map(id => FOOD_OPTIONS.find(food => food.id === id)?.name ?? id), profileDraft.otherNoLikes.trim()]
                      .filter(Boolean).join(', ') || 'Ninguno registrado'}
                  </Text>
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
              {profileStep < 4 ? (
                <Button
                  title="Continuar"
                  icon="check"
                  onPress={() => {
                    if (profileStep === 0 && profileDraft.name.trim().length < 2) {
                      setProfileError('Escribe un nombre de al menos dos letras.');
                      return;
                    }
                    setProfileError('');
                    setProfileStep(current => Math.min(4, current + 1));
                  }}
                />
              ) : (
                <Button
                  title={editingProfile ? 'Guardar cambios' : 'Crear perfil'}
                  icon="save"
                  onPress={saveProfile}
                />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderLinkModal = () => {
    if (!data) return null;
    const nutriCandidates = data.nutribot.ninos.filter(child => !getLinkedNutri(data, child.id));
    const warriorCandidates = data.warriorKids.children.filter(child => !getLinkedWarrior(data, child.id));
    return (
      <Modal
        animationType="slide"
        onRequestClose={() => setShowLinkEditor(false)}
        transparent
        visible={showLinkEditor}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vincular perfiles</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setShowLinkEditor(false)} style={styles.close}>
                <Icon name="close" size={18} color={COLORS.ink} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
              <Text style={styles.body}>
                Elige los dos registros manualmente. Los nombres, preferencias y demás datos de origen se conservan; el nombre mostrado se guarda por separado.
              </Text>
              <Text style={styles.inputLabel}>Perfil de NutriBot Familiar</Text>
              {nutriCandidates.length ? nutriCandidates.map(child => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedNutriId === child.id }}
                  key={child.id}
                  onPress={() => {
                    setSelectedNutriId(child.id);
                    if (!linkDisplayName.trim()) setLinkDisplayName(child.nombre);
                    setLinkTheme(child.genero);
                  }}
                  style={[styles.profileRow, selectedNutriId === child.id && { backgroundColor: COLORS.paleBlue }]}
                >
                  <View style={styles.profileAvatar}><Icon name="profile" size={20} color={COLORS.green} /></View>
                  <View style={styles.flex}>
                    <Text style={styles.inputLabel}>{child.nombre}</Text>
                    <Text style={styles.muted}>Peso: {child.peso || 'sin dato'} · Estatura: {child.altura || 'sin dato'}</Text>
                  </View>
                  <Icon name="check" size={19} color={selectedNutriId === child.id ? COLORS.blue : COLORS.line} />
                </Pressable>
              )) : <Text style={styles.muted}>No hay perfiles NutriBot disponibles para vincular.</Text>}
              <Text style={styles.inputLabel}>Perfil de Warrior Kids</Text>
              {warriorCandidates.length ? warriorCandidates.map(child => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedWarriorId === child.id }}
                  key={child.id}
                  onPress={() => {
                    setSelectedWarriorId(child.id);
                    if (!linkDisplayName.trim()) setLinkDisplayName(child.name);
                    setLinkTheme(child.theme ?? 'nina');
                  }}
                  style={[styles.profileRow, selectedWarriorId === child.id && { backgroundColor: COLORS.paleBlue }]}
                >
                  <AvatarIllustration theme={child.theme ?? 'nina'} size="small" />
                  <View style={styles.flex}>
                    <Text style={styles.inputLabel}>{child.name}</Text>
                    <Text style={styles.muted}>{child.points} puntos · {child.badges.length} insignias</Text>
                  </View>
                  <Icon name="check" size={19} color={selectedWarriorId === child.id ? COLORS.blue : COLORS.line} />
                </Pressable>
              )) : <Text style={styles.muted}>No hay perfiles Warrior Kids disponibles para vincular.</Text>}
              <Field
                autoCapitalize="words"
                label="Nombre que se mostrará en la app"
                onChangeText={setLinkDisplayName}
                placeholder="Nombre"
                value={linkDisplayName}
              />
              <View style={styles.roleRow}>
                {([
                  { id: 'nina' as const, label: 'Tema rosa' },
                  { id: 'nino' as const, label: 'Tema azul' },
                ]).map(option => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: linkTheme === option.id }}
                    key={option.id}
                    onPress={() => setLinkTheme(option.id)}
                    style={[styles.roleChoice, linkTheme === option.id && styles.roleChoiceActive]}
                  >
                    <Text style={[styles.roleChoiceText, linkTheme === option.id && styles.roleChoiceTextActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              {linkError ? <Text accessibilityRole="alert" style={styles.errorText}>{linkError}</Text> : null}
              <Button title="Vincular manualmente" icon="link" onPress={saveProfileLink} disabled={!nutriCandidates.length || !warriorCandidates.length} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderActivityModal = () => (
    <Modal
      animationType="slide"
      onRequestClose={() => setActivityModal(null)}
      transparent
      visible={Boolean(activityModal)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.horizontal}>
              <Icon name="activity" size={20} color={COLORS.blue} />
              <Text style={styles.modalTitle}>Registrar actividad</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setActivityModal(null)} style={styles.close}>
              <Icon name="close" size={18} color={COLORS.ink} />
            </Pressable>
          </View>
          {activityModal ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
              <Text style={styles.body}>{activityModal.title}</Text>
              <Text style={styles.muted}>{activityModal.instructions}</Text>
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
                  <Image source={{ uri: activityPhoto.uri }} style={styles.imagePreview} resizeMode="cover" />
                  <View style={styles.between}>
                    <Text style={styles.muted}>Foto opcional · guardada en el espacio privado de tu cuenta.</Text>
                    <Pressable accessibilityRole="button" onPress={() => setActivityPhoto(null)}>
                      <Text style={styles.linkText}>Quitar</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Text style={styles.footer}>La foto es opcional; puedes registrar la actividad sin evidencia.</Text>
              )}
              {activityError ? <Text accessibilityRole="alert" style={styles.errorText}>{activityError}</Text> : null}
              <Button title="Enviar a revisión" icon="send" onPress={() => void submitActivity()} />
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  const renderRecipeModal = () => (
    <Modal
      animationType="slide"
      onRequestClose={() => setRecipeDetails(null)}
      transparent
      visible={Boolean(recipeDetails)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.horizontal}>
              <Icon name="recipes" size={20} color={COLORS.blue} />
              <Text style={styles.modalTitle}>{recipeDetails?.title}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setRecipeDetails(null)} style={styles.close}>
              <Icon name="close" size={18} color={COLORS.ink} />
            </Pressable>
          </View>
          {recipeDetails ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
              <Text style={styles.muted}>{recipeDetails.groups}</Text>
              <Text style={styles.sectionTitle}>Ingredientes</Text>
              {recipeDetails.ingredients.map(ingredient => <Text key={ingredient} style={styles.body}>• {ingredient}</Text>)}
              <Text style={styles.sectionTitle}>Preparación</Text>
              <Text style={styles.body}>{recipeDetails.preparation}</Text>
              <View style={styles.notice}>
                <Text style={styles.noticeText}>{recipeDetails.note}</Text>
              </View>
              <Text style={styles.footer}>Una persona adulta debe acompañar la preparación y revisar alergias, etiquetas y seguridad alimentaria.</Text>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  const renderMenuPickerModal = () => (
    <Modal
      animationType="slide"
      onRequestClose={() => setMenuPicker(null)}
      transparent
      visible={Boolean(menuPicker)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Elegir receta · {menuPicker ? getMealName(menuPicker.meal) : ''}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setMenuPicker(null)} style={styles.close}>
              <Icon name="close" size={18} color={COLORS.ink} />
            </Pressable>
          </View>
          {menuPicker ? (
            <ScrollView contentContainerStyle={{ gap: 9, paddingBottom: 8 }}>
              {RECIPES.map(recipe => (
                <Pressable
                  accessibilityRole="button"
                  key={recipe.id}
                  onPress={() => assignRecipe(menuPicker.day, menuPicker.meal, recipe.id)}
                  style={[styles.card, styles.cardTight]}
                >
                  <View style={styles.horizontal}>
                    <Icon name="recipes" size={23} color={COLORS.blue} />
                    <View style={styles.flex}>
                      <Text style={styles.cardTitle}>{recipe.title}</Text>
                      <Text style={styles.muted}>{recipe.groups}</Text>
                    </View>
                    <Icon name="add" size={19} color={COLORS.blue} />
                  </View>
                </Pressable>
              ))}
              <Button
                title="Quitar receta asignada"
                variant="outline"
                onPress={() => assignRecipe(menuPicker.day, menuPicker.meal, null)}
              />
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  const renderChatModal = () => (
    <Modal
      animationType="slide"
      onRequestClose={() => setChatOpen(false)}
      transparent
      visible={chatOpen}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.flex}>
              <View style={styles.horizontal}>
                <Icon name="leaf" size={18} color={COLORS.green} />
                <Text style={styles.modalTitle}>NutriBot Familiar</Text>
              </View>
              <Text style={styles.muted}>Respuestas locales predefinidas</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setChatOpen(false)} style={styles.close}>
              <Icon name="close" size={18} color={COLORS.ink} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 330 }} contentContainerStyle={{ gap: 9, paddingVertical: 5 }}>
            {chatMessages.map((message, index) => (
              <View
                key={`${index}-${message.from}`}
                style={{
                  alignSelf: message.from === 'child' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  padding: 11,
                  borderRadius: 15,
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
        </View>
      </View>
    </Modal>
  );

  const renderArchiveModal = () => (
    <Modal
      animationType="fade"
      onRequestClose={() => setProfileToArchive(null)}
      transparent
      visible={Boolean(profileToArchive)}
    >
      <View style={[styles.overlay, { justifyContent: 'center', padding: 18 }]}>
        <View style={[styles.modalCard, { borderRadius: 22 }]}>
          <Text style={styles.modalTitle}>¿Ocultar este perfil?</Text>
          <Text style={[styles.body, { marginVertical: 12 }]}>
            “{profileToArchive?.name}” dejará de aparecer en la app. Sus datos no se borrarán y el perfil no se desvinculará de su origen.
          </Text>
          <View style={styles.horizontal}>
            <Button title="Cancelar" variant="outline" style={styles.flex} onPress={() => setProfileToArchive(null)} />
            <Button title="Ocultar perfil" variant="danger" style={styles.flex} onPress={archiveProfile} />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTabContent = () => {
    switch (tab) {
      case 'Familia':
        return role === 'tutor' ? renderTutorHome() : renderChildHome();
      case 'Recetas':
        return renderRecipes();
      case 'Menú':
        return role === 'tutor' ? renderWeeklyMenu() : renderAchievements();
      case 'Logros':
        return role === 'child' ? renderAchievements() : renderTutorHome();
      case 'Ajustes':
        return renderSettings();
      case 'Ayuda':
        return renderHelp();
      default:
        return null;
    }
  };

  if (loading || (!fontsLoaded && !fontError)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.blue} />
          <Text style={styles.spinnerText}>
            {fontError ? 'No se pudieron cargar las tipografías de Warrior Kids.' : 'Preparando tu espacio familiar…'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fontError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Icon name="warning" size={34} color={COLORS.orange} />
          <Text style={styles.cardTitle}>No se pudieron cargar las tipografías</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>{fontError.message}</Text>
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
          {authUser ? <Button title="Cerrar sesión" variant="outline" onPress={logout} /> : null}
        </View>
      </SafeAreaView>
    );
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.shell}>
        {renderHeader()}
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {storageError ? (
            <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: '#FFF5F5', borderColor: '#FED7D7', gap: 8 }]}>
              <Text style={[styles.noticeText, { color: COLORS.error }]}>No se guardó el último cambio: {storageError}</Text>
              <Button
                title="Recargar datos de Supabase"
                small
                variant="outline"
                onPress={() => { void loadData(); }}
              />
            </View>
          ) : null}
          {notice ? (
            <Pressable accessibilityRole="button" onPress={() => setNotice('')} style={styles.banner}>
              <Text style={styles.bannerText}>{notice}  ·  Toca para cerrar</Text>
            </Pressable>
          ) : null}
          {renderTabContent()}
        </ScrollView>
        <View style={styles.nav}>
          {(role === 'tutor'
            ? NAV_ITEMS
            : NAV_ITEMS.map(item => item.id === 'Menú'
              ? { ...item, id: 'Logros' as const, icon: 'achievements' as const, label: 'Logros' }
              : item)).map(item => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: tab === item.id }}
              key={item.id}
              onPress={() => setTab(item.id)}
              style={[styles.navItem, tab === item.id && styles.navItemActive]}
            >
              <Icon name={item.icon} size={19} color={tab === item.id ? COLORS.blueDeep : COLORS.muted} />
              <Text style={[styles.navLabel, tab === item.id && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {renderProfileModal()}
      {renderLinkModal()}
      {renderActivityModal()}
      {renderRecipeModal()}
      {renderMenuPickerModal()}
      {renderChatModal()}
      {renderArchiveModal()}
    </SafeAreaView>
  );
}
