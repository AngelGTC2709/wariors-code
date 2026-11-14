// Escenas: una animación por actividad.
// `pose(x)` recibe el progreso del ciclo (0 → 1) y devuelve, por capa,
// { tx, ty, rot, sx, sy, op }. Todo es periódico: pose(0) === pose(1).

import { C, NO, JAGUAR, SHADOW, LUPA_ANGLE, path, circle, ellipse, rect, line, stroke } from './jaguar';
import type { Layer } from './jaguar';

export type Channel = 'tx' | 'ty' | 'rot' | 'sx' | 'sy' | 'op';
export type Pose = Record<string, Partial<Record<Channel, number>>>;
export type Scene = {
  key: string;
  title: string;
  a11y: string;
  duration: number;
  still: number;
  back: Layer[];
  front: Layer[];
  labels?: { id: string; text: string }[];
  pose: (x: number) => Pose;
};

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (v: number) => {
  v = clamp(v);
  return v * v * (3 - 2 * v);
};
const env = (u: number, f = 0.12) => ease(u / f) * ease((1 - u) / f); // entra y sale suave
const win = (x: number, a: number, b: number, f = 0.03) => ease((x - a) / f) * ease((b - x) / f);
const sin = (v: number) => Math.sin(TAU * v);
const blink = (x: number, centers: number[], w = 0.02) => {
  let s = 1;
  for (const c of centers) {
    const d = Math.abs(x - c) / w;
    if (d < 1) s = Math.min(s, 0.08 + 0.92 * d);
  }
  return s;
};
const bg = (color: string) => ({ id: 'bg', shapes: [rect(-20, -20, 240, 260, 0, color, NO)] });

// Destellos amarillos como los del logo
const spark = (cx: number, cy: number, dir: number) =>
  [-38, 0, 38].map((a) => {
    const ang = ((a + (dir < 0 ? 180 : 0)) * Math.PI) / 180;
    return line(cx + Math.cos(ang) * 5, cy + Math.sin(ang) * 5, cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 15, C.yellow, 5);
  });

const star = (cx: number, cy: number, r: number, color: string) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return path('M' + pts.join(' L') + ' Z', color, { sw: 2.6 });
};

// =====================================================================
// 1) BAILA TU CANCIÓN FAVORITA
// =====================================================================
const note = (x: number, y: number, color: string) => [
  ellipse(x, y, 6.5, 5, color, { sw: 3 }),
  line(x + 5.5, y - 1, x + 5.5, y - 24, C.outline, 3),
  stroke(`M${x + 5.5} ${y - 24} Q${x + 16} ${y - 20} ${x + 13} ${y - 10}`, C.outline, 3),
];
const NOTES = [
  { id: 'note0', x: 2, y: 168, color: C.band, phase: 0 },
  { id: 'note1', x: 178, y: 160, color: C.orange, phase: 0.33 },
  { id: 'note2', x: 186, y: 96, color: '#8C6CF0', phase: 0.66 },
];

export const baila: Scene = {
  key: 'baila',
  title: 'Baila tu canción favorita',
  a11y: 'El jaguar Warrior baila al ritmo de la música',
  duration: 2400,
  still: 0.125,
  back: [
    bg('#FFF3D9'),
    {
      id: 'decoBack',
      shapes: [
        path('M10 -20 L52 -20 L120 240 L40 240 Z', '#FFFFFF', { stroke: 'none', op: 0.45 }),
        path('M150 -20 L192 -20 L170 240 L92 240 Z', '#FFFFFF', { stroke: 'none', op: 0.35 }),
        ellipse(100, 236, 124, 18, '#FFE0A0', NO),
      ],
    },
  ],
  front: [
    ...NOTES.map((n) => ({ id: n.id, pivot: [n.x, n.y], shapes: note(n.x, n.y, n.color) })),
    { id: 'sparkL', pivot: [20, 34], shapes: spark(20, 34, -1) },
    { id: 'sparkR', pivot: [180, 34], shapes: spark(180, 34, 1) },
  ],
  pose(x: number) {
    const beat = Math.abs(Math.sin(4 * Math.PI * x)); // 4 rebotes por ciclo
    const sway = sin(2 * x);
    const squash = Math.cos(8 * Math.PI * x);
    const p: Pose = {
      root: { ty: -9 * beat, rot: 6 * sway, sx: 1 + 0.03 * squash, sy: 1 - 0.04 * squash },
      shadow: { sx: 1 - 0.12 * beat, sy: 1 - 0.12 * beat },
      armL: { rot: 62 + 52 * sway + 6 * sin(8 * x) },
      armR: { rot: -(62 - 52 * sway + 6 * sin(8 * x + 0.25)) },
      legL: { ty: -6 * Math.max(0, Math.sin(4 * Math.PI * x)) },
      legR: { ty: -6 * Math.max(0, -Math.sin(4 * Math.PI * x)) },
      head: { rot: -9 * sway },
      tail: { rot: 16 * sin(4 * x) },
      ribbon: { rot: 12 * sin(4 * x + 0.2) },
      mouthOpen: { op: 1 },
      mouthSmile: { op: 0 },
      eyesClosed: { op: win(x, 0.5, 0.75, 0.02) },
      eyesOpen: { op: 1 - win(x, 0.5, 0.75, 0.02) },
      sparkL: { sx: 0.7 + 0.45 * beat, sy: 0.7 + 0.45 * beat, op: 0.4 + 0.6 * beat },
      sparkR: { sx: 0.7 + 0.45 * beat, sy: 0.7 + 0.45 * beat, op: 0.4 + 0.6 * beat },
    };
    for (const n of NOTES) {
      const u = (x * 2 + n.phase) % 1;
      p[n.id] = { ty: -78 * u, tx: 7 * sin(u), rot: 14 * sin(2 * u), op: Math.sin(Math.PI * u) };
    }
    return p;
  },
};

