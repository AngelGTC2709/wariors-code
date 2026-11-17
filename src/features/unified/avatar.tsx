import { Fragment, type ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { AvatarSelection } from './model';

// Catálogo del avatar. Cada prenda se desbloquea sola cuando el perfil junta sus puntos
// (no se gastan). Los índices son los que se guardan en `avatarSelections`, así que solo
// se agregan elementos al final; nunca se reordenan.
export type AvatarItem = { label: string; cost: number };
type ClothingKind = 'playera' | 'sueter' | 'sudadera' | 'vestido';
type Clothing = AvatarItem & { kind: ClothingKind; color: string; trim: string };

export const SKIN_TONES: (AvatarItem & { color: string })[] = [
  { label: 'Tono 1', cost: 0, color: '#F8D5B8' },
  { label: 'Tono 2', cost: 0, color: '#E6B98E' },
  { label: 'Tono 3', cost: 0, color: '#C88C61' },
  { label: 'Tono 4', cost: 0, color: '#A96845' },
  { label: 'Tono 5', cost: 0, color: '#805137' },
  { label: 'Tono 6', cost: 0, color: '#57392E' },
  { label: 'Tono 7', cost: 0, color: '#3D2720' },
];

export const HAIRSTYLES: AvatarItem[] = [
  { label: 'Corto', cost: 0 },
  { label: 'Lacio largo', cost: 0 },
  { label: 'Trenzas', cost: 0 },
  { label: 'Afro', cost: 0 },
  { label: 'Coletas', cost: 100 },
  { label: 'Rizos', cost: 150 },
  { label: 'Chongo', cost: 200 },
];

export const OUTFITS: Clothing[] = [
  { label: 'Playera menta', cost: 0, kind: 'playera', color: '#7FD6B8', trim: '#5BB898' },
  { label: 'Suéter lila', cost: 0, kind: 'sueter', color: '#B79CE8', trim: '#9A7DD6' },
  { label: 'Playera azul', cost: 0, kind: 'playera', color: '#7FB3E8', trim: '#5E95CF' },
  { label: 'Vestido rosa', cost: 0, kind: 'vestido', color: '#F28DB2', trim: '#E06A95' },
  { label: 'Vestido lila', cost: 0, kind: 'vestido', color: '#A98BE0', trim: '#8C6DCC' },
  { label: 'Playera naranja', cost: 0, kind: 'playera', color: '#F6A65A', trim: '#E08A3C' },
  { label: 'Sudadera morada', cost: 250, kind: 'sudadera', color: '#8E6BD8', trim: '#7352BE' },
  { label: 'Sudadera café', cost: 250, kind: 'sudadera', color: '#B88355', trim: '#9A6A40' },
  { label: 'Vestido coral', cost: 300, kind: 'vestido', color: '#F27C6B', trim: '#D9604F' },
  { label: 'Vestido amarillo', cost: 300, kind: 'vestido', color: '#F5CD52', trim: '#DDB136' },
];

export const ACCESSORIES: AvatarItem[] = [
  { label: 'Sin accesorio', cost: 0 },
  { label: 'Moño', cost: 0 },
  { label: 'Diadema', cost: 0 },
  { label: 'Gafas de sol', cost: 50 },
  { label: 'Gorra', cost: 80 },
  { label: 'Sombrero', cost: 100 },
  { label: 'Collar', cost: 120 },
  { label: 'Corona', cost: 200 },
];

export const AVATAR_BACKGROUNDS = ['#FFF0F5', '#F0FAF5', '#EAF4FF', '#F0EEFF', '#FFFBEA', '#F5F0FF'];

export const AVATAR_CATALOG = {
  piel: SKIN_TONES,
  cabello: HAIRSTYLES,
  ropa: OUTFITS,
  accesorio: ACCESSORIES,
} satisfies Record<Exclude<keyof AvatarSelection, 'fondo'>, AvatarItem[]>;

export type AvatarPart = keyof typeof AVATAR_CATALOG;

export function isUnlocked(item: AvatarItem | undefined, points: number): boolean {
  return Boolean(item) && points >= (item?.cost ?? 0);
}

const HAIR = '#3A2A24';
const INK = '#2B1D17';
const CHEEK = '#FF8FA3';
const JEANS = '#5B7DB1';
const SHOES = '#4A4A5A';
const TIE = '#FF5C93';

function hairBack(style: number): ReactNode {
  switch (style) {
    case 1: return <Path d="M35 40 Q33 94 42 96 L78 96 Q87 94 85 40 Z" fill={HAIR} />;
    case 3: return <Circle cx={60} cy={40} r={33} fill={HAIR} />;
    case 4: return (
      <>
        <Circle cx={31} cy={30} r={12} fill={HAIR} />
        <Circle cx={89} cy={30} r={12} fill={HAIR} />
        <Circle cx={40} cy={35} r={3} fill={TIE} />
        <Circle cx={80} cy={35} r={3} fill={TIE} />
      </>
    );
    case 5: return [[36, 30], [43, 18], [54, 12], [66, 12], [77, 18], [84, 30], [86, 44], [85, 58], [81, 70], [34, 44], [35, 58], [39, 70]]
      .map(([cx, cy]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={9} fill={HAIR} />);
    case 6: return (
      <>
        <Circle cx={60} cy={15} r={11} fill={HAIR} />
        <Rect x={52} y={22} width={16} height={4} rx={2} fill={TIE} />
      </>
    );
    default: return null;
  }
}

function hairFront(style: number): ReactNode {
  const cap = <Path d="M36 46 Q35 21 60 20 Q85 21 84 46 Q80 33 67 31 Q60 36 50 31 Q40 34 36 46 Z" fill={HAIR} />;
  if (style === 2) {
    // Las trenzas van al frente para que los brazos no las tapen.
    return (
      <>
        {cap}
        {[38, 82].map(x => (
          <G key={x}>
            {[58, 67, 76, 85, 94].map(y => <Circle key={y} cx={x} cy={y} r={5.5} fill={HAIR} />)}
            <Circle cx={x} cy={102} r={3} fill={TIE} />
          </G>
        ))}
      </>
    );
  }
  if (style === 5) {
    return (
      <>
        {cap}
        {[[44, 27], [55, 23], [66, 23], [77, 28]].map(([cx, cy]) => <Circle key={cx} cx={cx} cy={cy} r={7} fill={HAIR} />)}
      </>
    );
  }
  return cap;
}

function accessory(index: number): ReactNode {
  switch (index) {
    case 1: return (
      <>
        <Path d="M77 24 L65 16 L65 32 Z" fill={TIE} />
        <Path d="M77 24 L89 16 L89 32 Z" fill={TIE} />
        <Circle cx={77} cy={24} r={3.5} fill="#E0457A" />
      </>
    );
    case 2: return <Path d="M37 36 Q60 12 83 36" stroke="#9B6BDF" strokeWidth={4} strokeLinecap="round" fill="none" />;
    case 3: return (
      <>
        <Rect x={43} y={42} width={15} height={11} rx={4} fill="#2D2A32" />
        <Rect x={62} y={42} width={15} height={11} rx={4} fill="#2D2A32" />
        <Path d="M58 46 H62" stroke="#2D2A32" strokeWidth={2.4} />
      </>
    );
    case 4: return (
      <>
        <Path d="M35 38 Q36 13 60 13 Q84 13 85 38 Z" fill="#E2574C" />
        <Path d="M78 36 Q96 35 99 40 Q90 43 76 41 Z" fill="#C2423A" />
        <Circle cx={60} cy={14} r={2.5} fill="#C2423A" />
      </>
    );
    case 5: return (
      <>
        <Ellipse cx={60} cy={30} rx={34} ry={6} fill="#7B5BD6" />
        <Path d="M42 30 Q42 7 60 7 Q78 7 78 30 Z" fill="#7B5BD6" />
        <Rect x={42} y={21} width={36} height={5} fill="#FFC94D" />
      </>
    );
    case 6: return (
      <>
        <Path d="M48 77 Q60 92 72 77" stroke="#E8B53A" strokeWidth={2.2} fill="none" />
        <Circle cx={60} cy={89} r={3.6} fill="#E8B53A" />
      </>
    );
    case 7: return <Path d="M42 25 L46 8 L53 18 L60 4 L67 18 L74 8 L78 25 Z" fill="#F6C445" stroke="#E0A82E" strokeWidth={1.5} strokeLinejoin="round" />;
    default: return null;
  }
}

function body(skin: string, outfit: Clothing): ReactNode {
  const longSleeves = outfit.kind === 'sueter' || outfit.kind === 'sudadera';
  const dress = outfit.kind === 'vestido';
  return (
    <>
      {/* Piernas y zapatos */}
      {dress ? (
        <>
          <Rect x={46} y={136} width={11} height={44} rx={5} fill={skin} />
          <Rect x={63} y={136} width={11} height={44} rx={5} fill={skin} />
        </>
      ) : (
        <>
          <Rect x={44} y={122} width={14} height={58} rx={5} fill={JEANS} />
          <Rect x={62} y={122} width={14} height={58} rx={5} fill={JEANS} />
        </>
      )}
      <Ellipse cx={50} cy={183} rx={10} ry={5} fill={SHOES} />
      <Ellipse cx={70} cy={183} rx={10} ry={5} fill={SHOES} />
      {/* Brazos */}
      <Rect x={25} y={80} width={12} height={48} rx={6} fill={skin} />
      <Rect x={83} y={80} width={12} height={48} rx={6} fill={skin} />
      <Circle cx={31} cy={130} r={6} fill={skin} />
      <Circle cx={89} cy={130} r={6} fill={skin} />
      <Rect x={25} y={78} width={12} height={longSleeves ? 48 : 18} rx={6} fill={outfit.color} />
      <Rect x={83} y={78} width={12} height={longSleeves ? 48 : 18} rx={6} fill={outfit.color} />
      {/* Cuello */}
      <Rect x={54} y={62} width={12} height={16} rx={4} fill={skin} />
      {/* Prenda */}
      {dress ? (
        <Path d="M38 76 Q60 70 82 76 L91 144 Q60 151 29 144 Z" fill={outfit.color} />
      ) : (
        <Path d="M37 76 Q60 70 83 76 L84 126 Q60 129 36 126 Z" fill={outfit.color} />
      )}
      {dress ? <Path d="M38 104 Q60 109 82 104" stroke={outfit.trim} strokeWidth={3} fill="none" /> : null}
      {outfit.kind === 'sudadera' ? (
        <>
          <Path d="M44 72 Q60 88 76 72 L76 78 Q60 92 44 78 Z" fill={outfit.trim} />
          <Rect x={46} y={106} width={28} height={13} rx={5} fill={outfit.trim} />
          <Path d="M55 82 V94 M65 82 V94" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
        </>
      ) : null}
      {outfit.kind === 'sueter' ? <Path d="M37 120 H83" stroke={outfit.trim} strokeWidth={4} /> : null}
      {outfit.kind === 'playera' ? <Path d="M53 75 Q60 81 67 75" stroke={outfit.trim} strokeWidth={2.4} fill="none" /> : null}
    </>
  );
}

function head(skin: string): ReactNode {
  return (
    <>
      <Circle cx={37} cy={48} r={5} fill={skin} />
      <Circle cx={83} cy={48} r={5} fill={skin} />
      <Circle cx={60} cy={46} r={23} fill={skin} />
      <Ellipse cx={52} cy={48} rx={2.4} ry={3} fill={INK} />
      <Ellipse cx={68} cy={48} rx={2.4} ry={3} fill={INK} />
      <Ellipse cx={46} cy={55} rx={3.5} ry={2.2} fill={CHEEK} opacity={0.5} />
      <Ellipse cx={74} cy={55} rx={3.5} ry={2.2} fill={CHEEK} opacity={0.5} />
      <Path d="M53 57 Q60 63 67 57" stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </>
  );
}

const VIEW_BOXES = {
  full: { box: '0 0 120 200', ratio: 200 / 120 },
  bust: { box: '14 0 92 92', ratio: 1 },
  torso: { box: '20 70 80 96', ratio: 96 / 80 },
} as const;

/**
 * Avatar dibujado en SVG. `full` es el cuerpo completo; `bust`, cabeza y hombros (para
 * círculos pequeños), y `torso`, la prenda (para las miniaturas de ropa).
 */
export function AvatarFigure({
  selection, variant = 'full', width,
}: {
  selection: Pick<AvatarSelection, AvatarPart>;
  variant?: keyof typeof VIEW_BOXES;
  width: number;
}) {
  const skin = SKIN_TONES[selection.piel]?.color ?? SKIN_TONES[0].color;
  const outfit = OUTFITS[selection.ropa] ?? OUTFITS[0];
  const { box, ratio } = VIEW_BOXES[variant];
  return (
    <Svg width={width} height={width * ratio} viewBox={box}>
      {variant === 'torso' ? (
        // La miniatura de ropa muestra solo la prenda, sin cabeza ni cabello recortados.
        body(skin, outfit)
      ) : (
        <Fragment>
          {hairBack(selection.cabello)}
          {body(skin, outfit)}
          {head(skin)}
          {hairFront(selection.cabello)}
          {accessory(selection.accesorio)}
        </Fragment>
      )}
    </Svg>
  );
}
