import { createContext, useContext, type ReactNode } from 'react';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Icon as PhosphorIcon, IconWeight } from 'phosphor-react-native';
// Cada ícono se importa por su ruta para no meter los ~1,500 de Phosphor al bundle.
import { ArrowLeftIcon } from 'phosphor-react-native/src/icons/ArrowLeft';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { BabyIcon } from 'phosphor-react-native/src/icons/Baby';
import { BarbellIcon } from 'phosphor-react-native/src/icons/Barbell';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { BowlFoodIcon } from 'phosphor-react-native/src/icons/BowlFood';
import { BreadIcon } from 'phosphor-react-native/src/icons/Bread';
import { CalendarBlankIcon } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CaretDoubleLeftIcon } from 'phosphor-react-native/src/icons/CaretDoubleLeft';
import { CaretDoubleRightIcon } from 'phosphor-react-native/src/icons/CaretDoubleRight';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { LightningIcon } from 'phosphor-react-native/src/icons/Lightning';
import { FireIcon } from 'phosphor-react-native/src/icons/Fire';
import { CloudRainIcon } from 'phosphor-react-native/src/icons/CloudRain';
import { MoonStarsIcon } from 'phosphor-react-native/src/icons/MoonStars';
import { ConfettiIcon } from 'phosphor-react-native/src/icons/Confetti';
import { SunIcon } from 'phosphor-react-native/src/icons/Sun';
import { CalendarIcon } from 'phosphor-react-native/src/icons/Calendar';
import { CameraIcon } from 'phosphor-react-native/src/icons/Camera';
import { CarrotIcon } from 'phosphor-react-native/src/icons/Carrot';
import { ChartBarIcon } from 'phosphor-react-native/src/icons/ChartBar';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { DropIcon } from 'phosphor-react-native/src/icons/Drop';
import { EggIcon } from 'phosphor-react-native/src/icons/Egg';
import { ForkKnifeIcon } from 'phosphor-react-native/src/icons/ForkKnife';
import { GearIcon } from 'phosphor-react-native/src/icons/Gear';
import { GrainsIcon } from 'phosphor-react-native/src/icons/Grains';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { ImageIcon } from 'phosphor-react-native/src/icons/Image';
import { LeafIcon } from 'phosphor-react-native/src/icons/Leaf';
import { LinkIcon } from 'phosphor-react-native/src/icons/Link';
import { LockIcon } from 'phosphor-react-native/src/icons/Lock';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
import { MusicNoteIcon } from 'phosphor-react-native/src/icons/MusicNote';
import { PackageIcon } from 'phosphor-react-native/src/icons/Package';
import { PaletteIcon } from 'phosphor-react-native/src/icons/Palette';
import { PaperPlaneRightIcon } from 'phosphor-react-native/src/icons/PaperPlaneRight';
import { PauseIcon } from 'phosphor-react-native/src/icons/Pause';
import { PawPrintIcon } from 'phosphor-react-native/src/icons/PawPrint';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PersonSimpleRunIcon } from 'phosphor-react-native/src/icons/PersonSimpleRun';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { QuestionIcon } from 'phosphor-react-native/src/icons/Question';
import { RepeatIcon } from 'phosphor-react-native/src/icons/Repeat';
import { RulerIcon } from 'phosphor-react-native/src/icons/Ruler';
import { ScalesIcon } from 'phosphor-react-native/src/icons/Scales';
import { ShieldIcon } from 'phosphor-react-native/src/icons/Shield';
import { SmileyIcon } from 'phosphor-react-native/src/icons/Smiley';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { TreeIcon } from 'phosphor-react-native/src/icons/Tree';
import { TrophyIcon } from 'phosphor-react-native/src/icons/Trophy';
import { UserCircleIcon } from 'phosphor-react-native/src/icons/UserCircle';
import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { WavesIcon } from 'phosphor-react-native/src/icons/Waves';
import { XIcon } from 'phosphor-react-native/src/icons/X';

import { AVATAR_BACKGROUNDS, AvatarFigure } from './avatar';
import { AnimatedPress } from './motion';
import { COLORS, colorsFor, useColors } from './constants';
import { BORDER, RADIUS, SHADOW, SPACE, tint, sharedFor, themesFor, type ThemeMode, useShared, useThemeMode } from './tokens';

