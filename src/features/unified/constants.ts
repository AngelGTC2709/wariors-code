import type { AppIconName } from './ui';
import { PLAN_DIETA } from '@/constants/family-wellness';
import { sharedFor, themesFor, useThemeMode, type ThemeMode } from '@/features/unified/tokens';

export function colorsFor(mode: ThemeMode) {
  const THEMES = themesFor(mode);
  const SHARED = sharedFor(mode);
  return {
    navy: THEMES.tutor.hero,
    blue: THEMES.oli.acento,
    blueDeep: THEMES.oli.texto,
    pink: THEMES.lia.bordeAvatar,
    green: SHARED.completado,
    orange: SHARED.puntos,
    purple: SHARED.logros,
    background: THEMES.tutor.fondoInicio,
    white: SHARED.tarjeta,
    ink: THEMES.tutor.texto,
    muted: SHARED.textoSecundario,
    line: SHARED.bordeSutil,
    error: SHARED.error,
    paleBlue: THEMES.oli.acentoSuave,
    paleGreen: SHARED.exitoFondo,
    paleOrange: THEMES.tutor.acentoSuave,
  };
}

/** Colores del tema claro, para código fuera de componentes (acentos que no cambian). */
export const COLORS = colorsFor('light');

/** Colores del modo actual (claro u oscuro). */
export function useColors() {
  return colorsFor(useThemeMode());
}

// Ánimos del selector (en orden). `ink` es el color del texto e ícono sobre `color`.
// Los que tienen `retired` ya no se ofrecen, pero se conservan para leer días registrados antes.
export const CHILD_MOODS = [
  { id: 'feliz', label: 'Feliz', color: '#FFD84D', ink: '#5A3D00', icon: 'sun' },
  { id: 'emocionado', label: 'Emocionado', color: '#FFA94D', ink: '#5A2A00', icon: 'confetti' },
  { id: 'tranquilo', label: 'Tranquilo', color: '#7FCF9C', ink: '#0F3D22', icon: 'leaf' },
  { id: 'cansado', label: 'Cansado', color: '#34508F', ink: '#FFFFFF', icon: 'moonStars' },
  { id: 'triste', label: 'Triste', color: '#8EC9F2', ink: '#0B3556', icon: 'cloudRain' },
  { id: 'enojado', label: 'Enojado', color: '#E5604D', ink: '#FFFFFF', icon: 'fire' },
  { id: 'estresada', label: 'Con energía', color: '#8E4BD6', ink: '#FFFFFF', icon: 'lightning' },
  { id: 'bien', label: 'Bien', color: '#4C9BE8', ink: '#FFFFFF', icon: 'mood', retired: true },
  { id: 'normal', label: 'Más o menos', color: '#B8B8C4', ink: '#2B2B35', icon: 'mood', retired: true },
] as const satisfies readonly {
  id: string; label: string; color: string; ink: string; icon: AppIconName; retired?: boolean;
}[];

