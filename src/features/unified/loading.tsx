import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ActivityAnimation } from './animations';
import { LoadingDots, useReduceMotion } from './design';
import { BORDER, RADIUS, SHARED, SPACE, tint, useAppTheme } from './tokens';

type Theme = ReturnType<typeof useAppTheme>;
type Variant = 'entrada' | 'sesion' | 'perfil' | 'actividad';
type Transition = { kind: 'perfil' | 'actividad'; owner: string; userId: string; visible: boolean };

const PHRASES: Record<Variant, readonly string[]> = {
  entrada: ['Preparando tu espacio familiar…', 'Despertando al jaguar…', 'Llenando los vasos de agua…', 'Acomodando los colores del plato…'],
  sesion: ['Cargando los perfiles de tu familia…', 'Revisando el menú de la semana…', 'Contando los puntos de hoy…', 'Sincronizando con tu cuenta…'],
  perfil: ['Preparando tu aventura…', 'Buscando tus logros…', 'Afilando las garras del jaguar…', 'Cada pequeño paso cuenta.'],
  actividad: ['¡Calentando motores!', 'Busca un espacio libre a tu alrededor.', 'Ponte cómodo y toma un poco de agua.', 'El jaguar está listo, ¿y tú?'],
};

const TIPS = [
  'Un vaso de agua al despertar ayuda a empezar el día con energía.',
  'Las frutas y verduras deben ocupar una buena parte del plato.',
  'Celebrar los pequeños logros motiva más que exigir.',
];

export function useLoadingVisibility(pending: boolean) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (pending && shownAt.current === null) {
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
    if (!pending && shownAt.current !== null) {
      const timer = setTimeout(() => {
        shownAt.current = null;
        setVisible(false);
      }, Math.max(0, 600 - (Date.now() - shownAt.current)));
      return () => clearTimeout(timer);
    }
  }, [pending]);

  return visible;
}

export function useLoadingTransition(reduceMotion: boolean) {
  const [transition, setTransition] = useState<Transition | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancel = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTransition(null);
  }, []);

  const start = useCallback((kind: Transition['kind'], owner: string, userId: string) => {
    cancel();
    if (reduceMotion) return;
    setTransition({ kind, owner, userId, visible: false });
    timers.current = [setTimeout(() => {
      setTransition(current => current ? { ...current, visible: true } : null);
      timers.current = [setTimeout(cancel, 600)];
    }, 300)];
  }, [cancel, reduceMotion]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!reduceMotion) return;
    const timer = setTimeout(cancel, 0);
    return () => clearTimeout(timer);
  }, [cancel, reduceMotion]);

  return { transition, start, cancel };
}

