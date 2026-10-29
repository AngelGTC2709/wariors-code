import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ACTIVITIES,
  CHILD_AVATARS,
  MOODS,
  RECIPES,
  WEEKDAYS,
} from '@/constants/warrior-kids';

type ActivityStatus = 'pending' | 'approved';
type ChildTheme = 'nina' | 'nino';
type DailyLog = {
  activities: Record<string, ActivityStatus>;
  water: number;
  foodGroups: string[];
  mood: string | null;
};
type ChildProfile = {
  id: string;
  name: string;
  avatar: string;
  theme?: ChildTheme;
  points: number;
  badges: string[];
  days: Record<string, DailyLog>;
};
type AppData = {
  tutor: { name: string; email: string } | null;
  children: ChildProfile[];
  selectedChildId: string | null;
  weeklyMenu: Record<string, string>;
  remindersEnabled: boolean;
  waterGoal: number;
  screenLimitMinutes: number;
};
type Page = 'inicio' | 'habitos' | 'progreso' | 'recetas' | 'plan' | 'familia' | 'ajustes' | 'privacidad';
type AuthPage = 'welcome' | 'login' | 'register';

const STORAGE_KEY = 'warrior-kids-local-v1';
const TODAY = (() => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
})();
const FOOD_GROUPS = [
  { id: 'verduras', title: 'Verduras y frutas', emoji: '🥬' },
  { id: 'cereales', title: 'Cereales', emoji: '🌽' },
  { id: 'leguminosas', title: 'Leguminosas y alimentos de origen animal', emoji: '🫘' },
];
const EMPTY_LOG: DailyLog = { activities: {}, water: 0, foodGroups: [], mood: null };
const INITIAL_DATA: AppData = {
  tutor: null,
  children: [],
  selectedChildId: null,
  weeklyMenu: {},
  remindersEnabled: false,
  waterGoal: 5,
  screenLimitMinutes: 30,
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppData>;
  return (
    (candidate.tutor === null ||
      (!!candidate.tutor &&
        typeof candidate.tutor.name === 'string' &&
        typeof candidate.tutor.email === 'string')) &&
    Array.isArray(candidate.children) &&
    (candidate.selectedChildId === null || typeof candidate.selectedChildId === 'string') &&
    !!candidate.weeklyMenu &&
    typeof candidate.weeklyMenu === 'object' &&
    typeof candidate.remindersEnabled === 'boolean' &&
    typeof candidate.waterGoal === 'number' &&
    typeof candidate.screenLimitMinutes === 'number'
  );
}

const COLORS = {
  ink: '#3D3552',
  muted: '#897E8E',
  green: '#FF6F91',
  greenDark: '#C2455F',
  secondary: '#9B7EDE',
  mint: '#FDEDF1',
  cream: '#FFF7F8',
  peach: '#FFF0E8',
  lavender: '#F0EEFF',
  pink: '#FFF1F4',
  white: '#FFFFFF',
  border: '#F5DEE4',
  red: '#9A3D44',
};

type AppPalette = typeof COLORS;

const COLOR_THEMES: Record<ChildTheme, AppPalette> = {
  nina: COLORS,
  nino: {
    ink: '#243B53',
    muted: '#647C94',
    green: '#3D8BFF',
    greenDark: '#2A62B8',
    secondary: '#8B6DFF',
    mint: '#E6F0FF',
    cream: '#F3F8FF',
    peach: '#FFF3E8',
    lavender: '#F0EEFF',
    pink: '#EBF3FF',
    white: '#FFFFFF',
    border: '#D9E8FF',
    red: '#9A3D44',
  },
};

const PaletteContext = createContext<AppPalette>(COLOR_THEMES.nina);

