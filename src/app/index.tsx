import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
    ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';


type TemaId = 'nina' | 'nino';
type Tema = {
  id: TemaId; nombre: string; emoji: string; cara: string;
  principal: string; principalDark: string;
  secundario: string; secundarioDark: string;
  comida: string; agua: string; aviso: string; acento: string;
  fondo: string; texto: string;
  bordeSuave: string; tabTinte: string; iconTinte: string; superficie: string;
};

const TEMAS: Record<TemaId, Tema> = {
  nina: {
    id: 'nina', nombre: 'Niña', emoji: '👧🏻', cara: '👧🏻',
    principal: '#FF6F91', principalDark: '#C2455F',
    secundario: '#9B7EDE', secundarioDark: '#6B4FAE',
    comida: '#54C7C7', agua: '#54C7C7', aviso: '#FFD166', acento: '#FF9F68',
    fondo: '#FFF7F8', texto: '#3D3552',
    bordeSuave: '#F5DEE4', tabTinte: '#FDEDF1', iconTinte: '#FFF1F4', superficie: '#FAF1F3',
  },
  nino: {
    id: 'nino', nombre: 'Niño', emoji: '👦🏻', cara: '👦🏻',
    principal: '#3D8BFF', principalDark: '#2A62B8',
    secundario: '#8B6DFF', secundarioDark: '#5B43B8',
    comida: '#52D273', agua: '#3D8BFF', aviso: '#FFD447', acento: '#FF914D',
    fondo: '#F3F8FF', texto: '#243B53',
    bordeSuave: '#D9E8FF', tabTinte: '#E6F0FF', iconTinte: '#EBF3FF', superficie: '#EEF5FF',
  },
};

const TemaContext = createContext<Tema>(TEMAS.nina);

// Devuelve el tema y los estilos ya calculados para ese tema
function useEstilos() {
  const T = useContext(TemaContext);
  const s = useMemo(() => crearEstilos(T), [T]);
  const L = useMemo(() => crearEstilosLogin(T), [T]);
  return { T, s, L };
}

// ─── FICHAS DE LOS NIÑOS (las llena el padre / tutor) ────────────────────────
type Nino = {
  id: string;
  nombre: string;
  genero: TemaId;            // 'nina' | 'nino'
  peso: string;              // kg
  altura: string;            // cm
  alergias: string[];        // ids de ALIMENTOS (peligrosos)
  noGusta: string[];         // ids de ALIMENTOS (por gusto)
  otrasAlergias: string;
  otrosNoGusta: string;
};

type Usuario = { nombre: string; correo: string; rol: Rol };
type Rol = 'menor' | 'tutor';
type ChatMessage = { rol: 'bot' | 'user'; texto: string };

const STORAGE_KEY = 'nutribot-familiar-local-v1';

type StoredAppData = {
  usuarios: Usuario[];
  temaId: TemaId;
  ninos: Nino[];
};

function isUsuario(value: unknown): value is Usuario {
  if (!value || typeof value !== 'object') return false;
  const usuario = value as Partial<Usuario>;
  return (
    typeof usuario.nombre === 'string' &&
    typeof usuario.correo === 'string' &&
    (usuario.rol === 'menor' || usuario.rol === 'tutor')
  );
}

function isNino(value: unknown): value is Nino {
  if (!value || typeof value !== 'object') return false;
  const nino = value as Partial<Nino>;
  return (
    typeof nino.id === 'string' &&
    typeof nino.nombre === 'string' &&
    (nino.genero === 'nina' || nino.genero === 'nino') &&
    typeof nino.peso === 'string' &&
    typeof nino.altura === 'string' &&
    Array.isArray(nino.alergias) &&
    nino.alergias.every(item => typeof item === 'string') &&
    Array.isArray(nino.noGusta) &&
    nino.noGusta.every(item => typeof item === 'string') &&
    typeof nino.otrasAlergias === 'string' &&
    typeof nino.otrosNoGusta === 'string'
  );
}

function isStoredAppData(value: unknown): value is StoredAppData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<StoredAppData>;
  return (
    Array.isArray(data.usuarios) &&
    data.usuarios.every(isUsuario) &&
    (data.temaId === 'nina' || data.temaId === 'nino') &&
    Array.isArray(data.ninos) &&
    data.ninos.every(isNino)
  );
}

const ALIMENTOS = [
  { id: 'leche',     emoji: '🥛', nombre: 'Leche y lácteos' },
  { id: 'huevo',     emoji: '🥚', nombre: 'Huevo' },
  { id: 'cacahuate', emoji: '🥜', nombre: 'Cacahuate' },
  { id: 'nueces',    emoji: '🌰', nombre: 'Nueces y almendras' },
  { id: 'pescado',   emoji: '🐟', nombre: 'Pescado' },
  { id: 'mariscos',  emoji: '🦐', nombre: 'Mariscos' },
  { id: 'gluten',    emoji: '🌾', nombre: 'Trigo / gluten' },
  { id: 'soya',      emoji: '🫘', nombre: 'Soya' },
  { id: 'ajonjoli',  emoji: '⚪', nombre: 'Ajonjolí' },
  { id: 'fresa',     emoji: '🍓', nombre: 'Fresa' },
  { id: 'pollo',     emoji: '🍗', nombre: 'Pollo' },
  { id: 'res',       emoji: '🥩', nombre: 'Carne de res' },
  { id: 'cerdo',     emoji: '🥓', nombre: 'Cerdo' },
  { id: 'frijoles',  emoji: '🫘', nombre: 'Frijoles' },
  { id: 'brocoli',   emoji: '🥦', nombre: 'Brócoli' },
  { id: 'espinaca',  emoji: '🥬', nombre: 'Espinaca' },
  { id: 'zanahoria', emoji: '🥕', nombre: 'Zanahoria' },
  { id: 'tomate',    emoji: '🍅', nombre: 'Tomate' },
  { id: 'cebolla',   emoji: '🧅', nombre: 'Cebolla' },
  { id: 'champi',    emoji: '🍄', nombre: 'Champiñones' },
  { id: 'aguacate',  emoji: '🥑', nombre: 'Aguacate' },
  { id: 'picante',   emoji: '🌶️', nombre: 'Picante' },
];

const imc = (pesoKg: string, alturaCm: string): string | null => {
  const p = parseFloat(pesoKg.replace(',', '.'));
  const a = parseFloat(alturaCm.replace(',', '.')) / 100;
  if (!p || !a) return null;
  return (p / (a * a)).toFixed(1);
};

// "🥛 Leche y lácteos, 🥚 Huevo"
const nombresAlimentos = (ids: string[]): string =>
  ids
    .map(id => ALIMENTOS.find(a => a.id === id))
    .filter(Boolean)
    .map(a => `${a!.emoji} ${a!.nombre}`)
    .join(', ');

// Qué alimentos de una comida chocan con la ficha del niño
const conflictosComida = (alimentos: string[], nino: Nino | null) => {
  if (!nino) return { alergia: [] as string[], gusto: [] as string[] };
  return {
    alergia: alimentos.filter(a => nino.alergias.includes(a)),
    gusto:   alimentos.filter(a => nino.noGusta.includes(a)),
  };
};

// ─── AVATAR BUILDER: opciones por categoría ──────────────────────────────────
const AVATAR_BASE = {
  piel:      ['🟡', '🟠', '🤎', '🫶🏻', '🫶🏽', '🫶🏿'],
  cabello:   ['👱‍♀️', '🧑‍🦰', '🧑‍🦱', '🧑‍🦳', '💜', '🖤'],
  ropa:      ['👗', '👘', '🥻', '🩱', '🩲', '👙'],
  accesorio: ['👑', '🎀', '🌸', '⭐', '🦋', '🌈'],
  fondo:     ['🌸', '🌿', '🌊', '🌙', '☀️', '🌈'],
};
type AvatarCat = keyof typeof AVATAR_BASE;

const opcionesAvatar = (T: Tema): typeof AVATAR_BASE =>
  T.id === 'nino'
    ? {
        ...AVATAR_BASE,
        cabello:   ['👱‍♂️', '🧑‍🦰', '🧑‍🦱', '🧑‍🦳', '💙', '🖤'],
        ropa:      ['👕', '👔', '🧥', '🎽', '🩳', '🦺'],
        accesorio: ['🧢', '🎩', '⭐', '🦖', '🚀', '🌈'],
      }
    : AVATAR_BASE;

const AVATAR_DEFAULT = { piel: 0, cabello: 0, ropa: 0, accesorio: 0, fondo: 0 };

const FONDO_COLORES: Record<string, { bg: string; border: string }> = {
  '🌸': { bg: '#FFF0F5', border: '#F4A0B8' },
  '🌿': { bg: '#F0FAF5', border: '#C6E8D6' },
  '🌊': { bg: '#EAF4FF', border: '#8BBFE8' },
  '🌙': { bg: '#F0EEFF', border: '#B8AAEE' },
  '☀️': { bg: '#FFFBEA', border: '#FFD966' },
  '🌈': { bg: '#F5F0FF', border: '#C8A0E8' },
};

// ─── ESTADOS DE ÁNIMO ────────────────────────────────────────────────────────
const crearEstadosAnimo = (T: Tema) => {
  const o = T.id === 'nino';
  return [
    { id: 'feliz',     emoji: '😊', label: 'Feliz',                    color: T.comida },
    { id: 'bien',      emoji: '😌', label: 'Bien',                     color: T.secundario },
    { id: 'normal',    emoji: '😐', label: 'Normal',                   color: '#9C96A6' },
    { id: 'cansada',   emoji: '😴', label: o ? 'Cansado' : 'Cansada',   color: T.secundarioDark },
    { id: 'triste',    emoji: '😢', label: 'Triste',                   color: T.principal },
    { id: 'estresada', emoji: '😤', label: o ? 'Estresado' : 'Estresada', color: T.acento },
  ];
};

// ─── LOGROS ──────────────────────────────────────────────────────────────────
const crearLogros = (T: Tema) => {
  const o = T.id === 'nino';
  return [
    { id: 'racha7',    emoji: '🔥', titulo: 'Semana de fuego',      desc: '7 días seguidos activo/a',        desbloqueado: true  },
    { id: 'agua',      emoji: '💧', titulo: 'Hidrataciónista',      desc: 'Toma 8 vasos 5 días',             desbloqueado: true  },
    { id: 'pasos',     emoji: '👟', titulo: 'Caminante',            desc: 'Llega a 10k pasos',               desbloqueado: false },
    { id: 'mision10',  emoji: '🎯', titulo: o ? 'Misionero' : 'Misionera', desc: 'Completa 10 misiones',    desbloqueado: false },
    { id: 'nutribot',  emoji: '🌿', titulo: 'Fan de NutriBot',      desc: 'Chatea 5 días seguidos',          desbloqueado: false },
    { id: 'familia',   emoji: '👨‍👩‍👧', titulo: 'Familia saludable', desc: 'Sigue el plan familiar 1 semana', desbloqueado: false },
    { id: 'ejercicio', emoji: o ? '🤸‍♂️' : '🤸‍♀️', titulo: 'Cuerpo en movimiento', desc: 'Haz 5 ejercicios distintos', desbloqueado: false },
  ];
};

// ─── PLATO DEL BUEN COMER (grupos oficiales de alimentación en México) ───────
// Se conservan los colores oficiales (verde/amarillo/rojo) en ambos temas.
const GRUPOS_PLATO = [
  { id: 'verduras_frutas',    nombre: 'Verduras y frutas',                     color: '#4CAF6D', emoji: '🥦' },
  { id: 'cereales',           nombre: 'Cereales',                             color: '#FFC93C', emoji: '🌽' },
  { id: 'leguminosas_animal', nombre: 'Leguminosas y alim. de origen animal', color: '#E8637A', emoji: '🍗' },
] as const;

