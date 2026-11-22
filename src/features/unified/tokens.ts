import { createContext, useContext } from 'react';

import type { AccountRole, ChildTheme } from '@/features/unified/model';

/**
 * Modo de color resuelto. 'darkNina' es el oscuro con la paleta ciruela y rosa que se usa en
 * Niñez con un perfil de niña. La preferencia guardada puede ser 'system'.
 */
export type ThemeMode = 'light' | 'dark' | 'darkNina';
export const isDarkMode = (mode: ThemeMode) => mode !== 'light';

export const THEMES = {
  oli: {
    fondoInicio: '#EAF4FF',
    fondoFin: '#F3F8FF',
    hero: '#030303',
    heroSecundario: '#0A1931',
    acento: '#00C2FF',
    acentoSuave: '#D6F3FF',
    texto: '#0A1931',
    bordeAvatar: '#00C2FF',
  },
  lia: {
    fondoInicio: '#FFF0F5',
    fondoFin: '#FFF8FA',
    hero: '#3D0C2E',
    heroSecundario: '#3D0C2E',
    acento: '#FF4081',
    acentoSuave: '#FFD9E6',
    texto: '#3D0C2E',
    bordeAvatar: '#FF4081',
  },
  tutor: {
    fondoInicio: '#F1F5F9',
    fondoFin: '#F8FAFC',
    hero: '#0F172A',
    heroSecundario: '#1E293B',
    acento: '#D97706',
    acentoSuave: '#FEF3C7',
    texto: '#0F172A',
    bordeAvatar: '#D97706',
  },
} as const;

export const SHARED = {
  tarjeta: '#FFFFFF',
  apagada: '#EDF2F7',
  textoSecundario: '#64748B',
  textoFuerte: '#1F2A44',
  textoInactivo: '#94A3B8',
  sobreAcento: '#FFFFFF',
  /** Texto sobre las tarjetas oscuras de saludo y puntos (igual en ambos temas). */
  sobreHero: '#FFFFFF',
  bordeSutil: 'rgba(0,0,0,0.05)',
  presionado: 'rgba(0,0,0,0.12)',
  fondoInferior: 'rgba(255,255,255,0.85)',
  fondoModal: 'rgba(15,23,42,0.55)',
  error: '#E53E3E',
  errorFondo: '#FFF5F5',
  errorBorde: '#FED7D7',
  advertenciaBorde: '#FEEBC8',
  exitoFondo: '#F0FFF4',
  exitoBorde: '#C6F6D5',
  infoBorde: '#C6D9F0',
  puntos: '#F59E0B',
  completado: '#10B981',
  logros: '#8B5CF6',
  estrella: '#FFC107',
  estrellaBorde: '#FFA000',
  agua: '#38B6FF',
  alerta: '#FB923C',
  grafica: {
    agua: '#38B6FF',
    alimentacion: '#10B981',
    estudio: '#14B8A6',
    descanso: '#F59E0B',
  },
} as const;

// Tema oscuro según "Warrior Kids · Paleta de colores · Modo oscuro":
// azul noche de fondo para todos, cian para Niñez y naranja dorado para Tutor.
const NIGHT = {
  fondo: '#0B1728', // Azul noche: fondo principal
  tarjeta: '#172235', // Azul profundo: tarjetas y paneles
  secundario: '#202D42', // Azul grisáceo: contenedores secundarios
  inactivo: '#303D54', // Gris azulado: botones y elementos inactivos
  cian: '#30C8F2', // Acciones principales y modo Niñez
  dorado: '#F5A313', // Modo Tutor y recompensas
  morado: '#8B5CF6', // Logros e insignias
  verde: '#10B981', // Hábitos y movimiento
  rosa: '#F472B6', // Avatares y detalles
  amarillo: '#FACC15', // Estrellas y premios
  coral: '#FB923C', // Alertas y actividades
  grisClaro: '#94A3B8', // Texto secundario e íconos
  texto: '#F1F5F9',
} as const;

