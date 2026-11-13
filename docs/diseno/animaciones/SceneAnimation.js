// Renderer React Native de las escenas.
// - Cada capa es un <Animated.View> con su propio <Svg>; brazos, cabeza, etc.
//   giran sobre su pivot con transformaciones nativas (useNativeDriver: true).
// - La pose de cada escena se muestrea una vez y se convierte en interpolaciones
//   de un solo Animated.Value en bucle, así la animación corre en el hilo nativo.
// Dependencias: react-native-svg.

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { VB } from './jaguar';
import { sceneLayers } from './scenes';

const DEFAULTS = { tx: 0, ty: 0, rot: 0, sx: 1, sy: 1, op: 1 };
const CHANNELS = Object.keys(DEFAULTS);

function Shape({ s }) {
  const common = {
    fill: s.fill,
    stroke: s.stroke === 'none' ? undefined : s.stroke,
    strokeWidth: s.stroke === 'none' ? 0 : s.sw,
    strokeLinecap: s.cap || 'round',
    strokeLinejoin: 'round',
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

const LayerSvg = memo(function LayerSvg({ shapes, w, h, span }) {
  return (
    <Svg width={w} height={h} viewBox={`${VB.x} ${VB.y} ${VB.w * span} ${VB.h}`}>
      {shapes.map((s, i) => (
        <Shape key={i} s={s} />
      ))}
    </Svg>
  );
});

function flatten(layers, out = []) {
  for (const l of layers) {
    out.push(l);
    if (l.children) flatten(l.children, out);
  }
  return out;
}

// Convierte la función pose(x) en estilos animados por capa.
function buildStyles(scene, allLayers, t, k, W, H) {
  const N = Math.max(60, Math.round(scene.duration / 30));
  const xs = Array.from({ length: N + 1 }, (_, i) => i / N);
  const samples = xs.map((x) => scene.pose(x) || {});
  const styles = {};

  for (const layer of allLayers) {
    const ch = {};
    for (const c of CHANNELS) {
      const base = c === 'op' && layer.op !== undefined ? layer.op : DEFAULTS[c];
      const vals = samples.map((p) => (p[layer.id] && p[layer.id][c] !== undefined ? p[layer.id][c] : base));
      const constant = vals.every((v) => Math.abs(v - vals[0]) < 1e-4);
      if (constant && Math.abs(vals[0] - DEFAULTS[c]) < 1e-4) continue;
      const fmt = (v) => (c === 'rot' ? `${v.toFixed(3)}deg` : c === 'tx' || c === 'ty' ? v * k : v);
      ch[c] = constant ? fmt(vals[0]) : t.interpolate({ inputRange: xs, outputRange: vals.map(fmt) });
    }
    if (!Object.keys(ch).length) continue;

    const span = layer.span || 1;
    const bw = W * span;
    const tr = [];
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
    const st = {};
    if (tr.length) st.transform = tr;
    if (ch.op !== undefined) st.opacity = ch.op;
    styles[layer.id] = st;
  }
  return styles;
}

function Layer({ layer, styles, W, H, k }) {
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

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => alive && setReduce(!!v));
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduce(!!v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

/**
 * Muestra una escena animada.
 * @param scene    una de las escenas de ./scenes
 * @param size     ancho en px (el alto se calcula solo)
 * @param playing  false = cuadro fijo (útil para miniaturas)
 */
export function SceneAnimation({ scene, size = 220, playing = true, style, rounded = true }) {
  const W = size;
  const H = (size * VB.h) / VB.w;
  const k = W / VB.w;
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(scene.still ?? 0)).current;

  const layers = useMemo(() => sceneLayers(scene), [scene]);
  const allLayers = useMemo(() => [...flatten(layers), ...(scene.labels || [])], [layers, scene]);
  const styles = useMemo(() => buildStyles(scene, allLayers, t, k, W, H), [scene, allLayers, t, k, W, H]);

  useEffect(() => {
    if (!playing || reduce) {
      t.stopAnimation();
      t.setValue(scene.still ?? 0);
      return undefined;
    }
    t.setValue(0);
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: scene.duration, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [playing, reduce, scene, t]);

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
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#1F2A44',
  },
  chipText: { color: '#1F2A44', fontWeight: '700' },
});