function Button({
  title,
  onPress,
  tone = 'primary',
  disabled = false,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  tone?: 'primary' | 'soft' | 'outline' | 'warning';
  disabled?: boolean;
  compact?: boolean;
}) {
  const styles = usePaletteStyles();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${tone}`],
        compact && styles.buttonCompact,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, tone === 'soft' && styles.softButtonText]}>{title}</Text>
    </Pressable>
  );
}

function Card({ children, style }: { children: ReactNode; style?: object }) {
  const styles = usePaletteStyles();

  return <View style={[styles.card, style]}>{children}</View>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences';
}) {
  const styles = usePaletteStyles();
  const palette = useContext(PaletteContext);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

export default function HomeScreen() {
  const [data, setData] = useState<AppData | null>(null);
  const dataRef = useRef<AppData | null>(null);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const [storageError, setStorageError] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [authPage, setAuthPage] = useState<AuthPage>('welcome');
  const [role, setRole] = useState<'child' | 'tutor'>('tutor');
  const [page, setPage] = useState<Page>('inicio');
  const [tutorName, setTutorName] = useState('');
  const [email, setEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [childAvatar, setChildAvatar] = useState(CHILD_AVATARS[0]);
  const [childTheme, setChildTheme] = useState<ChildTheme>('nina');
  const [formError, setFormError] = useState('');
  const [showTutorGate, setShowTutorGate] = useState(false);
  const [gateEmail, setGateEmail] = useState('');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(WEEKDAYS[0]);
  const [welcomeNote, setWelcomeNote] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (!isAppData(parsed)) throw new Error('Los datos guardados no tienen el formato esperado.');
          dataRef.current = parsed;
          setData(parsed);
        } else {
          dataRef.current = INITIAL_DATA;
          setData(INITIAL_DATA);
        }
      } catch (error) {
        if (!mounted) return;
        dataRef.current = INITIAL_DATA;
        setData(INITIAL_DATA);
        setStorageError(
          error instanceof Error
            ? `No se pudieron leer los datos locales: ${error.message}`
            : 'No se pudieron leer los datos locales.',
        );
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const updateData = (updater: (current: AppData) => AppData) => {
    const current = dataRef.current;
    if (!current) return;
    const next = updater(current);
    dataRef.current = next;
    setData(next);
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)))
      .catch((error: unknown) => {
        setStorageError(
          error instanceof Error
            ? `No se pudieron guardar los cambios en este dispositivo: ${error.message}`
            : 'No se pudieron guardar los cambios en este dispositivo.',
        );
      });
  };

  const currentChild = useMemo(() => {
    if (!data) return null;
    return (
      data.children.find((child) => child.id === data.selectedChildId) ??
      data.children[0] ??
      null
    );
  }, [data]);
  const activeThemeId = showProfileForm || !currentChild ? childTheme : currentChild.theme ?? 'nina';
  const palette = COLOR_THEMES[activeThemeId];
  const styles = useMemo(() => createStyles(palette), [palette]);
  const todayLog = currentChild?.days[TODAY] ?? EMPTY_LOG;
  const recipe = RECIPES.find((item) => item.id === selectedRecipe);
  const pendingCount = currentChild
    ? Object.values(todayLog.activities).filter((status) => status === 'pending').length
    : 0;

  const saveTutor = () => {
    const name = tutorName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (name.length < 2 || name.length > 40) {
      setFormError('Escribe un nombre de al menos 2 caracteres.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFormError('Revisa el correo; debe tener un formato válido.');
      return;
    }
    setFormError('');
    updateData((current) => ({
      ...current,
      tutor: { name, email: normalizedEmail },
    }));
    setSignedIn(true);
    setRole('tutor');
    setPage('familia');
  };

  const loginTutor = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFormError('Escribe un correo válido para continuar.');
      return;
    }
    if (data?.tutor?.email !== normalizedEmail) {
      setFormError('No encontramos una cuenta familiar local con ese correo en este dispositivo.');
      return;
    }
    setFormError('');
    setSignedIn(true);
    setRole('tutor');
    setPage(data.children.length ? 'familia' : 'inicio');
  };

  const addChild = () => {
    const name = childName.trim();
    if (name.length < 2 || name.length > 24) {
      setFormError('Escribe un nombre o apodo de 2 a 24 caracteres.');
      return;
    }
    const id = makeId();
    updateData((current) => ({
      ...current,
      children: [...current.children, { id, name, avatar: childAvatar, theme: childTheme, points: 0, badges: [], days: {} }],
      selectedChildId: id,
    }));
    setChildName('');
    setFormError('');
    setShowProfileForm(false);
    setPage('inicio');
  };

  const updateChild = (childId: string, updater: (child: ChildProfile) => ChildProfile) => {
    updateData((current) => ({
      ...current,
      children: current.children.map((child) => (child.id === childId ? updater(child) : child)),
    }));
  };

  const updateToday = (updater: (log: DailyLog) => DailyLog) => {
    if (!currentChild) return;
    updateChild(currentChild.id, (child) => ({
      ...child,
      days: {
        ...child.days,
        [TODAY]: updater(child.days[TODAY] ?? { ...EMPTY_LOG, activities: {}, foodGroups: [] }),
      },
    }));
  };

  const registerActivity = (activityId: string) => {
    if (!currentChild || todayLog.activities[activityId]) return;
    updateToday((log) => ({
      ...log,
      activities: { ...log.activities, [activityId]: 'pending' },
    }));
    setWelcomeNote('¡Actividad registrada! Pídele a tu tutor que la revise.');
  };

  const confirmActivity = (childId: string, activityId: string) => {
    const activity = ACTIVITIES.find((item) => item.id === activityId);
    if (!activity) return;
    updateData((current) => ({
      ...current,
      children: current.children.map((child) => {
        if (child.id !== childId) return child;
        const log = child.days[TODAY] ?? EMPTY_LOG;
        if (log.activities[activityId] !== 'pending') return child;
        const nextPoints = child.points + activity.points;
        const badges = [...child.badges];
        if (!badges.includes('primer-reto')) badges.push('primer-reto');
        if (nextPoints >= 45 && !badges.includes('familia-en-equipo')) badges.push('familia-en-equipo');
        return {
          ...child,
          points: nextPoints,
          badges,
          days: { ...child.days, [TODAY]: { ...log, activities: { ...log.activities, [activityId]: 'approved' } } },
        };
      }),
    }));
  };

  const reviewActivity = (childId: string, activityId: string) => {
    updateData((current) => ({
      ...current,
      children: current.children.map((child) => {
        if (child.id !== childId) return child;
        const log = child.days[TODAY] ?? EMPTY_LOG;
        if (log.activities[activityId] !== 'pending') return child;
        const activities = { ...log.activities };
        delete activities[activityId];
        return { ...child, days: { ...child.days, [TODAY]: { ...log, activities } } };
      }),
    }));
  };

  const changePage = (nextPage: Page) => {
    setSelectedRecipe(null);
    setPage(nextPage);
  };

  const signOut = () => {
    setSignedIn(false);
    setShowTutorGate(false);
    setAuthPage('welcome');
    setRole('tutor');
    setFormError('');
    setEmail('');
    setTutorName('');
  };

  const renderChildForm = (title: string) => (
    <Card>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.body}>Usa un nombre o apodo; no hace falta fecha de nacimiento ni otros datos personales.</Text>
      <Text style={styles.fieldLabel}>Elige una paleta</Text>
      <View style={styles.themeRow}>
        {([
          { id: 'nina', label: 'Niña', emoji: '👧🏻' },
          { id: 'nino', label: 'Niño', emoji: '👦🏻' },
        ] as const).map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: childTheme === option.id }}
            key={option.id}
            onPress={() => setChildTheme(option.id)}
            style={[styles.themeChoice, childTheme === option.id && styles.themeChoiceSelected]}
          >
            <Text style={styles.themeEmoji}>{option.emoji}</Text>
            <Text style={[styles.themeChoiceText, childTheme === option.id && styles.themeChoiceTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Field label="Nombre o apodo" value={childName} onChangeText={setChildName} placeholder="Por ejemplo, Alex" maxLength={24} />
      <Text style={styles.fieldLabel}>Elige un avatar</Text>
      <View style={styles.avatarRow}>
        {CHILD_AVATARS.map((avatar) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Elegir avatar ${avatar}`}
            accessibilityState={{ selected: childAvatar === avatar }}
            key={avatar}
            onPress={() => setChildAvatar(avatar)}
            style={[styles.avatarChoice, childAvatar === avatar && styles.avatarChoiceSelected]}
          >
            <Text style={styles.avatarEmoji}>{avatar}</Text>
          </Pressable>
        ))}
      </View>
      {!!formError && <Text accessibilityRole="alert" style={styles.errorText}>{formError}</Text>}
      <Button title="Guardar perfil infantil" onPress={addChild} />
    </Card>
  );

  if (!data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator color={palette.green} size="large" />
          <Text style={styles.body}>Cargando datos de este dispositivo…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!signedIn) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.brandMark}>🛡️</Text>
            <Text style={styles.brand}>Warrior Kids</Text>
            <Text style={styles.tagline}>Pequeños pasos, grandes aventuras</Text>
            <Card style={styles.welcomeCard}>
              <Text style={styles.heroTitle}>¡Hola, familia! 👋</Text>
              <Text style={styles.body}>
                Retos divertidos y hábitos para compartir, con el acompañamiento de una persona adulta.
              </Text>
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Prototipo local: el acceso familiar es solo una demostración, no es una cuenta ni autenticación segura.
                </Text>
              </View>
              {authPage === 'welcome' && (
                <View style={styles.stack}>
                  <Button title="Crear cuenta familiar local" onPress={() => { setAuthPage('register'); setFormError(''); }} />
                  <Button title="Ya tengo una cuenta en este dispositivo" tone="soft" onPress={() => { setAuthPage('login'); setFormError(''); }} />
                  {data.tutor && (
                    <Text style={styles.helperText}>Este dispositivo tiene un perfil familiar local registrado.</Text>
                  )}
                </View>
              )}
              {authPage === 'register' && (
                <View style={styles.stack}>
                  <Field label="Nombre de la persona tutora" value={tutorName} onChangeText={setTutorName} placeholder="Tu nombre" maxLength={40} />
                  <Field label="Correo para identificar la cuenta local" value={email} onChangeText={setEmail} placeholder="familia@ejemplo.mx" keyboardType="email-address" autoCapitalize="none" maxLength={100} />
                  <Text style={styles.helperText}>El correo se guarda únicamente en este dispositivo. No pedimos contraseña.</Text>
                  {!!formError && <Text accessibilityRole="alert" style={styles.errorText}>{formError}</Text>}
                  <Button title="Registrar y continuar" onPress={saveTutor} />
                  <Button title="Volver" tone="outline" onPress={() => { setAuthPage('welcome'); setFormError(''); }} />
                </View>
              )}
              {authPage === 'login' && (
                <View style={styles.stack}>
                  <Field label="Correo guardado en este dispositivo" value={email} onChangeText={setEmail} placeholder="familia@ejemplo.mx" keyboardType="email-address" autoCapitalize="none" maxLength={100} />
                  {!!formError && <Text accessibilityRole="alert" style={styles.errorText}>{formError}</Text>}
                  <Button title="Entrar a esta familia" onPress={loginTutor} />
                  <Button title="Volver" tone="outline" onPress={() => { setAuthPage('welcome'); setFormError(''); }} />
                </View>
              )}
            </Card>
            <Text style={styles.footerNote}>Sin anuncios ni funciones sociales públicas. Los datos no se sincronizan con la nube.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (data.children.length === 0) {
    return (
      <PaletteContext.Provider value={palette}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.brand}>Warrior Kids</Text>
              <Text style={styles.subtitle}>¡Vamos a crear el primer perfil de tu familia!</Text>
              {renderChildForm('Perfil infantil')}
              <Button title="Cerrar sesión" tone="outline" onPress={signOut} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </PaletteContext.Provider>
    );
  }

  if (!currentChild) return null;

  const pageOptions: { id: Page; label: string; emoji: string; roles: Array<'child' | 'tutor'> }[] = [
    { id: 'inicio', label: 'Inicio', emoji: '🏠', roles: ['child'] },
    { id: 'habitos', label: 'Hábitos', emoji: '💧', roles: ['child'] },
    { id: 'progreso', label: 'Progreso', emoji: '⭐', roles: ['child'] },
    { id: 'familia', label: 'Familia', emoji: '👨‍👩‍👧', roles: ['tutor'] },
    { id: 'recetas', label: 'Recetas', emoji: '🥗', roles: ['child', 'tutor'] },
    { id: 'plan', label: 'Menú', emoji: '📅', roles: ['tutor'] },
    { id: 'ajustes', label: 'Ajustes', emoji: '⚙️', roles: ['tutor'] },
    { id: 'privacidad', label: 'Ayuda', emoji: '🔒', roles: ['child', 'tutor'] },
  ];
  const visiblePages = pageOptions.filter((option) => option.roles.includes(role));
  const pageTitle = pageOptions.find((option) => option.id === page)?.label ?? 'Warrior Kids';

  const renderActivities = (compact = false) => (
    <View style={styles.stack}>
      {ACTIVITIES.map((activity, index) => {
        const status = todayLog.activities[activity.id];
        const isChallenge = index === new Date().getDay() % ACTIVITIES.length;
        return (
          <Card key={activity.id} style={compact ? styles.activityCardCompact : undefined}>
            <View style={styles.activityHeading}>
              <Text style={styles.activityEmoji}>{activity.emoji}</Text>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{activity.title}</Text>
                <Text style={styles.helperText}>⏱ {activity.minutes} min · +{activity.points} puntos con aprobación</Text>
              </View>
            </View>
            {isChallenge && <Text style={styles.challengeLabel}>RETO DEL DÍA</Text>}
            {!compact && <Text style={styles.body}>{activity.instructions}</Text>}
            <Button
              compact
              disabled={!!status}
              onPress={() => registerActivity(activity.id)}
              title={status === 'approved' ? '¡Confirmada por tu tutor! ✓' : status === 'pending' ? 'Esperando revisión de tu tutor' : 'Ya la hice · avisar a mi tutor'}
              tone={status ? 'soft' : 'primary'}
            />
          </Card>
        );
      })}
    </View>
  );

  const renderPage = () => {
    if (!currentChild) return null;
    if (role === 'child' && page === 'inicio') {
      return (
        <View style={styles.stack}>
          <Card style={styles.kidHero}>
            <Text style={styles.heroTitle}>¡Qué gusto verte, {currentChild.name}! {currentChild.avatar}</Text>
            <Text style={styles.body}>Cada actividad es una oportunidad para jugar, aprender y compartir. ¡A tu ritmo!</Text>
          </Card>
          <Card style={styles.dailyChallenge}>
            <Text style={styles.eyebrow}>TU RETO DE HOY</Text>
            <Text style={styles.heroTitle}>{ACTIVITIES[new Date().getDay() % ACTIVITIES.length].emoji} {ACTIVITIES[new Date().getDay() % ACTIVITIES.length].title}</Text>
            <Text style={styles.body}>{ACTIVITIES[new Date().getDay() % ACTIVITIES.length].instructions}</Text>
            <Text style={styles.helperText}>Dura aproximadamente {ACTIVITIES[new Date().getDay() % ACTIVITIES.length].minutes} minutos. Puedes hacerlo con una persona adulta.</Text>
            <Button
              title={todayLog.activities[ACTIVITIES[new Date().getDay() % ACTIVITIES.length].id] ? 'Ya avisaste a tu tutor ✓' : 'Lo hice · avisar a mi tutor'}
              disabled={!!todayLog.activities[ACTIVITIES[new Date().getDay() % ACTIVITIES.length].id]}
              onPress={() => registerActivity(ACTIVITIES[new Date().getDay() % ACTIVITIES.length].id)}
              tone={todayLog.activities[ACTIVITIES[new Date().getDay() % ACTIVITIES.length].id] ? 'soft' : 'primary'}
            />
          </Card>
          {welcomeNote ? <Text accessibilityLiveRegion="polite" style={styles.successText}>{welcomeNote}</Text> : null}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Más ideas para moverte</Text>
            <Text style={styles.helperText}>Elige lo que te guste; no hay competencia.</Text>
          </View>
          {renderActivities(true)}
          <Button title="Registrar agua, comida o ánimo" tone="soft" onPress={() => changePage('habitos')} />
        </View>
      );
    }

    if (role === 'child' && page === 'habitos') {
      return (
        <View style={styles.stack}>
          <Card>
            <Text style={styles.cardTitle}>💧 Vasos de agua</Text>
            <Text style={styles.body}>{todayLog.water} vasos registrados · meta familiar: {data.waterGoal}. Esta meta la eligió tu familia, no es una recomendación médica.</Text>
            <View style={styles.waterRow}>
              <Button compact title="−" tone="outline" disabled={todayLog.water === 0} onPress={() => updateToday((log) => ({ ...log, water: Math.max(0, log.water - 1) }))} />
              <Text style={styles.waterNumber}>{todayLog.water}</Text>
              <Button compact title="+1 vaso" onPress={() => updateToday((log) => ({ ...log, water: log.water + 1 }))} />
            </View>
          </Card>
          <Card>
            <Text style={styles.cardTitle}>🍽️ Explora los grupos de alimentos</Text>
            <Text style={styles.body}>El Plato del Bien Comer nos invita a conocer distintos grupos. Registra lo que exploraste; no es una calificación.</Text>
            {FOOD_GROUPS.map((group) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Registrar ${group.title}`}
                key={group.id}
                onPress={() => updateToday((log) => ({ ...log, foodGroups: [...log.foodGroups, group.id] }))}
                style={styles.foodRow}
              >
                <Text style={styles.foodEmoji}>{group.emoji}</Text>
                <Text style={[styles.body, styles.flex]}>{group.title}</Text>
                <Text style={styles.foodCount}>{todayLog.foodGroups.filter((id) => id === group.id).length} +</Text>
              </Pressable>
            ))}
          </Card>
          <Card>
            <Text style={styles.cardTitle}>🌈 ¿Cómo te sientes?</Text>
            <Text style={styles.body}>No hay respuestas buenas o malas. Si te sientes mal, cuéntaselo a una persona adulta de confianza.</Text>
            <View style={styles.moodRow}>
              {MOODS.map((mood) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Me siento: ${mood.label}`}
                  accessibilityState={{ selected: todayLog.mood === mood.id }}
                  key={mood.id}
                  onPress={() => updateToday((log) => ({ ...log, mood: mood.id }))}
                  style={[styles.moodChoice, todayLog.mood === mood.id && styles.moodChoiceSelected]}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={styles.helperText}>{mood.label}</Text>
                </Pressable>
              ))}
            </View>
            {todayLog.mood === 'triste' || todayLog.mood === 'cansado' ? (
              <Text style={styles.noticeText}>Gracias por contarlo. Busca a una persona adulta de confianza para platicar. 💛</Text>
            ) : null}
          </Card>
          {renderActivities(true)}
        </View>
      );
    }

    if (role === 'child' && page === 'progreso') {
      const progress = currentChild.points % 100;
      const badgeData = [
        { id: 'primer-reto', emoji: '🎯', title: 'Primer reto', detail: 'Tu tutor confirmó tu primera actividad.' },
        { id: 'familia-en-equipo', emoji: '🤝', title: 'Familia en equipo', detail: 'Sumaron 45 puntos con actividades aprobadas.' },
      ];
      return (
        <View style={styles.stack}>
          <Card style={styles.progressHero}>
            <Text style={styles.heroTitle}>⭐ {currentChild.points} puntos</Text>
            <Text style={styles.body}>Los puntos llegan cuando tu tutor confirma una actividad. Cada 100 puntos se completa una recompensa virtual.</Text>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
            <Text style={styles.helperText}>{progress} de 100 puntos para la siguiente recompensa virtual.</Text>
          </Card>
          <Card>
            <Text style={styles.cardTitle}>🏅 Insignias</Text>
            <Text style={styles.helperText}>Se ganan por participar, nunca por apariencia o comparación.</Text>
            {badgeData.map((badge) => {
              const unlocked = currentChild.badges.includes(badge.id);
              return (
                <View key={badge.id} style={[styles.badgeRow, !unlocked && styles.badgeLocked]}>
                  <Text style={styles.badgeEmoji}>{unlocked ? badge.emoji : '🔒'}</Text>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{badge.title}</Text>
                    <Text style={styles.helperText}>{badge.detail}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
          <Button title="Volver a mis retos" onPress={() => changePage('inicio')} />
        </View>
      );
    }

    if (role === 'tutor' && page === 'familia') {
      const approvedToday = Object.values(todayLog.activities).filter((status) => status === 'approved').length;
      const pendingActivities = ACTIVITIES.filter((activity) => todayLog.activities[activity.id] === 'pending');
      return (
        <View style={styles.stack}>
          <Card style={styles.familySummary}>
            <Text style={styles.heroTitle}>Hola, {data.tutor?.name} 👋</Text>
            <Text style={styles.body}>Un espacio privado para acompañar a tu familia en este dispositivo.</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={styles.statNumber}>{approvedToday}</Text><Text style={styles.helperText}>actividades confirmadas hoy</Text></View>
              <View style={styles.statBox}><Text style={styles.statNumber}>{todayLog.water}</Text><Text style={styles.helperText}>vasos registrados hoy</Text></View>
              <View style={styles.statBox}><Text style={styles.statNumber}>{currentChild.points}</Text><Text style={styles.helperText}>puntos acumulados</Text></View>
            </View>
          </Card>
          {pendingActivities.length === 0 ? (
            <Card>
              <Text style={styles.cardTitle}>✅ Sin actividades por revisar</Text>
              <Text style={styles.body}>Cuando tu peque registre una actividad, aparecerá aquí. ¡Acompáñalo con ánimo y curiosidad!</Text>
            </Card>
          ) : (
            <View style={styles.stack}>
              <Text style={styles.sectionTitle}>Actividades que esperan tu revisión</Text>
              {pendingActivities.map((activity) => (
                <Card key={activity.id}>
                  <Text style={styles.cardTitle}>{activity.emoji} {activity.title}</Text>
                  <Text style={styles.body}>Pregunta cómo le fue y confirma si la actividad se realizó.</Text>
                  <View style={styles.buttonRow}>
                    <Button compact title={`Confirmar · +${activity.points} pts`} onPress={() => confirmActivity(currentChild.id, activity.id)} />
                    <Button compact title="Revisar juntos" tone="outline" onPress={() => reviewActivity(currentChild.id, activity.id)} />
                  </View>
                </Card>
              ))}
            </View>
          )}
          <Card>
            <Text style={styles.cardTitle}>Perfiles de esta familia</Text>
            <Text style={styles.helperText}>Solo aparecen en esta cuenta local de la persona tutora.</Text>
            {data.children.map((child) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: child.id === currentChild.id }}
                key={child.id}
                onPress={() => updateData((current) => ({ ...current, selectedChildId: child.id }))}
                style={[styles.profileRow, child.id === currentChild.id && styles.profileRowSelected]}
              >
                <Text style={styles.profileAvatar}>{child.avatar}</Text>
                <Text style={[styles.cardTitle, styles.flex]}>{child.name}</Text>
                <Text style={styles.helperText}>{child.points} pts</Text>
              </Pressable>
            ))}
            {showProfileForm ? (
              <View style={styles.stack}>
                {renderChildForm('Añadir otro perfil infantil')}
                <Button title="Cancelar" tone="outline" onPress={() => { setShowProfileForm(false); setFormError(''); }} />
              </View>
            ) : (
              <Button title="＋ Añadir perfil infantil" tone="soft" onPress={() => { setShowProfileForm(true); setFormError(''); }} />
            )}
          </Card>
        </View>
      );
    }

    if (page === 'recetas') {
      return (
        <View style={styles.stack}>
          <Card style={styles.recipeIntro}>
            <Text style={styles.cardTitle}>🥗 Recetario en familia</Text>
            <Text style={styles.body}>Ideas sencillas con ingredientes comunes de la región. El Plato del Bien Comer es una guía de aprendizaje, no una dieta médica.</Text>
          </Card>
          {recipe ? (
            <Card>
              <Text style={styles.heroTitle}>{recipe.emoji} {recipe.title}</Text>
              <Text style={styles.sectionTitle}>Grupos del Plato del Bien Comer</Text>
              <Text style={styles.body}>{recipe.groups}</Text>
              <Text style={styles.sectionTitle}>Ingredientes</Text>
              {recipe.ingredients.map((ingredient) => <Text key={ingredient} style={styles.bullet}>• {ingredient}</Text>)}
              <Text style={styles.sectionTitle}>Preparación</Text>
              <Text style={styles.body}>{recipe.preparation}</Text>
              <Text style={styles.noticeText}>💡 {recipe.note}</Text>
              <Button title="Volver a las recetas" tone="outline" onPress={() => setSelectedRecipe(null)} />
            </Card>
          ) : RECIPES.map((item) => (
            <Pressable key={item.id} onPress={() => setSelectedRecipe(item.id)} accessibilityRole="button" style={styles.recipePress}>
              <Card style={styles.recipeCard}>
                <Text style={styles.activityEmoji}>{item.emoji}</Text>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.helperText}>{item.groups}</Text>
                  <Text style={styles.linkText}>Ver ingredientes y preparación ›</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      );
    }

    if (role === 'tutor' && page === 'plan') {
      const plannedRecipe = RECIPES.find((item) => item.id === data.weeklyMenu[selectedDay]);
      return (
        <View style={styles.stack}>
          <Card>
            <Text style={styles.cardTitle}>📅 Planificador familiar</Text>
            <Text style={styles.body}>Elige una idea por día; puedes cambiarla cuando quieras. No es un plan alimenticio médico.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
              {WEEKDAYS.map((day) => (
                <Pressable key={day} onPress={() => setSelectedDay(day)} style={[styles.dayChip, selectedDay === day && styles.dayChipSelected]}>
                  <Text style={[styles.dayText, selectedDay === day && styles.dayTextSelected]}>{day.slice(0, 3)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.sectionTitle}>{selectedDay}</Text>
            {plannedRecipe ? (
              <View style={styles.plannedMeal}>
                <Text style={styles.cardTitle}>{plannedRecipe.emoji} {plannedRecipe.title}</Text>
                <Button compact title="Quitar del menú" tone="outline" onPress={() => updateData((current) => {
                  const weeklyMenu = { ...current.weeklyMenu };
                  delete weeklyMenu[selectedDay];
                  return { ...current, weeklyMenu };
                })} />
              </View>
            ) : <Text style={styles.helperText}>Todavía no hay una receta para este día.</Text>}
            <Text style={styles.sectionTitle}>Agregar una receta</Text>
            {RECIPES.map((item) => (
              <Button
                compact
                key={item.id}
                title={`${item.emoji} ${item.title}`}
                tone="soft"
                onPress={() => updateData((current) => ({ ...current, weeklyMenu: { ...current.weeklyMenu, [selectedDay]: item.id } }))}
              />
            ))}
          </Card>
        </View>
      );
    }

    if (role === 'tutor' && page === 'ajustes') {
      return (
        <View style={styles.stack}>
          <Card>
            <Text style={styles.cardTitle}>🔔 Recordatorios familiares</Text>
            <Text style={styles.body}>Guarda una preferencia para recordar hábitos. Esta opción no programa notificaciones del sistema.</Text>
            <Button
              title={data.remindersEnabled ? 'Recordatorio local: activado' : 'Recordatorio local: desactivado'}
              tone={data.remindersEnabled ? 'primary' : 'outline'}
              onPress={() => updateData((current) => ({ ...current, remindersEnabled: !current.remindersEnabled }))}
            />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>💧 Meta familiar de agua</Text>
            <Text style={styles.body}>Una meta sencilla elegida en familia, no una prescripción médica.</Text>
            <View style={styles.waterRow}>
              <Button compact title="−" tone="outline" disabled={data.waterGoal <= 1} onPress={() => updateData((current) => ({ ...current, waterGoal: Math.max(1, current.waterGoal - 1) }))} />
              <Text style={styles.waterNumber}>{data.waterGoal}</Text>
              <Button compact title="+1" disabled={data.waterGoal >= 10} onPress={() => updateData((current) => ({ ...current, waterGoal: Math.min(10, current.waterGoal + 1) }))} />
            </View>
          </Card>
          <Card>
            <Text style={styles.cardTitle}>⏳ Tiempo de uso acordado</Text>
            <Text style={styles.body}>Elijan juntos un límite orientativo diario para esta app.</Text>
            <View style={styles.limitRow}>
              {[15, 30, 45, 60].map((minutes) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: data.screenLimitMinutes === minutes }}
                  key={minutes}
                  onPress={() => updateData((current) => ({ ...current, screenLimitMinutes: minutes }))}
                  style={[styles.limitChip, data.screenLimitMinutes === minutes && styles.limitChipSelected]}
                >
                  <Text style={[styles.dayText, data.screenLimitMinutes === minutes && styles.dayTextSelected]}>{minutes} min</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.helperText}>La app no bloquea el dispositivo ni mide tiempo en segundo plano.</Text>
          </Card>
          <Button title="Cerrar sesión local" tone="outline" onPress={signOut} />
        </View>
      );
    }

    if (page === 'privacidad') {
      return (
        <View style={styles.stack}>
          <Card>
            <Text style={styles.cardTitle}>🔒 Privacidad y límites del prototipo</Text>
            <Text style={styles.body}>Los perfiles, registros, puntos, preferencias y menú se guardan en el almacenamiento local de este dispositivo.</Text>
            <Text style={styles.bullet}>• No hay sincronización en la nube, autenticación real ni administración de cuentas.</Text>
            <Text style={styles.bullet}>• El correo solo identifica el perfil local; no se verifica ni se envía a un servidor.</Text>
            <Text style={styles.bullet}>• No hay notificaciones del sistema, anuncios, chat externo ni funciones sociales públicas.</Text>
            <Text style={styles.bullet}>• Quien tenga acceso al dispositivo podría ver los datos locales. Cerrar sesión no los borra.</Text>
          </Card>
          <Card>
            <Text style={styles.cardTitle}>💛 Acompañamiento y ayuda</Text>
            <Text style={styles.body}>Warrior Kids no da diagnósticos ni consejos médicos y no sustituye la supervisión de una persona adulta o de profesionales de salud. Si una niña o un niño se siente mal, anímale a hablar con una persona adulta de confianza.</Text>
            <Text style={styles.helperText}>Las pruebas con menores requieren las autorizaciones y el consentimiento del tutor, además del asentimiento del menor cuando corresponda.</Text>
          </Card>
        </View>
      );
    }

    return (
      <View style={styles.stack}>
        <Card><Text style={styles.cardTitle}>Tus actividades</Text><Text style={styles.body}>Hazlas a tu ritmo. Las actividades que registres se comparten solo con la persona tutora de este dispositivo.</Text></Card>
        {renderActivities()}
      </View>
    );
  };

  if (showTutorGate) {
    const enterTutorSpace = () => {
      if (gateEmail.trim().toLowerCase() !== data.tutor?.email) {
        setFormError('Ese correo no coincide con el perfil familiar de este dispositivo.');
        return;
      }
      setFormError('');
      setGateEmail('');
      setShowTutorGate(false);
      setRole('tutor');
      setPage('familia');
    };
    return (
      <PaletteContext.Provider value={palette}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <View style={styles.gateContent}>
              <Text style={styles.brandMark}>🔐</Text>
              <Text style={styles.heroTitle}>Acceso de la persona tutora</Text>
              <Text style={styles.body}>Para abrir los perfiles y avances familiares, pide a tu persona tutora que escriba el correo guardado en este dispositivo.</Text>
              <Card>
                <Field label="Correo familiar local" value={gateEmail} onChangeText={setGateEmail} placeholder="Correo de la persona tutora" keyboardType="email-address" autoCapitalize="none" maxLength={100} />
                <Text style={styles.helperText}>Esta comprobación local es solo una barrera de prototipo; no sustituye una autenticación segura.</Text>
                {!!formError && <Text accessibilityRole="alert" style={styles.errorText}>{formError}</Text>}
                <Button title="Continuar como tutor" onPress={enterTutorSpace} />
                <Button title="Volver al espacio infantil" tone="outline" onPress={() => { setShowTutorGate(false); setGateEmail(''); setFormError(''); }} />
              </Card>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </PaletteContext.Provider>
    );
  }

  return (
    <PaletteContext.Provider value={palette}>
      <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={styles.appShell}>
        <View style={styles.topBar}>
          <View style={styles.brandSmallWrap}>
            <Text style={styles.brandSmall}>🛡️ Warrior Kids</Text>
            <Text style={styles.helperText}>{role === 'child' ? `${currentChild.avatar} ${currentChild.name}` : 'Espacio de la persona tutora'}</Text>
          </View>
          <View style={styles.roleToggle}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: role === 'child' }} onPress={() => { setRole('child'); changePage('inicio'); }} style={[styles.roleOption, role === 'child' && styles.roleSelected]}>
              <Text style={[styles.roleText, role === 'child' && styles.roleTextSelected]}>Peque</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: role === 'tutor' }} onPress={() => { if (role === 'child') { setFormError(''); setShowTutorGate(true); } else { changePage('familia'); } }} style={[styles.roleOption, role === 'tutor' && styles.roleSelected]}>
              <Text style={[styles.roleText, role === 'tutor' && styles.roleTextSelected]}>Tutor</Text>
            </Pressable>
          </View>
        </View>
        {role === 'tutor' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profileSelector}>
            {data.children.map((child) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Seleccionar perfil ${child.name}`}
              accessibilityState={{ selected: child.id === currentChild.id }}
              key={child.id}
              onPress={() => updateData((current) => ({ ...current, selectedChildId: child.id }))}
              style={[styles.profileChip, child.id === currentChild.id && styles.profileChipSelected]}
            >
              <Text>{child.avatar}</Text>
              <Text style={[styles.profileChipText, child.id === currentChild.id && styles.profileChipTextSelected]}>{child.name}</Text>
            </Pressable>
            ))}
          </ScrollView>
        ) : <View style={styles.childIdentity} />}
        <View style={styles.pageHeading}>
          <Text style={styles.pageTitle}>{pageTitle}</Text>
          {role === 'child' && <Text style={styles.pointsPill}>⭐ {currentChild.points} pts</Text>}
        </View>
        {!!storageError && (
          <Text accessibilityRole="alert" style={styles.storageError}>{storageError}</Text>
        )}
        <ScrollView
          contentContainerStyle={styles.pageContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderPage()}
          <Text style={styles.localNote}>Guardado solo en este dispositivo · Sincronización en la nube pendiente</Text>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRow}>
          {visiblePages.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: page === option.id }}
              key={option.id}
              onPress={() => changePage(option.id)}
              style={[styles.navItem, page === option.id && styles.navItemSelected]}
            >
              <Text style={styles.navEmoji}>{option.emoji}</Text>
              <Text style={[styles.navLabel, page === option.id && styles.navLabelSelected]}>{option.label}</Text>
              {option.id === 'familia' && pendingCount > 0 && role === 'tutor' ? <Text style={styles.pendingBadge}>{pendingCount}</Text> : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </PaletteContext.Provider>
  );
}

const createStyles = (COLORS: AppPalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cream },
  flex: { flex: 1 },
  appShell: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  gateContent: { flex: 1, justifyContent: 'center', padding: 22, gap: 12 },
  childIdentity: { height: 8 },
  authContent: { flexGrow: 1, padding: 22, justifyContent: 'center', gap: 10 },
  pageContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 18, gap: 12 },
  brandMark: { fontSize: 54, textAlign: 'center' },
  brand: { color: COLORS.greenDark, fontSize: 31, fontWeight: '900', textAlign: 'center', letterSpacing: -0.6 },
  tagline: { color: COLORS.muted, fontSize: 15, textAlign: 'center', marginBottom: 10 },
  welcomeCard: { padding: 21 },
  heroTitle: { color: COLORS.ink, fontSize: 23, fontWeight: '900', lineHeight: 30, marginBottom: 7 },
  subtitle: { color: COLORS.muted, fontSize: 16, textAlign: 'center', marginBottom: 18 },
  body: { color: COLORS.ink, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  helperText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  footerNote: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 14, marginTop: 8 },
  card: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 19, padding: 16, gap: 10 },
  cardTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', lineHeight: 23 },
  stack: { gap: 12 },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  input: { minHeight: 50, borderColor: COLORS.border, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, color: COLORS.ink, fontSize: 16, backgroundColor: COLORS.white },
  button: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.green },
  buttonCompact: { minHeight: 42, paddingVertical: 9 },
  button_primary: { backgroundColor: COLORS.green },
  button_soft: { backgroundColor: COLORS.mint },
  button_outline: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.green },
  button_warning: { backgroundColor: COLORS.peach },
  buttonDisabled: { opacity: 0.72 },
  buttonText: { color: COLORS.white, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  softButtonText: { color: COLORS.greenDark },
  pressed: { opacity: 0.78 },
  errorText: { color: COLORS.red, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  successText: { color: COLORS.greenDark, fontSize: 14, fontWeight: '700' },
  notice: { backgroundColor: COLORS.cream, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EBDCBA', marginBottom: 8 },
  noticeText: { color: '#63512B', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  fieldHint: { color: COLORS.muted, fontSize: 12 },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  avatarChoice: { width: 48, height: 48, borderRadius: 15, backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  avatarChoiceSelected: { borderColor: COLORS.green, borderWidth: 2, backgroundColor: COLORS.mint },
  avatarEmoji: { fontSize: 27 },
  themeRow: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  themeChoice: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.white },
  themeChoiceSelected: { backgroundColor: COLORS.mint, borderColor: COLORS.green, borderWidth: 2 },
  themeEmoji: { fontSize: 23 },
  themeChoiceText: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  themeChoiceTextSelected: { color: COLORS.greenDark },
  topBar: { minHeight: 68, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  brandSmallWrap: { gap: 2 },
  brandSmall: { color: COLORS.greenDark, fontSize: 17, fontWeight: '900' },
  roleToggle: { flexDirection: 'row', padding: 3, borderRadius: 14, backgroundColor: COLORS.mint },
  roleOption: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11 },
  roleSelected: { backgroundColor: COLORS.green },
  roleText: { color: COLORS.muted, fontSize: 13, fontWeight: '800' },
  roleTextSelected: { color: COLORS.white },
  profileSelector: { paddingHorizontal: 14, paddingBottom: 8, gap: 8 },
  profileChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 8 },
  profileChipSelected: { backgroundColor: COLORS.mint, borderColor: COLORS.green },
  profileChipText: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  profileChipTextSelected: { color: COLORS.greenDark },
  pageHeading: { paddingHorizontal: 17, paddingTop: 3, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { color: COLORS.ink, fontSize: 24, fontWeight: '900' },
  pointsPill: { color: COLORS.greenDark, fontSize: 13, fontWeight: '800', backgroundColor: COLORS.mint, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 },
  localNote: { color: COLORS.muted, fontSize: 11, textAlign: 'center', lineHeight: 17, paddingTop: 8 },
  navRow: { borderTopColor: COLORS.border, borderTopWidth: 1, backgroundColor: COLORS.white, paddingHorizontal: 9, paddingVertical: 7, gap: 6, alignItems: 'center' },
  navItem: { minWidth: 66, minHeight: 56, paddingHorizontal: 9, borderRadius: 13, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  navItemSelected: { backgroundColor: COLORS.mint },
  navEmoji: { fontSize: 19 },
  navLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  navLabelSelected: { color: COLORS.greenDark },
  pendingBadge: { position: 'absolute', right: 2, top: 0, minWidth: 18, height: 18, textAlign: 'center', color: COLORS.white, backgroundColor: '#C35A53', borderRadius: 9, overflow: 'hidden', fontSize: 11, fontWeight: '900', paddingTop: 2 },
  kidHero: { backgroundColor: COLORS.mint, borderColor: COLORS.border, padding: 20 },
  dailyChallenge: { backgroundColor: COLORS.cream, borderColor: '#EBDCBA' },
  eyebrow: { color: COLORS.greenDark, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  challengeLabel: { color: COLORS.greenDark, fontSize: 11, fontWeight: '900', letterSpacing: 1, paddingTop: 8 },
  sectionHeader: { gap: 2, paddingHorizontal: 2, paddingTop: 4 },
  sectionTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', marginTop: 4, marginBottom: 2 },
  activityCardCompact: { padding: 13 },
  activityHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  activityEmoji: { fontSize: 32 },
  waterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 17, paddingTop: 7 },
  waterNumber: { color: COLORS.greenDark, fontSize: 25, fontWeight: '900', minWidth: 32, textAlign: 'center' },
  foodRow: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: COLORS.border, paddingVertical: 8 },
  foodEmoji: { fontSize: 24 },
  foodCount: { color: COLORS.greenDark, fontSize: 15, fontWeight: '800' },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  moodChoice: { minWidth: 61, alignItems: 'center', borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, padding: 8, backgroundColor: COLORS.white },
  moodChoiceSelected: { borderWidth: 2, borderColor: COLORS.green, backgroundColor: COLORS.mint },
  moodEmoji: { fontSize: 25, marginBottom: 3 },
  progressHero: { backgroundColor: COLORS.lavender, borderColor: '#D9D1F0', padding: 20 },
  progressTrack: { height: 14, borderRadius: 8, backgroundColor: COLORS.lavender, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.secondary, borderRadius: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: COLORS.border },
  badgeLocked: { opacity: 0.5 },
  badgeEmoji: { fontSize: 29 },
  familySummary: { backgroundColor: COLORS.mint, borderColor: COLORS.border },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: { flex: 1, minWidth: 86, backgroundColor: COLORS.white, padding: 10, borderRadius: 12, gap: 4 },
  statNumber: { color: COLORS.greenDark, fontSize: 21, fontWeight: '900' },
  buttonRow: { gap: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10 },
  profileRowSelected: { borderColor: COLORS.green, backgroundColor: COLORS.mint },
  profileAvatar: { fontSize: 26 },
  recipeIntro: { backgroundColor: COLORS.mint },
  recipePress: { borderRadius: 19 },
  recipeCard: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  linkText: { color: COLORS.green, fontWeight: '800', fontSize: 13, marginTop: 7 },
  bullet: { color: COLORS.ink, fontSize: 15, lineHeight: 23 },
  dayRow: { gap: 7, paddingVertical: 12 },
  dayChip: { minWidth: 48, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: COLORS.mint, borderRadius: 12 },
  dayChipSelected: { backgroundColor: COLORS.green },
  dayText: { color: COLORS.ink, fontSize: 13, fontWeight: '800' },
  dayTextSelected: { color: COLORS.white },
  plannedMeal: { backgroundColor: COLORS.mint, borderRadius: 13, padding: 12, gap: 8 },
  limitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  limitChip: { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.white },
  limitChipSelected: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  storageError: { marginHorizontal: 16, marginBottom: 8, color: COLORS.red, fontSize: 12, fontWeight: '700', lineHeight: 18 },
});

function usePaletteStyles() {
  const palette = useContext(PaletteContext);
  return useMemo(() => createStyles(palette), [palette]);
}