const THEMES_DARK = {
  oli: {
    fondoInicio: NIGHT.fondo,
    fondoFin: NIGHT.fondo,
    hero: NIGHT.tarjeta,
    heroSecundario: NIGHT.secundario,
    acento: NIGHT.cian,
    acentoSuave: '#123347',
    texto: NIGHT.texto,
    bordeAvatar: NIGHT.cian,
  },
  lia: {
    fondoInicio: NIGHT.fondo,
    fondoFin: NIGHT.fondo,
    hero: NIGHT.tarjeta,
    heroSecundario: NIGHT.secundario,
    acento: NIGHT.cian,
    acentoSuave: '#123347',
    texto: NIGHT.texto,
    bordeAvatar: NIGHT.rosa,
  },
  tutor: {
    fondoInicio: NIGHT.fondo,
    fondoFin: NIGHT.fondo,
    hero: NIGHT.tarjeta,
    heroSecundario: NIGHT.secundario,
    acento: NIGHT.dorado,
    acentoSuave: '#3A2D08',
    texto: NIGHT.texto,
    bordeAvatar: NIGHT.dorado,
  },
} as const satisfies Record<keyof typeof THEMES, Record<keyof typeof THEMES.tutor, string>>;

const SHARED_DARK = {
  ...SHARED,
  tarjeta: NIGHT.tarjeta,
  apagada: NIGHT.inactivo,
  textoSecundario: NIGHT.grisClaro,
  textoFuerte: NIGHT.texto,
  textoInactivo: NIGHT.grisClaro,
  // En botones cian o dorados el texto va en azul noche para que contraste.
  sobreAcento: NIGHT.fondo,
  bordeSutil: 'rgba(148,163,184,0.18)',
  presionado: 'rgba(255,255,255,0.14)',
  fondoInferior: 'rgba(23,34,53,0.96)',
  fondoModal: 'rgba(5,10,20,0.7)',
  error: '#F87171',
  errorFondo: '#3A1515',
  errorBorde: '#7F1D1D',
  advertenciaBorde: '#A77A16',
  exitoFondo: '#103538',
  exitoBorde: '#137C6B',
  infoBorde: '#247C9C',
  puntos: NIGHT.dorado,
  completado: NIGHT.verde,
  logros: NIGHT.morado,
  estrella: NIGHT.amarillo,
  estrellaBorde: NIGHT.dorado,
  agua: NIGHT.cian,
  alerta: NIGHT.coral,
  grafica: { agua: NIGHT.cian, alimentacion: NIGHT.verde, estudio: '#14B8A6', descanso: NIGHT.dorado },
} as const;

// Tema oscuro Niña ("Paleta de colores – Modo Niña").
const NINA = {
  fondo: '#170F24', // Ciruela oscuro: fondo principal
  fondoSecundario: '#21152F', // Morado berenjena
  tarjeta: '#30203D', // Vino morado
  panel: '#3B2948', // Malva oscuro
  bordePrincipal: '#E879B9', // Rosa pastel
  bordeSecundario: '#A78BFA', // Lila
  boton: '#F472B6', // Rosa vibrante
  botonSecundario: '#EC4899', // Fucsia
  logros: '#A78BFA', // Lila brillante
  premios: '#FACC15', // Dorado suave
  iconoActivo: '#FDA4D5', // Rosa claro
  texto: '#FFF1F7', // Blanco rosado
  textoSecundario: '#C4B5D0', // Lavanda grisáceo
} as const;

const NINA_THEME = {
  fondoInicio: NINA.fondo,
  fondoFin: NINA.fondoSecundario,
  hero: NINA.tarjeta,
  heroSecundario: NINA.panel,
  acento: NINA.boton,
  acentoSuave: NINA.panel,
  texto: NINA.texto,
  bordeAvatar: NINA.bordePrincipal,
} as const;

// En 'darkNina' todos los temas usan la paleta de niña: solo se activa en Niñez con perfil de niña.
const THEMES_DARK_NINA = { oli: NINA_THEME, lia: NINA_THEME, tutor: NINA_THEME } as const;

const SHARED_DARK_NINA = {
  ...SHARED_DARK,
  tarjeta: NINA.tarjeta,
  apagada: NINA.panel,
  textoSecundario: NINA.textoSecundario,
  textoFuerte: NINA.texto,
  textoInactivo: NINA.textoSecundario,
  sobreAcento: NINA.fondo,
  bordeSutil: 'rgba(232,121,185,0.24)',
  fondoInferior: 'rgba(33,21,47,0.96)',
  fondoModal: 'rgba(10,5,18,0.72)',
  advertenciaBorde: NINA.premios,
  infoBorde: NINA.bordeSecundario,
  puntos: NINA.premios,
  logros: NINA.logros,
  estrella: NINA.premios,
  estrellaBorde: NINA.premios,
} as const;

