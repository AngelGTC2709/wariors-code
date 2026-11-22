// Jaguar Warrior Kids: piezas vectoriales del personaje.
// Son datos puros (sin React) para que el mismo dibujo sirva en React Native
// y en la vista previa web. Cada capa tiene un "pivot" (punto de giro).

export const VB = { x: -20, y: -20, w: 240, h: 260 }; // lienzo del personaje

export const C = {
  outline: '#1F2A44',
  fur: '#E9AE55',
  furLight: '#F8E0A8',
  ear: '#C9773A',
  spot: '#4A2C16',
  rosette: '#D3923E',
  band: '#27B4E6',
  orange: '#F06A2C',
  iris: '#8A4517',
  pupil: '#2A1408',
  nose: '#7B3A22',
  white: '#FFFFFF',
  yellow: '#FFC531',
  mouth: '#8B2B2B',
  tongue: '#F07C7C',
  wood: '#B8722E',
  glass: '#CDEBFF',
};

const O = C.outline;
export const NO = { stroke: 'none' };

export const path = (d, fill, x = {}) => ({ t: 'path', d, fill, stroke: O, sw: 4, ...x });
export const circle = (cx, cy, r, fill, x = {}) => ({ t: 'circle', cx, cy, r, fill, stroke: O, sw: 4, ...x });
export const ellipse = (cx, cy, rx, ry, fill, x = {}) => ({ t: 'ellipse', cx, cy, rx, ry, fill, stroke: O, sw: 4, ...x });
export const rect = (x0, y0, w, h, rx, fill, x = {}) => ({ t: 'rect', x: x0, y: y0, w, h, rx, fill, stroke: O, sw: 4, ...x });
export const line = (x1, y1, x2, y2, stroke, sw, x = {}) => ({ t: 'line', x1, y1, x2, y2, stroke, sw, cap: 'round', ...x });
export const stroke = (d, color, sw, x = {}) => ({ t: 'path', d, fill: 'none', stroke: color, sw, cap: 'round', ...x });

const dot = (cx, cy, r) => circle(cx, cy, r, C.spot, NO);
const rosette = (cx, cy, s = 1) =>
  ellipse(cx, cy, 5 * s, 4 * s, C.rosette, { stroke: C.spot, sw: 2.4 * s, dash: [5 * s, 2.5 * s] });

const f1 = (n) => Math.round(n * 10) / 10;

// ---------- Piezas ----------

function arm(side) {
  const L = side === 'L';
  const X = (x) => (L ? x : 200 - x);
  const sx = X(72), sy = 140, px = X(52), py = 182;
  // muñequera azul (rectángulo girado sobre el brazo)
  const ax = px - sx, ay = py - sy, len = Math.hypot(ax, ay);
  const ux = ax / len, uy = ay / len, vx = -uy, vy = ux;
  const bx = sx + ax * 0.72, by = sy + ay * 0.72;
  const pts = [[9, -3.8], [9, 3.8], [-9, 3.8], [-9, -3.8]].map(([a, b]) => [f1(bx + vx * a + ux * b), f1(by + vy * a + uy * b)]);
  const band = path('M' + pts.map((p) => p.join(' ')).join(' L') + ' Z', C.band, { sw: 3 });
  return [
    line(sx, sy, px, py, O, 20),
    line(sx, sy, px, py, C.fur, 13),
    dot(X(66), 153, 2.2),
    dot(X(61), 162, 1.8),
    band,
    circle(px, py, 11.5, C.fur),
    dot(X(51), 177.5, 1.8),
    line(X(47.5), 186, X(47.5), 191.5, O, 2.2),
    line(X(55), 187, X(55), 192.5, O, 2.2),
  ];
}

function leg(side) {
  const L = side === 'L';
  const X = (x) => (L ? x : 200 - x);
  return [
    rect(L ? 76 : 104, 176, 20, 46, 10, C.fur),
    dot(X(84), 196, 2.6),
    rosette(X(89), 207, 0.7),
    ellipse(X(84), 224, 15, 8.5, C.fur),
    line(X(79), 225.5, X(79), 230.5, O, 2.4),
    line(X(87), 225.5, X(87), 230.5, O, 2.4),
  ];
}

const TAIL_D = 'M120 194 C146 206 168 192 163 164';
const tail = [
  stroke(TAIL_D, O, 15),
  stroke(TAIL_D, C.fur, 9),
  dot(141, 200.5, 2.4),
  dot(156, 192, 2.2),
  circle(163, 164, 4.6, C.spot, NO),
];

const body = [
  path('M70 134 C62 160 66 190 84 200 L116 200 C134 190 138 160 130 134 C120 124 80 124 70 134 Z', C.fur),
  ellipse(100, 170, 19, 24, C.furLight, NO),
  rosette(78, 160, 0.8),
  rosette(122, 160, 0.8),
  dot(79, 180, 2.5),
  dot(121, 181, 2.5),
  dot(77, 146, 2.2),
  dot(123, 146, 2.2),
];

const ribbon = [
  path('M148 66 C164 61 180 67 191 80 C183 80 176 82 170 87 C164 79 158 77 148 77 Z', C.band, { sw: 3.5 }),
  path('M148 74 C161 78 170 90 173 105 C167 101 161 101 155 103 C155 93 152 85 146 80 Z', C.orange, { sw: 3.5 }),
];

