import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  type PressableStateCallbackType,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion as useReanimatedReduceMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { useSoundEffects } from './sound-effects';
import { RADIUS, sharedFor, type ThemeMode, useThemeMode } from './tokens';

export function useReduceMotion() {
  const initialPreference = useReanimatedReduceMotion();
  const [reduceMotion, setReduceMotion] = useState(initialPreference);

  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      setReduceMotion(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !changed) setReduceMotion(value);
    }).catch(error => {
      if (__DEV__) console.warn('No se pudo consultar la preferencia de movimiento reducido.', error);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedPress({
  children,
  onPress,
  label,
  selected,
  disabled = false,
  pressedScale = 0.96,
  hitSlop,
  silent = false,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  pressedScale?: number;
  hitSlop?: number;
  silent?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = MOTION_STYLES[useThemeMode()];
  const reduceMotion = useReduceMotion();
  const { playTap } = useSoundEffects();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(scale);
      scale.set(1);
    }
  }, [reduceMotion, scale]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      aria-selected={selected}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={() => {
        if (!silent) playTap();
        onPress();
      }}
      onPressIn={() => { if (!reduceMotion) scale.set(withSpring(pressedScale)); }}
      onPressOut={() => { if (!reduceMotion) scale.set(withSpring(1)); }}
      style={[styles.pressable, style, animatedStyle]}
    >
      {({ pressed }: PressableStateCallbackType) => (
        <>
          {children}
          {pressed && !disabled ? <View pointerEvents="none" style={styles.pressedOverlay} /> : null}
        </>
      )}
    </AnimatedPressable>
  );
}

// Estilos en versión clara y oscura; los componentes toman la del modo actual.
function createMotionStyles(mode: ThemeMode) {
  const SHARED = sharedFor(mode);
  return StyleSheet.create({
  pressable: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: RADIUS.pildora },
  pressedOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: SHARED.presionado },
  });
}
const MOTION_STYLES = { light: createMotionStyles('light'), dark: createMotionStyles('dark') };
