import type { ReactNode } from 'react';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Svg, { Path } from 'react-native-svg';

import { AnimatedPress } from './motion';
import { COLORS } from './constants';
import { BORDER, RADIUS, SHADOW, SHARED, SPACE, THEMES, tint } from './tokens';

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
  | 'shield';

const ICON_SYMBOLS = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  recipes: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  menu: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  help: { ios: 'questionmark.circle', android: 'help', web: 'help' },
  achievements: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' },
  points: { ios: 'star.fill', android: 'stars', web: 'stars' },
  water: { ios: 'mug', android: 'local_drink', web: 'local_drink' },
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
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  leaf: { ios: 'leaf.fill', android: 'nutrition', web: 'nutrition' },
  music: { ios: 'music.note', android: 'music_note', web: 'music_note' },
  paw: { ios: 'pawprint.fill', android: 'pets', web: 'pets' },
  forest: { ios: 'tree.fill', android: 'forest', web: 'forest' },
  dumbbell: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
  waves: { ios: 'water.waves', android: 'waves', web: 'waves' },
  pause: { ios: 'pause.fill', android: 'pause', web: 'pause' },
  repeat: { ios: 'repeat', android: 'repeat', web: 'repeat' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  chest: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
  chart: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  bell: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  shield: { ios: 'shield.fill', android: 'shield', web: 'shield' },
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
  if (name === 'water') {
    // SF Symbols has no plain drinking glass; keep the same glass on every platform.
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M4 3h16l-1.6 16.1A2 2 0 0 1 16.4 21H7.6a2 2 0 0 1-2-1.9L4 3Zm2.3 7 .9 9h9.6l.9-9H6.3Z" fill={color} fillRule="evenodd" />
      </Svg>
    );
  }
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
  const accessoryColors = ['#ED64A6', '#805AD5', '#F6C445', '#48BB78', '#2B6CB0', '#ED8936'];
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
            backgroundColor: accessoryColors[selection.accesorio] ?? accessoryColors[0],
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
} as const;

