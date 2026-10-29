export type AvatarKey = 'piel' | 'cabello' | 'ropa' | 'accesorio' | 'fondo';
export type AvatarSelection = Record<AvatarKey, number>;
export type MoodId = 'feliz' | 'bien' | 'normal' | 'cansada' | 'triste' | 'estresada';

export type Mood = {
  id: MoodId;
  emoji: string;
  label: string;
  color: string;
};

export type Achievement = {
  id: string;
  emoji: string;
  titulo: string;
  desc: string;
  desbloqueado: boolean;
};

export type DietDay = {
  dia: string;
  desayuno: string;
  comida: string;
  cena: string;
  kids: string;
};

export type WeeklyEntry = {
  dia: string;
  xp: number;
  completas: number;
  animo: MoodId;
};

export type DailyStat = {
  icon: string;
  valor: number;
  label: string;
  max: number;
  bg: string;
  accent: string;
};

export type MissionItem = {
  icon: string;
  titulo: string;
  sub: string;
  xp: number;
  hecha: boolean;
};

export const AVATAR_OPCIONES: Record<AvatarKey, string[]> = {
  piel: ['🟡', '🟠', '🤎', '🫶🏻', '🫶🏽', '🫶🏿'],
  cabello: ['👱‍♀️', '🧑‍🦰', '🧑‍🦱', '🧑‍🦳', '💜', '🖤'],
  ropa: ['👗', '👘', '🥻', '🩱', '🩲', '👙'],
  accesorio: ['👑', '🎀', '🌸', '⭐', '🦋', '🌈'],
  fondo: ['🌸', '🌿', '🌊', '🌙', '☀️', '🌈'],
};

export const AVATAR_DEFAULT: AvatarSelection = {
  piel: 0,
  cabello: 0,
  ropa: 0,
  accesorio: 0,
  fondo: 0,
};

export const FONDO_COLORES: Record<string, { bg: string; border: string }> = {
  '🌸': { bg: '#FFF0F5', border: '#F4A0B8' },
  '🌿': { bg: '#F0FAF5', border: '#C6E8D6' },
  '🌊': { bg: '#EAF4FF', border: '#8BBFE8' },
  '🌙': { bg: '#F0EEFF', border: '#B8AAEE' },
  '☀️': { bg: '#FFFBEA', border: '#FFD966' },
  '🌈': { bg: '#F5F0FF', border: '#C8A0E8' },
};

export const ESTADOS_ANIMO: Mood[] = [
  { id: 'feliz', emoji: '😊', label: 'Feliz', color: '#2DB76A' },
  { id: 'bien', emoji: '😌', label: 'Bien', color: '#3B9EE8' },
  { id: 'normal', emoji: '😐', label: 'Normal', color: '#888' },
  { id: 'cansada', emoji: '😴', label: 'Cansada', color: '#A29BFE' },
  { id: 'triste', emoji: '😢', label: 'Triste', color: '#E8537A' },
  { id: 'estresada', emoji: '😤', label: 'Estresada', color: '#FF9F43' },
];

export const LOGROS: Achievement[] = [
  { id: 'racha7', emoji: '🔥', titulo: 'Semana de fuego', desc: '7 días seguidos activa', desbloqueado: true },
  { id: 'agua', emoji: '💧', titulo: 'Hidrataciónista', desc: 'Toma 8 vasos 5 días', desbloqueado: true },
  { id: 'pasos', emoji: '👟', titulo: 'Caminante', desc: 'Llega a 10k pasos', desbloqueado: false },
  { id: 'mision10', emoji: '🎯', titulo: 'Misionera', desc: 'Completa 10 misiones', desbloqueado: false },
  { id: 'nutribot', emoji: '🌿', titulo: 'Fan de NutriBot', desc: 'Chatea 5 días seguidos', desbloqueado: false },
  { id: 'familia', emoji: '👨‍👩‍👧', titulo: 'Familia saludable', desc: 'Sigue el plan familiar 1 semana', desbloqueado: false },
];