export const FOOD_OPTIONS = [
  { id: 'leche', group: 'animal', emoji: '🥛', name: 'Leche y lácteos', keywords: ['leche', 'yogur', 'queso', 'crema'] },
  { id: 'huevo', group: 'animal', emoji: '🥚', name: 'Huevo', keywords: ['huevo', 'omelette', 'mayonesa'] },
  { id: 'cacahuate', group: 'leguminosas', emoji: '🥜', name: 'Cacahuate', keywords: ['cacahuate', 'maní'] },
  { id: 'nueces', group: 'leguminosas', emoji: '🌰', name: 'Nueces y almendras', keywords: ['nuez', 'almendra', 'granola'] },
  { id: 'pescado', group: 'animal', emoji: '🐟', name: 'Pescado', keywords: ['pescado', 'atún'] },
  { id: 'mariscos', group: 'animal', emoji: '🦐', name: 'Mariscos', keywords: ['camarón', 'mariscos'] },
  { id: 'gluten', group: 'cereales', emoji: '🌾', name: 'Trigo / gluten', keywords: ['trigo', 'gluten', 'pan', 'tostada', 'tortilla de harina'] },
  { id: 'soya', group: 'leguminosas', emoji: '🫘', name: 'Soya', keywords: ['soya', 'soja'] },
  { id: 'ajonjoli', group: 'leguminosas', emoji: '⚪', name: 'Ajonjolí', keywords: ['ajonjolí', 'sésamo'] },
  { id: 'fresa', group: 'frutas', emoji: '🍓', name: 'Fresa', keywords: ['fresa'] },
  { id: 'pollo', group: 'animal', emoji: '🍗', name: 'Pollo', keywords: ['pollo'] },
  { id: 'res', group: 'animal', emoji: '🥩', name: 'Carne de res', keywords: ['res', 'bistec'] },
  { id: 'cerdo', group: 'animal', emoji: '🥓', name: 'Cerdo', keywords: ['cerdo', 'tocino'] },
  { id: 'frijoles', group: 'leguminosas', emoji: '🫘', name: 'Frijoles', keywords: ['frijol'] },
  { id: 'brocoli', group: 'frutas', emoji: '🥦', name: 'Brócoli', keywords: ['brócoli', 'brocoli'] },
  { id: 'espinaca', group: 'frutas', emoji: '🥬', name: 'Espinaca', keywords: ['espinaca'] },
  { id: 'zanahoria', group: 'frutas', emoji: '🥕', name: 'Zanahoria', keywords: ['zanahoria'] },
  { id: 'tomate', group: 'frutas', emoji: '🍅', name: 'Tomate', keywords: ['tomate', 'jitomate'] },
  { id: 'cebolla', group: 'frutas', emoji: '🧅', name: 'Cebolla', keywords: ['cebolla'] },
  { id: 'champi', group: 'frutas', emoji: '🍄', name: 'Champiñones', keywords: ['champiñón', 'champiñones', 'hongos'] },
  { id: 'aguacate', group: 'frutas', emoji: '🥑', name: 'Aguacate', keywords: ['aguacate', 'guacamole'] },
  { id: 'picante', group: 'frutas', emoji: '🌶️', name: 'Picante', keywords: ['chile', 'picante', 'salsa'] },
  { id: 'manzana', group: 'frutas', emoji: '🍎', name: 'Manzana', keywords: ['manzana'] },
  { id: 'platano', group: 'frutas', emoji: '🍌', name: 'Plátano', keywords: ['plátano', 'platano'] },
  { id: 'naranja', group: 'frutas', emoji: '🍊', name: 'Naranja y mandarina', keywords: ['naranja', 'mandarina'] },
  { id: 'uvas', group: 'frutas', emoji: '🍇', name: 'Uvas', keywords: ['uva'] },
  { id: 'sandia', group: 'frutas', emoji: '🍉', name: 'Sandía', keywords: ['sandía', 'sandia'] },
  { id: 'melon', group: 'frutas', emoji: '🍈', name: 'Melón', keywords: ['melón', 'melon'] },
  { id: 'papaya', group: 'frutas', emoji: '🍈', name: 'Papaya', keywords: ['papaya'] },
  { id: 'mango', group: 'frutas', emoji: '🥭', name: 'Mango', keywords: ['mango'] },
  { id: 'pina', group: 'frutas', emoji: '🍍', name: 'Piña', keywords: ['piña'] },
  { id: 'pera', group: 'frutas', emoji: '🍐', name: 'Pera', keywords: ['pera'] },
  { id: 'durazno', group: 'frutas', emoji: '🍑', name: 'Durazno', keywords: ['durazno'] },
  { id: 'kiwi', group: 'frutas', emoji: '🥝', name: 'Kiwi', keywords: ['kiwi'] },
  { id: 'limon', group: 'frutas', emoji: '🍋', name: 'Limón', keywords: ['limón', 'limon'] },
  { id: 'pepino', group: 'frutas', emoji: '🥒', name: 'Pepino', keywords: ['pepino'] },
  { id: 'calabacita', group: 'frutas', emoji: '🥒', name: 'Calabacita', keywords: ['calabacita', 'calabaza'] },
  { id: 'lechuga', group: 'frutas', emoji: '🥬', name: 'Lechuga', keywords: ['lechuga'] },
  { id: 'coliflor', group: 'frutas', emoji: '🥦', name: 'Coliflor', keywords: ['coliflor'] },
  { id: 'elote', group: 'cereales', emoji: '🌽', name: 'Maíz y elote', keywords: ['maíz', 'maiz', 'elote'] },
  { id: 'tortilla', group: 'cereales', emoji: '🫓', name: 'Tortilla de maíz', keywords: ['tortilla de maíz', 'tortilla de maiz'] },
  { id: 'arroz', group: 'cereales', emoji: '🍚', name: 'Arroz', keywords: ['arroz'] },
  { id: 'avena', group: 'cereales', emoji: '🥣', name: 'Avena', keywords: ['avena'] },
  { id: 'pasta', group: 'cereales', emoji: '🍝', name: 'Pasta', keywords: ['pasta', 'espagueti', 'fideo'] },
  { id: 'cereal', group: 'cereales', emoji: '🥣', name: 'Cereal de caja', keywords: ['cereal'] },
  { id: 'papa', group: 'cereales', emoji: '🥔', name: 'Papa', keywords: ['papa'] },
  { id: 'camote', group: 'cereales', emoji: '🍠', name: 'Camote', keywords: ['camote'] },
  { id: 'galletas', group: 'cereales', emoji: '🍪', name: 'Galletas integrales', keywords: ['galleta'] },
  { id: 'lentejas', group: 'leguminosas', emoji: '🫘', name: 'Lentejas', keywords: ['lenteja'] },
  { id: 'garbanzos', group: 'leguminosas', emoji: '🫘', name: 'Garbanzos', keywords: ['garbanzo'] },
  { id: 'habas', group: 'leguminosas', emoji: '🫛', name: 'Habas', keywords: ['haba'] },
  { id: 'chicharos', group: 'leguminosas', emoji: '🫛', name: 'Chícharos', keywords: ['chícharo', 'chicharo'] },
  { id: 'alubias', group: 'leguminosas', emoji: '🫘', name: 'Alubias', keywords: ['alubia'] },
  { id: 'edamame', group: 'leguminosas', emoji: '🫛', name: 'Edamame', keywords: ['edamame'] },
  { id: 'pistaches', group: 'leguminosas', emoji: '🥜', name: 'Pistaches', keywords: ['pistache'] },
  { id: 'pavo', group: 'animal', emoji: '🦃', name: 'Pavo', keywords: ['pavo'] },
  { id: 'jamon', group: 'animal', emoji: '🍖', name: 'Jamón', keywords: ['jamón', 'jamon'] },
  { id: 'sardina', group: 'animal', emoji: '🐟', name: 'Sardina', keywords: ['sardina'] },
  { id: 'salmon', group: 'animal', emoji: '🍣', name: 'Salmón', keywords: ['salmón', 'salmon'] },
] as const;

