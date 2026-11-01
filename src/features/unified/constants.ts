import { PLAN_DIETA } from '@/constants/family-wellness';

export const COLORS = {
  navy: '#1A202C',
  blue: '#2B6CB0',
  blueDeep: '#1E4E8C',
  pink: '#ED64A6',
  green: '#48BB78',
  orange: '#ED8936',
  purple: '#805AD5',
  yellow: '#F6C445',
  background: '#F7FAFC',
  white: '#FFFFFF',
  ink: '#1A202C',
  muted: '#5A6474',
  line: '#E2E8F0',
  error: '#E53E3E',
  paleBlue: '#EBF4FF',
  paleGreen: '#F0FFF4',
  palePink: '#FFF5F9',
  paleOrange: '#FFFAF0',
  palePurple: '#FAF5FF',
} as const;

export const CHILD_MOODS = [
  { id: 'feliz', emoji: '😄', label: 'A gusto', color: COLORS.green },
  { id: 'bien', emoji: '🙂', label: 'Bien', color: COLORS.blue },
  { id: 'tranquilo', emoji: '😌', label: 'Tranquilo', color: COLORS.purple },
  { id: 'normal', emoji: '😐', label: 'Más o menos', color: COLORS.orange },
  { id: 'cansado', emoji: '😴', label: 'Cansado', color: COLORS.blueDeep },
  { id: 'triste', emoji: '😢', label: 'Triste', color: COLORS.pink },
  { id: 'estresada', emoji: '😤', label: 'Con energía', color: COLORS.orange },
] as const;

export const FOOD_OPTIONS = [
  { id: 'leche', emoji: '🥛', name: 'Leche y lácteos', keywords: ['leche', 'yogur', 'queso', 'crema'] },
  { id: 'huevo', emoji: '🥚', name: 'Huevo', keywords: ['huevo', 'omelette', 'mayonesa'] },
  { id: 'cacahuate', emoji: '🥜', name: 'Cacahuate', keywords: ['cacahuate', 'maní'] },
  { id: 'nueces', emoji: '🌰', name: 'Nueces y almendras', keywords: ['nuez', 'almendra', 'granola'] },
  { id: 'pescado', emoji: '🐟', name: 'Pescado', keywords: ['pescado', 'atún'] },
  { id: 'mariscos', emoji: '🦐', name: 'Mariscos', keywords: ['camarón', 'mariscos'] },
  { id: 'gluten', emoji: '🌾', name: 'Trigo / gluten', keywords: ['trigo', 'gluten', 'pan', 'tostada', 'tortilla de harina'] },
  { id: 'soya', emoji: '🫘', name: 'Soya', keywords: ['soya', 'soja'] },
  { id: 'ajonjoli', emoji: '⚪', name: 'Ajonjolí', keywords: ['ajonjolí', 'sésamo'] },
  { id: 'fresa', emoji: '🍓', name: 'Fresa', keywords: ['fresa'] },
  { id: 'pollo', emoji: '🍗', name: 'Pollo', keywords: ['pollo'] },
  { id: 'res', emoji: '🥩', name: 'Carne de res', keywords: ['res', 'bistec'] },
  { id: 'cerdo', emoji: '🥓', name: 'Cerdo', keywords: ['cerdo', 'tocino'] },
  { id: 'frijoles', emoji: '🫘', name: 'Frijoles', keywords: ['frijol'] },
  { id: 'brocoli', emoji: '🥦', name: 'Brócoli', keywords: ['brócoli', 'brocoli'] },
  { id: 'espinaca', emoji: '🥬', name: 'Espinaca', keywords: ['espinaca'] },
  { id: 'zanahoria', emoji: '🥕', name: 'Zanahoria', keywords: ['zanahoria'] },
  { id: 'tomate', emoji: '🍅', name: 'Tomate', keywords: ['tomate', 'jitomate'] },
  { id: 'cebolla', emoji: '🧅', name: 'Cebolla', keywords: ['cebolla'] },
  { id: 'champi', emoji: '🍄', name: 'Champiñones', keywords: ['champiñón', 'champiñones', 'hongos'] },
  { id: 'aguacate', emoji: '🥑', name: 'Aguacate', keywords: ['aguacate', 'guacamole'] },
  { id: 'picante', emoji: '🌶️', name: 'Picante', keywords: ['chile', 'picante', 'salsa'] },
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
    answer: 'Los datos se guardan en este dispositivo. No se envían a una nube ni se comparten públicamente.',
  },
  {
    question: '¿Quién puede revisar los avances?',
    answer: 'La persona tutora de este dispositivo puede acompañar y revisar las actividades registradas.',
  },
  {
    question: '¿El PIN protege mis datos?',
    answer: 'No. El PIN es solo una confirmación local; no sustituye una contraseña ni una autenticación segura.',
  },
  {
    question: '¿Warrior Kids da consejos médicos?',
    answer: 'No. Las recetas son ideas educativas y el movimiento es recreativo. Consulta a profesionales de salud cuando haga falta.',
  },
  {
    question: '¿Cómo se guardan las fotos de actividades?',
    answer: 'Las fotos opcionales se guardan solo en este dispositivo y no se suben a ningún servidor.',
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
