// Renderer React Native de las escenas.
// - Cada capa es un <Animated.View> con su propio <Svg>; brazos, cabeza, etc.
//   giran sobre su pivot con transformaciones nativas (useNativeDriver: true).
// - La pose de cada escena se muestrea una vez y se convierte en interpolaciones
//   de un solo Animated.Value en bucle, así la animación corre en el hilo nativo.
// Dependencias: react-native-svg.

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { BORDER, RADIUS, SHARED } from '../tokens';
import { useReduceMotion } from '../motion';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { VB, type Layer as SceneLayer, type Shape as SceneShape } from './jaguar';
import { sceneLayers } from './scenes';
import type { Channel, Scene } from './scenes';

const DEFAULTS = { tx: 0, ty: 0, rot: 0, sx: 1, sy: 1, op: 1 };
const CHANNELS: Channel[] = ['tx', 'ty', 'rot', 'sx', 'sy', 'op'];
type NumericValue = number | Animated.AnimatedInterpolation<number>;
type RotationValue = `${number}deg` | Animated.AnimatedInterpolation<string>;
type LayerStyle = Animated.WithAnimatedValue<ViewStyle>;
type LayerStyles = Record<string, LayerStyle>;

function Shape({ s }: { s: SceneShape }) {
  const common = {
    fill: s.fill,
    stroke: s.stroke === 'none' ? undefined : s.stroke,
    strokeWidth: s.stroke === 'none' ? 0 : s.sw,
    strokeLinecap: s.cap || 'round',
    strokeLinejoin: 'round' as const,
    strokeDasharray: s.dash,
    opacity: s.op,
  };
  switch (s.t) {
    case 'path':
      return <Path d={s.d} {...common} />;
    case 'circle':
      return <Circle cx={s.cx} cy={s.cy} r={s.r} {...common} />;
    case 'ellipse':
      return <Ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />;
    case 'rect':
      return <Rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} ry={s.rx} {...common} />;
    case 'line':
      return <Line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...common} />;
    default:
      return null;
  }
}

const LayerSvg = memo(function LayerSvg({ shapes, w, h, span }: { shapes: SceneShape[]; w: number; h: number; span: number }) {
  return (
    <Svg width={w} height={h} viewBox={`${VB.x} ${VB.y} ${VB.w * span} ${VB.h}`}>
      {shapes.map((s, i) => (
        <Shape key={i} s={s} />
      ))}
    </Svg>
  );
});

function flatten(layers: SceneLayer[], out: SceneLayer[] = []): SceneLayer[] {
  for (const l of layers) {
    out.push(l);
    if (l.children) flatten(l.children, out);
  }
  return out;
}

// Convierte la función pose(x) en estilos animados por capa.
function buildStyles(scene: Scene, allLayers: SceneLayer[], t: Animated.Value, k: number, W: number, H: number, staticFrame: boolean): LayerStyles {
  const N = Math.max(60, Math.round(scene.duration / 30));
  const xs = staticFrame ? [scene.still] : Array.from({ length: N + 1 }, (_, i) => i / N);
  const samples = xs.map((x) => scene.pose(x) || {});
  const styles: LayerStyles = {};

  for (const layer of allLayers) {
    const ch: { tx?: NumericValue; ty?: NumericValue; rot?: RotationValue; sx?: NumericValue; sy?: NumericValue; op?: NumericValue } = {};
    for (const c of CHANNELS) {
      const base = c === 'op' && layer.op !== undefined ? layer.op : DEFAULTS[c];
      const vals = samples.map((p) => p[layer.id]?.[c] ?? base);
      const constant = vals.every((v) => Math.abs(v - vals[0]) < 1e-4);
      if (constant && Math.abs(vals[0] - DEFAULTS[c]) < 1e-4) continue;
      if (c === 'rot') {
        const angles = vals.map(v => `${Number(v.toFixed(3))}deg` as const);
        ch.rot = constant ? angles[0] : t.interpolate({ inputRange: xs, outputRange: angles });
      } else {
        const values = vals.map(v => c === 'tx' || c === 'ty' ? v * k : v);
        ch[c] = constant ? values[0] : t.interpolate({ inputRange: xs, outputRange: values });
      }
    }
    if (!Object.keys(ch).length) continue;

    const span = layer.span || 1;
    const bw = W * span;
    const tr: ({ translateX: NumericValue } | { translateY: NumericValue } | { rotate: RotationValue } |
      { scaleX: NumericValue } | { scaleY: NumericValue })[] = [];
    if (ch.tx !== undefined) tr.push({ translateX: ch.tx });
    if (ch.ty !== undefined) tr.push({ translateY: ch.ty });
    const turns = ch.rot !== undefined || ch.sx !== undefined || ch.sy !== undefined;
    if (turns) {
      const piv = layer.pivot || [VB.x + (VB.w * span) / 2, VB.y + VB.h / 2];
      const dx = (piv[0] - VB.x) * k - bw / 2;
      const dy = (piv[1] - VB.y) * k - H / 2;
      tr.push({ translateX: dx }, { translateY: dy });
      if (ch.rot !== undefined) tr.push({ rotate: ch.rot });
      if (ch.sx !== undefined) tr.push({ scaleX: ch.sx });
      if (ch.sy !== undefined) tr.push({ scaleY: ch.sy });
      tr.push({ translateX: -dx }, { translateY: -dy });
    }
    styles[layer.id] = {
      ...(tr.length ? { transform: tr } : {}),
      ...(ch.op !== undefined ? { opacity: ch.op } : {}),
    };
  }
  return styles;
}

