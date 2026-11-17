import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
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
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import type { AccountRole } from './model';
import { useSoundEffects } from './sound-effects';
import { BORDER, FOOD_GROUP_COLORS, RADIUS, SHADOW, SHARED, SPACE, tint, useAppTheme } from './tokens';
import { AnimatedPress, useReduceMotion } from './motion';
import { Icon, type AppIconName } from './ui';

type Theme = ReturnType<typeof useAppTheme>;
type Themed = { theme: Theme };
type FoodGroup = keyof typeof FOOD_GROUP_COLORS;

const LOGO = require('@/assets/images/wk-logo.png');
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

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
  theme, group, label, icon, selected, onPress,
}: Themed & { group: FoodGroup; label: string; icon?: AppIconName; selected: boolean; onPress: () => void }) {
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
        aria-checked={selected}
        onPress={onPress}
        style={[
          styles.foodChip,
          { backgroundColor: colors.fondo, borderColor: selected ? colors.texto : 'transparent' },
          !selected && styles.foodChipInactive,
        ]}
      >
        {selected ? <Icon name="check" size={16} color={colors.texto} /> : null}
        {icon && !selected ? <Icon name={icon} size={16} color={colors.texto} /> : null}
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
            silent
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
      aria-selected={selected}
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
  // Pulso sutil solo cuando los puntos suben; no en el montaje ni cuando bajan.
  const pointsScale = useSharedValue(1);
  const pointsOpacity = useSharedValue(1);
  const pointsStyle = useAnimatedStyle(() => ({ opacity: pointsOpacity.get(), transform: [{ scale: pointsScale.get() }] }));
  const previousPoints = useRef(points);
  useEffect(() => {
    const increased = points > previousPoints.current;
    previousPoints.current = points;
    if (!increased) return;
    if (reduceMotion) {
      pointsOpacity.set(withSequence(withTiming(0.6, { duration: 0 }), withTiming(1, { duration: 200, easing: EASE_OUT })));
    } else {
      pointsScale.set(withSequence(
        withTiming(1.08, { duration: 150, easing: EASE_OUT }),
        withSpring(1, { duration: 300, dampingRatio: 1 }),
      ));
    }
  }, [points, pointsOpacity, pointsScale, reduceMotion]);
  return (
    <View style={[styles.heroCard, { backgroundColor: theme.colors.hero }]}>
      <View style={styles.heroContent}>
        <Text style={[theme.type.hero, { color: theme.colors.sobreAcento }]}>{title}</Text>
        <Text style={[theme.type.heroSubtitle ?? theme.type.body, styles.heroSubtitle, { color: theme.colors.sobreAcento }]}>{subtitle}</Text>
        <Animated.View style={[styles.pointsPill, { backgroundColor: tint(SHARED.puntos, 0.2) }, pointsStyle]}>
          <Icon name="points" size={16} color={SHARED.puntos} />
          <Text style={[theme.type.caption, { color: theme.colors.sobreAcento }]}>{points} puntos</Text>
        </Animated.View>
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

export function HabitProgress({ value, max, color }: { value: number; max: number; color: string }) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  // El relleno ocupa toda la pista y se desliza con translateX: sin relayout por frame y sin deformar la punta redonda.
  const trackWidth = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: trackWidth.get() > 0 ? 1 : 0,
    transform: [{ translateX: (progress.get() - 1) * trackWidth.get() }],
  }));
  useEffect(() => {
    progress.set(reduceMotion ? ratio : withTiming(ratio, { duration: 200, easing: EASE_OUT }));
    return () => cancelAnimation(progress);
  }, [progress, ratio, reduceMotion]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      onLayout={event => trackWidth.set(event.nativeEvent.layout.width)}
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

// Fila de reto diario: ícono, texto y su estado (pendiente, listo para reclamar o completado).
export function ChallengeRow({
  theme, icon, title, detail, points, ready, claimed, onClaim,
}: Themed & {
  icon: AppIconName;
  title: string;
  detail: string;
  points: number;
  ready: boolean;
  claimed: boolean;
  onClaim: () => void;
}) {
  return (
    <View
      style={[
        styles.challengeRow,
        claimed
          ? { backgroundColor: tint(SHARED.completado, 0.1), borderColor: tint(SHARED.completado, 0.45) }
          : { backgroundColor: SHARED.tarjeta, borderColor: theme.colors.bordeSutil },
      ]}
    >
      <View style={[styles.challengeEmoji, { backgroundColor: theme.colors.acentoSuave }]}>
        <Icon name={icon} size={24} color={theme.colors.acento} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[theme.type.h3, { color: theme.colors.texto }]}>{title}</Text>
        <Text style={[theme.type.tab, { color: theme.colors.textoSecundario }]}>{detail}</Text>
      </View>
      {claimed ? (
        <View accessible accessibilityLabel={`${title}: completado`} style={[styles.challengeCheck, { backgroundColor: SHARED.completado }]}>
          <Icon name="check" size={22} color={SHARED.sobreAcento} />
        </View>
      ) : ready ? (
        <PillButton theme={theme} label={`Reclamar +${points}`} onPress={onClaim} style={styles.challengeClaim} />
      ) : (
        <View accessible accessibilityLabel={`${title}: ${points} puntos al completarlo`} style={[styles.pointsPill, { backgroundColor: SHARED.apagada }]}>
          <Text style={[theme.type.caption, { color: theme.colors.textoSecundario }]}>+{points}</Text>
        </View>
      )}
    </View>
  );
}