export const EXERCISE_CATEGORIES = [
  {
    id: 'cardio',
    label: 'Cardio',
    emoji: '🏃',
    color: COLORS.orange,
    items: [
      { title: 'Saltos de rana', duration: '10 saltos × 3', detail: 'Agáchate y salta hacia adelante como una rana.' },
      { title: 'Salta la cuerda', duration: '1 minuto', detail: 'Salta a tu propio ritmo y sin prisa.' },
      { title: 'Carrera en el lugar', duration: '30 seg × 3', detail: 'Corre sin moverte del lugar, levantando las rodillas.' },
    ],
  },
  {
    id: 'fuerza',
    label: 'Fuerza',
    emoji: '💪',
    color: COLORS.blue,
    items: [
      { title: 'Sentadillas de superhéroe', duration: '10 rep × 2', detail: 'Baja como si te sentaras en una silla invisible.' },
      { title: 'Camina como cocodrilo', duration: '20 segundos', detail: 'Muévete en un espacio seguro y con supervisión adulta.' },
      { title: 'Plancha del osito', duration: '15 seg × 2', detail: 'Hazla solo si te sientes cómodo/a y sin dolor.' },
    ],
  },
  {
    id: 'flexibilidad',
    label: 'Flexibilidad',
    emoji: '🧘',
    color: COLORS.purple,
    items: [
      { title: 'Postura de mariposa', duration: '30 segundos', detail: 'Siéntate y junta las plantas de los pies suavemente.' },
      { title: 'Gato y vaca', duration: '5 repeticiones', detail: 'Curva y relaja la espalda lentamente.' },
      { title: 'Árbol que se estira', duration: '20 seg por lado', detail: 'Estira los brazos al cielo sin forzar el cuerpo.' },
    ],
  },
  {
    id: 'equilibrio',
    label: 'Equilibrio',
    emoji: '🤸',
    color: COLORS.green,
    items: [
      { title: 'El flamingo', duration: '20 seg por pie', detail: 'Párate en un pie cerca de una persona adulta.' },
      { title: 'Camina en línea', duration: '10 pasos', detail: 'Camina despacio en una superficie plana.' },
      { title: 'Juego de las estatuas', duration: 'Libre', detail: 'Baila y quédate quieto/a cuando pare la música.' },
    ],
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: '¿Los datos de mis hijos son privados?',
    answer: 'Los datos se guardan en el espacio privado de tu cuenta en la nube y no se comparten públicamente.',
  },
  {
    question: '¿Quién puede revisar los avances?',
    answer: 'La persona tutora de la cuenta puede acompañar y revisar las actividades registradas.',
  },
  {
    question: '¿Cómo se protege el acceso de la persona tutora?',
    answer: 'La cuenta usa correo y contraseña. Para volver al modo Tutor se verifica la contraseña de la cuenta.',
  },
  {
    question: '¿Warrior Kids da consejos médicos?',
    answer: 'No. Las recetas son ideas educativas y el movimiento es recreativo. Consulta a profesionales de salud cuando haga falta.',
  },
  {
    question: '¿Cómo se guardan las fotos de actividades?',
    answer: 'Las fotos de evidencia se guardan en un espacio privado en la nube asociado a la cuenta.',
  },
] as const;

