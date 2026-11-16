import { useEffect, useState, type ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import type { AccountRole } from './model';
import { BORDER, FOOD_GROUP_COLORS, RADIUS, SHADOW, SHARED, SPACE, tint, useAppTheme } from './tokens';
import { AnimatedPress, useReduceMotion } from './motion';
import { Icon, type AppIconName } from './ui';

type Theme = ReturnType<typeof useAppTheme>;
type Themed = { theme: Theme };
type FoodGroup = keyof typeof FOOD_GROUP_COLORS;

const LOGO = require('@/assets/images/wk-logo.png');

export { useReduceMotion };

export function PillButton({
  theme, label, onPress, variant = 'primary', disabled = false, style,
}: Themed & {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const ghost = variant === 'ghost';
  return (
    <AnimatedPress
      label={label}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.pillButton,
        { backgroundColor: ghost ? theme.colors.tarjeta : theme.colors.acento },
        ghost && { borderWidth: BORDER.tarjeta, borderColor: theme.colors.bordeSutil },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[theme.type.button, { color: ghost ? theme.colors.texto : theme.colors.sobreAcento }]}>{label}</Text>
    </AnimatedPress>
  );
}

export function AvatarButton({ theme, onPress }: Themed & { onPress: () => void }) {
  return (
    <AnimatedPress
      label="Personalizar avatar"
      onPress={onPress}
      pressedScale={0.94}
      hitSlop={3}
      style={[styles.avatarButton, { backgroundColor: theme.colors.acentoSuave }]}
    >
      <View style={styles.inline}>
        <Icon name="avatar" color={theme.colors.acento} size={18} />
        <Text style={[theme.type.caption, { color: theme.colors.texto }]}>Personalizar avatar</Text>
      </View>
    </AnimatedPress>
  );
}

export function WaterCounter({
  theme, value, goal, onDecrease, onIncrease,
}: Themed & { value: number; goal: number; onDecrease: () => void; onIncrease: () => void }) {
  return (
    <View style={[styles.waterCounter, { backgroundColor: tint(theme.colors.apagada, 0.6) }]}>
      <AnimatedPress
        label="Quitar un vaso de agua"
        onPress={onDecrease}
        disabled={value <= 0}
        hitSlop={2}
        style={[styles.waterMinus, { backgroundColor: theme.colors.tarjeta }, value <= 0 && styles.disabled]}
      >
        <Text style={[theme.type.h3, { color: theme.colors.texto }]}>−</Text>
      </AnimatedPress>
      <View style={styles.inline} accessible accessibilityLabel={`${value} de ${goal} vasos de agua`}>
        <Icon name="water" color={theme.colors.agua} size={20} />
        <Text style={[theme.type.counter, { color: theme.colors.texto }]}>{value} de {goal}</Text>
      </View>
      <AnimatedPress label="Agregar un vaso de agua" onPress={onIncrease} style={[styles.waterPlus, { backgroundColor: theme.colors.acento }]}>
        <Text style={[theme.type.button, { color: theme.colors.sobreAcento }]}>+1</Text>
      </AnimatedPress>
    </View>
  );
}

export function FoodChip({
  theme, group, label, selected, onPress,
}: Themed & { group: FoodGroup; label: string; selected: boolean; onPress: () => void }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const colors = FOOD_GROUP_COLORS[group];
  useEffect(() => {
    const target = selected ? 1.05 : 1;
    scale.set(reduceMotion ? target : withSpring(target));
    return () => cancelAnimation(scale);
  }, [reduceMotion, scale, selected]);

  return (
    <Animated.View style={[selected && [styles.selectedFoodChip, { backgroundColor: colors.fondo }, SHADOW.chip], animatedStyle]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        style={[
          styles.foodChip,
          { backgroundColor: colors.fondo, borderColor: selected ? colors.texto : 'transparent' },
          !selected && styles.foodChipInactive,
        ]}
      >
        {selected ? <Icon name="check" size={16} color={colors.texto} /> : null}
        <Text style={[theme.type.caption, { color: colors.texto }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function RoleSwitch({
  theme, role, onSelectChild, onRequestTutor,
}: Themed & { role: AccountRole; onSelectChild: () => void; onRequestTutor: () => void }) {
  return (
    <View style={[styles.roleSwitch, { backgroundColor: theme.colors.apagada }]}>
      {([
        { id: 'child', label: 'Niñez', onPress: onSelectChild },
        { id: 'tutor', label: 'Tutor', onPress: onRequestTutor },
      ] as const).map(item => {
        const selected = role === item.id;
        const color = selected ? theme.colors.sobreAcento : theme.colors.texto;
        return (
          <AnimatedPress
            key={item.id}
            label={item.label}
            onPress={() => { if (!selected) item.onPress(); }}
            selected={selected}
            style={[styles.roleOption, selected && { backgroundColor: theme.colors.acento }]}
          >
            <View style={styles.inline}>
              {item.id === 'tutor' ? <Icon name="lock" size={14} color={color} /> : null}
              <Text style={[theme.type.caption, { color }]}>{item.label}</Text>
            </View>
          </AnimatedPress>
        );
      })}
    </View>
  );
}

export function TopBar({
  theme, role, onSelectChild, onRequestTutor, avatar, childName,
}: Themed & {
  role: AccountRole;
  onSelectChild: () => void;
  onRequestTutor: () => void;
  avatar?: ReactNode;
  childName?: string;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarRow}>
        <View style={styles.brand}>
          <Image source={LOGO} style={styles.brandLogo} resizeMode="contain" />
          <Text numberOfLines={1} style={[theme.type.h3, styles.brandTitle, { color: theme.colors.texto }]}>Warrior Kids</Text>
        </View>
        <RoleSwitch theme={theme} role={role} onSelectChild={onSelectChild} onRequestTutor={onRequestTutor} />
      </View>
      {role === 'child' && childName ? (
        <View style={styles.childHeader}>
          <View style={[styles.childAvatar, { borderColor: theme.colors.bordeAvatar }]}>{avatar}</View>
          <View style={[styles.childName, { backgroundColor: theme.colors.tarjeta }]}>
            <Text style={[theme.type.h3, { color: theme.colors.texto }]}>{childName}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export type BottomBarItem = { id: string; label: string; icon: AppIconName };

function BottomBarTab({
  theme, item, selected, onPress,
}: Themed & { item: BottomBarItem; selected: boolean; onPress: () => void }) {
  const reduceMotion = useReduceMotion();
  const offset = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  useEffect(() => {
    const target = selected ? -3 : 0;
    offset.set(reduceMotion ? target : withSpring(target, { duration: 150, dampingRatio: 0.6 }));
    return () => cancelAnimation(offset);
  }, [offset, reduceMotion, selected]);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.bottomTab}
    >
      <Animated.View style={[styles.bottomTabContent, animatedStyle]}>
        <View style={[styles.tabIcon, selected && { backgroundColor: theme.colors.acentoSuave }]}>
          <Icon name={item.icon} size={22} color={selected ? theme.colors.acento : theme.colors.textoInactivo} />
        </View>
        <Text numberOfLines={1} style={[selected ? theme.type.tabActive : theme.type.tab, { color: selected ? theme.colors.texto : theme.colors.textoInactivo }]}>
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function BottomBar({
  theme, items, activeId, onSelect,
}: Themed & { items: readonly BottomBarItem[]; activeId: string; onSelect: (id: string) => void }) {
  return (
    <View accessibilityRole="tablist" style={[styles.bottomBar, { borderTopColor: theme.colors.bordeSutil }]}>
      {items.map(item => (
        <BottomBarTab key={item.id} theme={theme} item={item} selected={item.id === activeId} onPress={() => onSelect(item.id)} />
      ))}
    </View>
  );
}

export function HeroCard({
  theme, title, subtitle, points, actionLabel, onAction,
}: Themed & { title: string; subtitle: string; points: number; actionLabel: string; onAction: () => void }) {
  const reduceMotion = useReduceMotion();
  const offset = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(offset);
      offset.set(0);
    }
  }, [offset, reduceMotion]);
  return (
    <View style={[styles.heroCard, { backgroundColor: theme.colors.hero }]}>
      <View style={styles.heroContent}>
        <Text style={[theme.type.hero, { color: theme.colors.sobreAcento }]}>{title}</Text>
        <Text style={[theme.type.heroSubtitle ?? theme.type.body, styles.heroSubtitle, { color: theme.colors.sobreAcento }]}>{subtitle}</Text>
        <View style={[styles.pointsPill, { backgroundColor: tint(SHARED.puntos, 0.2) }]}>
          <Icon name="points" size={16} color={SHARED.puntos} />
          <Text style={[theme.type.caption, { color: theme.colors.sobreAcento }]}>{points} puntos</Text>
        </View>
        <PillButton theme={theme} label={actionLabel} onPress={onAction} style={styles.heroButton} />
      </View>
      <Animated.View style={[styles.heroLogo, animatedStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Jaguar de Warrior Kids"
          onPress={() => {
            if (!reduceMotion) offset.set(withSequence(withTiming(-8, { duration: 150 }), withSpring(0)));
          }}
        >
          <Image source={LOGO} style={styles.heroLogoImage} resizeMode="contain" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function HabitProgress({ value, max, color }: { value: number; max: number; color: string }) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const animatedStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  useEffect(() => {
    progress.set(reduceMotion ? ratio : withTiming(ratio, { duration: 300 }));
    return () => cancelAnimation(progress);
  }, [progress, ratio, reduceMotion]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={[styles.progressTrack, { backgroundColor: SHARED.apagada }]}
    >
      <Animated.View style={[styles.progressFill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

export function HabitCard({
  theme, title, icon, iconColor, value, goal, points, onDecrease, onIncrease,
}: Themed & {
  title: string;
  icon: AppIconName;
  iconColor: string;
  value: number;
  goal: number;
  points: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={[styles.habitCard, { backgroundColor: theme.colors.tarjeta, borderColor: theme.colors.bordeSutil }, SHADOW.habito]}>
      <View style={styles.habitHeader}>
        <View style={[styles.habitIcon, { backgroundColor: tint(iconColor, 0.15) }]}><Icon name={icon} size={24} color={iconColor} /></View>
        <View style={styles.flex}>
          <Text style={[theme.type.h3, { color: theme.colors.texto }]}>{title}</Text>
          <Text style={[theme.type.counter, { color: theme.colors.textoSecundario }]}>{value} de {goal}</Text>
        </View>
        <View style={[styles.pointsPill, { backgroundColor: tint(theme.colors.puntos, 0.15) }]}>
          <Text style={[theme.type.caption, { color: theme.colors.texto }]}>+{points} puntos</Text>
        </View>
      </View>
      <HabitProgress value={value} max={goal} color={iconColor} />
      <WaterCounter theme={theme} value={value} goal={goal} onDecrease={onDecrease} onIncrease={onIncrease} />
    </View>
  );
}

export function SectionCard({
  theme, role, title, subtitle, children,
}: Themed & { role: AccountRole; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.colors.tarjeta, borderRadius: role === 'child' ? RADIUS.habito : RADIUS.tarjeta }, SHADOW.tarjeta]}>
      <Text style={[theme.type.h2, { color: theme.colors.texto }]}>{title}</Text>
      {subtitle ? <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function ListRow({
  theme, icon, iconColor, title, subtitle, trailing,
}: Themed & { icon: AppIconName; iconColor: string; title: string; subtitle?: string; trailing?: ReactNode }) {
  return (
    <View style={styles.listRow}>
      <View style={[styles.listIcon, { backgroundColor: tint(iconColor, 0.15) }]}><Icon name={icon} color={iconColor} size={22} /></View>
      <View style={styles.flex}>
        <Text style={[theme.type.h3, { color: theme.colors.texto }]}>{title}</Text>
        {subtitle ? <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

const CHART_SERIES = [
  { key: 'agua', label: 'Agua' },
  { key: 'alimentacion', label: 'Alimentación' },
  { key: 'estudio', label: 'Estudio' },
  { key: 'descanso', label: 'Descanso' },
] as const;
type ChartSeries = (typeof CHART_SERIES)[number]['key'];
export type ChartDay = { label: string; values: Record<ChartSeries, number> };

function ChartBar({ height, color, index, reduceMotion }: { height: number; color: string; index: number; reduceMotion: boolean }) {
  const animatedHeight = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ height: animatedHeight.get() }));
  useEffect(() => {
    animatedHeight.set(reduceMotion
      ? height
      : withDelay(index * 40, withTiming(height, { duration: 600, easing: Easing.out(Easing.cubic) })));
    return () => cancelAnimation(animatedHeight);
  }, [animatedHeight, height, index, reduceMotion]);
  return <Animated.View style={[styles.chartBar, { backgroundColor: color }, animatedStyle]} />;
}

export function BarChart({ theme, days, max }: Themed & { days: readonly ChartDay[]; max: number }) {
  const reduceMotion = useReduceMotion();
  return (
    <View>
      <View style={styles.chartDays}>
        {days.map((day, dayIndex) => (
          <View
            key={`${day.label}-${dayIndex}`}
            accessible
            accessibilityLabel={`${day.label}: ${CHART_SERIES.map(series => `${series.label} ${day.values[series.key]}`).join(', ')}`}
            style={styles.chartDay}
          >
            <View style={styles.chartBars}>
              {CHART_SERIES.map((series, seriesIndex) => {
                const value = day.values[series.key];
                const height = max > 0 ? Math.max(0, Math.min(1, value / max)) * 100 : 0;
                return <ChartBar key={series.key} height={height} color={theme.colors.grafica[series.key]} index={dayIndex * CHART_SERIES.length + seriesIndex} reduceMotion={reduceMotion} />;
              })}
            </View>
            <Text style={[theme.type.tab, { color: theme.colors.textoSecundario }]}>{day.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.chartLegend}>
        {CHART_SERIES.map(series => (
          <View key={series.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.grafica[series.key] }]} />
            <Text style={[theme.type.tab, { color: theme.colors.textoSecundario }]}>{series.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProgressRing({ theme, value, size = 120 }: Themed & { value: number; size?: number }) {
  const percent = Math.max(0, Math.min(100, value));
  const radius = (size - BORDER.anillo) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.colors.apagada} strokeWidth={BORDER.anillo} fill="none" />
        {percent > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.completado}
            strokeWidth={BORDER.anillo}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - percent / 100)}
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
            fill="none"
          />
        ) : null}
      </Svg>
      <Text style={[theme.type.metric ?? theme.type.h1, { color: theme.colors.texto }]}>{Math.round(percent)}%</Text>
    </View>
  );
}

function LoadingDot({ color, index, reduceMotion }: { color: string; index: number; reduceMotion: boolean }) {
  const offset = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  useEffect(() => {
    if (reduceMotion) {
      offset.set(0);
    } else {
      offset.set(withDelay(index * 300, withRepeat(withSequence(
        withTiming(-6, { duration: 150 }),
        withTiming(0, { duration: 150 }),
        withDelay(600, withTiming(0, { duration: 0 })),
      ), -1)));
    }
    return () => cancelAnimation(offset);
  }, [index, offset, reduceMotion]);
  return <Animated.View style={[styles.loadingDot, { backgroundColor: color }, animatedStyle]} />;
}

export function LoadingDots({ theme }: Themed) {
  const reduceMotion = useReduceMotion();
  return (
    <View accessible accessibilityLabel="Cargando" style={styles.loadingDots}>
      {[0, 1, 2].map(index => <LoadingDot key={index} index={index} color={theme.colors.acento} reduceMotion={reduceMotion} />)}
    </View>
  );
}

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SHEET_SPRING = { duration: 300, dampingRatio: 0.8 } as const;

export function BottomSheet({
  theme, visible, onClose, children,
}: Themed & { visible: boolean; onClose: () => void; children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  const { height: windowHeight } = useWindowDimensions();
  // El Modal sigue montado hasta que termina la salida.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  // Conserva el último contenido visible para que no se vacíe mientras la hoja baja.
  const [shownChildren, setShownChildren] = useState(children);
  if (visible && shownChildren !== children) setShownChildren(children);

  const progress = useSharedValue(0);
  const sheetHeight = useSharedValue(windowHeight);

  useEffect(() => {
    if (!mounted) return;
    const target = visible ? 1 : 0;
    const onFinish = (finished?: boolean) => {
      'worklet';
      if (finished && !visible) scheduleOnRN(setMounted, false);
    };
    progress.set(reduceMotion
      ? withTiming(target, { duration: 200, easing: EASE_OUT }, onFinish)
      : withSpring(target, { ...SHEET_SPRING, overshootClamping: !visible }, onFinish));
  }, [mounted, progress, reduceMotion, visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, progress.get())) }));
  const sheetStyle = useAnimatedStyle(() => (reduceMotion
    ? { opacity: Math.min(1, Math.max(0, progress.get())), transform: [{ translateY: 0 }] }
    : { opacity: 1, transform: [{ translateY: (1 - progress.get()) * sheetHeight.get() }] }));

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} animationType="none">
      <KeyboardAvoidingView
        style={[styles.sheetContainer, { pointerEvents: visible ? 'auto' : 'none' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.sheetBackdrop, backdropStyle]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={StyleSheet.absoluteFill} />
        <Animated.View
          accessibilityViewIsModal
          onLayout={event => sheetHeight.set(event.nativeEvent.layout.height)}
          style={[styles.sheet, { backgroundColor: theme.colors.fondoFin }, sheetStyle]}
        >
          {/* Faldón: cubre el hueco inferior cuando el resorte rebasa un poco hacia arriba. */}
          <View pointerEvents="none" style={[styles.sheetSkirt, { backgroundColor: theme.colors.fondoFin }]} />
          {visible ? children : shownChildren}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE[8] },
  pillButton: { height: 52, borderRadius: RADIUS.pildora, overflow: 'hidden' },
  avatarButton: { height: 38, borderRadius: RADIUS.pildora, alignSelf: 'flex-start', paddingHorizontal: SPACE[14] },
  waterCounter: { minHeight: 52, borderRadius: RADIUS.pildora, padding: SPACE[4], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE[8] },
  waterMinus: { width: 44, height: 44, borderRadius: RADIUS.pildora },
  waterPlus: { minWidth: 52, height: 44, borderRadius: RADIUS.pildora },
  foodChip: { minHeight: 44, paddingHorizontal: SPACE[14], borderWidth: BORDER.chip, borderRadius: RADIUS.pildora, flexDirection: 'row', alignItems: 'center', gap: SPACE[4] },
  foodChipInactive: { opacity: 0.8 },
  selectedFoodChip: { borderRadius: RADIUS.pildora },
  roleSwitch: { flexDirection: 'row', borderRadius: RADIUS.pildora, padding: SPACE[4] },
  roleOption: { height: 44, minWidth: 68, borderRadius: RADIUS.pildora, paddingHorizontal: SPACE[8] },
  topBar: { gap: SPACE[12] },
  topBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE[8] },
  brand: { flexDirection: 'row', alignItems: 'center', gap: SPACE[8], flexShrink: 1, minWidth: 0 },
  brandTitle: { flexShrink: 1 },
  brandLogo: { width: 44, height: 44 },
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE[8] },
  childAvatar: { width: 52, height: 52, borderWidth: BORDER.avatar, borderRadius: RADIUS.pildora, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  childName: { borderRadius: RADIUS.pildora, paddingHorizontal: SPACE[16], paddingVertical: SPACE[8] },
  bottomBar: { flexDirection: 'row', backgroundColor: SHARED.fondoInferior, borderTopWidth: BORDER.fino, borderTopLeftRadius: RADIUS.tarjeta, borderTopRightRadius: RADIUS.tarjeta, paddingTop: SPACE[8] },
  bottomTab: { minHeight: 54, flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomTabContent: { alignItems: 'center' },
  tabIcon: { width: 52, height: 32, borderRadius: RADIUS.pildora, alignItems: 'center', justifyContent: 'center' },
  heroCard: { borderRadius: RADIUS.hero, overflow: 'hidden', padding: SPACE[24], minHeight: 220 },
  heroContent: { alignItems: 'flex-start', width: '70%', gap: SPACE[12], zIndex: 1 },
  heroSubtitle: { opacity: 0.8 },
  heroButton: { alignSelf: 'stretch' },
  heroLogo: { position: 'absolute', right: -24, bottom: -28 },
  heroLogoImage: { width: 150, height: 150 },
  pointsPill: { borderRadius: RADIUS.pildora, paddingHorizontal: SPACE[12], paddingVertical: SPACE[4], flexDirection: 'row', alignItems: 'center', gap: SPACE[4] },
  habitCard: { borderRadius: RADIUS.habito, borderWidth: BORDER.tarjeta, padding: SPACE[16], gap: SPACE[12] },
  habitHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE[12] },
  habitIcon: { width: 48, height: 48, borderRadius: RADIUS.pildora, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 10, borderRadius: RADIUS.pildora, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.pildora },
  sectionCard: { padding: SPACE[20], gap: SPACE[8] },
  listRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: SPACE[12] },
  listIcon: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  chartDays: { flexDirection: 'row', justifyContent: 'space-around', gap: SPACE[4] },
  chartDay: { flex: 1, alignItems: 'center', gap: SPACE[4] },
  chartBars: { height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: SPACE[4] },
  chartBar: { width: 6, borderTopLeftRadius: RADIUS.barra, borderTopRightRadius: RADIUS.barra },
  chartLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACE[12], marginTop: SPACE[12] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE[4] },
  legendDot: { width: 8, height: 8, borderRadius: RADIUS.pildora },
  loadingDots: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE[8] },
  loadingDot: { width: 12, height: 12, borderRadius: RADIUS.pildora },
  sheetContainer: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { backgroundColor: SHARED.fondoModal },
  sheet: { maxHeight: '90%', borderTopLeftRadius: RADIUS.hero, borderTopRightRadius: RADIUS.hero, padding: SPACE[20] },
  sheetSkirt: { position: 'absolute', top: '100%', left: 0, right: 0, height: 48 },
});