const headBase = [
  // mechón, orejas y mejillas (detrás de la cabeza)
  path('M80 48 C77 36 81 26 87 21 C88 29 92 31 96 27 C96 19 100 13 107 10 C104 18 107 25 112 25 C114 21 119 18 125 20 C120 27 122 37 121 48 Z', C.fur),
  circle(54, 46, 19, C.fur),
  circle(55, 48, 10, C.ear, NO),
  circle(146, 46, 19, C.fur),
  circle(145, 48, 10, C.ear, NO),
  path('M52 94 L34 102 L48 107 L36 116 L58 117 Z', C.fur),
  path('M148 94 L166 102 L152 107 L164 116 L142 117 Z', C.fur),
  // cabeza
  path('M44 86 C42 54 68 36 100 36 C132 36 158 54 156 86 C155 112 132 130 100 130 C68 130 45 112 44 86 Z', C.fur),
  path('M62 96 C62 78 80 74 100 82 C120 74 138 78 138 96 C138 114 120 125 100 125 C80 125 62 114 62 96 Z', C.furLight, NO),
  // manchas
  rosette(70, 56, 0.85),
  rosette(130, 56, 0.85),
  dot(56, 92, 2.4),
  dot(144, 92, 2.4),
  rosette(55, 74, 0.7),
  rosette(145, 74, 0.7),
  dot(60, 106, 2),
  dot(140, 106, 2),
  dot(100, 42, 2.2),
  // banda de guerrero con gema
  path('M45 63 C72 45 128 45 155 63 L156 78 C128 61 72 61 44 78 Z', C.band),
  stroke('M58 60 C80 51 120 51 142 60', C.white, 2.4, { op: 0.5 }),
  path('M100 49 L111 60 L100 71 L89 60 Z', C.white, { sw: 3 }),
  path('M100 54 L106 60 L100 66 L94 60 Z', C.orange, NO),
  // cejas decididas
  stroke('M65 81 Q77 72 90 79', O, 5),
  stroke('M110 79 Q123 72 135 81', O, 5),
  // nariz y bigotes
  path('M92 104 Q100 100 108 104 Q105 111 100 112 Q95 111 92 104 Z', C.nose, { sw: 3 }),
  dot(86, 111, 1.4),
  dot(82, 115, 1.4),
  dot(114, 111, 1.4),
  dot(118, 115, 1.4),
  line(72, 113, 58, 110, O, 2),
  line(128, 113, 142, 110, O, 2),
];

const eye = (cx, ix) => [
  ellipse(cx, 91, 12, 13, C.white, { sw: 3 }),
  circle(ix, 93, 8.5, C.iris, NO),
  circle(ix, 93, 4.6, C.pupil, NO),
  circle(ix + 3, 89, 3, C.white, NO),
  circle(ix - 3, 97, 1.4, C.white, NO),
];
const eyesOpen = [...eye(80, 81), ...eye(120, 119)];
const eyesClosed = [stroke('M70 94 Q80 83 90 94', O, 4.5), stroke('M110 94 Q120 83 130 94', O, 4.5)];

const mouthSmile = [stroke('M100 112 L100 116 M88 115 Q94 123 100 116 Q106 123 112 115', O, 3)];
const mouthOpen = [
  line(100, 112, 100, 115, O, 3),
  path('M87 115 Q100 117 113 115 Q111 129 100 129 Q89 129 87 115 Z', C.mouth, { sw: 3 }),
  ellipse(100, 124.5, 6, 3.4, C.tongue, NO),
];

// Lupa sujeta en la mano derecha. `held` = giro (grados) que tendrá el brazo,
// para que el mango quede vertical cuando el brazo esté levantado.
function lupa(held) {
  const px = 148, py = 182;
  const a = ((-90 - held) * Math.PI) / 180;
  const hx = px + Math.cos(a) * 28, hy = py + Math.sin(a) * 28;
  const lx = px + Math.cos(a) * 40, ly = py + Math.sin(a) * 40;
  return [
    line(px, py, hx, hy, O, 9),
    line(px, py, hx, hy, C.wood, 4.5),
    circle(lx, ly, 13, C.glass, { stroke: O, sw: 9 }),
    circle(lx, ly, 13, 'none', { stroke: C.orange, sw: 4 }),
    stroke(`M${f1(lx - 7)} ${f1(ly - 2)} Q${f1(lx - 6)} ${f1(ly - 7)} ${f1(lx - 1)} ${f1(ly - 8)}`, C.white, 2.6),
  ];
}
export const LUPA_ANGLE = -65;

export const SHADOW = {
  id: 'shadow',
  pivot: [100, 232],
  shapes: [ellipse(100, 232, 46, 7, O, { stroke: 'none', op: 0.16 })],
};

export const JAGUAR = {
  id: 'root',
  pivot: [100, 230],
  children: [
    { id: 'tail', pivot: [121, 194], shapes: tail },
    { id: 'legL', pivot: [86, 186], shapes: leg('L') },
    { id: 'legR', pivot: [114, 186], shapes: leg('R') },
    { id: 'body', shapes: body },
    {
      id: 'head',
      pivot: [100, 128],
      children: [
        { id: 'ribbon', pivot: [150, 72], shapes: ribbon },
        { id: 'headBase', shapes: headBase },
        { id: 'eyesOpen', pivot: [100, 91], shapes: eyesOpen },
        { id: 'eyesClosed', pivot: [100, 91], shapes: eyesClosed, op: 0 },
        { id: 'mouthSmile', shapes: mouthSmile },
        { id: 'mouthOpen', pivot: [100, 115], shapes: mouthOpen, op: 0 },
      ],
    },
    { id: 'armL', pivot: [72, 140], shapes: arm('L') },
    {
      id: 'armR',
      pivot: [128, 140],
      children: [
        { id: 'lupa', shapes: lupa(LUPA_ANGLE), op: 0 },
        { id: 'armRBody', shapes: arm('R') },
      ],
    },
  ],
};