type GrupoId = typeof GRUPOS_PLATO[number]['id'];

const grupoInfo = (id: GrupoId) => GRUPOS_PLATO.find(g => g.id === id)!;

// ─── PLAN DIETA FAMILIAR (basado en el Plato del Buen Comer) ─────────────────
// `alimentos` = ids de ALIMENTOS que lleva la comida (para avisar alergias/gustos).
// Son ingredientes típicos de cada platillo; el padre debe revisar las recetas reales.
type Comida = { texto: string; grupos: GrupoId[]; alimentos: string[] };
type Merienda = { texto: string; alimentos: string[] };

const PLAN_DIETA: {
  dia: string; desayuno: Comida; comida: Comida; cena: Comida; kids: Merienda;
}[] = [
  {
    dia: 'Lunes',
    desayuno: { texto: '🥚 Huevos revueltos con tostadas integrales y fruta', grupos: ['leguminosas_animal', 'cereales', 'verduras_frutas'], alimentos: ['huevo', 'gluten'] },
    comida:   { texto: '🍗 Pechuga a la plancha, arroz y ensalada de colores', grupos: ['leguminosas_animal', 'cereales', 'verduras_frutas'], alimentos: ['pollo', 'tomate', 'zanahoria'] },
    cena:     { texto: '🥣 Sopa de verduras y pan tostado', grupos: ['verduras_frutas', 'cereales'], alimentos: ['gluten', 'zanahoria'] },
    kids:     { texto: '🍌 Licuado de plátano con leche para los pequeños', alimentos: ['leche'] },
  },
  {
    dia: 'Martes',
    desayuno: { texto: '🥞 Hotcakes de avena con miel de abeja y fruta picada', grupos: ['cereales', 'verduras_frutas'], alimentos: ['gluten', 'huevo', 'leche'] },
    comida:   { texto: '🐟 Filete de pescado al vapor, puré de papa y brócoli', grupos: ['leguminosas_animal', 'cereales', 'verduras_frutas'], alimentos: ['pescado', 'leche', 'brocoli'] },
    cena:     { texto: '🧀 Quesadillas de queso con frijoles', grupos: ['cereales', 'leguminosas_animal'], alimentos: ['leche', 'frijoles'] },
    kids:     { texto: '🍎 Manzana en rodajas con crema de cacahuate', alimentos: ['cacahuate'] },
  },
  {
    dia: 'Miércoles',
    desayuno: { texto: '🫐 Yogur griego con granola y frutos rojos', grupos: ['leguminosas_animal', 'cereales', 'verduras_frutas'], alimentos: ['leche', 'gluten', 'nueces', 'fresa'] },
    comida:   { texto: '🥩 Bistec encebollado, frijoles y tortillas', grupos: ['leguminosas_animal', 'cereales'], alimentos: ['res', 'cebolla', 'frijoles'] },
    cena:     { texto: '🥗 Ensalada César con pollo asado', grupos: ['verduras_frutas', 'leguminosas_animal'], alimentos: ['pollo', 'huevo', 'leche', 'pescado', 'gluten'] },
    kids:     { texto: '🥕 Palitos de zanahoria con hummus', alimentos: ['zanahoria', 'ajonjoli'] },
  },
  {
    dia: 'Jueves',
    desayuno: { texto: '🌮 Tacos de frijoles con huevo y aguacate', grupos: ['leguminosas_animal', 'cereales', 'verduras_frutas'], alimentos: ['frijoles', 'huevo', 'aguacate'] },
    comida:   { texto: '🍲 Pozole rojo con tostadas y lechuga', grupos: ['leguminosas_animal', 'cereales', 'verduras_frutas'], alimentos: ['cerdo', 'picante'] },
    cena:     { texto: '🍳 Omelette de espinacas y champiñones', grupos: ['leguminosas_animal', 'verduras_frutas'], alimentos: ['huevo', 'espinaca', 'champi', 'leche'] },
    kids:     { texto: '🫙 Gelatina de frutas sin azúcar añadida', alimentos: [] },
  },
  {
    dia: 'Viernes',
    desayuno: { texto: '🥤 Smoothie verde con espinaca, mango y leche de almendra', grupos: ['verduras_frutas', 'leguminosas_animal'], alimentos: ['espinaca', 'nueces'] },
    comida:   { texto: '🍕 Pizza integral de verduras casera', grupos: ['cereales', 'verduras_frutas', 'leguminosas_animal'], alimentos: ['gluten', 'leche', 'tomate'] },
    cena:     { texto: '🥙 Wrap de atún con vegetales frescos', grupos: ['leguminosas_animal', 'cereales', 'verduras_frutas'], alimentos: ['pescado', 'gluten', 'tomate'] },
    kids:     { texto: '🍇 Uvas con queso panela en cubos', alimentos: ['leche'] },
  },
  {
    dia: 'Sábado',
    desayuno: { texto: '🥐 Chilaquiles verdes con crema y queso', grupos: ['cereales', 'leguminosas_animal'], alimentos: ['leche', 'picante'] },
    comida:   { texto: '🌯 Burritos de pollo con guacamole', grupos: ['cereales', 'leguminosas_animal', 'verduras_frutas'], alimentos: ['pollo', 'gluten', 'aguacate'] },
    cena:     { texto: '🍜 Caldo tlalpeño con garbanzo', grupos: ['leguminosas_animal', 'verduras_frutas'], alimentos: ['pollo', 'zanahoria', 'aguacate', 'picante'] },
    kids:     { texto: '🍓 Paletas de fresa naturales caseras', alimentos: ['fresa'] },
  },
  {
    dia: 'Domingo',
    desayuno: { texto: '🍳 Desayuno familiar: huevos al gusto, tocino, frijoles y salsa', grupos: ['leguminosas_animal', 'verduras_frutas'], alimentos: ['huevo', 'cerdo', 'frijoles', 'tomate', 'picante'] },
    comida:   { texto: '🥘 Mole rojo con arroz y tortillas recién hechas', grupos: ['leguminosas_animal', 'cereales'], alimentos: ['pollo', 'ajonjoli', 'cacahuate', 'nueces', 'picante'] },
    cena:     { texto: '🫕 Sopa de lima yucateca', grupos: ['leguminosas_animal', 'verduras_frutas'], alimentos: ['pollo', 'tomate'] },
    kids:     { texto: '🍩 Donas horneadas de canela como premio dominical', alimentos: ['gluten', 'huevo', 'leche'] },
  },
];

// ─── EJERCICIOS PARA NIÑOS ────────────────────────────────────────────────────
type CategoriaEjercicio = 'cardio' | 'fuerza' | 'flexibilidad' | 'equilibrio';

const crearCategoriasEjercicio = (T: Tema) => {
  const o = T.id === 'nino';
  return [
    { id: 'cardio',       label: 'Cardio',       icon: o ? '🏃‍♂️' : '🏃‍♀️', color: T.acento },
    { id: 'fuerza',       label: 'Fuerza',       icon: '💪',                color: T.principal },
    { id: 'flexibilidad', label: 'Flexibilidad', icon: o ? '🧘‍♂️' : '🧘‍♀️', color: T.secundario },
    { id: 'equilibrio',   label: 'Equilibrio',   icon: o ? '🤸‍♂️' : '🤸‍♀️', color: T.comida },
  ] as { id: CategoriaEjercicio; label: string; icon: string; color: string }[];
};

const EJERCICIOS_NINOS: Record<CategoriaEjercicio, { emoji: string; titulo: string; duracion: string; descripcion: string }[]> = {
  cardio: [
    { emoji: '🐸', titulo: 'Saltos de rana',        duracion: '10 saltos × 3',  descripcion: 'Agáchate y salta hacia adelante como una rana. ¡Divertido y lleno de energía!' },
    { emoji: '🪢', titulo: 'Salta la cuerda',        duracion: '1 minuto',      descripcion: 'Salta la cuerda a tu propio ritmo, sin prisa. Es un excelente calentamiento.' },
    { emoji: '🏃', titulo: 'Carrera en el lugar',    duracion: '30 seg × 3',    descripcion: 'Corre sin moverte del lugar, levantando bien las rodillas.' },
  ],
  fuerza: [
    { emoji: '🦸', titulo: 'Sentadillas de superhéroe', duracion: '10 rep × 2', descripcion: 'Baja como si te sentaras en una silla invisible y salta al subir.' },
    { emoji: '🐊', titulo: 'Camina como cocodrilo',   duracion: '20 segundos',   descripcion: 'Apóyate en manos y pies con el cuerpo bajo, y camina hacia adelante.' },
    { emoji: '🧸', titulo: 'Plancha del osito',        duracion: '15 seg × 2',    descripcion: 'Mantén el cuerpo recto apoyado en antebrazos y puntas de los pies.' },
  ],
  flexibilidad: [
    { emoji: '🦋', titulo: 'Postura de la mariposa',  duracion: '30 segundos',   descripcion: 'Sentado/a, junta las plantas de los pies y mueve las rodillas como alitas.' },
    { emoji: '🐱', titulo: 'Gato - vaca',              duracion: '5 repeticiones', descripcion: 'En cuatro puntos, arquea y curva la espalda lentamente como un gatito.' },
    { emoji: '🌳', titulo: 'El árbol que se estira',   duracion: '20 seg × lado', descripcion: 'De pie, estira los brazos hacia el cielo como las ramas de un árbol.' },
  ],
  equilibrio: [
    { emoji: '🦩', titulo: 'El flamingo',              duracion: '20 seg × pie', descripcion: 'Párate en un solo pie, como un flamingo, sin caerte.' },
    { emoji: '🚶', titulo: 'Camina en línea recta',    duracion: '10 pasos',     descripcion: 'Camina poniendo un pie justo delante del otro, como en la cuerda floja.' },
    { emoji: '🗿', titulo: 'Juego de las estatuas',    duracion: 'Libre',        descripcion: 'Baila y cuando la música se detenga, quédate quieto/a como una estatua.' },
  ],
};

// ─── HISTORIAL SEMANAL ────────────────────────────────────────────────────────
const SEMANA = [
  { dia: 'L', xp: 320, completas: 2, animo: 'bien'     },
  { dia: 'M', xp: 580, completas: 3, animo: 'feliz'    },
  { dia: 'X', xp: 200, completas: 1, animo: 'normal'   },
  { dia: 'J', xp: 750, completas: 3, animo: 'feliz'    },
  { dia: 'V', xp: 490, completas: 2, animo: 'cansada'  },
  { dia: 'S', xp: 100, completas: 1, animo: 'triste'   },
  { dia: 'D', xp: 620, completas: 3, animo: 'bien'     },
];
const MAX_XP_SEMANA = Math.max(...SEMANA.map(d => d.xp));

// ─── MENSAJES DEL DÍA ────────────────────────────────────────────────────────
const MENSAJES_DIA = [
  '¡Hoy es un nuevo día para brillar ✨',
  '¡Cada pequeño esfuerzo te acerca a tu mejor versión! 💪',
  '¡Eres increíble y lo sabes! Sigue adelante 🌟',
  'Hoy, un vasito de agua más y un paso más. ¡Tú puedes! 💧',
  '¡Tu racha de 21 días demuestra que eres imparable! 🔥',
  'Dicen los reyes magos, que recibirás una gran sorpresa',
  'Eres alguien que vale mucho la pena',
  'No dejes que los malos comentarios te afecten',
];

