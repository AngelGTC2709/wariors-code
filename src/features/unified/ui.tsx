import type { ReactNode } from 'react';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { COLORS } from './constants';

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
  | 'sparkles'
  | 'leaf';

const ICON_SYMBOLS = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  recipes: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  menu: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  help: { ios: 'questionmark.circle', android: 'help', web: 'help' },
  achievements: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' },
  points: { ios: 'star.fill', android: 'stars', web: 'stars' },
  water: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  food: { ios: 'leaf.fill', android: 'nutrition', web: 'nutrition' },
  mood: { ios: 'face.smiling', android: 'sentiment_satisfied', web: 'sentiment_satisfied' },
  sleep: { ios: 'bed.double.fill', android: 'bedtime', web: 'bedtime' },
  activity: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  avatar: { ios: 'paintpalette.fill', android: 'palette', web: 'palette' },
  profile: { ios: 'person.crop.circle.fill', android: 'face_3', web: 'face_3' },
  tutor: { ios: 'person.2.fill', android: 'family_restroom', web: 'family_restroom' },
  child: { ios: 'figure.child', android: 'child_care', web: 'child_care' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  link: { ios: 'link', android: 'link', web: 'link' },
  pin: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  logout: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' },
  next: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  gallery: { ios: 'photo', android: 'image', web: 'image' },
  send: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  save: { ios: 'checkmark', android: 'done', web: 'done' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  scale: { ios: 'scalemass.fill', android: 'scale', web: 'scale' },
  height: { ios: 'ruler', android: 'straighten', web: 'straighten' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  leaf: { ios: 'leaf.fill', android: 'nutrition', web: 'nutrition' },
} as const satisfies Record<AppIconName, SymbolViewProps['name']>;

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

export function Icon({
  name,
  size = 18,
  color = COLORS.blue,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
}) {
  return <SymbolView name={ICON_SYMBOLS[name]} size={size} tintColor={color} />;
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
  const scale = size === 'small' ? 0.62 : 1;
  const skinColors = ['#F8D5B8', '#E6B98E', '#C88C61', '#A96845', '#805137', '#57392E'];
  const hairColors = ['#6F4939', '#B45D3D', '#302B32', '#D6C49A', '#784AA8', '#1C1B20'];
  const clothingColors = ['#E66B9A', '#805AD5', '#2B6CB0', '#48A878', '#ED8936', '#344255'];
  const backgroundColors = ['#FFF0F5', '#F0FAF5', '#EAF4FF', '#F0EEFF', '#FFFBEA', '#F5F0FF'];
  const skin = skinColors[selection?.piel ?? 0] ?? skinColors[0];
  const hair = hairColors[selection?.cabello ?? 0] ?? hairColors[0];
  const clothing = clothingColors[selection?.ropa ?? (theme === 'nina' ? 0 : 2)] ?? clothingColors[0];
  const background = backgroundColors[selection?.fondo ?? (theme === 'nina' ? 0 : 2)] ?? backgroundColors[0];
  const dimension = size === 'small' ? 52 : 88;

  return (
    <View
      accessibilityLabel="Avatar ilustrado"
      style={{
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
        borderWidth: 2,
        borderColor: theme === 'nina' ? '#F4A0B8' : '#8BBFE8',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          bottom: -5 * scale,
          width: 52 * scale,
          height: 36 * scale,
          borderTopLeftRadius: 28 * scale,
          borderTopRightRadius: 28 * scale,
          backgroundColor: clothing,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 17 * scale,
          width: 8 * scale,
          height: 12 * scale,
          borderRadius: 6 * scale,
          backgroundColor: skin,
          left: 17 * scale,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 17 * scale,
          width: 8 * scale,
          height: 12 * scale,
          borderRadius: 6 * scale,
          backgroundColor: skin,
          right: 17 * scale,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 8 * scale,
          width: 41 * scale,
          height: 45 * scale,
          borderRadius: 22 * scale,
          backgroundColor: skin,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 7 * scale,
          width: 44 * scale,
          height: 23 * scale,
          borderTopLeftRadius: 24 * scale,
          borderTopRightRadius: 24 * scale,
          borderBottomRightRadius: 12 * scale,
          borderBottomLeftRadius: 12 * scale,
          backgroundColor: hair,
        }}
      />
      <View style={{ position: 'absolute', top: 33 * scale, flexDirection: 'row', gap: 12 * scale }}>
        <View style={{ width: 3 * scale, height: 3 * scale, borderRadius: 2 * scale, backgroundColor: '#302B32' }} />
        <View style={{ width: 3 * scale, height: 3 * scale, borderRadius: 2 * scale, backgroundColor: '#302B32' }} />
      </View>
      <View
        style={{
          position: 'absolute',
          top: 42 * scale,
          width: 9 * scale,
          height: 4 * scale,
          borderBottomWidth: 1.5 * scale,
          borderColor: '#9B514D',
          borderRadius: 8 * scale,
        }}
      />
      {selection ? (
        <View
          style={{
            position: 'absolute',
            right: 8 * scale,
            top: 7 * scale,
            width: 10 * scale,
            height: 10 * scale,
            borderRadius: 5 * scale,
            backgroundColor: theme === 'nina' ? COLORS.pink : COLORS.yellow,
          }}
        />
      ) : null}
    </View>
  );
}

export const TYPE = {
  display: 'Fredoka_700Bold',
  heading: 'Fredoka_600SemiBold',
  body: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  page: { flex: 1, backgroundColor: COLORS.background },
  shell: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: COLORS.background },
  authRoot: { flex: 1, backgroundColor: COLORS.navy, justifyContent: 'center' },
  authScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 36 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 26 },
  brandMark: { width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { color: COLORS.white, fontFamily: TYPE.display, fontSize: 25, lineHeight: 30 },
  brandCaption: { color: '#A8B4C7', fontFamily: TYPE.medium, fontSize: 10, letterSpacing: 1.4, marginTop: 2 },
  authTitle: { color: COLORS.white, fontFamily: TYPE.display, fontSize: 32, lineHeight: 38 },
  authSubtitle: { color: '#B8C2D3', fontFamily: TYPE.body, fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 22 },
  authCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 18, gap: 14 },
  authNotice: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 15 },
  roleRow: { flexDirection: 'row', backgroundColor: '#EDF2F7', padding: 4, borderRadius: 17, gap: 4 },
  roleChoice: { flex: 1, minHeight: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  roleChoiceActive: { backgroundColor: COLORS.white, shadowColor: COLORS.navy, shadowOpacity: 0.09, shadowRadius: 8, elevation: 2 },
  roleChoiceText: { color: COLORS.muted, fontFamily: TYPE.medium, fontSize: 12 },
  roleChoiceTextActive: { color: COLORS.ink, fontFamily: TYPE.bold },
  inputGroup: { gap: 6 },
  inputLabel: { color: COLORS.ink, fontFamily: TYPE.bold, fontSize: 11 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, paddingHorizontal: 13, color: COLORS.ink, fontFamily: TYPE.body, fontSize: 13 },
  inputFocused: { borderColor: COLORS.blue },
  inputError: { borderColor: COLORS.error },
  fieldHint: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 10, lineHeight: 15 },
  errorText: { color: COLORS.error, fontFamily: TYPE.medium, fontSize: 11, lineHeight: 16 },
  button: { minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', gap: 8 },
  buttonPrimary: { backgroundColor: COLORS.blue },
  buttonSecondary: { backgroundColor: COLORS.paleBlue, borderWidth: 1, borderColor: '#C6D9F0' },
  buttonOutline: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  buttonDanger: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FED7D7' },
  buttonSuccess: { backgroundColor: COLORS.green },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  buttonText: { color: COLORS.white, fontFamily: TYPE.bold, fontSize: 12, textAlign: 'center' },
  buttonTextSecondary: { color: COLORS.blueDeep },
  buttonTextOutline: { color: COLORS.ink },
  buttonTextDanger: { color: COLORS.error },
  buttonSmall: { minHeight: 34, borderRadius: 11, paddingVertical: 7, paddingHorizontal: 10 },
  buttonSmallText: { fontSize: 10 },
  linkButton: { paddingVertical: 8, alignItems: 'center' },
  linkText: { color: COLORS.blue, fontFamily: TYPE.bold, fontSize: 11 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  headerMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.paleBlue, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.ink, fontFamily: TYPE.heading, fontSize: 15 },
  headerSub: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 9, marginTop: 1 },
  roleSwitch: { flexDirection: 'row', backgroundColor: '#EDF2F7', padding: 3, borderRadius: 13 },
  roleSwitchItem: { minWidth: 58, minHeight: 33, paddingHorizontal: 7, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roleSwitchActive: { backgroundColor: COLORS.white, shadowColor: COLORS.navy, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  roleSwitchText: { color: COLORS.muted, fontFamily: TYPE.medium, fontSize: 10 },
  roleSwitchTextActive: { color: COLORS.blueDeep, fontFamily: TYPE.bold },
  profileStrip: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingTop: 9, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line, flexDirection: 'row', gap: 8 },
  profileChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white },
  profileChipActive: { borderColor: COLORS.blue, backgroundColor: COLORS.paleBlue },
  profileChipText: { color: COLORS.ink, fontFamily: TYPE.medium, fontSize: 10 },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 22, gap: 13 },
  pageIntro: { marginBottom: 2 },
  eyebrow: { color: COLORS.blue, fontFamily: TYPE.extraBold, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: COLORS.ink, fontFamily: TYPE.display, fontSize: 27, lineHeight: 32, marginTop: 3 },
  subtitle: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { color: COLORS.ink, fontFamily: TYPE.heading, fontSize: 17, lineHeight: 22 },
  sectionHint: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 10, lineHeight: 15, marginTop: 2 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: COLORS.line, gap: 10, shadowColor: '#203047', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.035, shadowRadius: 10, elevation: 1 },
  cardTight: { padding: 12, gap: 8 },
  cardTitle: { color: COLORS.ink, fontFamily: TYPE.heading, fontSize: 15, lineHeight: 20 },
  body: { color: COLORS.ink, fontFamily: TYPE.body, fontSize: 12, lineHeight: 19 },
  muted: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 10, lineHeight: 16 },
  horizontal: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill: { alignSelf: 'flex-start', borderRadius: 30, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  pillText: { color: COLORS.ink, fontFamily: TYPE.bold, fontSize: 9 },
  tabRow: { flexDirection: 'row', gap: 7, paddingVertical: 3 },
  tabChip: { borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  tabChipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  tabChipText: { color: COLORS.muted, fontFamily: TYPE.medium, fontSize: 10 },
  tabChipTextActive: { color: COLORS.white, fontFamily: TYPE.bold },
  meterTrack: { height: 8, backgroundColor: '#EDF2F7', borderRadius: 20, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 20 },
  metricCard: { flex: 1, minWidth: '46%', padding: 12, borderRadius: 17, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, gap: 5 },
  metricValue: { color: COLORS.ink, fontFamily: TYPE.heading, fontSize: 19 },
  metricLabel: { color: COLORS.muted, fontFamily: TYPE.medium, fontSize: 9 },
  metricIcon: { fontSize: 18 },
  avatarCircle: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paleBlue, borderWidth: 2, borderColor: '#BEE3F8', overflow: 'hidden' },
  nav: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 7, paddingBottom: 7, paddingHorizontal: 5 },
  navItem: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 14 },
  navItemActive: { backgroundColor: COLORS.paleBlue },
  navLabel: { color: COLORS.muted, fontFamily: TYPE.medium, fontSize: 8 },
  navLabelActive: { color: COLORS.blueDeep, fontFamily: TYPE.bold },
  divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  banner: { borderRadius: 14, padding: 11, backgroundColor: COLORS.paleBlue, borderWidth: 1, borderColor: '#C6D9F0', gap: 4 },
  bannerText: { color: COLORS.blueDeep, fontFamily: TYPE.medium, fontSize: 10, lineHeight: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(20, 31, 48, 0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { color: COLORS.ink, fontFamily: TYPE.heading, fontSize: 19, flex: 1 },
  close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: COLORS.white },
  imagePreview: { width: '100%', height: 190, borderRadius: 14, backgroundColor: '#EDF2F7' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  profileAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paleBlue },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  notice: { padding: 11, borderRadius: 13, backgroundColor: COLORS.paleOrange, borderWidth: 1, borderColor: '#FEEBC8' },
  noticeText: { color: '#744210', fontFamily: TYPE.medium, fontSize: 10, lineHeight: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  spinnerText: { color: COLORS.muted, fontFamily: TYPE.medium, fontSize: 12 },
  footer: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 9, textAlign: 'center', lineHeight: 14, marginTop: 4 },
});

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
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
  return (
    <View style={[styles.inputGroup, style]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#8A97A8"
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
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  small?: boolean;
  disabled?: boolean;
  icon?: AppIconName;
  style?: StyleProp<ViewStyle>;
}) {
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
    ? COLORS.white
    : variant === 'secondary'
      ? COLORS.blueDeep
      : variant === 'danger'
        ? COLORS.error
        : COLORS.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        small && styles.buttonSmall,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={small ? 15 : 18} color={iconColor} /> : null}
      <Text style={[textStyle, small && styles.buttonSmallText]}>{title}</Text>
    </Pressable>
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
  const emojiPrefix = EMOJI_ICON_PREFIXES.find(([prefix]) => title.startsWith(prefix));
  const cleanTitle = emojiPrefix ? title.slice(emojiPrefix[0].length).trimStart() : title;
  const content = (
    <View style={styles.horizontal}>
      {emojiPrefix || icon ? (
        <Icon name={emojiPrefix?.[1] ?? icon ?? 'food'} size={13} color={selected ? COLORS.white : color} />
      ) : null}
      <Text style={[styles.pillText, selected && { color: COLORS.white }]}>{cleanTitle}</Text>
    </View>
  );
  const style = [
    styles.pill,
    { backgroundColor: selected ? color : `${color}18`, borderWidth: 1, borderColor: selected ? color : `${color}40` },
  ];
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={style}>
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
  return (
    <View style={styles.sectionRow}>
      <View style={styles.flex}>
        <Text style={styles.sectionTitle}>{title}</Text>
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
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <View style={styles.meterTrack}>
      <View style={[styles.meterFill, { width: `${percent}%`, backgroundColor: color }]} />
    </View>
  );
}