/** Fondos y bordes teñidos de las tarjetas por sección en el modo oscuro. */
export const DARK_SECTION_TONES = {
  habitos: { fondo: '#123347', borde: '#247C9C', icono: NIGHT.cian, circulo: NIGHT.tarjeta },
  logros: { fondo: '#252347', borde: '#6346A5', icono: NIGHT.morado, circulo: NIGHT.tarjeta },
  movimiento: { fondo: '#103538', borde: '#137C6B', icono: NIGHT.verde, circulo: NIGHT.tarjeta },
  nutribot: { fondo: '#342F26', borde: '#946B26', icono: NIGHT.dorado, circulo: NIGHT.tarjeta },
  revisar: { fondo: '#3A2D08', borde: '#A77A16', icono: NIGHT.dorado, circulo: NIGHT.tarjeta },
} as const;
export type SectionTone = keyof typeof DARK_SECTION_TONES;

const DARK_NINA_SECTION_TONES = {
  habitos: { fondo: NINA.tarjeta, borde: NINA.bordePrincipal, icono: NINA.iconoActivo, circulo: NINA.fondo },
  logros: { fondo: NINA.tarjeta, borde: NINA.bordeSecundario, icono: NINA.logros, circulo: NINA.fondo },
  movimiento: { fondo: NINA.tarjeta, borde: NINA.botonSecundario, icono: NINA.iconoActivo, circulo: NINA.fondo },
  nutribot: { fondo: NINA.tarjeta, borde: NINA.premios, icono: NINA.premios, circulo: NINA.fondo },
  revisar: DARK_SECTION_TONES.revisar,
} as const satisfies Record<SectionTone, { fondo: string; borde: string; icono: string; circulo: string }>;

/** Tonos de sección del modo; en claro no hay (se usa un tinte del color de la sección). */
export const sectionTonesFor = (mode: ThemeMode) =>
  mode === 'darkNina' ? DARK_NINA_SECTION_TONES : mode === 'dark' ? DARK_SECTION_TONES : null;

export const FOOD_GROUP_COLORS = {
  frutas: { fondo: '#D1F4D9', texto: '#1B5E20' },
  cereales: { fondo: '#FFE8B8', texto: '#B26A00' },
  leguminosas: { fondo: '#E8D9FF', texto: '#5E35B1' },
  animal: { fondo: '#DCEBFF', texto: '#0277BD' },
} as const;

const FOOD_GROUP_COLORS_DARK = {
  frutas: { fondo: '#163A24', texto: '#86EFAC' },
  cereales: { fondo: '#3D2C0A', texto: '#FCD34D' },
  leguminosas: { fondo: '#2E2147', texto: '#C4B5FD' },
  animal: { fondo: '#0F2A44', texto: '#7DD3FC' },
} as const;

export type ThemePalette = typeof THEMES | typeof THEMES_DARK;
export const themesFor = (mode: ThemeMode) => (mode === 'darkNina' ? THEMES_DARK_NINA : mode === 'dark' ? THEMES_DARK : THEMES);
export const sharedFor = (mode: ThemeMode) => (mode === 'darkNina' ? SHARED_DARK_NINA : mode === 'dark' ? SHARED_DARK : SHARED);
export const foodGroupColorsFor = (mode: ThemeMode) => (mode === 'light' ? FOOD_GROUP_COLORS : FOOD_GROUP_COLORS_DARK);

/** Modo de color de la pantalla. UnifiedApp lo provee según la preferencia guardada. */
export const ThemeModeContext = createContext<ThemeMode>('light');
export function useThemeMode(): ThemeMode {
  return useContext(ThemeModeContext);
}
export function useShared() {
  return sharedFor(useThemeMode());
}
export function useFoodGroupColors() {
  return foodGroupColorsFor(useThemeMode());
}