// ─── DETECCIÓN DE ÁNIMO TRISTE ───────────────────────────────────────────────
const PALABRAS_TRISTES = [
  'triste', 'mal', 'llorar', 'llorando', 'solo', 'sola', 'deprimida', 'deprimido', 'ansiosa', 'ansioso',
  'ansiedad', 'cansada de todo', 'cansado de todo', 'ya no quiero', 'nada importa', 'todo esta mal',
  'me siento mal', 'estoy mal', 'no puedo', 'me rindo', 'ayuda', 'agotada', 'agotado',
];

const detectarAnimo = (texto: string): boolean =>
  PALABRAS_TRISTES.some(p => texto.toLowerCase().includes(p));

function responderNutriBot(texto: string, estadoAnimo: string, nino: Nino | null) {
  const mensaje = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (
    /no puedo respirar|no puede respirar|dificultad para respirar|hinch|ronch|reaccion alergica|hacerme dano|no quiero vivir/.test(
      mensaje,
    )
  ) {
    return 'Avísale ahora mismo a un adulto de confianza y pídele que te acompañe a buscar ayuda médica o de emergencia. No tienes que resolverlo a solas. 💜';
  }

  if (detectarAnimo(texto) || estadoAnimo === 'triste' || estadoAnimo === 'estresada') {
    return `Siento que estés pasando por algo difícil, ${nino?.nombre ?? 'amigo/a'}. Gracias por contármelo. ¿Quieres decirme qué pasó? También puedes hablar ahora con un adulto de confianza. 💜`;
  }

  if (/comer|comida|desayuno|almuerzo|cena|nutricion|alimento/.test(mensaje)) {
    const alertaAlergias =
      nino && (nino.alergias.length > 0 || nino.otrasAlergias.trim())
        ? ' Pide a un adulto que revise tus alergias y las etiquetas antes de elegir.'
        : ' Pide a un adulto que te ayude a elegir y revisar los ingredientes.';
    return `Una comida puede combinar verduras y frutas, cereales y leguminosas o alimentos de origen animal. No necesitas comer perfecto; lo importante es variar.${alertaAlergias} 🍽️`;
  }

  if (/ejercicio|saltar|caminar|correr|actividad/.test(mensaje)) {
    return 'Puedes probar una caminata o bailar unos minutos con supervisión de un adulto. Hazlo a tu ritmo y detente si algo te duele o te sientes mal. 🤸';
  }

  if (/logre|meta|termine|complet/.test(mensaje) || estadoAnimo === 'feliz') {
    return `¡Qué gusto, ${nino?.nombre ?? 'amigo/a'}! Reconocer tu esfuerzo ya es un gran logro. ¿Qué fue lo que más te gustó? ✨`;
  }

  return `Gracias por escribirme, ${nino?.nombre ?? 'amigo/a'} 🌿 ¿Quieres hablar de cómo te sientes, de una comida o de una actividad para hoy?`;
}