// =====================================================================
// 2) IMITA ANIMALES  (pingüino → rana → gato)
// =====================================================================
const tuft = (x: number, y: number) => stroke(`M${x - 6} ${y} Q${x - 4} ${y - 9} ${x - 1} ${y - 12} M${x} ${y} L${x + 1} ${y - 14} M${x + 6} ${y} Q${x + 5} ${y - 8} ${x + 9} ${y - 11}`, '#5FB86A', 3);

export const imitaAnimales: Scene = {
  key: 'imita-animales',
  title: 'Imita animales',
  a11y: 'El jaguar Warrior camina como pingüino, salta como rana y se estira como gato',
  duration: 9000,
  still: 0.5,
  back: [
    bg('#E4F6EA'),
    {
      id: 'decoBack',
      shapes: [
        ellipse(100, 238, 130, 22, '#BFE7C9', NO),
        ellipse(14, 214, 30, 8, '#9ED8F0', { stroke: '#6FB9DA', sw: 2.5 }),
        circle(6, 211, 4, '#7CCB6E', { sw: 2 }),
        tuft(186, 222),
        tuft(40, 230),
        tuft(166, 236),
        circle(190, 196, 4, '#FF8FB1', { sw: 2 }),
        circle(198, 202, 4, '#FFC531', { sw: 2 }),
      ],
    },
  ],
  front: [],
  labels: [
    { id: 'label0', text: '🐧  Camina como pingüino' },
    { id: 'label1', text: '🐸  Salta como rana' },
    { id: 'label2', text: '🐱  Estírate como gato' },
  ],
  pose(x: number) {
    const p: Pose = {
      label0: { op: win(x, -0.05, 0.335) + win(x, 0.97, 1.4) },
      label1: { op: win(x, 0.335, 0.665) },
      label2: { op: win(x, 0.665, 1.0) },
    };
    const set = (id: string, v: Pose[string]) => (p[id] = { ...(p[id] || {}), ...v });

    if (x < 0.34) {
      // Pingüino: bamboleo con aletas rígidas
      const u = x / 0.34;
      const e = env(u);
      const w = sin(3 * u);
      set('root', { rot: 9 * w * e, ty: -3 * Math.abs(w) * e });
      set('legL', { ty: -6 * Math.max(0, w) * e });
      set('legR', { ty: -6 * Math.max(0, -w) * e });
      set('armL', { rot: (30 + 10 * sin(12 * u)) * e });
      set('armR', { rot: -(30 + 10 * sin(12 * u + 0.5)) * e });
      set('head', { rot: -5 * w * e });
      set('tail', { rot: 10 * w * e });
      set('ribbon', { rot: 8 * w * e });
      set('eyesOpen', { sy: blink(u, [0.55], 0.06) });
    } else if (x < 0.67) {
      // Rana: dos saltos con agachada
      const u = (x - 0.34) / 0.33;
      const v = (u * 2) % 1;
      const crouch =
        v < 0.3 ? ease(v / 0.3) : v < 0.4 ? 1 - ease((v - 0.3) / 0.1) : v < 0.75 ? 0 : v < 0.85 ? ease((v - 0.75) / 0.1) : 1 - ease((v - 0.85) / 0.15);
      const air = v > 0.32 && v < 0.78 ? Math.sin((Math.PI * (v - 0.32)) / 0.46) : 0;
      set('root', { ty: -17 * air, sy: 1 - 0.16 * crouch + 0.06 * air, sx: 1 + 0.1 * crouch - 0.03 * air });
      set('shadow', { sx: 1 - 0.35 * air + 0.08 * crouch, sy: 1 - 0.35 * air, op: 1 - 0.4 * air });
      set('armL', { rot: 118 * air - 12 * crouch });
      set('armR', { rot: -118 * air + 12 * crouch });
      set('legL', { rot: 22 * air });
      set('legR', { rot: -22 * air });
      set('tail', { rot: -18 * air });
      set('ribbon', { rot: -14 * air });
      set('mouthOpen', { op: clamp(air * 2) });
      set('mouthSmile', { op: 1 - clamp(air * 2) });
    } else {
      // Gato: gato y vaca, ojos cerrados y cola arriba
      const u = (x - 0.67) / 0.33;
      const e = env(u, 0.15);
      const w = sin(2 * u);
      set('root', { sy: 1 + 0.05 * w * e, sx: 1 - 0.02 * w * e });
      set('head', { ty: -5 * w * e, rot: 3 * w * e });
      set('armL', { rot: -10 * e });
      set('armR', { rot: 10 * e });
      set('tail', { rot: (-26 + 12 * sin(4 * u)) * e });
      set('ribbon', { rot: 6 * sin(3 * u) * e });
      set('eyesClosed', { op: e });
      set('eyesOpen', { op: 1 - e });
    }
    return p;
  },
};