function Layer({ layer, styles, W, H, k }: { layer: SceneLayer; styles: LayerStyles; W: number; H: number; k: number }) {
  const span = layer.span || 1;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, top: 0, width: W * span, height: H }, styles[layer.id]]}
    >
      {layer.shapes && layer.shapes.length ? <LayerSvg shapes={layer.shapes} w={W * span} h={H} span={span} /> : null}
      {layer.children
        ? layer.children.map((c) => <Layer key={c.id} layer={c} styles={styles} W={W} H={H} k={k} />)
        : null}
    </Animated.View>
  );
}

/**
 * Muestra una escena animada.
 * @param scene    una de las escenas de ./scenes
 * @param size     ancho en px (el alto se calcula solo)
 * @param playing  false = cuadro fijo (útil para miniaturas)
 */
export function SceneAnimation({ scene, size = 220, playing = true, style, rounded = true, staticFrame = false }: {
  scene: Scene;
  size?: number;
  playing?: boolean;
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
  staticFrame?: boolean;
}) {
  const W = size;
  const H = (size * VB.h) / VB.w;
  const k = W / VB.w;
  const reduce = useReduceMotion();
  const [t] = useState(() => new Animated.Value(scene.still));
  const hasStarted = useRef(false);

  const layers = useMemo(() => sceneLayers(scene), [scene]);
  const allLayers = useMemo(() => [...flatten(layers), ...(scene.labels || [])], [layers, scene]);
  const styles = useMemo(() => buildStyles(scene, allLayers, t, k, W, H, staticFrame), [scene, allLayers, t, k, W, H, staticFrame]);

  useEffect(() => {
    hasStarted.current = false;
    t.setValue(scene.still);
  }, [scene, t]);

  useEffect(() => {
    if (reduce || staticFrame) {
      t.stopAnimation();
      t.setValue(scene.still);
      hasStarted.current = false;
      return undefined;
    }
    if (!playing) {
      t.stopAnimation();
      return undefined;
    }
    let stopped = false;
    let loop: Animated.CompositeAnimation | undefined;
    t.stopAnimation(value => {
      if (stopped) return;
      const start = hasStarted.current ? value : 0;
      hasStarted.current = true;
      t.setValue(start);
      Animated.timing(t, {
        toValue: 1, duration: Math.max(0, (1 - start) * scene.duration), easing: Easing.linear, useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || stopped) return;
        t.setValue(0);
        loop = Animated.loop(Animated.timing(t, {
          toValue: 1, duration: scene.duration, easing: Easing.linear, useNativeDriver: true,
        }));
        loop.start();
      });
    });
    return () => {
      stopped = true;
      loop?.stop();
      t.stopAnimation();
    };
  }, [playing, reduce, scene, staticFrame, t]);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={scene.a11y}
      style={[{ width: W, height: H, overflow: 'hidden', borderRadius: rounded ? size * 0.1 : 0 }, style]}
    >
      {layers.map((l) => (
        <Layer key={l.id} layer={l} styles={styles} W={W} H={H} k={k} />
      ))}
      {(scene.labels || []).map((lb) => (
        <Animated.View key={lb.id} pointerEvents="none" style={[s.labelWrap, { top: size * 0.04 }, styles[lb.id]]}>
          <View style={[s.chip, { paddingHorizontal: size * 0.05, paddingVertical: size * 0.022 }]}>
            <Text style={[s.chipText, { fontSize: Math.max(10, size * 0.058) }]}>{lb.text}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  labelWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  chip: {
    backgroundColor: SHARED.tarjeta,
    borderRadius: RADIUS.pildora,
    borderWidth: BORDER.chip,
    borderColor: SHARED.textoFuerte,
  },
  chipText: { color: SHARED.textoFuerte, fontWeight: '700' },
});