export type AppIconName =
  | 'home'
  | 'recipes'
  | 'menu'
  | 'settings'
  | 'help'
  | 'achievements'
  | 'points'
  | 'water'
  | 'food'
  | 'mood'
  | 'sleep'
  | 'activity'
  | 'avatar'
  | 'profile'
  | 'tutor'
  | 'child'
  | 'add'
  | 'edit'
  | 'link'
  | 'pin'
  | 'logout'
  | 'next'
  | 'camera'
  | 'gallery'
  | 'send'
  | 'save'
  | 'close'
  | 'warning'
  | 'search'
  | 'check'
  | 'scale'
  | 'height'
  | 'heart'
  | 'sparkles'
  | 'leaf'
  | 'music'
  | 'paw'
  | 'forest'
  | 'dumbbell'
  | 'waves'
  | 'pause'
  | 'repeat'
  | 'lock'
  | 'chest'
  | 'chart'
  | 'bell'
  | 'shield'
  | 'cereal'
  | 'legume'
  | 'produce'
  | 'animal'
  | 'sun'
  | 'confetti'
  | 'moonStars'
  | 'cloudRain'
  | 'fire'
  | 'lightning'
  | 'calendar'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronsLeft'
  | 'chevronsRight';

// Íconos Phosphor: duotone en el modo Niñez y regular en el modo Tutor (ver IconWeightContext).
const ICONS: Record<AppIconName, PhosphorIcon> = {
  home: HouseIcon,
  recipes: ForkKnifeIcon,
  menu: CalendarIcon,
  settings: GearIcon,
  help: QuestionIcon,
  achievements: TrophyIcon,
  points: StarIcon,
  water: DropIcon,
  food: BowlFoodIcon,
  mood: SmileyIcon,
  sleep: MoonIcon,
  activity: PersonSimpleRunIcon,
  avatar: PaletteIcon,
  profile: UserCircleIcon,
  tutor: UsersThreeIcon,
  child: BabyIcon,
  add: PlusIcon,
  edit: PencilSimpleIcon,
  link: LinkIcon,
  pin: LockIcon,
  logout: ArrowLeftIcon,
  next: ArrowRightIcon,
  camera: CameraIcon,
  gallery: ImageIcon,
  send: PaperPlaneRightIcon,
  save: CheckIcon,
  close: XIcon,
  warning: WarningIcon,
  search: MagnifyingGlassIcon,
  check: CheckCircleIcon,
  scale: ScalesIcon,
  height: RulerIcon,
  heart: HeartIcon,
  sparkles: SparkleIcon,
  leaf: LeafIcon,
  music: MusicNoteIcon,
  paw: PawPrintIcon,
  forest: TreeIcon,
  dumbbell: BarbellIcon,
  waves: WavesIcon,
  pause: PauseIcon,
  repeat: RepeatIcon,
  lock: LockIcon,
  chest: PackageIcon,
  chart: ChartBarIcon,
  bell: BellIcon,
  shield: ShieldIcon,
  cereal: BreadIcon,
  legume: GrainsIcon,
  produce: CarrotIcon,
  animal: EggIcon,
  sun: SunIcon,
  confetti: ConfettiIcon,
  moonStars: MoonStarsIcon,
  cloudRain: CloudRainIcon,
  fire: FireIcon,
  lightning: LightningIcon,
  calendar: CalendarBlankIcon,
  chevronLeft: CaretLeftIcon,
  chevronRight: CaretRightIcon,
  chevronsLeft: CaretDoubleLeftIcon,
  chevronsRight: CaretDoubleRightIcon,
};

/** Estilo de los íconos de la pantalla: 'duotone' en Niñez, 'regular' en Tutor. */
export const IconWeightContext = createContext<IconWeight>('regular');

const EMOJI_ICON_PREFIXES: [string, AppIconName][] = [
  ['⚠️', 'warning'],
  ['🌙', 'sleep'],
  ['🌤️', 'menu'],
  ['☀️', 'menu'],
  ['🌱', 'leaf'],
  ['⭐', 'points'],
  ['🏅', 'achievements'],
  ['💧', 'water'],
  ['🥗', 'food'],
  ['🍎', 'food'],
  ['🌽', 'food'],
  ['🫘', 'food'],
  ['🥚', 'food'],
  ['🥛', 'food'],
  ['🥜', 'food'],
  ['🌰', 'food'],
  ['🐟', 'food'],
  ['🦐', 'food'],
  ['🌾', 'food'],
  ['🍓', 'food'],
  ['🍗', 'food'],
  ['🥩', 'food'],
  ['🥓', 'food'],
  ['🥦', 'food'],
  ['🥬', 'food'],
  ['🥕', 'food'],
  ['🍅', 'food'],
  ['🧅', 'food'],
  ['🍄', 'food'],
  ['🥑', 'food'],
  ['🌶️', 'food'],
  ['⚖️', 'scale'],
  ['📏', 'height'],
  ['🔎', 'search'],
  ['🔗', 'link'],
];