/** Resuelve la preferencia guardada ('system', 'light', 'dark') con el esquema del sistema. */
export function resolveThemeMode(preference: 'system' | 'light' | 'dark' | undefined, system: string | null | undefined): 'light' | 'dark' {
  if (preference === 'dark') return 'dark';
  if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
  return 'light';
}

export const SPACE = {
  4: 4,
  6: 6,
  8: 8,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  36: 36,
} as const;

export const RADIUS = {
  barra: 6,
  sm: 12,
  md: 16,
  habito: 22,
  tarjeta: 24,
  hero: 28,
  pildora: 9999,
} as const;

export const BORDER = {
  fino: 1,
  tarjeta: 1.5,
  chip: 2,
  avatar: 3,
  anillo: 12,
} as const;

export const SHADOW = {
  tarjeta: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  habito: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  chip: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

type AppTextStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
};

type AppTextStyles = {
  hero: AppTextStyle;
  heroSubtitle: AppTextStyle | undefined;
  h1: AppTextStyle;
  h2: AppTextStyle;
  h3: AppTextStyle;
  body: AppTextStyle;
  button: AppTextStyle;
  counter: AppTextStyle;
  caption: AppTextStyle;
  tab: AppTextStyle;
  tabActive: AppTextStyle;
  metric: AppTextStyle | undefined;
};

const CHILD_TYPE: AppTextStyles = {
  hero: { fontFamily: 'Fredoka_700Bold', fontSize: 24, lineHeight: 30 },
  heroSubtitle: { fontFamily: 'Fredoka_500Medium', fontSize: 14, lineHeight: 20 },
  h1: { fontFamily: 'Fredoka_700Bold', fontSize: 26, lineHeight: 32 },
  h2: { fontFamily: 'Fredoka_700Bold', fontSize: 20, lineHeight: 26 },
  h3: { fontFamily: 'Fredoka_600SemiBold', fontSize: 16, lineHeight: 22 },
  body: { fontFamily: 'Fredoka_400Regular', fontSize: 14, lineHeight: 20 },
  button: { fontFamily: 'Fredoka_600SemiBold', fontSize: 16, lineHeight: 20 },
  counter: { fontFamily: 'Fredoka_400Regular', fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: 'Fredoka_700Bold', fontSize: 12, lineHeight: 16 },
  tab: { fontFamily: 'Fredoka_500Medium', fontSize: 11, lineHeight: 14 },
  tabActive: { fontFamily: 'Fredoka_700Bold', fontSize: 11, lineHeight: 14 },
  metric: undefined,
};

const TUTOR_TYPE: AppTextStyles = {
  hero: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 24, lineHeight: 30 },
  heroSubtitle: undefined,
  h1: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, lineHeight: 24 },
  h3: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, lineHeight: 20 },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, lineHeight: 20 },
  button: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, lineHeight: 20 },
  counter: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, lineHeight: 16 },
  tab: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, lineHeight: 14 },
  tabActive: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, lineHeight: 14 },
  metric: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 32, lineHeight: 36 },
};

export function tint(hex: string, alpha: number): string {
  const value = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    throw new Error('El color debe ser un hexadecimal de 3 o 6 dígitos.');
  }
  if (!Number.isFinite(alpha)) {
    throw new Error('La opacidad debe ser un número finito.');
  }

  const fullHex = value.length === 3 ? [...value].map(digit => digit + digit).join('') : value;
  const red = Number.parseInt(fullHex.slice(0, 2), 16);
  const green = Number.parseInt(fullHex.slice(2, 4), 16);
  const blue = Number.parseInt(fullHex.slice(4, 6), 16);
  const opacity = Math.min(1, Math.max(0, alpha));

  return `rgba(${red},${green},${blue},${opacity})`;
}

export function appThemeFor(role: AccountRole, childTheme: ChildTheme, mode: ThemeMode) {
  const theme = role === 'tutor' ? 'tutor' : childTheme === 'nina' ? 'lia' : 'oli';

  return {
    mode,
    colors: { ...themesFor(mode)[theme], ...sharedFor(mode) },
    type: role === 'tutor' ? TUTOR_TYPE : CHILD_TYPE,
  };
}

export function useAppTheme(role: AccountRole, childTheme: ChildTheme) {
  return appThemeFor(role, childTheme, useThemeMode());
}