export const DIET_INGREDIENTS: Record<string, Record<string, string[]>> = {
  Lunes: {
    desayuno: ['huevo', 'gluten'],
    comida: ['pollo', 'tomate', 'zanahoria'],
    cena: ['gluten', 'zanahoria'],
  },
  Martes: {
    desayuno: ['gluten', 'huevo', 'leche'],
    comida: ['pescado', 'leche', 'brocoli'],
    cena: ['leche', 'frijoles'],
  },
  Miércoles: {
    desayuno: ['leche', 'gluten', 'nueces', 'fresa'],
    comida: ['res', 'cebolla', 'frijoles'],
    cena: ['pollo', 'huevo', 'leche', 'pescado', 'gluten'],
  },
  Jueves: {
    desayuno: ['frijoles', 'huevo', 'aguacate'],
    comida: ['cerdo', 'picante'],
    cena: ['huevo', 'espinaca', 'champi', 'leche'],
  },
  Viernes: {
    desayuno: ['espinaca', 'nueces'],
    comida: ['gluten', 'leche', 'tomate'],
    cena: ['pescado', 'gluten', 'tomate'],
  },
  Sábado: {
    desayuno: ['leche', 'picante'],
    comida: ['pollo', 'gluten', 'aguacate'],
    cena: ['pollo', 'zanahoria', 'aguacate', 'picante'],
  },
  Domingo: {
    desayuno: ['huevo', 'cerdo', 'frijoles', 'tomate', 'picante'],
    comida: ['pollo', 'ajonjoli', 'cacahuate', 'nueces', 'picante'],
    cena: ['pollo', 'tomate'],
  },
};

export const FAMILY_DIET = PLAN_DIETA;