/**
 * Ícono de la app (Phosphor). Sin `label` es decorativo y queda oculto para lectores de pantalla
 * (el texto de al lado ya lo describe); con `label` se anuncia como imagen.
 */
export function Icon({
  name,
  size = 18,
  color = COLORS.blue,
  label,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
  label?: string;
}) {
  const weight = useContext(IconWeightContext);
  const Glyph = ICONS[name];
  const glyph = <Glyph size={size} color={color} weight={weight} duotoneColor={color} />;
  if (label) {
    return <View accessible accessibilityRole="image" accessibilityLabel={label}>{glyph}</View>;
  }
  return (
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {glyph}
    </View>
  );
}

export function AvatarIllustration({
  theme,
  selection,
  size = 'large',
}: {
  theme: 'nina' | 'nino';
  selection?: { piel: number; cabello: number; ropa: number; accesorio: number; fondo: number };
  size?: 'large' | 'small';
}) {
  const fallback = { piel: 0, cabello: theme === 'nina' ? 1 : 0, ropa: theme === 'nina' ? 0 : 2, accesorio: 0, fondo: theme === 'nina' ? 0 : 2 };
  const current = selection ?? fallback;
  const background = AVATAR_BACKGROUNDS[current.fondo] ?? AVATAR_BACKGROUNDS[0];
  const dimension = size === 'small' ? 52 : 88;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Avatar ilustrado"
      style={{
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
        alignItems: 'center',
        justifyContent: 'flex-end',
        backgroundColor: background,
        borderWidth: 2,
        borderColor: theme === 'nina' ? '#F4A0B8' : '#8BBFE8',
        overflow: 'hidden',
      }}
    >
      <AvatarFigure selection={current} variant="bust" width={dimension - 4} />
    </View>
  );
}