// ─── BARRA XP ANIMADA ─────────────────────────────────────────────────────────
function BarraXP({ actual, maximo }: { actual: number; maximo: number }) {
  const { s } = useEstilos();
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, { toValue: actual / maximo, duration: 1200, useNativeDriver: false }).start();
  }, [actual, anim, maximo]);
  return (
    <View style={s.xpWrap}>
      <View style={s.xpBg}>
        <Animated.View
          style={[s.xpFill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>
      <View style={s.xpRow}>
        <Text style={s.xpTxt}>{actual} XP</Text>
        <Text style={s.xpTxt}>{maximo} XP</Text>
      </View>
    </View>
  );
}

// ─── MODAL CONSTRUCTOR DE AVATAR ─────────────────────────────────────────────
function ModalAvatarBuilder({
  visible, avatarActual, onClose, onSave,
}: {
  visible: boolean;
  avatarActual: typeof AVATAR_DEFAULT;
  onClose: () => void;
  onSave: (av: typeof AVATAR_DEFAULT) => void;
}) {
  const { T, s } = useEstilos();
  const OPC = opcionesAvatar(T);
  const [av, setAv] = useState(avatarActual);
  const [tab, setTab] = useState<AvatarCat>('piel');

  const TABS: { id: AvatarCat; label: string; icon: string }[] = [
    { id: 'piel',      label: 'Piel',      icon: '✋' },
    { id: 'cabello',   label: 'Cabello',   icon: T.id === 'nino' ? '💇‍♂️' : '💇‍♀️' },
    { id: 'ropa',      label: 'Ropa',      icon: T.id === 'nino' ? '👕' : '👗' },
    { id: 'accesorio', label: 'Accesorio', icon: T.id === 'nino' ? '🧢' : '👑' },
    { id: 'fondo',     label: 'Fondo',     icon: '🖼️' },
  ];

  const fondoKey = OPC.fondo[av.fondo];
  const fondoStyle = FONDO_COLORES[fondoKey] ?? { bg: '#F0FAF5', border: '#C6E8D6' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { maxHeight: '90%' }]}>
          {/* Header */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitulo}>🎭 Construye tu avatar</Text>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Preview del avatar */}
          <View style={[s.avatarPreview, { backgroundColor: fondoStyle.bg, borderColor: fondoStyle.border }]}>
            <Text style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>Vista previa</Text>
            <View style={s.avatarPreviewCircle}>
              <Text style={[s.avatarLayer, { fontSize: 48, opacity: 0.3 }]}>{OPC.fondo[av.fondo]}</Text>
              <Text style={[s.avatarLayer, { fontSize: 54 }]}>{T.cara}</Text>
              <Text style={[s.avatarLayer, { fontSize: 36, top: 4 }]}>{OPC.cabello[av.cabello]}</Text>
              <Text style={[s.avatarLayer, { fontSize: 30, bottom: 0 }]}>{OPC.ropa[av.ropa]}</Text>
              <Text style={[s.avatarLayer, { fontSize: 22, top: 0, right: 4 }]}>{OPC.accesorio[av.accesorio]}</Text>
            </View>
          </View>

          {/* Tabs de categorías */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll}>
            {TABS.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[s.tab, tab === t.id && s.tabActivo]}
                onPress={() => setTab(t.id)}
              >
                <Text style={{ fontSize: 16 }}>{t.icon}</Text>
                <Text style={[s.tabLabel, tab === t.id && { color: T.principal }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Opciones de la categoría seleccionada */}
          <View style={s.opcionesGrid}>
            {OPC[tab].map((op, i) => (
              <TouchableOpacity
                key={i}
                style={[s.opcionCard, av[tab] === i && s.opcionSeleccionada]}
                onPress={() => setAv(prev => ({ ...prev, [tab]: i }))}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 30 }}>{op}</Text>
                {av[tab] === i && <Text style={s.opcionCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Guardar */}
          <TouchableOpacity
            style={s.guardarBtn}
            onPress={() => { onSave(av); onClose(); }}
          >
            <Text style={s.guardarBtnTxt}>✨ Guardar avatar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL PLAN DIETA FAMILIAR (Plato del Buen Comer) ────────────────────────
function ChipGrupo({ id }: { id: GrupoId }) {
  const { s } = useEstilos();
  const g = grupoInfo(id);
  return (
    <View style={[s.chipGrupo, { backgroundColor: g.color + '22', borderColor: g.color }]}>
      <Text style={{ fontSize: 11 }}>{g.emoji}</Text>
      <Text style={[s.chipGrupoTxt, { color: g.color }]}>{g.nombre}</Text>
    </View>
  );
}

// Avisos de alergia / gusto para una comida según la ficha del niño
function AlertaComida({ alimentos, nino }: { alimentos: string[]; nino: Nino | null }) {
  const { s } = useEstilos();
  const { alergia, gusto } = conflictosComida(alimentos, nino);
  if (!alergia.length && !gusto.length) return null;
  return (
    <>
      {alergia.length > 0 && (
        <View style={s.dietaAlerta}>
          <Text style={s.dietaAlertaTxt}>
            ⚠️ Cuidado: puede contener {nombresAlimentos(alergia)} (alergia de {nino?.nombre})
          </Text>
        </View>
      )}
      {gusto.length > 0 && (
        <View style={[s.dietaAlerta, s.dietaGusto]}>
          <Text style={s.dietaGustoTxt}>
            😝 Incluye algo que no le gusta: {nombresAlimentos(gusto)}
          </Text>
        </View>
      )}
    </>
  );
}

function ModalDietaFamiliar({
  visible, onClose, nino,
}: {
  visible: boolean;
  onClose: () => void;
  nino: Nino | null;
}) {
  const { T, s } = useEstilos();
  const [diaActivo, setDiaActivo] = useState(0);
  const dia = PLAN_DIETA[diaActivo];

  const diaTieneAlergia = (d: typeof PLAN_DIETA[number]) =>
    [d.desayuno, d.comida, d.cena, d.kids].some(c => conflictosComida(c.alimentos, nino).alergia.length > 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { maxHeight: '90%' }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitulo}>🥦 Plan Familiar Semanal</Text>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Explicación del Plato del Buen Comer */}
          <View style={s.platoIntro}>
            <Text style={s.platoIntroTitulo}>🍽️ Basado en el Plato del Buen Comer</Text>
            <Text style={s.platoIntroTxt}>
              Cada comida busca combinar los 3 grupos de alimentos recomendados en México:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {GRUPOS_PLATO.map(g => (
                <View key={g.id} style={[s.chipGrupo, { backgroundColor: g.color + '22', borderColor: g.color }]}>
                  <Text style={{ fontSize: 11 }}>{g.emoji}</Text>
                  <Text style={[s.chipGrupoTxt, { color: g.color }]}>{g.nombre}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Ficha del niño: avisos personalizados */}
          {nino && (
            <View style={[s.dietaAlerta, { backgroundColor: '#fff', marginTop: 10 }]}>
              <Text style={s.dietaFichaTxt}>
                👤 Plan revisado con la ficha de {nino.nombre}. Las comidas con ⚠️ pueden tener alimentos a los que es alérgico/a.
              </Text>
              {!!nino.otrasAlergias && (
                <Text style={s.dietaFichaTxt}>
                  ✍️ Revisa también (alergias que escribió su tutor): {nino.otrasAlergias}
                </Text>
              )}
              <Text style={[s.dietaFichaTxt, { opacity: 0.7 }]}>
                Los ingredientes son típicos de cada platillo; revisa siempre tu receta y las etiquetas.
              </Text>
            </View>
          )}

          {/* Selector de días */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, marginTop: 14 }}>
            {PLAN_DIETA.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  s.diaTab,
                  diaActivo === i && s.diaTabActivo,
                  diaTieneAlergia(d) && s.diaTabAlerta,
                ]}
                onPress={() => setDiaActivo(i)}
              >
                <Text style={[s.diaTabTxt, diaActivo === i && { color: '#fff' }]}>
                  {d.dia.slice(0, 3)}{diaTieneAlergia(d) ? ' ⚠️' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.dietaDia}>{dia.dia}</Text>

            {[
              { label: '🌅 Desayuno', val: dia.desayuno },
              { label: '☀️ Comida',   val: dia.comida   },
              { label: '🌙 Cena',     val: dia.cena     },
            ].map((item, i) => (
              <View key={i} style={s.dietaItem}>
                <Text style={s.dietaLabel}>{item.label}</Text>
                <Text style={s.dietaVal}>{item.val.texto}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {item.val.grupos.map(g => <ChipGrupo key={g} id={g} />)}
                </View>
                <AlertaComida alimentos={item.val.alimentos} nino={nino} />
              </View>
            ))}

            <View style={[s.dietaItem, { backgroundColor: T.aviso + '22', borderColor: T.aviso }]}>
              <Text style={s.dietaLabel}>👶 Para los peques</Text>
              <Text style={s.dietaVal}>{dia.kids.texto}</Text>
              <AlertaComida alimentos={dia.kids.alimentos} nino={nino} />
            </View>

            <View style={s.dietaTip}>
              <Text style={s.dietaTipTxt}>
                💡 Tip: Involucra a los niños en la cocina y recuérdales combinar los 3 grupos del Plato del Buen Comer en cada comida. ¡Aprenden mejor lo que ayudan a preparar!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL EJERCICIOS PARA NIÑOS ──────────────────────────────────────────────
function ModalEjercicios({
  visible, onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { T, s } = useEstilos();
  const CATEGORIAS_EJERCICIO = crearCategoriasEjercicio(T);
  const [catActiva, setCatActiva] = useState<CategoriaEjercicio>('cardio');
  const catInfo = CATEGORIAS_EJERCICIO.find(c => c.id === catActiva)!;
  const ejercicios = EJERCICIOS_NINOS[catActiva];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { maxHeight: '90%' }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitulo}>🤸 Ejercicios para niños</Text>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>
            Rutinas cortas y divertidas de 10 a 15 minutos, pensadas para hacerse en familia 🏡
          </Text>

          {/* Tabs de categorías */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {CATEGORIAS_EJERCICIO.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[
                  s.tab,
                  catActiva === c.id && { backgroundColor: c.color + '22', borderWidth: 1.5, borderColor: c.color },
                ]}
                onPress={() => setCatActiva(c.id)}
              >
                <Text style={{ fontSize: 16 }}>{c.icon}</Text>
                <Text style={[s.tabLabel, catActiva === c.id && { color: c.color }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false}>
            {ejercicios.map((ej, i) => (
              <View key={i} style={[s.ejercicioCard, { borderColor: catInfo.color + '55' }]}>
                <View style={[s.ejercicioEmojiBg, { backgroundColor: catInfo.color + '22' }]}>
                  <Text style={{ fontSize: 26 }}>{ej.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={s.ejercicioTitulo}>{ej.titulo}</Text>
                    <View style={[s.duracionBadge, { backgroundColor: catInfo.color }]}>
                      <Text style={s.duracionBadgeTxt}>{ej.duracion}</Text>
                    </View>
                  </View>
                  <Text style={s.ejercicioDesc}>{ej.descripcion}</Text>
                </View>
              </View>
            ))}

            <View style={s.dietaTip}>
              <Text style={s.dietaTipTxt}>
                💡 Recuerda: siempre supervisa a los niños durante el ejercicio, ofréceles agua y detente si se sienten cansados o adoloridos.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL DIARIO DE ÁNIMO ────────────────────────────────────────────────────
function ModalDiarioAnimo({
  visible, onClose, aniomHoy, onSelectAnimo,
}: {
  visible: boolean;
  onClose: () => void;
  aniomHoy: string;
  onSelectAnimo: (id: string) => void;
}) {
  const { T, s } = useEstilos();
  const ESTADOS_ANIMO = crearEstadosAnimo(T);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitulo}>🌸 ¿Cómo te sientes hoy?</Text>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            Registrar tu ánimo ayuda a NutriBot a acompañarte mejor 💜
          </Text>

          <View style={s.animoGrid}>
            {ESTADOS_ANIMO.map(e => (
              <TouchableOpacity
                key={e.id}
                style={[s.animoCard, { borderColor: e.color },
                  aniomHoy === e.id && { backgroundColor: e.color + '22' }]}
                onPress={() => { onSelectAnimo(e.id); onClose(); }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 34 }}>{e.emoji}</Text>
                <Text style={[s.animoLabel, { color: e.color }]}>{e.label}</Text>
                {aniomHoy === e.id && <Text style={{ fontSize: 14, color: e.color }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Historial mini */}
          <View style={s.historicoAnimo}>
            <Text style={{ fontSize: 12, color: '#888', fontWeight: '700', marginBottom: 8 }}>
              Esta semana:
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {SEMANA.map((d, i) => {
                const estado = ESTADOS_ANIMO.find(e => e.id === d.animo);
                return (
                  <View key={i} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 18 }}>{estado?.emoji ?? '😐'}</Text>
                    <Text style={{ fontSize: 10, color: '#aaa' }}>{d.dia}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL LOGROS ─────────────────────────────────────────────────────────────
function ModalLogros({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { T, s } = useEstilos();
  const LOGROS = crearLogros(T);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { maxHeight: '85%' }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitulo}>🏆 Mis Logros</Text>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
            {LOGROS.filter(l => l.desbloqueado).length} de {LOGROS.length} desbloqueados ✨
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {LOGROS.map((l, i) => (
              <View key={i} style={[s.logroCard, !l.desbloqueado && { opacity: 0.4 }]}>
                <View style={[s.logroEmojiBg, l.desbloqueado && { backgroundColor: T.aviso + '22' }]}>
                  <Text style={{ fontSize: 28 }}>{l.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.logroTitulo}>{l.titulo}</Text>
                  <Text style={s.logroDesc}>{l.desc}</Text>
                </View>
                {l.desbloqueado
                  ? <Text style={{ fontSize: 20 }}>⭐</Text>
                  : <Text style={{ fontSize: 16 }}>🔒</Text>
                }
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL NUTRIBOT CHAT (mejorado con empatía y ficha del niño) ──────────────
function ModalNutriBot({
  visible, onClose, estadoAnimo, nombre, nino,
}: {
  visible: boolean;
  onClose: () => void;
  estadoAnimo: string;
  nombre: string;
  nino: Nino | null;
}) {
  const { T, s } = useEstilos();
  const ESTADOS_ANIMO = crearEstadosAnimo(T);
  const estadoInfo = ESTADOS_ANIMO.find(e => e.id === estadoAnimo);

  const saludo = () =>
    estadoAnimo === 'triste' || estadoAnimo === 'estresada'
      ? `Hola ${nombre} 💜 Noto que hoy no estás en tu mejor momento... Estoy aquí contigo. ¿Me cuentas cómo te sientes?`
      : estadoAnimo === 'feliz'
      ? `¡Hola ${nombre}! 😊✨ ¡Qué bueno verte de buen ánimo hoy! ¿En qué te ayudo?`
      : `¡Hola ${nombre}! 🌿 Soy NutriBot. ¿Cómo puedo ayudarte hoy?`;

  const [msgs, setMsgs] = useState<ChatMessage[]>([{ rol: 'bot', texto: saludo() }]);
  const [input, setInput]     = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const enviar = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMsgs(prev => [
      ...prev,
      { rol: 'user', texto: userMsg },
      { rol: 'bot', texto: responderNutriBot(userMsg, estadoAnimo, nino) },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.chatOverlay}>
        <View style={s.chatBox}>
          <View style={s.chatHeader}>
            <View style={s.chatBotIcon}><Text style={{ fontSize: 22 }}>🌿</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.chatBotNombre}>NutriBot</Text>
              <Text style={s.chatBotSub}>
                {estadoInfo
                  ? `${nombre} está ${estadoInfo.label.toLowerCase()} ${estadoInfo.emoji}`
                  : 'Tu guía de salud y amigo'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ fontSize: 18, color: '#fff' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView ref={scrollRef} style={s.chatMsgs} contentContainerStyle={{ padding: 12, gap: 8 }}>
            {msgs.map((m, i) => (
              <View key={i} style={[s.msgRow, m.rol === 'user' && s.msgRowUser]}>
                {m.rol === 'bot' && (
                  <View style={s.botAvatarMini}>
                    <Text style={{ fontSize: 14 }}>🌿</Text>
                  </View>
                )}
                <View style={[s.msgBurbuja, m.rol === 'user' ? s.msgUser : s.msgBot]}>
                  <Text style={[s.msgTxt, m.rol === 'user' && { color: '#fff' }]}>{m.texto}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Sugerencias rápidas */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sugerencias}>
            {['¿Qué debería comer hoy?', 'Estoy un poco triste', '¡Logré mi meta!', '¿Qué ejercicio hago hoy?'].map((sug, i) => (
              <TouchableOpacity
                key={i}
                style={s.sugerenciaBtn}
                onPress={() => { setInput(sug); }}
              >
                <Text style={s.sugerenciaTxt}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.chatInputRow}>
            <TextInput
              style={s.chatInput}
              placeholder="Cuéntame o pregúntame..."
              placeholderTextColor="#aaa"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={enviar}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity style={s.chatSend} onPress={enviar} activeOpacity={0.8}>
              <Text style={{ fontSize: 18 }}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── INICIO DE SESIÓN / REGISTRO ─────────────────────────────────────────────
const ROLES: { id: Rol; emoji: string; nombre: string }[] = [
  { id: 'menor', emoji: '🧒🏻',       nombre: 'Soy el menor' },
  { id: 'tutor', emoji: '👨‍👩‍👧', nombre: 'Padre / Tutor' },
];

const correoValido = (c: string) => /^\S+@\S+\.\S+$/.test(c);

function LoginScreen({
  usuarios, onRegistro, onEntrar, temaId, onCambiarTema,
}: {
  usuarios: Usuario[];
  onRegistro: (u: Usuario) => void;
  onEntrar: (u: Usuario) => void;
  temaId: TemaId;
  onCambiarTema: (t: TemaId) => void;
}) {
  const { T, L } = useEstilos();
  const [modoRegistro, setModoRegistro] = useState(false);
  const [rol, setRol]           = useState<Rol>('menor');
  const [nombre, setNombre]     = useState('');
  const [correo, setCorreo]     = useState('');
  const [error, setError]       = useState('');

  const cambiarModo = () => {
    setModoRegistro(m => !m);
    setError('');
  };

  const enviar = () => {
    const c = correo.trim().toLowerCase();
    setError('');

    if (!correoValido(c)) return setError('Escribe un correo válido 📧');

    if (modoRegistro) {
      if (!nombre.trim()) return setError('Escribe tu nombre 🌸');
      if (usuarios.some(u => u.correo === c)) return setError('Ese correo ya está registrado');
      const nuevo: Usuario = { nombre: nombre.trim(), correo: c, rol };
      onRegistro(nuevo);
      onEntrar(nuevo);
    } else {
      const u = usuarios.find(x => x.correo === c);
      if (!u) return setError('No hay una cuenta local con ese correo. Regístrate primero.');
      if (u.rol !== rol) {
        return setError(
          u.rol === 'tutor'
            ? 'Esta cuenta está registrada como Padre / Tutor'
            : 'Esta cuenta está registrada como menor'
        );
      }
      onEntrar(u);
    }
  };

  return (
    <KeyboardAvoidingView
      style={L.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={L.scroll} keyboardShouldPersistTaps="handled">
        <View style={L.logoWrap}>
          <Text style={{ fontSize: 44 }}>🌿</Text>
        </View>
        <Text style={L.titulo}>NutriBot Familiar</Text>
        <Text style={L.subtitulo}>
          {modoRegistro ? 'Crea tu cuenta para empezar ✨' : '¡Qué gusto verte de nuevo! 💜'}
        </Text>

        {/* Selector de rol: menor o padre/tutor */}
        <Text style={L.label}>¿Quién inicia sesión?</Text>
        <View style={L.rolRow}>
          {ROLES.map(r => {
            const activo = rol === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => { setRol(r.id); setError(''); }}
                activeOpacity={0.8}
                style={[L.rolBtn, activo && { backgroundColor: T.principal, borderColor: T.principal }]}
              >
                <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
                <Text style={[L.rolTxt, { color: activo ? '#fff' : T.texto }]}>{r.nombre}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selector de tema (sin cambios) */}
        <Text style={L.label}>¿Quién va a usar la app?</Text>
        <View style={L.temaRow}>
          {Object.values(TEMAS).map(t => {
            const activo = temaId === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => onCambiarTema(t.id)}
                activeOpacity={0.8}
                style={[L.temaBtn, { borderColor: t.principal }, activo && { backgroundColor: t.principal }]}
              >
                <Text style={{ fontSize: 28 }}>{t.emoji}</Text>
                <Text style={[L.temaTxt, { color: activo ? '#fff' : t.principal }]}>{t.nombre}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={L.card}>
          {modoRegistro && (
            <>
              <Text style={L.label}>Nombre</Text>
              <TextInput
                style={L.input}
                placeholder="Tu nombre"
                placeholderTextColor="#aaa"
                value={nombre}
                onChangeText={setNombre}
              />
            </>
          )}

          <Text style={L.label}>Correo</Text>
          <TextInput
            style={L.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#aaa"
            value={correo}
            onChangeText={setCorreo}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {!!error && <Text style={L.error}>{error}</Text>}

          <TouchableOpacity style={L.btn} onPress={enviar} activeOpacity={0.85}>
            <Text style={L.btnTxt}>{modoRegistro ? '✨ Crear cuenta' : 'Iniciar sesión'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={cambiarModo} style={{ marginTop: 18 }}>
          <Text style={L.link}>
            {modoRegistro ? '¿Ya tienes cuenta? ' : '¿Aún no tienes cuenta? '}
            <Text style={{ color: T.principal, fontWeight: '900' }}>
              {modoRegistro ? 'Inicia sesión' : 'Regístrate'}
            </Text>
          </Text>
        </TouchableOpacity>

        <Text style={L.demo}>
          El correo solo identifica una cuenta guardada en este dispositivo; no verifica tu identidad.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('./familiar')}
          style={{ marginTop: 14 }}
        >
          <Text style={L.link}>Abrir la experiencia anterior Warrior Kids</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const crearEstilosLogin = (T: Tema) => StyleSheet.create({
  root:      { flex: 1, backgroundColor: T.fondo },
  scroll:    { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logoWrap:  { width: 88, height: 88, borderRadius: 44, backgroundColor: T.iconTinte, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.principal, marginBottom: 14 },
  titulo:    { fontSize: 26, fontWeight: '900', color: T.texto, letterSpacing: -0.5 },
  subtitulo: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 24, textAlign: 'center' },
  card:      { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: T.bordeSuave, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 4 },
  label:     { fontSize: 12, fontWeight: '800', color: T.texto, marginBottom: 6 },
  input:     { backgroundColor: T.superficie, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.texto, borderWidth: 1, borderColor: T.bordeSuave, marginBottom: 14 },
  claveRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  ojo:       { padding: 10 },
  error:     { color: T.principalDark, fontSize: 12, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  btn:       { backgroundColor: T.principal, borderRadius: 14, padding: 15, alignItems: 'center', shadowColor: T.principal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  btnTxt:    { color: '#fff', fontSize: 16, fontWeight: '900' },
  link:      { fontSize: 13, color: '#666', textAlign: 'center' },
  demo:      { fontSize: 11, color: '#bbb', marginTop: 14 },
  // selector de rol (menor / padre-tutor)
  rolRow:    { flexDirection: 'row', gap: 10, marginBottom: 18 },
  rolBtn:    { width: 140, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 16, borderWidth: 2, borderColor: T.bordeSuave, backgroundColor: '#fff', gap: 2 },
  rolTxt:    { fontSize: 12, fontWeight: '900', textAlign: 'center' },
  // selector de tema
  temaRow:   { flexDirection: 'row', gap: 12, marginBottom: 20 },
  temaBtn:   { width: 120, alignItems: 'center', paddingVertical: 12, borderRadius: 18, borderWidth: 2, backgroundColor: '#fff' },
  temaTxt:   { fontSize: 14, fontWeight: '900', marginTop: 2 },
});

// ─── PANTALLA DEL PADRE / TUTOR ──────────────────────────────────────────────
const crearEstilosTutor = (T: Tema) => StyleSheet.create({
  root:       { flex: 1, backgroundColor: T.fondo },
  scroll:     { padding: 20, paddingTop: 56, paddingBottom: 60 },
  header:     { alignItems: 'center', marginBottom: 20 },
  titulo:     { fontSize: 22, fontWeight: '900', color: T.texto, marginTop: 6 },
  sub:        { fontSize: 13, color: '#888', marginTop: 4, textAlign: 'center' },
  vacio:      { textAlign: 'center', color: '#888', marginVertical: 20, fontSize: 14 },

  card:       { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: T.bordeSuave },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardNombre: { fontSize: 17, fontWeight: '900', color: T.texto },
  cardDatos:  { fontSize: 13, color: '#666', marginTop: 2 },
  cardAcc:    { flexDirection: 'row', gap: 6 },
  accBtn:     { padding: 8, borderRadius: 10, backgroundColor: T.superficie },
  bloqueTit:  { fontSize: 12, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  chipsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipMini:   { borderRadius: 14, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  chipMiniTxt:{ fontSize: 11, fontWeight: '700' },
  nota:       { fontSize: 10, color: '#aaa', marginTop: 10 },

  form:       { backgroundColor: '#fff', borderRadius: 22, padding: 18, borderWidth: 2, borderColor: T.principal, marginBottom: 14 },
  formTit:    { fontSize: 16, fontWeight: '900', color: T.texto, marginBottom: 12 },
  label:      { fontSize: 12, fontWeight: '800', color: T.texto, marginBottom: 6 },
  hint:       { fontSize: 11, color: '#888', marginBottom: 8, lineHeight: 15 },
  input:      { backgroundColor: T.superficie, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: T.texto, borderWidth: 1, borderColor: T.bordeSuave, marginBottom: 14 },
  fila2:      { flexDirection: 'row', gap: 10 },
  generoRow:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  generoBtn:  { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, borderWidth: 2, borderColor: T.bordeSuave },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipTxt:    { fontSize: 12, fontWeight: '700', color: '#555' },
  seccionAle: { backgroundColor: '#FFF1F1', borderRadius: 16, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#F5B5B5' },
  seccionGus: { backgroundColor: T.superficie, borderRadius: 16, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: T.bordeSuave },
  error:      { color: T.principalDark, fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  btnGuardar: { backgroundColor: T.principal, borderRadius: 14, padding: 14, alignItems: 'center' },
  btnGuardarTxt: { color: '#fff', fontSize: 15, fontWeight: '900' },
  btnCancelar:{ alignItems: 'center', padding: 12 },
  btnCancelarTxt: { color: '#888', fontWeight: '700' },
  btnAgregar: { backgroundColor: T.comida, borderRadius: 16, padding: 15, alignItems: 'center', marginBottom: 14 },
  btnAgregarTxt: { color: '#fff', fontSize: 15, fontWeight: '900' },
  btnSalir:   { alignSelf: 'center', marginTop: 10, backgroundColor: T.principal, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12 },
});

function FormNino({
  inicial, onGuardar, onCancelar,
}: {
  inicial: Nino | null;
  onGuardar: (n: Nino) => void;
  onCancelar: () => void;
}) {
  const { T } = useEstilos();
  const U = useMemo(() => crearEstilosTutor(T), [T]);

  const [nombre, setNombre]       = useState(inicial?.nombre ?? '');
  const [genero, setGenero]       = useState<TemaId>(inicial?.genero ?? 'nina');
  const [peso, setPeso]           = useState(inicial?.peso ?? '');
  const [altura, setAltura]       = useState(inicial?.altura ?? '');
  const [alergias, setAlergias]   = useState<string[]>(inicial?.alergias ?? []);
  const [noGusta, setNoGusta]     = useState<string[]>(inicial?.noGusta ?? []);
  const [otrasAle, setOtrasAle]   = useState(inicial?.otrasAlergias ?? '');
  const [otrosGus, setOtrosGus]   = useState(inicial?.otrosNoGusta ?? '');
  const [error, setError]         = useState('');

  const toggle = (lista: string[], set: (l: string[]) => void, id: string) =>
    set(lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id]);

  // Si marcas algo como alergia, se quita de "no le gusta" para no duplicar
  const toggleAlergia = (id: string) => {
    if (!alergias.includes(id)) setNoGusta(prev => prev.filter(x => x !== id));
    toggle(alergias, setAlergias, id);
  };

  const guardar = () => {
    const p = parseFloat(peso.replace(',', '.'));
    const a = parseFloat(altura.replace(',', '.'));
    if (!nombre.trim())              return setError('Escribe el nombre del niño/a 🌸');
    if (!p || p < 2 || p > 150)      return setError('Escribe un peso válido en kg (ej. 28.5)');
    if (!a || a < 40 || a > 200)     return setError('Escribe una altura válida en cm (ej. 125)');
    onGuardar({
      id: inicial?.id ?? String(Date.now()),
      nombre: nombre.trim(), genero,
      peso: String(p), altura: String(a),
      alergias, noGusta,
      otrasAlergias: otrasAle.trim(), otrosNoGusta: otrosGus.trim(),
    });
  };

  return (
    <View style={U.form}>
      <Text style={U.formTit}>{inicial ? '✏️ Editar ficha' : '➕ Nueva ficha'}</Text>

      <Text style={U.label}>Nombre</Text>
      <TextInput style={U.input} placeholder="Nombre del niño/a" placeholderTextColor="#aaa"
        value={nombre} onChangeText={setNombre} />

      <Text style={U.label}>¿Niña o niño?</Text>
      <View style={U.generoRow}>
        {Object.values(TEMAS).map(t => (
          <TouchableOpacity key={t.id} onPress={() => setGenero(t.id)} activeOpacity={0.8}
            style={[U.generoBtn, genero === t.id && { borderColor: t.principal, backgroundColor: t.principal + '22' }]}>
            <Text style={{ fontSize: 24 }}>{t.emoji}</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: t.principal }}>{t.nombre}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={U.fila2}>
        <View style={{ flex: 1 }}>
          <Text style={U.label}>⚖️ Peso (kg)</Text>
          <TextInput style={U.input} placeholder="28.5" placeholderTextColor="#aaa"
            keyboardType="decimal-pad" value={peso} onChangeText={setPeso} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={U.label}>📏 Altura (cm)</Text>
          <TextInput style={U.input} placeholder="125" placeholderTextColor="#aaa"
            keyboardType="decimal-pad" value={altura} onChangeText={setAltura} />
        </View>
      </View>

      {/* ALERGIAS */}
      <View style={U.seccionAle}>
        <Text style={[U.label, { color: '#C0392B' }]}>🚫 Alergias o intolerancias</Text>
        <Text style={U.hint}>Alimentos que le hacen daño y NO puede comer.</Text>
        <View style={U.chipsRow}>
          {ALIMENTOS.map(a => {
            const on = alergias.includes(a.id);
            return (
              <TouchableOpacity key={a.id} activeOpacity={0.8}
                onPress={() => toggleAlergia(a.id)}
                style={[U.chip, on && { backgroundColor: '#E74C3C', borderColor: '#E74C3C' }]}>
                <Text style={{ fontSize: 13 }}>{a.emoji}</Text>
                <Text style={[U.chipTxt, on && { color: '#fff' }]}>{a.nombre}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput style={[U.input, { marginTop: 10, marginBottom: 0 }]}
          placeholder="Otras alergias (escríbelas aquí)" placeholderTextColor="#aaa"
          value={otrasAle} onChangeText={setOtrasAle} />
      </View>

      {/* NO LE GUSTA */}
      <View style={U.seccionGus}>
        <Text style={[U.label, { color: T.secundarioDark }]}>😝 No le gusta</Text>
        <Text style={U.hint}>Alimentos que no come por gusto (no son peligrosos).</Text>
        <View style={U.chipsRow}>
          {ALIMENTOS.map(a => {
            const on = noGusta.includes(a.id);
            const bloqueado = alergias.includes(a.id);
            return (
              <TouchableOpacity key={a.id} activeOpacity={0.8} disabled={bloqueado}
                onPress={() => toggle(noGusta, setNoGusta, a.id)}
                style={[U.chip, on && { backgroundColor: T.secundario, borderColor: T.secundario }, bloqueado && { opacity: 0.3 }]}>
                <Text style={{ fontSize: 13 }}>{a.emoji}</Text>
                <Text style={[U.chipTxt, on && { color: '#fff' }]}>{a.nombre}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput style={[U.input, { marginTop: 10, marginBottom: 0 }]}
          placeholder="Otros que no le gusten" placeholderTextColor="#aaa"
          value={otrosGus} onChangeText={setOtrosGus} />
      </View>

      {!!error && <Text style={U.error}>{error}</Text>}

      <TouchableOpacity style={U.btnGuardar} onPress={guardar} activeOpacity={0.85}>
        <Text style={U.btnGuardarTxt}>✨ Guardar ficha</Text>
      </TouchableOpacity>
      <TouchableOpacity style={U.btnCancelar} onPress={onCancelar}>
        <Text style={U.btnCancelarTxt}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

function ChipsLectura({ ids, color }: { ids: string[]; color: string }) {
  const { T } = useEstilos();
  const U = useMemo(() => crearEstilosTutor(T), [T]);
  return (
    <View style={U.chipsRow}>
      {ids.map(id => {
        const a = ALIMENTOS.find(x => x.id === id);
        if (!a) return null;
        return (
          <View key={id} style={[U.chipMini, { borderColor: color, backgroundColor: color + '18' }]}>
            <Text style={[U.chipMiniTxt, { color }]}>{a.emoji} {a.nombre}</Text>
          </View>
        );
      })}
    </View>
  );
}

function TutorScreen({
  nombre, ninos, onGuardarNino, onEliminarNino, onSalir,
}: {
  nombre: string;
  ninos: Nino[];
  onGuardarNino: (n: Nino) => void;
  onEliminarNino: (id: string) => void;
  onSalir: () => void;
}) {
  const { T } = useEstilos();
  const U = useMemo(() => crearEstilosTutor(T), [T]);
  const [editando, setEditando] = useState<Nino | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const confirmarEliminar = (n: Nino) =>
    Alert.alert('Eliminar ficha', `¿Eliminar la ficha de ${n.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onEliminarNino(n.id) },
    ]);

  return (
    <KeyboardAvoidingView style={U.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={U.scroll} keyboardShouldPersistTaps="handled">
        <View style={U.header}>
          <Text style={{ fontSize: 40 }}>👨‍👩‍👧</Text>
          <Text style={U.titulo}>Panel de Padre / Tutor</Text>
          <Text style={U.sub}>Hola, {nombre} 💜{'\n'}Registra a tus hijos para personalizar su alimentación</Text>
        </View>

        {mostrarForm ? (
          <FormNino
            key={editando?.id ?? 'nuevo'}
            inicial={editando}
            onCancelar={() => { setMostrarForm(false); setEditando(null); }}
            onGuardar={n => { onGuardarNino(n); setMostrarForm(false); setEditando(null); }}
          />
        ) : (
          <TouchableOpacity style={U.btnAgregar} activeOpacity={0.85}
            onPress={() => { setEditando(null); setMostrarForm(true); }}>
            <Text style={U.btnAgregarTxt}>➕ Agregar niño/a</Text>
          </TouchableOpacity>
        )}

        {ninos.length === 0 && !mostrarForm && (
          <Text style={U.vacio}>Aún no has registrado a ningún niño/a 🌱</Text>
        )}

        {ninos.map(n => {
          const t = TEMAS[n.genero];
          const valorImc = imc(n.peso, n.altura);
          return (
            <View key={n.id} style={[U.card, { borderColor: t.principal + '66' }]}>
              <View style={U.cardTop}>
                <Text style={{ fontSize: 34 }}>{t.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={U.cardNombre}>{n.nombre}</Text>
                  <Text style={U.cardDatos}>
                    ⚖️ {n.peso} kg · 📏 {n.altura} cm{valorImc ? ` · IMC ${valorImc}` : ''}
                  </Text>
                </View>
                <View style={U.cardAcc}>
                  <TouchableOpacity style={U.accBtn}
                    onPress={() => { setEditando(n); setMostrarForm(true); }}>
                    <Text style={{ fontSize: 16 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={U.accBtn} onPress={() => confirmarEliminar(n)}>
                    <Text style={{ fontSize: 16 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(n.alergias.length > 0 || !!n.otrasAlergias) && (
                <>
                  <Text style={[U.bloqueTit, { color: '#C0392B' }]}>🚫 Alergias</Text>
                  <ChipsLectura ids={n.alergias} color="#E74C3C" />
                  {!!n.otrasAlergias && (
                    <Text style={[U.cardDatos, { marginTop: 4 }]}>+ {n.otrasAlergias}</Text>
                  )}
                </>
              )}

              {(n.noGusta.length > 0 || !!n.otrosNoGusta) && (
                <>
                  <Text style={[U.bloqueTit, { color: T.secundarioDark }]}>😝 No le gusta</Text>
                  <ChipsLectura ids={n.noGusta} color={T.secundario} />
                  {!!n.otrosNoGusta && (
                    <Text style={[U.cardDatos, { marginTop: 4 }]}>+ {n.otrosNoGusta}</Text>
                  )}
                </>
              )}

              {valorImc && (
                <Text style={U.nota}>
                  El IMC en niños se interpreta con tablas de percentiles; consulta a su pediatra.
                </Text>
              )}
            </View>
          );
        })}

        <TouchableOpacity onPress={onSalir} style={U.btnSalir}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── PANTALLA PRINCIPAL ────────────────────────────────────────────────────────
type Stat = {
  icon: string; valor: number; label: string; max: number;
  color: 'agua' | 'acento' | 'principal' | 'secundario';
};

function HomeScreen({
  nombre, ninos, onSalir,
}: {
  nombre: string;
  ninos: Nino[];
  onSalir: () => void;
}) {
  const { T, s } = useEstilos();
  const OPC = opcionesAvatar(T);
  const ESTADOS_ANIMO = crearEstadosAnimo(T);
  const esNino = T.id === 'nino';

  // Ficha del niño: se busca por nombre; si no coincide, se usa la primera registrada
  const [fichaId, setFichaId] = useState<string | null>(
    () =>
      ninos.find(n => n.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())?.id
      ?? ninos[0]?.id
      ?? null
  );
  const nino = ninos.find(n => n.id === fichaId) ?? null;

  const [avatar, setAvatar]               = useState(AVATAR_DEFAULT);
  const [showAvatarBuilder, setAvatarBuilder] = useState(false);
  const [showChat, setChat]               = useState(false);
  const [showDieta, setDieta]             = useState(false);
  const [showAnimo, setAnimo]             = useState(false);
  const [showLogros, setLogros]           = useState(false);
  const [showEjercicios, setEjercicios]   = useState(false);
  const [estadoAnimo, setEstadoAnimo]     = useState('bien');

  const [stats, setStats] = useState<Stat[]>([
    { icon: '💦', valor: 4,    label: 'vasos',     max: 8,     color: 'agua' },
    { icon: '👣', valor: 3200, label: 'pasos',     max: 10000, color: 'acento' },
    { icon: '🥝', valor: 2,    label: 'frutas',    max: 5,     color: 'principal' },
    { icon: '🌙', valor: 7,    label: 'hrs sueño', max: 9,     color: 'secundario' },
  ]);

  const [misiones, setMisiones] = useState([
    { icon: '🥗', titulo: 'Come una ensalada',    sub: '¡Completada! 🎉',   xp: 40, hecha: true  },
    { icon: '🎯', titulo: 'Camina 30 minutos',    sub: 'Te faltan 18 min',  xp: 50, hecha: false },
    { icon: '💧', titulo: 'Toma 8 vasos de agua', sub: 'Te faltan 4 vasos', xp: 30, hecha: false },
    { icon: '🤸', titulo: 'Haz un ejercicio de la app', sub: 'Elige uno de la lista', xp: 35, hecha: false },
  ]);

  const [xp, setXp]     = useState(620);
  const [xpAnim]        = useState(new Animated.Value(0));
  const [xpFlash, setXpFlash] = useState(false);

  const msgDia = MENSAJES_DIA[new Date().getDay() % MENSAJES_DIA.length];

  const fondoKey   = OPC.fondo[avatar.fondo];
  const fondoStyle = FONDO_COLORES[fondoKey] ?? { bg: '#F0FAF5', border: '#C6E8D6' };
  const animoInfo  = ESTADOS_ANIMO.find(e => e.id === estadoAnimo) ?? ESTADOS_ANIMO[1];

  const sumarStat = (i: number) => {
    setStats(prev => {
      const next = [...prev];
      if (next[i].valor < next[i].max) next[i] = { ...next[i], valor: next[i].valor + 1 };
      return next;
    });
  };

  const toggleMision = (i: number) => {
    setMisiones(prev => {
      const next = [...prev];
      const m = next[i];
      if (!m.hecha) {
        next[i] = { ...m, hecha: true, sub: '¡Completada! 🎉' };
        const nuevoXp = xp + m.xp;
        setXp(nuevoXp);
        setXpFlash(true);
        Animated.sequence([
          Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(xpAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => setXpFlash(false));
      } else {
        next[i] = { ...m, hecha: false, sub: 'Pendiente' };
      }
      return next;
    });
  };

  const formatStat = (stat: Stat) => {
    if (stat.label === 'pasos') return `${(stat.valor / 1000).toFixed(1)}k`;
    if (stat.label === 'hrs sueño') return `${stat.valor}h`;
    return String(stat.valor);
  };

  return (
    <>
      <ModalAvatarBuilder
        visible={showAvatarBuilder}
        avatarActual={avatar}
        onClose={() => setAvatarBuilder(false)}
        onSave={setAvatar}
      />
      <ModalNutriBot
        key={estadoAnimo}
        visible={showChat}
        onClose={() => setChat(false)}
        estadoAnimo={estadoAnimo}
        nombre={nombre}
        nino={nino}
      />
      <ModalDietaFamiliar visible={showDieta} onClose={() => setDieta(false)} nino={nino} />
      <ModalEjercicios visible={showEjercicios} onClose={() => setEjercicios(false)} />
      <ModalDiarioAnimo
        visible={showAnimo}
        onClose={() => setAnimo(false)}
        aniomHoy={estadoAnimo}
        onSelectAnimo={setEstadoAnimo}
      />
      <ModalLogros visible={showLogros} onClose={() => setLogros(false)} />

      <ParallaxScrollView
        headerBackgroundColor={{ light: T.principal, dark: T.principalDark }}
        headerImage={
          <View style={s.headerContent}>
            <Text style={s.saludo}>¡Buenos días!</Text>
            <Text style={s.nombreHeader}>{nombre} 👋</Text>
            <View style={s.rachaBadge}>
              <Text style={s.rachaTexto}>🔥 7 días seguidos</Text>
            </View>
            <TouchableOpacity onPress={onSalir} style={s.salirBtn}>
              <Text style={s.salirTxt}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        }
      >
        {/* ── MENSAJE DEL DÍA ── */}
        <View style={s.mensajeDia}>
          <Text style={s.mensajeDiaTxt}>✨ {msgDia}</Text>
        </View>

        {/* ── SELECTOR DE FICHA (solo si el tutor registró varios niños) ── */}
        {ninos.length > 1 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={s.fichaLabel}>¿Quién eres?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ninos.map(n => {
                const activo = n.id === fichaId;
                return (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => setFichaId(n.id)}
                    activeOpacity={0.8}
                    style={[s.fichaChip, activo && { backgroundColor: T.principal, borderColor: T.principal }]}
                  >
                    <Text style={{ fontSize: 16 }}>{TEMAS[n.genero].emoji}</Text>
                    <Text style={[s.fichaChipTxt, activo && { color: '#fff' }]}>{n.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── AVISO DE ALERGIAS ── */}
        {nino && (nino.alergias.length > 0 || !!nino.otrasAlergias) && (
          <View style={s.alergiaBanner}>
            <Text style={s.alergiaBannerTxt}>
              🚫 Alergias de {nino.nombre}: {[nombresAlimentos(nino.alergias), nino.otrasAlergias].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {/* ── TARJETA AVATAR con ánimo ── */}
        <ThemedView style={s.avatarCard}>
          <TouchableOpacity
            style={s.avatarWrap}
            onPress={() => setAvatarBuilder(true)}
            activeOpacity={0.8}
          >
            <View style={[s.avatarCirculo, { backgroundColor: fondoStyle.bg, borderColor: fondoStyle.border }]}>
              <Text style={{ fontSize: 16, position: 'absolute', opacity: 0.25 }}>
                {OPC.fondo[avatar.fondo]}
              </Text>
              <Text style={{ fontSize: 44, zIndex: 2 }}>{T.cara}</Text>
              <Text style={{ fontSize: 22, position: 'absolute', top: 2, zIndex: 3 }}>
                {OPC.cabello[avatar.cabello]}
              </Text>
              <Text style={{ fontSize: 18, position: 'absolute', bottom: 2, zIndex: 3 }}>
                {OPC.ropa[avatar.ropa]}
              </Text>
              <Text style={{ fontSize: 14, position: 'absolute', top: 2, right: 2, zIndex: 4 }}>
                {OPC.accesorio[avatar.accesorio]}
              </Text>
            </View>
            <View style={s.nivelBadge}>
              <Text style={s.nivelTxt}>Nv. 5</Text>
            </View>
            <View style={s.editBadge}>
              <Text style={{ fontSize: 10 }}>🎭</Text>
            </View>
          </TouchableOpacity>

          <View style={s.avatarInfo}>
            <ThemedText type="defaultSemiBold" style={s.avatarNombre}>
              {nombre} ✨
            </ThemedText>

            {/* Estado de ánimo actual */}
            <TouchableOpacity
              style={[s.animoBadge, { borderColor: animoInfo.color }]}
              onPress={() => setAnimo(true)}
            >
              <Text style={{ fontSize: 14 }}>{animoInfo.emoji}</Text>
              <Text style={[s.animoBadgeTxt, { color: animoInfo.color }]}>
                {animoInfo.label}
              </Text>
              <Text style={{ fontSize: 10, color: '#ccc' }}>›</Text>
            </TouchableOpacity>

            <ThemedText style={s.avatarSub}>¡Casi llegas al nivel 6!</ThemedText>
            <Animated.View style={{ opacity: xpFlash ? xpAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.4, 1] }) : 1 }}>
              {xpFlash && (
                <Animated.Text style={[s.xpFlashTxt, { opacity: xpAnim, transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }] }]}>
                  +XP ✨
                </Animated.Text>
              )}
              <BarraXP actual={xp} maximo={1000} />
            </Animated.View>
          </View>
        </ThemedView>

        {/* ── ACCESOS RÁPIDOS ── */}
        <View style={s.accesosRow}>
          {[
            { icon: '🏆', label: 'Logros',    onPress: () => setLogros(true),     color: T.aviso },
            { icon: '🥦', label: 'Dieta',     onPress: () => setDieta(true),      color: T.comida },
            { icon: '🌸', label: 'Ánimo',     onPress: () => setAnimo(true),      color: T.principal },
            { icon: esNino ? '🤸‍♂️' : '🤸‍♀️', label: 'Ejercicio', onPress: () => setEjercicios(true), color: T.acento },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={[s.accesoCard, { backgroundColor: a.color + '22', borderColor: a.color }]}
              onPress={a.onPress} activeOpacity={0.8}>
              <Text style={{ fontSize: 24 }}>{a.icon}</Text>
              <Text style={s.accesoLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── STATS DEL DÍA ── */}
        <ThemedView style={s.secHeader}>
          <ThemedText type="subtitle" style={s.secTitulo}>Hoy</ThemedText>
        </ThemedView>

        <View style={s.statsRow}>
          {stats.map((stat, i) => {
            const accent = T[stat.color];
            return (
              <View key={i} style={[s.statCard, { backgroundColor: accent + '1A', borderTopColor: accent }]}>
                <Text style={s.statIcon}>{stat.icon}</Text>
                <Text style={[s.statVal, { color: accent }]}>{formatStat(stat)}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
                <TouchableOpacity
                  style={[s.statPlus, { backgroundColor: accent }]}
                  onPress={() => sumarStat(i)}
                  activeOpacity={0.7}
                >
                  <Text style={s.statPlusTxt}>+</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* ── HISTORIAL SEMANAL ── */}
        <ThemedView style={s.secHeader}>
          <ThemedText type="subtitle" style={s.secTitulo}>Esta semana</ThemedText>
        </ThemedView>

        <ThemedView style={s.semanaCard}>
          <View style={s.semanaBarras}>
            {SEMANA.map((d, i) => {
              const hoy    = i === 6;
              const alto   = Math.round((d.xp / MAX_XP_SEMANA) * 80);
              const estado = ESTADOS_ANIMO.find(e => e.id === d.animo);
              return (
                <View key={i} style={s.semanaCol}>
                  <Text style={{ fontSize: 8 }}>{estado?.emoji ?? '😐'}</Text>
                  <Text style={s.semanaXp}>{d.xp}</Text>
                  <View style={s.semanaBarBg}>
                    <View style={[s.semanaBar, { height: alto, backgroundColor: hoy ? T.principal : T.principal + '40' }]} />
                  </View>
                  <Text style={[s.somanaDia, hoy && { color: T.principal, fontWeight: '900' }]}>{d.dia}</Text>
                  <Text style={s.semanaEstrellas}>
                    {d.completas === 3 ? '⭐⭐⭐' : d.completas === 2 ? '⭐⭐' : '⭐'}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={s.semanaResumen}>
            <Text style={s.semanaResumenTxt}>🏆 Mejor día: Jueves · 750 XP</Text>
          </View>
        </ThemedView>

        {/* ── MISIONES ── */}
        <ThemedView style={s.secHeader}>
          <ThemedText type="subtitle" style={s.secTitulo}>Misiones del día</ThemedText>
        </ThemedView>

        {misiones.map((m, i) => (
          <TouchableOpacity key={i} onPress={() => toggleMision(i)} activeOpacity={0.75}>
            <ThemedView style={[s.misionCard, m.hecha && s.misionHecha]}>
              <View style={s.mIconWrap}>
                <Text style={s.mIcon}>{m.icon}</Text>
              </View>
              <View style={s.mTexto}>
                <ThemedText type="defaultSemiBold" style={s.mTitulo}>{m.titulo}</ThemedText>
                <ThemedText style={s.mSub}>{m.sub}</ThemedText>
              </View>
              {m.hecha ? (
                <Text style={s.check}>✅</Text>
              ) : (
                <View style={s.xpBadge}>
                  <Text style={s.xpBadgeTxt}>+{m.xp} XP</Text>
                </View>
              )}
            </ThemedView>
          </TouchableOpacity>
        ))}

        {/* ── BOTÓN DIETA FAMILIAR ── */}
        <TouchableOpacity style={[s.chatBtn, { backgroundColor: T.comida }]} activeOpacity={0.85} onPress={() => setDieta(true)}>
          <View style={[s.botAvatar, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
            <Text style={{ fontSize: 26 }}>🥦</Text>
          </View>
          <View style={s.botInfo}>
            <Text style={s.botTitulo}>Plan de dieta familiar</Text>
            <Text style={s.botSub}>
              {nino
                ? `Menú semanal con avisos de alergias para ${nino.nombre} 🍽️`
                : 'Menú semanal basado en el Plato del Buen Comer 🍽️'}
            </Text>
          </View>
          <Text style={s.botArrow}>›</Text>
        </TouchableOpacity>

        {/* ── BOTÓN EJERCICIOS PARA NIÑOS ── */}
        <TouchableOpacity style={[s.chatBtn, { backgroundColor: T.acento }]} activeOpacity={0.85} onPress={() => setEjercicios(true)}>
          <View style={[s.botAvatar, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
            <Text style={{ fontSize: 26 }}>{esNino ? '🤸‍♂️' : '🤸‍♀️'}</Text>
          </View>
          <View style={s.botInfo}>
            <Text style={s.botTitulo}>Ejercicios para niños</Text>
            <Text style={s.botSub}>Rutinas cortas de cardio, fuerza y equilibrio 💪</Text>
          </View>
          <Text style={s.botArrow}>›</Text>
        </TouchableOpacity>

        {/* ── BOTÓN NUTRIBOT ── */}
        <TouchableOpacity style={s.chatBtn} activeOpacity={0.85} onPress={() => setChat(true)}>
          <View style={s.botAvatar}>
            <Text style={{ fontSize: 26 }}>🌿</Text>
          </View>
          <View style={s.botInfo}>
            <Text style={s.botTitulo}>Habla con NutriBot</Text>
            <Text style={s.botSub}>
              {estadoAnimo === 'triste' || estadoAnimo === 'estresada'
                ? '💜 Estoy aquí para escucharte'
                : 'Tu guía de salud y amigo personal'}
            </Text>
          </View>
          <Text style={s.botArrow}>›</Text>
        </TouchableOpacity>

      </ParallaxScrollView>
    </>
  );
}

// ─── ESTILOS (dependen del tema) ──────────────────────────────────────────────
const crearEstilos = (T: Tema) => StyleSheet.create({
  // HEADER
  headerContent: { position: 'absolute', bottom: 24, left: 24 },
  saludo: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  nombreHeader: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 2, letterSpacing: -0.5 },
  rachaBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  rachaTexto: { color: '#fff', fontSize: 13, fontWeight: '800' },
  salirBtn: { alignSelf: 'flex-start', marginTop: 8 },
  salirTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },

  // MENSAJE DEL DÍA
  mensajeDia: { backgroundColor: T.aviso + '22', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: T.aviso },
  mensajeDiaTxt: { fontSize: 13, color: T.texto, fontWeight: '700', textAlign: 'center', lineHeight: 18 },

  // FICHA DEL NIÑO (selector y aviso de alergias)
  fichaLabel: { fontSize: 12, fontWeight: '800', color: T.texto, marginBottom: 6 },
  fichaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1.5, borderColor: T.bordeSuave, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, backgroundColor: '#fff' },
  fichaChipTxt: { fontSize: 13, fontWeight: '800', color: T.texto },
  alergiaBanner: { backgroundColor: '#FFF1F1', borderRadius: 14, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#E74C3C' },
  alergiaBannerTxt: { fontSize: 12, color: '#C0392B', fontWeight: '800', textAlign: 'center', lineHeight: 17 },

  // AVATAR CARD
  avatarCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 18, marginBottom: 8, backgroundColor: T.fondo, borderWidth: 1, borderColor: T.bordeSuave, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 4 },
  avatarWrap: { position: 'relative', marginRight: 16 },
  avatarCirculo: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'hidden' },
  avatarLayer: { position: 'absolute' },
  nivelBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: T.principal, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 2, borderColor: '#fff' },
  nivelTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },
  editBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#fff', borderRadius: 10, padding: 4, borderWidth: 1, borderColor: T.bordeSuave },
  avatarInfo: { flex: 1 },
  avatarNombre: { fontSize: 16, color: T.texto },
  avatarSub: { fontSize: 12, opacity: 0.55, marginBottom: 8, marginTop: 2, color: T.texto },

  // ÁNIMO BADGE
  animoBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, marginBottom: 4, gap: 4, backgroundColor: '#fff' },
  animoBadgeTxt: { fontSize: 12, fontWeight: '800' },

  // XP
  xpFlashTxt: { fontSize: 13, fontWeight: '900', color: T.principal, position: 'absolute', top: -20, left: 0 },
  xpWrap: {},
  xpBg: { height: 8, backgroundColor: T.superficie, borderRadius: 8, overflow: 'hidden', marginBottom: 4 },
  xpFill: { height: '100%', backgroundColor: T.principal, borderRadius: 8 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpTxt: { fontSize: 10, color: '#aaa', fontWeight: '700' },

  // ACCESOS RÁPIDOS
  accesosRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  accesoCard: { flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1.5, gap: 4 },
  accesoLabel: { fontSize: 10, fontWeight: '800', color: T.texto, textAlign: 'center' },

  // SEC HEADER
  secHeader: { marginTop: 12, marginBottom: 10, backgroundColor: 'transparent' },
  secTitulo: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3, color: T.texto },

  // STATS
  statsRow: { flexDirection: 'row', marginBottom: 4, gap: 8, flexWrap: 'wrap' },
  statCard: { width: '22%', flexGrow: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: T.bordeSuave, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statVal: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#888', fontWeight: '700', marginTop: 2, marginBottom: 8, textAlign: 'center' },
  statPlus: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statPlusTxt: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 22 },

  // SEMANA
  semanaCard: { borderRadius: 20, padding: 16, marginBottom: 8, backgroundColor: T.fondo, borderWidth: 1, borderColor: T.bordeSuave, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  semanaBarras: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  semanaCol: { alignItems: 'center', flex: 1 },
  semanaXp: { fontSize: 8, color: '#bbb', fontWeight: '700', marginBottom: 2 },
  semanaBarBg: { width: 20, height: 80, borderRadius: 6, backgroundColor: T.superficie, justifyContent: 'flex-end', overflow: 'hidden' },
  semanaBar: { width: '100%', borderRadius: 6 },
  somanaDia: { fontSize: 11, color: '#888', fontWeight: '700', marginTop: 4 },
  semanaEstrellas: { fontSize: 7, marginTop: 2 },
  semanaResumen: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: T.bordeSuave },
  semanaResumenTxt: { fontSize: 12, color: '#666', fontWeight: '700', textAlign: 'center' },

  // MISIONES
  misionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10, backgroundColor: T.fondo, borderWidth: 1, borderColor: T.bordeSuave, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  misionHecha: { opacity: 0.45 },
  mIconWrap: { width: 46, height: 46, borderRadius: 13, backgroundColor: T.iconTinte, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: T.bordeSuave },
  mIcon: { fontSize: 24 },
  mTexto: { flex: 1 },
  mTitulo: { fontSize: 14, color: T.texto },
  mSub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  check: { fontSize: 20 },
  xpBadge: { backgroundColor: T.principal, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  xpBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '900' },

  // BOTONES PRINCIPALES
  chatBtn: { backgroundColor: T.principal, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12, shadowColor: T.principal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  botAvatar: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  botInfo: { flex: 1 },
  botTitulo: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  botSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 3 },
  botArrow: { color: 'rgba(255,255,255,0.8)', fontSize: 32, fontWeight: '300' },

  // MODAL BASE
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: T.fondo, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalTitulo: { flex: 1, fontSize: 18, fontWeight: '900', color: T.texto },
  modalClose: { padding: 8 },

  // AVATAR BUILDER
  avatarPreview: { borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 2 },
  avatarPreviewCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: 'rgba(255,255,255,0.6)' },
  tabsScroll: { marginBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, alignItems: 'center', backgroundColor: '#F5F5F5', flexDirection: 'row', gap: 4 },
  tabActivo: { backgroundColor: T.tabTinte, borderWidth: 1.5, borderColor: T.principal },
  tabLabel: { fontSize: 12, fontWeight: '700', color: '#888' },
  opcionesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  opcionCard: { width: '30%', borderRadius: 14, padding: 12, alignItems: 'center', backgroundColor: '#F8F8F8', borderWidth: 1.5, borderColor: '#eee' },
  opcionSeleccionada: { borderColor: T.principal, backgroundColor: T.tabTinte, borderWidth: 2 },
  opcionCheck: { fontSize: 12, color: T.principal, fontWeight: '900' },
  guardarBtn: { backgroundColor: T.principal, borderRadius: 14, padding: 16, alignItems: 'center' },
  guardarBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // DIETA / PLATO DEL BUEN COMER
  platoIntro: { backgroundColor: T.secundario + '18', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: T.secundario + '44' },
  platoIntroTitulo: { fontSize: 14, fontWeight: '900', color: T.secundarioDark, marginBottom: 4 },
  platoIntroTxt: { fontSize: 12, color: T.texto, lineHeight: 17 },
  chipGrupo: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  chipGrupoTxt: { fontSize: 10, fontWeight: '800' },
  diaTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#F0F0F0', borderWidth: 1.5, borderColor: 'transparent' },
  diaTabActivo: { backgroundColor: T.comida },
  diaTabAlerta: { borderColor: '#E74C3C' },
  diaTabTxt: { fontSize: 13, fontWeight: '800', color: '#555' },
  dietaDia: { fontSize: 20, fontWeight: '900', color: T.texto, marginBottom: 12 },
  dietaItem: { backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: T.bordeSuave },
  dietaLabel: { fontSize: 13, fontWeight: '800', color: T.comida, marginBottom: 6 },
  dietaVal: { fontSize: 14, color: T.texto, lineHeight: 20 },
  dietaTip: { backgroundColor: T.aviso + '22', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: T.aviso, marginTop: 4 },
  dietaTipTxt: { fontSize: 13, color: T.texto, lineHeight: 18 },
  // avisos de alergia / gusto en la dieta
  dietaAlerta: { backgroundColor: '#FFF1F1', borderRadius: 10, padding: 8, marginTop: 8, borderWidth: 1, borderColor: '#E74C3C', gap: 4 },
  dietaAlertaTxt: { fontSize: 12, fontWeight: '800', color: '#C0392B', lineHeight: 17 },
  dietaGusto: { backgroundColor: T.aviso + '22', borderColor: T.aviso },
  dietaGustoTxt: { fontSize: 12, fontWeight: '700', color: T.texto, lineHeight: 17 },
  dietaFichaTxt: { fontSize: 12, color: T.texto, lineHeight: 17 },

  // EJERCICIOS
  ejercicioCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 16, padding: 14, marginBottom: 10, backgroundColor: '#fff', borderWidth: 1.5, gap: 12 },
  ejercicioEmojiBg: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ejercicioTitulo: { fontSize: 14, fontWeight: '900', color: T.texto },
  ejercicioDesc: { fontSize: 12, color: '#888', marginTop: 4, lineHeight: 17 },
  duracionBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  duracionBadgeTxt: { fontSize: 10, fontWeight: '900', color: '#fff' },

  // ÁNIMO
  animoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  animoCard: { width: '30%', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 2, backgroundColor: '#fafafa' },
  animoLabel: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  historicoAnimo: { backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: T.bordeSuave },

  // LOGROS
  logroCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: T.bordeSuave, gap: 12 },
  logroEmojiBg: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' },
  logroTitulo: { fontSize: 14, fontWeight: '900', color: T.texto },
  logroDesc: { fontSize: 12, color: '#888', marginTop: 2 },

  // CHAT
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  chatBox: { backgroundColor: T.fondo, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '85%', overflow: 'hidden' },
  chatHeader: { backgroundColor: T.principal, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatBotIcon: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chatBotNombre: { color: '#fff', fontSize: 16, fontWeight: '900' },
  chatBotSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  chatMsgs: { flex: 1, backgroundColor: T.superficie },
  msgRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end', gap: 6 },
  msgRowUser: { justifyContent: 'flex-end' },
  botAvatarMini: { width: 28, height: 28, backgroundColor: T.tabTinte, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  msgBurbuja: { maxWidth: '75%', borderRadius: 16, padding: 10 },
  msgBot: { backgroundColor: '#fff', borderWidth: 1, borderColor: T.bordeSuave },
  msgUser: { backgroundColor: T.principal },
  msgTxt: { fontSize: 14, color: T.texto, lineHeight: 20 },
  sugerencias: { backgroundColor: T.superficie, paddingVertical: 8, paddingHorizontal: 12 },
  sugerenciaBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: T.bordeSuave },
  sugerenciaTxt: { fontSize: 12, color: '#555', fontWeight: '600' },
  chatInputRow: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderColor: T.bordeSuave, backgroundColor: '#fff' },
  chatInput: { flex: 1, backgroundColor: T.superficie, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: T.texto, borderWidth: 1, borderColor: T.bordeSuave, maxHeight: 80 },
  chatSend: { width: 44, height: 44, backgroundColor: T.principal, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

// ─── RAÍZ: decide entre login y app, y provee el tema ────────────────────────
export default function App() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [sesion, setSesion]     = useState<Usuario | null>(null);
  const [temaId, setTemaId]     = useState<TemaId>('nina');
  const [ninos, setNinos]       = useState<Nino[]>([]);
  const [datosCargados, setDatosCargados] = useState(false);
  const escrituras = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let activo = true;

    const cargarDatos = async () => {
      try {
        const guardado = await AsyncStorage.getItem(STORAGE_KEY);
        if (!guardado) return;

        const datos: unknown = JSON.parse(guardado);
        if (!isStoredAppData(datos)) {
          throw new Error('El formato de los datos guardados no es válido.');
        }

        if (activo) {
          setUsuarios(datos.usuarios);
          setTemaId(datos.temaId);
          setNinos(datos.ninos);
        }
      } catch (error) {
        if (activo) {
          Alert.alert(
            'No se pudieron cargar los datos locales',
            error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
          );
        }
      } finally {
        if (activo) setDatosCargados(true);
      }
    };

    void cargarDatos();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!datosCargados) return;

    const datos: StoredAppData = { usuarios, temaId, ninos };
    escrituras.current = escrituras.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(datos)))
      .catch(error => {
        Alert.alert(
          'No se pudieron guardar los datos locales',
          error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
        );
      });
  }, [datosCargados, usuarios, temaId, ninos]);

  const guardarNino = (n: Nino) =>
    setNinos(prev => prev.some(x => x.id === n.id)
      ? prev.map(x => (x.id === n.id ? n : x))
      : [...prev, n]);

  const eliminarNino = (id: string) => setNinos(prev => prev.filter(x => x.id !== id));

  if (!datosCargados) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: TEMAS[temaId].fondo,
        }}
      >
        <ActivityIndicator color={TEMAS[temaId].principal} />
      </View>
    );
  }

  return (
    <TemaContext.Provider value={TEMAS[temaId]}>
      {!sesion ? (
        <LoginScreen
          usuarios={usuarios}
          onRegistro={u => setUsuarios(prev => [...prev, u])}
          onEntrar={setSesion}
          temaId={temaId}
          onCambiarTema={setTemaId}
        />
      ) : sesion.rol === 'tutor' ? (
        <TutorScreen
          nombre={sesion.nombre}
          ninos={ninos}
          onGuardarNino={guardarNino}
          onEliminarNino={eliminarNino}
          onSalir={() => setSesion(null)}
        />
      ) : (
        <HomeScreen
          nombre={sesion.nombre}
          ninos={ninos}
          onSalir={() => setSesion(null)}
        />
      )}
    </TemaContext.Provider>
  );
}