// =====================================================================
// 3) PASEO PARA DESCUBRIR (camina con lupa, el paisaje se desplaza)
// =====================================================================
const tree = (x: number) => [
  rect(x - 5, 160, 10, 50, 3, '#9A6233', { sw: 3 }),
  circle(x - 14, 160, 14, '#5DBB63', { sw: 3 }),
  circle(x + 14, 160, 14, '#5DBB63', { sw: 3 }),
  circle(x, 146, 20, '#6CC870', { sw: 3 }),
];
const bush = (x: number) => [circle(x - 8, 208, 9, '#4FA85A', { sw: 3 }), circle(x + 6, 206, 11, '#5DBB63', { sw: 3 })];
const flower = (x: number, y: number, c: string) => [line(x, y, x, y + 12, '#3E8E48', 2.5), circle(x, y, 4.5, c, { sw: 2 }), circle(x, y, 1.6, C.yellow, NO)];

const forestTile = (o: number) => [
  ...tree(o + 0),
  ...bush(o + 70),
  ...tree(o + 150),
  ...flower(o + 40, 214, '#FF8FB1'),
  ...flower(o + 110, 222, '#8C6CF0'),
  ...flower(o + 196, 216, C.orange),
];
const hillsTile = (o: number) => [ellipse(o + 60, 206, 78, 48, '#BCE5A8', NO), ellipse(o + 120, 210, 60, 30, '#A9DB95', NO)];