export const PLAN_DIETA: DietDay[] = [
  {
    dia: 'Lunes',
    desayuno: '🥚 Huevos revueltos con tostadas integrales y fruta',
    comida: '🍗 Pechuga a la plancha, arroz y ensalada de colores',
    cena: '🥣 Sopa de verduras y pan tostado',
    kids: '🍌 Licuado de plátano con leche para los pequeños',
  },
  {
    dia: 'Martes',
    desayuno: '🥞 Hotcakes de avena con miel de abeja',
    comida: '🐟 Filete de pescado al vapor, puré de papa y brócoli',
    cena: '🧀 Quesadillas de queso con frijoles',
    kids: '🍎 Manzana en rodajas con crema de cacahuate',
  },
  {
    dia: 'Miércoles',
    desayuno: '🫐 Yogur griego con granola y frutos rojos',
    comida: '🥩 Bistec encebollado, frijoles y tortillas',
    cena: '🥗 Ensalada César con pollo asado',
    kids: '🥕 Palitos de zanahoria con hummus',
  },
  {
    dia: 'Jueves',
    desayuno: '🌮 Tacos de frijoles con huevo y aguacate',
    comida: '🍲 Pozole rojo con tostadas y lechuga',
    cena: '🍳 Omelette de espinacas y champiñones',
    kids: '🫙 Gelatina de frutas sin azúcar añadida',
  },
  {
    dia: 'Viernes',
    desayuno: '🥤 Smoothie verde con espinaca, mango y leche de almendra',
    comida: '🍕 Pizza integral de verduras casera',
    cena: '🥙 Wrap de atún con vegetales frescos',
    kids: '🍇 Uvas con queso panela en cubos',
  },
  {
    dia: 'Sábado',
    desayuno: '🥐 Chilaquiles verdes con crema y queso',
    comida: '🌯 Burritos de pollo con guacamole',
    cena: '🍜 Caldo tlalpeño con garbanzo',
    kids: '🍓 Paletas de fresa naturales caseras',
  },
  {
    dia: 'Domingo',
    desayuno: '🍳 Desayuno familiar: huevos al gusto, tocino, frijoles y salsa',
    comida: '🥘 Mole rojo con arroz y tortillas recién hechas',
    cena: '🫕 Sopa de lima yucateca',
    kids: '🍩 Donas horneadas de canela como premio dominical',
  },
];

export const SEMANA: WeeklyEntry[] = [
  { dia: 'L', xp: 320, completas: 2, animo: 'bien' },
  { dia: 'M', xp: 580, completas: 3, animo: 'feliz' },
  { dia: 'X', xp: 200, completas: 1, animo: 'normal' },
  { dia: 'J', xp: 750, completas: 3, animo: 'feliz' },
  { dia: 'V', xp: 490, completas: 2, animo: 'cansada' },
  { dia: 'S', xp: 100, completas: 1, animo: 'triste' },
  { dia: 'D', xp: 620, completas: 3, animo: 'bien' },
];

export const MAX_XP_SEMANA = Math.max(...SEMANA.map((d) => d.xp));

export const MENSAJES_DIA = [
  '¡Hoy es un nuevo día para brillar, Fanny! ✨',
  '¡Cada pequeño esfuerzo te acerca a tu mejor versión! 💪',
  '¡Eres increíble y lo sabes! Sigue adelante 🌟',
  'Hoy, un vasito de agua más y un paso más. ¡Tú puedes! 💧',
  '¡Tu racha de 7 días demuestra que eres imparable! 🔥',
];

export const PALABRAS_TRISTES = [
  'triste', 'mal', 'llorar', 'llorando', 'solo', 'sola', 'deprimida', 'ansiosa',
  'ansiedad', 'cansada de todo', 'ya no quiero', 'nada importa', 'todo esta mal',
  'me siento mal', 'estoy mal', 'no puedo', 'me rindo', 'ayuda', 'agotada',
];

export const detectarAnimo = (texto: string): boolean =>
  PALABRAS_TRISTES.some((palabra) => texto.toLowerCase().includes(palabra));

export const TABS_AVATAR: { id: AvatarKey; label: string; icon: string }[] = [
  { id: 'piel', label: 'Piel', icon: '✋' },
  { id: 'cabello', label: 'Cabello', icon: '💇‍♀️' },
  { id: 'ropa', label: 'Ropa', icon: '👗' },
  { id: 'accesorio', label: 'Accesorio', icon: '👑' },
  { id: 'fondo', label: 'Fondo', icon: '🖼️' },
];