export const styles = StyleSheet.create({
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
  authNotice: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: SPACE[16] },
  roleRow: { flexDirection: 'row', backgroundColor: SHARED.apagada, padding: SPACE[4], borderRadius: RADIUS.md, gap: SPACE[4] },
  roleChoice: { flex: 1, minHeight: 44, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: SPACE[4] },
  roleChoiceActive: { backgroundColor: COLORS.white, shadowColor: COLORS.navy, shadowOpacity: 0.09, shadowRadius: 8, elevation: 2 },
  roleChoiceText: { color: COLORS.muted, fontFamily: TYPE.medium, fontSize: 12 },
  roleChoiceTextActive: { color: COLORS.ink, fontFamily: TYPE.bold },
  inputGroup: { gap: SPACE[4] },
  inputLabel: { color: COLORS.ink, fontFamily: TYPE.bold, fontSize: 11 },
  input: { minHeight: 48, borderRadius: RADIUS.sm, borderWidth: BORDER.fino, borderColor: COLORS.line, backgroundColor: COLORS.white, paddingHorizontal: SPACE[14], color: COLORS.ink, fontFamily: TYPE.body, fontSize: 13 },
  inputFocused: { borderColor: COLORS.blue },
  inputError: { borderColor: SHARED.error },
  fieldHint: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 10, lineHeight: 15 },
  errorText: { color: SHARED.error, fontFamily: TYPE.medium, fontSize: 11, lineHeight: 16 },
  button: { minHeight: 44, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE[16], paddingVertical: SPACE[12], flexDirection: 'row', gap: SPACE[8] },
  buttonPrimary: { backgroundColor: COLORS.blue },
  buttonSecondary: { backgroundColor: COLORS.paleBlue, borderWidth: BORDER.fino, borderColor: SHARED.infoBorde },
  buttonOutline: { backgroundColor: COLORS.white, borderWidth: BORDER.fino, borderColor: COLORS.line },
  buttonDanger: { backgroundColor: SHARED.errorFondo, borderWidth: BORDER.fino, borderColor: SHARED.errorBorde },
  buttonSuccess: { backgroundColor: COLORS.green },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: COLORS.white, fontFamily: TYPE.bold, fontSize: 12, textAlign: 'center' },
  buttonTextSecondary: { color: COLORS.blueDeep },
  buttonTextOutline: { color: COLORS.ink },
  buttonTextDanger: { color: COLORS.error },
  buttonSmall: { minHeight: 44, borderRadius: RADIUS.sm, paddingVertical: SPACE[4], paddingHorizontal: SPACE[8] },
  buttonSmallText: { fontSize: 10 },
  linkButton: { minHeight: 44, paddingVertical: SPACE[8], alignItems: 'center', justifyContent: 'center' },
  linkText: { color: COLORS.blue, fontFamily: TYPE.bold, fontSize: 11 },
  profileStrip: { backgroundColor: COLORS.white, paddingHorizontal: SPACE[16], paddingTop: SPACE[8], paddingBottom: SPACE[8], borderBottomWidth: BORDER.fino, borderBottomColor: COLORS.line, flexDirection: 'row', gap: SPACE[8] },
  profileChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: SPACE[4], paddingVertical: SPACE[8], paddingHorizontal: SPACE[12], borderRadius: RADIUS.md, borderWidth: BORDER.fino, borderColor: COLORS.line, backgroundColor: COLORS.white },
  profileChipActive: { borderColor: COLORS.blue, backgroundColor: COLORS.paleBlue },
  profileChipText: { color: COLORS.ink, fontFamily: TYPE.medium, fontSize: 10 },
  content: { paddingHorizontal: SPACE[16], paddingTop: SPACE[16], paddingBottom: SPACE[24], gap: SPACE[12] },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACE[4] },
  sectionTitle: { color: COLORS.ink, fontFamily: TYPE.heading, fontSize: 17, lineHeight: 22 },
  sectionHint: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 10, lineHeight: 15, marginTop: SPACE[4] },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.habito, padding: SPACE[16], borderWidth: BORDER.fino, borderColor: COLORS.line, gap: SPACE[12], ...SHADOW.habito },
  cardTight: { padding: SPACE[12], gap: SPACE[8] },
  cardTitle: { color: COLORS.ink, fontFamily: TYPE.heading, fontSize: 15, lineHeight: 20 },
  body: { color: COLORS.ink, fontFamily: TYPE.body, fontSize: 12, lineHeight: 19 },
  muted: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 10, lineHeight: 16 },
  horizontal: { flexDirection: 'row', alignItems: 'center', gap: SPACE[12] },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE[8] },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[8] },
  pill: { alignSelf: 'flex-start', borderRadius: RADIUS.pildora, paddingHorizontal: SPACE[8], paddingVertical: SPACE[4], flexDirection: 'row', alignItems: 'center', gap: SPACE[4] },
  pillText: { color: COLORS.ink, fontFamily: TYPE.bold, fontSize: 9 },
  meterTrack: { height: 8, backgroundColor: SHARED.apagada, borderRadius: RADIUS.pildora, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: RADIUS.pildora },
  divider: { height: BORDER.fino, backgroundColor: COLORS.line, marginVertical: SPACE[4] },
  emptyState: { alignItems: 'center', paddingVertical: SPACE[20], gap: SPACE[8] },
  banner: { borderRadius: RADIUS.sm, padding: SPACE[12], backgroundColor: COLORS.paleBlue, borderWidth: BORDER.fino, borderColor: SHARED.infoBorde, gap: SPACE[4] },
  bannerText: { color: COLORS.blueDeep, fontFamily: TYPE.medium, fontSize: 10, lineHeight: 16 },
  overlay: { flex: 1, backgroundColor: SHARED.fondoModal, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.hero, borderTopRightRadius: RADIUS.hero, padding: SPACE[20], paddingBottom: SPACE[24], maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE[12] },
  modalTitle: { color: COLORS.ink, fontFamily: TYPE.heading, fontSize: 19, flex: 1 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.pildora, backgroundColor: COLORS.white },
  imagePreview: { width: '100%', height: 190, borderRadius: RADIUS.sm, backgroundColor: SHARED.apagada },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE[12], paddingVertical: SPACE[8], borderBottomWidth: BORDER.fino, borderBottomColor: COLORS.line },
  profileAvatar: { width: 38, height: 38, borderRadius: RADIUS.pildora, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paleBlue },
  notice: { padding: SPACE[12], borderRadius: RADIUS.sm, backgroundColor: COLORS.paleOrange, borderWidth: BORDER.fino, borderColor: tint(THEMES.tutor.acento, 0.3) },
  noticeText: { color: THEMES.tutor.texto, fontFamily: TYPE.medium, fontSize: 10, lineHeight: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE[12], padding: SPACE[24] },
  footer: { color: COLORS.muted, fontFamily: TYPE.body, fontSize: 9, textAlign: 'center', lineHeight: 14, marginTop: SPACE[4] },
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
        placeholderTextColor={SHARED.textoInactivo}
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
    <AnimatedPress
      label={title}
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