export const paseo: Scene = {
  key: 'paseo',
  title: 'Paseo para descubrir',
  a11y: 'El jaguar Warrior camina por el bosque explorando con una lupa',
  duration: 3200,
  still: 0.125,
  back: [
    {
      id: 'sky',
      shapes: [
        rect(-20, -20, 240, 260, 0, '#DDF1FF', NO),
        circle(186, 14, 15, '#FFD45C', { stroke: '#F5B731', sw: 3 }),
        ellipse(30, 22, 22, 8, '#FFFFFF', NO),
        ellipse(44, 16, 14, 9, '#FFFFFF', NO),
      ],
    },
    { id: 'hills', span: 2, shapes: [-20, 100, 220, 340].flatMap(hillsTile) },
    { id: 'ground', shapes: [rect(-20, 206, 240, 40, 0, '#8FD07E', NO), ellipse(100, 236, 120, 12, '#E7C793', NO)] },
    { id: 'forest', span: 2, shapes: [-20, 220].flatMap(forestTile) },
  ],
  front: [
    {
      id: 'butterfly',
      pivot: [26, 66],
      children: [
        {
          id: 'wings',
          pivot: [26, 66],
          shapes: [
            ellipse(19, 61, 7, 8.5, '#FF8FB1', { sw: 2.5 }),
            ellipse(33, 61, 7, 8.5, '#FF8FB1', { sw: 2.5 }),
            ellipse(20, 71, 5, 5.5, '#FFC531', { sw: 2.5 }),
            ellipse(32, 71, 5, 5.5, '#FFC531', { sw: 2.5 }),
          ],
        },
        { id: 'bfBody', shapes: [ellipse(26, 66, 2.4, 8, C.outline, NO), stroke('M25 59 L22 53 M27 59 L30 53', C.outline, 1.6)] },
      ],
    },
  ],
  pose(x: number) {
    const step = Math.sin(4 * Math.PI * x); // 4 pasos por ciclo
    return {
      hills: { tx: -120 * x },
      forest: { tx: -240 * x },
      root: { ty: -4 * Math.abs(step), rot: 2 * step },
      shadow: { sx: 1 - 0.05 * Math.abs(step) },
      legL: { ty: -7 * Math.max(0, step) },
      legR: { ty: -7 * Math.max(0, -step) },
      armL: { rot: 16 * step },
      armR: { rot: LUPA_ANGLE + 4 * sin(4 * x) },
      lupa: { op: 1 },
      head: { rot: 6 * sin(x) },
      tail: { rot: 10 * step },
      ribbon: { rot: 9 * sin(8 * x) },
      eyesOpen: { sy: blink(x, [0.32, 0.82], 0.035) },
      butterfly: { tx: -8 + 20 * sin(x), ty: -30 + 9 * sin(2 * x) },
      wings: { sx: 0.35 + 0.65 * Math.abs(Math.cos(TAU * 8 * x)) },
    };
  },
};

// =====================================================================
// 4) ESTIRA COMO GIGANTE (sube brazos, crece y respira)
// =====================================================================
const stretchAmt = (x: number) =>
  x < 0.06 ? 0 : x < 0.4 ? ease((x - 0.06) / 0.34) : x < 0.62 ? 1 : x < 0.9 ? 1 - ease((x - 0.62) / 0.28) : 0;

export const estiraGigante: Scene = {
  key: 'estira-gigante',
  title: 'Estira como gigante',
  a11y: 'El jaguar Warrior sube los brazos y se estira muy alto',
  duration: 5200,
  still: 0.5,
  back: [
    bg('#EEE9FF'),
    {
      id: 'decoBack',
      shapes: [
        ellipse(100, 236, 120, 16, '#DCD2FF', NO),
        star(18, 150, 6, '#FFFFFF'),
        star(186, 176, 5, '#FFFFFF'),
        star(176, 110, 4, '#FFFFFF'),
      ],
    },
  ],
  front: [
    { id: 'star0', pivot: [32, 18], shapes: [star(32, 18, 10, C.yellow)] },
    { id: 'star1', pivot: [168, 14], shapes: [star(168, 14, 12, C.yellow)] },
    { id: 'star2', pivot: [100, 0], shapes: [star(100, 0, 8, '#FF8FB1')] },
  ],
  labels: [{ id: 'label0', text: '¡Más alto!' }],
  pose(x: number) {
    const s = stretchAmt(x);
    const hold = clamp((s - 0.85) / 0.15);
    const rest = 1 - s;
    const breath = 0.015 * sin(2 * x) * rest;
    const p: Pose = {
      root: { sy: 1 + 0.08 * s + breath, sx: 1 - 0.03 * s, ty: -6 * s },
      shadow: { sx: 1 - 0.1 * s },
      armL: { rot: 105 * s + 4 * sin(6 * x) * hold },
      armR: { rot: -105 * s - 4 * sin(6 * x + 0.5) * hold },
      head: { ty: -3 * s },
      tail: { rot: -22 * s + 4 * sin(3 * x) },
      ribbon: { rot: 7 * sin(3 * x) },
      eyesClosed: { op: hold },
      eyesOpen: { op: 1 - hold, sy: blink(x, [0.95], 0.02) },
      label0: { op: hold, ty: -6 * hold },
    };
    ['star0', 'star1', 'star2'].forEach((id, i) => {
      const pulse = 0.75 + 0.3 * Math.abs(sin(2 * x + i / 3));
      p[id] = { op: hold, sx: pulse * (0.5 + 0.5 * hold), sy: pulse * (0.5 + 0.5 * hold), rot: 40 * sin(x + i / 3) };
    });
    return p;
  },
};

export const SCENES = { baila, 'imita-animales': imitaAnimales, paseo, 'estira-gigante': estiraGigante };

// Orden de capas de cualquier escena: fondo → sombra → jaguar → frente
export const sceneLayers = (scene: Scene): Layer[] => [...scene.back, SHADOW, JAGUAR, ...scene.front];
