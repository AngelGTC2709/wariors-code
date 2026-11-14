import type { AccountRole, ChildTheme } from '@/features/unified/model';

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
  grafica: {
    agua: '#38B6FF',
    alimentacion: '#10B981',
    estudio: '#14B8A6',
    descanso: '#F59E0B',
  },
} as const;

export const FOOD_GROUP_COLORS = {
  frutas: { fondo: '#D1F4D9', texto: '#1B5E20' },
  cereales: { fondo: '#FFE8B8', texto: '#B26A00' },
  leguminosas: { fondo: '#E8D9FF', texto: '#5E35B1' },
  animal: { fondo: '#DCEBFF', texto: '#0277BD' },
} as const;

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

export function useAppTheme(role: AccountRole, childTheme: ChildTheme) {
  const theme = role === 'tutor' ? 'tutor' : childTheme === 'nina' ? 'lia' : 'oli';

  return {
    colors: { ...THEMES[theme], ...SHARED },
    type: role === 'tutor' ? TUTOR_TYPE : CHILD_TYPE,
  };
}