export const TYPE = {
  display: 'Fredoka_700Bold',
  heading: 'Fredoka_600SemiBold',
  body: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

// Estilos en versión clara y oscura; los componentes toman la del modo actual.
function createUiStyles(mode: ThemeMode) {
  const COLORS = colorsFor(mode);
  const SHARED = sharedFor(mode);
  const THEMES = themesFor(mode);
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  shell: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: COLORS.background },
  authRoot: { flex: 1, backgroundColor: COLORS.navy, justifyContent: 'center' },
  authScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: SPACE[20], paddingVertical: SPACE[36] },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: SPACE[12], marginBottom: SPACE[24] },
  brandMark: { width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { color: COLORS.white, fontFamily: TYPE.display, fontSize: 25, lineHeight: 30 },
  brandCaption: { color: tint(COLORS.white, 0.66), fontFamily: TYPE.medium, fontSize: 10, letterSpacing: 1.4, marginTop: SPACE[4] },
  authTitle: { color: COLORS.white, fontFamily: TYPE.display, fontSize: 32, lineHeight: 38 },
  authSubtitle: { color: tint(COLORS.white, 0.72), fontFamily: TYPE.body, fontSize: 13, lineHeight: 20, marginTop: SPACE[8], marginBottom: SPACE[20] },
  authCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.tarjeta, padding: SPACE[16], gap: SPACE[14] },
  authNotice: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: SPACE[16] },
  roleRow: { flexDirection: 'row', backgroundColor: SHARED.apagada, padding: SPACE[4], borderRadius: RADIUS.md, gap: SPACE[4] },
  roleChoice: { flex: 1, minHeight: 44, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: SPACE[4] },
  roleChoiceActive: { backgroundColor: COLORS.white, shadowColor: COLORS.navy, shadowOpacity: 0.09, shadowRadius: 8, elevation: 2 },
  roleChoiceText: { color: COLORS.muted, fontFamily: TYPE.medium, fontSize: 12 },
  roleChoiceTextActive: { color: COLORS.ink, fontFamily: TYPE.bold },
  // Va sobre un recuadro de color, también en tema oscuro.
  roleChoiceTextOnColor: { color: '#000000', fontFamily: TYPE.bold },
  inputGroup: { gap: SPACE[4] },
  inputLabel: { color: COLORS.ink, fontFamily: TYPE.bold, fontSize: 13 },
  input: { minHeight: 48, borderRadius: RADIUS.sm, borderWidth: BORDER.fino, borderColor: COLORS.line, backgroundColor: COLORS.white, paddingHorizontal: SPACE[14], color: COLORS.ink, fontFamily: TYPE.body, fontSize: 13 },
  inputError: { borderColor: SHARED.error },
  fieldHint: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 12, lineHeight: 17 },
  errorText: { color: SHARED.error, fontFamily: TYPE.medium, fontSize: 13, lineHeight: 18 },
  button: { minHeight: 44, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE[16], paddingVertical: SPACE[12], flexDirection: 'row', gap: SPACE[8] },
  buttonPrimary: { backgroundColor: COLORS.blue },
  buttonSecondary: { backgroundColor: COLORS.paleBlue, borderWidth: BORDER.fino, borderColor: SHARED.infoBorde },
  buttonOutline: { backgroundColor: COLORS.white, borderWidth: BORDER.fino, borderColor: COLORS.line },
  buttonDanger: { backgroundColor: SHARED.errorFondo, borderWidth: BORDER.fino, borderColor: SHARED.errorBorde },
  buttonSuccess: { backgroundColor: COLORS.green },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: SHARED.sobreAcento, fontFamily: TYPE.bold, fontSize: 13, textAlign: 'center' },
  buttonTextSecondary: { color: COLORS.blueDeep },
  buttonTextOutline: { color: COLORS.ink },
  buttonTextDanger: { color: COLORS.error },
  buttonSmall: { minHeight: 44, minWidth: 44, borderRadius: RADIUS.sm, paddingVertical: SPACE[4], paddingHorizontal: SPACE[8] },
  buttonSmallText: { fontSize: 12 },
  linkButton: { minHeight: 44, paddingVertical: SPACE[8], alignItems: 'center', justifyContent: 'center' },
  linkText: { color: COLORS.blue, fontFamily: TYPE.bold, fontSize: 13 },
  profileStripScroll: { flexGrow: 0, flexShrink: 0, backgroundColor: COLORS.white, borderBottomWidth: BORDER.fino, borderBottomColor: COLORS.line },
  profileStrip: { paddingHorizontal: SPACE[16], paddingTop: SPACE[8], paddingBottom: SPACE[8], flexDirection: 'row', gap: SPACE[8] },
  profileChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: SPACE[4], paddingVertical: SPACE[8], paddingHorizontal: SPACE[12], borderRadius: RADIUS.md, borderWidth: BORDER.fino, borderColor: COLORS.line, backgroundColor: COLORS.white },
  profileChipActive: { borderColor: COLORS.blue, backgroundColor: COLORS.paleBlue },
  profileChipText: { color: COLORS.ink, fontFamily: TYPE.medium, fontSize: 12 },
  content: { paddingHorizontal: SPACE[16], paddingTop: SPACE[16], paddingBottom: SPACE[24], gap: SPACE[12] },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACE[4] },
  sectionTitle: { color: COLORS.ink, fontFamily: TYPE.heading, fontSize: 17, lineHeight: 22 },
  sectionHint: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 12, lineHeight: 17, marginTop: SPACE[4] },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.habito, padding: SPACE[16], borderWidth: BORDER.fino, borderColor: COLORS.line, gap: SPACE[12], ...SHADOW.habito },
  cardTight: { padding: SPACE[12], gap: SPACE[8] },
  cardTitle: { color: COLORS.ink, fontFamily: TYPE.heading, fontSize: 15, lineHeight: 20 },
  body: { color: COLORS.ink, fontFamily: TYPE.body, fontSize: 12, lineHeight: 19 },
  muted: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 12, lineHeight: 18 },
  horizontal: { flexDirection: 'row', alignItems: 'center', gap: SPACE[12] },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE[8] },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[8] },
  pill: { alignSelf: 'flex-start', borderRadius: RADIUS.pildora, paddingHorizontal: SPACE[8], paddingVertical: SPACE[4], flexDirection: 'row', alignItems: 'center', gap: SPACE[4] },
  pillText: { color: COLORS.ink, fontFamily: TYPE.bold, fontSize: 12 },
  meterTrack: { height: 8, backgroundColor: SHARED.apagada, borderRadius: RADIUS.pildora, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: RADIUS.pildora },
  divider: { height: BORDER.fino, backgroundColor: COLORS.line, marginVertical: SPACE[4] },
  emptyState: { alignItems: 'center', paddingVertical: SPACE[20], gap: SPACE[8] },
  banner: { borderRadius: RADIUS.sm, padding: SPACE[12], backgroundColor: COLORS.paleBlue, borderWidth: BORDER.fino, borderColor: SHARED.infoBorde, gap: SPACE[4] },
  bannerText: { color: COLORS.blueDeep, fontFamily: TYPE.medium, fontSize: 12, lineHeight: 18 },
  overlay: { flex: 1, backgroundColor: SHARED.fondoModal, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.hero, borderTopRightRadius: RADIUS.hero, padding: SPACE[20], paddingBottom: SPACE[24], maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE[12] },
  modalTitle: { color: COLORS.ink, fontFamily: TYPE.heading, fontSize: 19, flex: 1 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.pildora, backgroundColor: COLORS.white },
  imagePreview: { width: '100%', height: 190, borderRadius: RADIUS.sm, backgroundColor: SHARED.apagada },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE[12], paddingVertical: SPACE[8], borderBottomWidth: BORDER.fino, borderBottomColor: COLORS.line },
  profileAvatar: { width: 38, height: 38, borderRadius: RADIUS.pildora, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paleBlue },
  notice: { padding: SPACE[12], borderRadius: RADIUS.sm, backgroundColor: COLORS.paleOrange, borderWidth: BORDER.fino, borderColor: tint(THEMES.tutor.acento, 0.3) },
  noticeText: { color: THEMES.tutor.texto, fontFamily: TYPE.medium, fontSize: 12, lineHeight: 18 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE[12], padding: SPACE[24] },
  footer: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 9, textAlign: 'center', lineHeight: 14, marginTop: SPACE[4] },
  });
}
export const UI_STYLES = { light: createUiStyles('light'), dark: createUiStyles('dark'), darkNina: createUiStyles('darkNina') };
export function useUiStyles() {
  return UI_STYLES[useThemeMode()];
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = UI_STYLES[useThemeMode()];
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({
  label,
  style,
  inputStyle,
  error,
  hint,
  ...props
}: TextInputProps & {
  label: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  error?: string;
  hint?: string;
}) {
  const styles = UI_STYLES[useThemeMode()];
  const SHARED = useShared();
  return (
    <View style={[styles.inputGroup, style]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={SHARED.textoSecundario}
        style={[styles.input, error && styles.inputError, inputStyle]}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  small = false,
  disabled = false,
  icon,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  small?: boolean;
  disabled?: boolean;
  icon?: AppIconName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const SHARED = useShared();
  const styles = UI_STYLES[useThemeMode()];
  const COLORS = useColors();
  const variantStyle = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    outline: styles.buttonOutline,
    danger: styles.buttonDanger,
    success: styles.buttonSuccess,
  }[variant];
  const textStyle = {
    primary: styles.buttonText,
    secondary: styles.buttonTextSecondary,
    outline: styles.buttonTextOutline,
    danger: styles.buttonTextDanger,
    success: styles.buttonText,
  }[variant];
  const iconColor = variant === 'primary' || variant === 'success'
    ? SHARED.sobreAcento
    : variant === 'secondary'
      ? COLORS.blueDeep
      : variant === 'danger'
        ? COLORS.error
        : COLORS.ink;

  return (
    <AnimatedPress
      label={accessibilityLabel ?? title}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        variantStyle,
        small && styles.buttonSmall,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={small ? 15 : 18} color={iconColor} /> : null}
      <Text style={[textStyle, small && styles.buttonSmallText]}>{title}</Text>
    </AnimatedPress>
  );
}

export function Tag({
  title,
  selected = false,
  color = COLORS.blue,
  onPress,
  icon,
}: {
  title: string;
  selected?: boolean;
  color?: string;
  onPress?: () => void;
  icon?: AppIconName;
}) {
  const SHARED = useShared();
  const styles = UI_STYLES[useThemeMode()];
  const emojiPrefix = EMOJI_ICON_PREFIXES.find(([prefix]) => title.startsWith(prefix));
  const cleanTitle = emojiPrefix ? title.slice(emojiPrefix[0].length).trimStart() : title;
  const content = (
    <View style={styles.horizontal}>
      {emojiPrefix || icon ? (
        <Icon name={emojiPrefix?.[1] ?? icon ?? 'food'} size={13} color={selected ? SHARED.sobreAcento : color} />
      ) : null}
      <Text style={[styles.pillText, selected && { color: SHARED.sobreAcento }]}>{cleanTitle}</Text>
    </View>
  );
  const style = [
    styles.pill,
    { backgroundColor: selected ? color : `${color}18`, borderWidth: 1, borderColor: selected ? color : `${color}40` },
  ];
  return onPress ? (
    <Pressable accessibilityRole="button" aria-selected={selected} onPress={onPress} style={style}>
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const styles = UI_STYLES[useThemeMode()];
  return (
    <View style={styles.sectionRow}>
      <View style={styles.flex}>
        <Text role="heading" aria-level={2} style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionHint}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function ProgressMeter({
  value,
  max,
  color = COLORS.blue,
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const styles = UI_STYLES[useThemeMode()];
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <View style={styles.meterTrack}>
      <View style={[styles.meterFill, { width: `${percent}%`, backgroundColor: color }]} />
    </View>
  );
}