export function SectionCard({
  theme, role, title, subtitle, children, style,
}: Themed & { role: AccountRole; title: string; subtitle?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.colors.tarjeta, borderRadius: role === 'child' ? RADIUS.habito : RADIUS.tarjeta }, SHADOW.tarjeta, style]}>
      <Text role="heading" aria-level={3} style={[theme.type.h2, { color: theme.colors.texto }]}>{title}</Text>
      {subtitle ? <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function HomeGrid({ children }: { children: ReactNode }) {
  return <View style={styles.homeGrid}>{children}</View>;
}

// Mosaico grande del inicio de Niñez: un ícono, un título y una línea de estado.
export function HomeTile({
  theme, title, subtitle, icon, color, onPress,
}: Themed & { title: string; subtitle: string; icon: AppIconName; color: string; onPress: () => void }) {
  return (
    <AnimatedPress
      label={`${title}. ${subtitle}`}
      onPress={onPress}
      style={[styles.homeTile, { backgroundColor: tint(color, 0.16), borderColor: tint(color, 0.4) }]}
    >
      <View style={[styles.homeTileIcon, { backgroundColor: SHARED.tarjeta }]}>
        <Icon name={icon} size={32} color={color} />
      </View>
      <Text style={[theme.type.h3, styles.homeTileText, { color: theme.colors.texto }]}>{title}</Text>
      <Text style={[theme.type.tab, styles.homeTileText, { color: theme.colors.textoSecundario }]}>{subtitle}</Text>
    </AnimatedPress>
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

const CHART_HEIGHT = 120;

/** Subtítulo de cada gráfica del resumen semanal. */
export function ChartTitle({ theme, title, note }: Themed & { title: string; note?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text role="heading" aria-level={4} style={[theme.type.h3, { color: theme.colors.texto }]}>{title}</Text>
      {note ? <Text style={[theme.type.tab, { color: theme.colors.textoSecundario }]}>{note}</Text> : null}
    </View>
  );
}

/** Barras verticales de agua por día con una línea punteada en la meta. */
export function WaterWeekChart({
  theme, days, goal,
}: Themed & { days: readonly { label: string; value: number }[]; goal: number }) {
  const max = Math.max(goal, ...days.map(day => day.value), 1);
  const goalOffset = (goal / max) * CHART_HEIGHT;
  return (
    <View
      accessible
      accessibilityLabel={`Agua por día. Meta de ${goal} vasos. ${days.map(day => `${day.label} ${day.value}`).join(', ')}`}
      style={{ gap: SPACE[4] }}
    >
      <View style={styles.waterPlot}>
        <View style={[styles.goalLine, { bottom: goalOffset, borderColor: theme.colors.textoSecundario }]} />
        <Text style={[theme.type.tab, styles.goalLabel, { bottom: goalOffset + 2, color: theme.colors.textoSecundario }]}>Meta {goal}</Text>
        {days.map((day, index) => (
          <View key={`${day.label}-${index}`} style={styles.waterColumn}>
            {day.value > 0 ? <Text style={[theme.type.tab, { color: theme.colors.texto }]}>{day.value}</Text> : null}
            <View
              style={[
                styles.waterBar,
                {
                  height: Math.max(day.value > 0 ? 4 : 0, (day.value / max) * CHART_HEIGHT),
                  backgroundColor: day.value >= goal ? theme.colors.agua : tint(theme.colors.agua, 0.55),
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.chartLabels}>
        {days.map((day, index) => (
          <Text key={`${day.label}-${index}`} style={[theme.type.tab, styles.chartLabel, { color: theme.colors.textoSecundario }]}>{day.label}</Text>
        ))}
      </View>
    </View>
  );
}

export type DonutItem = { label: string; value: number; color: string; icon: AppIconName; valueLabel: string };
const DONUT_SIZE = 120;
const DONUT_STROKE = 22;

/** Dona con leyenda de íconos; cada segmento es proporcional a su valor. */
export function DonutChart({
  theme, items, center, emptyText,
}: Themed & { items: readonly DonutItem[]; center: string; emptyText: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const radius = (DONUT_SIZE - DONUT_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <View
      accessible
      accessibilityLabel={total ? items.map(item => `${item.label}: ${item.valueLabel}`).join(', ') : emptyText}
      style={styles.donutRow}
    >
      <View style={{ width: DONUT_SIZE, height: DONUT_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={DONUT_SIZE} height={DONUT_SIZE} style={StyleSheet.absoluteFill}>
          <Circle cx={DONUT_SIZE / 2} cy={DONUT_SIZE / 2} r={radius} stroke={SHARED.apagada} strokeWidth={DONUT_STROKE} fill="none" />
          {total ? items.filter(item => item.value > 0).map(item => {
            const length = (item.value / total) * circumference;
            const segment = (
              <Circle
                key={item.label}
                cx={DONUT_SIZE / 2}
                cy={DONUT_SIZE / 2}
                r={radius}
                stroke={item.color}
                strokeWidth={DONUT_STROKE}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}
                fill="none"
              />
            );
            offset += length;
            return segment;
          }) : null}
        </Svg>
        <Text style={[theme.type.h3, { color: theme.colors.texto, textAlign: 'center' }]}>{center}</Text>
      </View>
      <View style={styles.donutLegend}>
        {total ? items.map(item => (
          <View key={item.label} style={styles.legendItem}>
            <Icon name={item.icon} size={18} color={item.color} />
            <Text style={[theme.type.tab, styles.flex, { color: theme.colors.texto }]}>{item.label}</Text>
            <Text style={[theme.type.tab, { color: theme.colors.textoSecundario }]}>{item.valueLabel}</Text>
          </View>
        )) : <Text style={[theme.type.body, { color: theme.colors.textoSecundario }]}>{emptyText}</Text>}
      </View>
    </View>
  );
}

/** Barra horizontal en forma de píldora con ícono y texto adentro. */
export function PillBar({
  theme, icon, color, text, ratio,
}: Themed & { icon: AppIconName; color: string; text: string; ratio: number }) {
  return (
    <View accessible accessibilityLabel={text} style={[styles.pillBar, { backgroundColor: tint(color, 0.16) }]}>
      <View style={[styles.pillFill, { width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`, backgroundColor: tint(color, 0.45) }]} />
      <Icon name={icon} size={18} color={color} />
      <Text style={[theme.type.tab, styles.flex, { color: theme.colors.texto }]}>{text}</Text>
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
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
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

type Celebration = { badge: string; id: number };

/**
 * Celebración breve (800 ms) cuando aparece una insignia nueva en el mismo perfil.
 * No se dispara al montar ni al cambiar de perfil. Solo transform y opacity.
 */
export function AchievementCelebration({
  theme, profileKey, badges, describe,
}: Themed & {
  profileKey: string;
  badges: readonly string[];
  describe: (badge: string) => { title: string; icon: AppIconName };
}) {
  const reduceMotion = useReduceMotion();
  const { playCelebration } = useSoundEffects();
  const [seen, setSeen] = useState({ profileKey, signature: badges.join('|'), badges });
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const signature = badges.join('|');
  if (seen.profileKey !== profileKey || seen.signature !== signature) {
    const fresh = seen.profileKey === profileKey ? badges.find(badge => !seen.badges.includes(badge)) : undefined;
    setSeen({ profileKey, signature, badges });
    if (fresh) setCelebration(current => ({ badge: fresh, id: (current?.id ?? 0) + 1 }));
  }

  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const ring = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - ring.get()),
    transform: [{ scale: 0.95 + 0.65 * ring.get() }],
  }));

  useEffect(() => {
    if (!celebration) return;
    playCelebration();
    // 150 entrada + 450 visible + 200 salida = 800 ms.
    opacity.set(withSequence(
      withTiming(1, { duration: 150, easing: EASE_OUT }),
      withDelay(450, withTiming(0, { duration: 200, easing: EASE_OUT })),
    ));
    if (reduceMotion) {
      scale.set(1);
      ring.set(1);
      return;
    }
    scale.set(withSequence(withTiming(0.95, { duration: 0 }), withTiming(1, { duration: 250, easing: EASE_OUT })));
    ring.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 600, easing: EASE_OUT })));
  }, [celebration, opacity, playCelebration, reduceMotion, ring, scale]);

  const info = celebration ? describe(celebration.badge) : null;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.celebrationLayer]}
    >
      {info ? (
        <Animated.View style={[styles.celebrationCard, { backgroundColor: theme.colors.tarjeta }, SHADOW.chip, cardStyle]}>
          <View style={styles.celebrationMedalWrap}>
            <Animated.View style={[styles.celebrationRing, { borderColor: SHARED.logros }, ringStyle]} />
            <View style={[styles.celebrationMedal, { borderColor: SHARED.logros, backgroundColor: tint(SHARED.logros, 0.15) }]}>
              <Icon name={info.icon} size={30} color={SHARED.logros} />
            </View>
          </View>
          <Text style={[theme.type.h3, { color: theme.colors.texto }]}>{info.title}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const SHEET_SPRING = { duration: 300, dampingRatio: 0.8 } as const;
const SNAP_BACK_SPRING = { duration: 400, dampingRatio: 0.8 } as const;
const DISMISS_DISTANCE_RATIO = 0.25;
const DISMISS_VELOCITY = 500;
const RUBBER_BAND_LIMIT = 80;

// Resistencia hacia arriba: se mueve cada vez menos y nunca pasa de RUBBER_BAND_LIMIT.
function rubberBand(distance: number) {
  'worklet';
  return RUBBER_BAND_LIMIT * (1 - 1 / ((distance * 0.55) / RUBBER_BAND_LIMIT + 1));
}

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
  // Desplazamiento del arrastre: positivo = hacia abajo, 1:1 con el dedo.
  const dragY = useSharedValue(0);
  const dragStart = useSharedValue(0);
  // Velocidad (en unidades de progress/s) que hereda el resorte de salida tras un flick.
  const releaseVelocity = useSharedValue(0);

  useEffect(() => {
    if (!mounted) return;
    const target = visible ? 1 : 0;
    if (visible) dragY.set(0);
    const velocity = releaseVelocity.get();
    releaseVelocity.set(0);
    const onFinish = (finished?: boolean) => {
      'worklet';
      if (finished && !visible) scheduleOnRN(setMounted, false);
    };
    progress.set(reduceMotion
      ? withTiming(target, { duration: 200, easing: EASE_OUT }, onFinish)
      : withSpring(target, { ...SHEET_SPRING, overshootClamping: !visible, velocity }, onFinish));
  }, [dragY, mounted, progress, reduceMotion, releaseVelocity, visible]);

  const dragGesture = usePanGesture({
    enabled: visible,
    hitSlop: { top: SPACE[16] },
    onActivate: () => {
      'worklet';
      cancelAnimation(dragY);
      dragStart.set(dragY.get());
    },
    onUpdate: event => {
      'worklet';
      const raw = dragStart.get() + event.translationY;
      dragY.set(raw >= 0 ? raw : -rubberBand(-raw));
    },
    onDeactivate: event => {
      'worklet';
      const height = Math.max(1, sheetHeight.get());
      const distance = dragY.get();
      const shouldDismiss = event.velocityY > DISMISS_VELOCITY
        || (distance > height * DISMISS_DISTANCE_RATIO && event.velocityY > -DISMISS_VELOCITY);
      if (!shouldDismiss) {
        dragY.set(reduceMotion
          ? withTiming(0, { duration: 200, easing: EASE_OUT })
          : withSpring(0, { ...SNAP_BACK_SPRING, velocity: event.velocityY }));
        return;
      }
      if (!reduceMotion) {
        // Pasa la posición del dedo al progress para que la salida continúe sin salto.
        progress.set(1 - distance / height);
        dragY.set(0);
        releaseVelocity.set(-Math.max(0, event.velocityY) / height);
      }
      scheduleOnRN(onClose);
    },
  });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, progress.get())) }));
  const sheetStyle = useAnimatedStyle(() => (reduceMotion
    ? { opacity: Math.min(1, Math.max(0, progress.get())), transform: [{ translateY: dragY.get() }] }
    : { opacity: 1, transform: [{ translateY: (1 - progress.get()) * sheetHeight.get() + dragY.get() }] }));

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} animationType="none">
      {/* En Android el contenido del Modal queda fuera del root de la app: necesita su propio root de gestos. */}
      <GestureHandlerRootView style={styles.flex}>
        <KeyboardAvoidingView
          style={[styles.sheetContainer, { pointerEvents: visible ? 'auto' : 'none' }]}
          behavior="padding"
        >
          <Animated.View style={[StyleSheet.absoluteFill, styles.sheetBackdrop, backdropStyle]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={StyleSheet.absoluteFill} />
          <Animated.View
            accessibilityViewIsModal
            onLayout={(event: LayoutChangeEvent) => sheetHeight.set(event.nativeEvent.layout.height)}
            style={[styles.sheet, { backgroundColor: theme.colors.fondoFin }, sheetStyle]}
          >
            {/* Faldón: cubre el hueco inferior cuando el resorte o la resistencia suben la hoja. */}
            <View pointerEvents="none" style={[styles.sheetSkirt, { backgroundColor: theme.colors.fondoFin }]} />
            {/* Zona de agarre: solo aquí se arrastra, para no competir con los ScrollView del contenido. */}
            <GestureDetector gesture={dragGesture}>
              <View style={styles.sheetHandleZone}>
                <View style={[styles.sheetHandle, { backgroundColor: theme.colors.textoInactivo }]} />
              </View>
            </GestureDetector>
            {visible ? children : shownChildren}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE[8] },
  pillButton: { minHeight: 52, minWidth: 52, paddingHorizontal: SPACE[20], borderRadius: RADIUS.pildora, overflow: 'hidden' },
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
  tabIcon: { width: 52, height: 32, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
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
  progressFill: { width: '100%', height: '100%', borderRadius: RADIUS.pildora },
  sectionCard: { padding: SPACE[20], gap: SPACE[8] },
  challengeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE[12], padding: SPACE[12], borderRadius: RADIUS.md, borderWidth: BORDER.tarjeta },
  challengeEmoji: { width: 48, height: 48, borderRadius: RADIUS.pildora, alignItems: 'center', justifyContent: 'center' },
  challengeCheck: { width: 44, height: 44, borderRadius: RADIUS.pildora, alignItems: 'center', justifyContent: 'center' },
  challengeClaim: { minHeight: 44, paddingHorizontal: SPACE[12] },
  homeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[12] },
  homeTile: { flexGrow: 1, flexBasis: '45%', minHeight: 156, borderRadius: RADIUS.habito, borderWidth: BORDER.tarjeta, padding: SPACE[16], gap: SPACE[8] },
  homeTileIcon: { width: 60, height: 60, borderRadius: RADIUS.pildora, alignItems: 'center', justifyContent: 'center' },
  homeTileText: { textAlign: 'center' },
  listRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: SPACE[12] },
  listIcon: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  waterPlot: { height: CHART_HEIGHT + 20, flexDirection: 'row', alignItems: 'flex-end', gap: SPACE[6], paddingTop: 20 },
  waterColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  waterBar: { width: '70%', borderTopLeftRadius: RADIUS.sm, borderTopRightRadius: RADIUS.sm },
  goalLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed' },
  goalLabel: { position: 'absolute', right: 0 },
  chartLabels: { flexDirection: 'row', gap: SPACE[6] },
  chartLabel: { flex: 1, textAlign: 'center' },
  donutRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACE[16] },
  donutLegend: { flex: 1, minWidth: 160, gap: SPACE[8] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE[8] },
  pillBar: { minHeight: 36, borderRadius: RADIUS.pildora, flexDirection: 'row', alignItems: 'center', gap: SPACE[8], paddingHorizontal: SPACE[12], overflow: 'hidden' },
  pillFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: RADIUS.pildora },
  loadingDots: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE[8] },
  loadingDot: { width: 12, height: 12, borderRadius: RADIUS.pildora },
  celebrationLayer: { alignItems: 'center', justifyContent: 'center' },
  celebrationCard: { alignItems: 'center', gap: SPACE[12], paddingVertical: SPACE[24], paddingHorizontal: SPACE[36], borderRadius: RADIUS.tarjeta },
  celebrationMedalWrap: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center' },
  celebrationRing: { position: 'absolute', width: 68, height: 68, borderRadius: RADIUS.pildora, borderWidth: BORDER.avatar },
  celebrationMedal: { width: 68, height: 68, borderRadius: RADIUS.pildora, borderWidth: BORDER.avatar, alignItems: 'center', justifyContent: 'center' },
  sheetContainer: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { backgroundColor: SHARED.fondoModal },
  sheet: { maxHeight: '90%', borderTopLeftRadius: RADIUS.hero, borderTopRightRadius: RADIUS.hero, padding: SPACE[20] },
  sheetSkirt: { position: 'absolute', top: '100%', left: 0, right: 0, height: 120 },
  sheetHandleZone: { position: 'absolute', top: 0, left: 0, right: 0, height: SPACE[20], alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  sheetHandle: { width: 36, height: 4, borderRadius: RADIUS.pildora, opacity: 0.6 },
});