export function LoadingScreen({
  variant, theme, name, points, avatar, activity, fontsLoaded = true,
}: {
  variant: Variant;
  theme: Theme;
  name?: string;
  points?: number;
  avatar?: ReactNode;
  activity?: string;
  fontsLoaded?: boolean;
}) {
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(3);
  const opacity = useSharedValue(1);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    opacity.set(1);
    const timer = setInterval(() => {
      if (reduceMotion) {
        setIndex(current => (current + 1) % PHRASES[variant].length);
      } else {
        opacity.set(withTiming(0, { duration: 100 }));
        fadeTimer = setTimeout(() => {
          setIndex(current => (current + 1) % PHRASES[variant].length);
          opacity.set(withTiming(1, { duration: 100 }));
        }, 100);
      }
    }, 2500);
    return () => {
      clearInterval(timer);
      if (fadeTimer) clearTimeout(fadeTimer);
      cancelAnimation(opacity);
    };
  }, [opacity, reduceMotion, variant]);

  useEffect(() => {
    if (variant !== 'actividad') return;
    const timer = setInterval(() => setCount(current => Math.max(1, current - 1)), 200);
    return () => clearInterval(timer);
  }, [variant]);

  const dark = variant === 'entrada';
  const color = dark ? SHARED.tarjeta : theme.colors.texto;
  const heading = fontsLoaded ? theme.type.h1 : styles.fallbackHeading;
  const body = fontsLoaded ? theme.type.body : styles.fallbackBody;

  return (
    <View accessibilityLiveRegion="polite" style={[styles.container, { backgroundColor: dark ? theme.colors.hero : theme.colors.fondoInicio }]}>
      {variant === 'entrada' || variant === 'sesion' ? (
        <View style={[styles.logoHalo, { borderColor: dark ? tint(theme.colors.acento, 0.35) : theme.colors.acento, backgroundColor: dark ? tint(theme.colors.acento, 0.12) : SHARED.tarjeta }]}>
          <Image source={require('@/assets/images/wk-logo.png')} contentFit="contain" style={styles.logo} />
        </View>
      ) : null}
      {variant === 'entrada' ? (
        <View style={styles.center}>
          <Text style={[heading, { color }]}>Warrior Kids</Text>
          <Text style={[body, styles.brand, { color }]}>CRECEMOS EN FAMILIA</Text>
        </View>
      ) : null}
      {variant === 'sesion' ? (
        <>
          <Text style={[heading, styles.centerText, { color }]}>¡Qué gusto verte, {name || 'tutor'}!</Text>
          <View style={styles.card}>
            {['Cuenta verificada ✓', 'Perfiles', 'Menú de la semana'].map(item => (
              <Text key={item} style={[body, styles.listItem, { color }]}>{item}</Text>
            ))}
          </View>
          <View style={styles.card}>
            <Text style={[fontsLoaded ? theme.type.h3 : styles.fallbackHeading, { color: theme.colors.acento }]}>¿Sabías que…?</Text>
            <Text style={[body, { color }]}>{TIPS[index % TIPS.length]}</Text>
          </View>
        </>
      ) : null}
      {variant === 'perfil' ? (
        <>
          <View style={[styles.avatarHalo, { borderColor: theme.colors.bordeAvatar, backgroundColor: theme.colors.acentoSuave }]}>
            <Text style={[styles.star, styles.starLeft]}>★</Text>
            {avatar}
            <Text style={[styles.star, styles.starRight]}>★</Text>
          </View>
          <Text style={[heading, styles.centerText, { color }]}>¡Hola, {name}!</Text>
          <Text style={[body, { color }]}>{points ?? 0} puntos te esperan</Text>
        </>
      ) : null}
      {variant === 'actividad' && activity ? (
        <>
          <ActivityAnimation activity={activity} size={Math.max(1, Math.min(280, width - 48))} rounded />
          <Text style={[heading, styles.centerText, { color }]}>¡Calentando motores!</Text>
          <Text style={[heading, styles.count, { color: theme.colors.acento }]}>{count}</Text>
        </>
      ) : null}
      <Animated.View style={fade}>
        <Text style={[body, styles.centerText, { color }]}>{PHRASES[variant][index]}</Text>
      </Animated.View>
      {variant !== 'actividad' ? <LoadingDots theme={theme} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE[24], gap: SPACE[20] },
  center: { alignItems: 'center', gap: SPACE[4] },
  centerText: { textAlign: 'center' },
  brand: { letterSpacing: 2, textAlign: 'center' },
  logoHalo: { width: 150, height: 150, borderRadius: 75, borderWidth: BORDER.avatar, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 118, height: 118 },
  card: { width: '100%', maxWidth: 360, backgroundColor: SHARED.tarjeta, borderRadius: RADIUS.tarjeta, padding: SPACE[16], gap: SPACE[8] },
  listItem: { paddingVertical: SPACE[4] },
  avatarHalo: { width: 160, height: 160, borderRadius: 80, borderWidth: BORDER.avatar, alignItems: 'center', justifyContent: 'center' },
  star: { position: 'absolute', color: SHARED.estrella, fontSize: 28 },
  starLeft: { left: -12, top: 8 },
  starRight: { right: -12, bottom: 8 },
  count: { fontSize: 42, lineHeight: 50 },
  fallbackHeading: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  fallbackBody: { fontSize: 14, lineHeight: 20 },
});
