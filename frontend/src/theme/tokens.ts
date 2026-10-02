export type Scheme = 'light' | 'dark';

export interface Palette {
  canvas: string;
  canvasDot: string;
  surface: string;
  surfaceMuted: string;
  surfaceRaised: string;
  ink: string;
  inkMuted: string;
  border: string;
  // Needs 3:1 against a surface
  borderStrong: string;
  outline: string;
  primary: string;
  onPrimary: string;
  primaryTonal: string;
  onPrimaryTonal: string;
  highlight: string;
  onHighlight: string;
  danger: string;
  onDanger: string;
  success: string;
  // Stays white in dark mode: it's exactly what the model receives
  artboard: string;
  // Lines over the white artboard, the same in both themes
  guide: string;
  scrim: string;
  onScrim: string;
}

export const palettes: Record<Scheme, Palette> = {
  light: {
    canvas: '#F5F3FF',
    canvasDot: '#D9D3F2',
    surface: '#FFFFFF',
    surfaceMuted: '#ECE8FB',
    surfaceRaised: '#FFFFFF',
    ink: '#16122B',
    inkMuted: '#585270',
    border: '#DAD4F0',
    borderStrong: '#7F77A0',
    outline: '#16122B',
    primary: '#5800FF',
    onPrimary: '#FFFFFF',
    primaryTonal: '#E9E0FF',
    onPrimaryTonal: '#3A00A8',
    highlight: '#FFC83D',
    onHighlight: '#16122B',
    danger: '#C4221A',
    onDanger: '#FFFFFF',
    success: '#0F7A55',
    artboard: '#FFFFFF',
    guide: 'rgba(88, 0, 255, 0.16)',
    scrim: 'rgba(22, 18, 43, 0.6)',
    onScrim: '#FFFFFF',
  },
  dark: {
    canvas: '#0D0B1E',
    canvasDot: '#1E1A38',
    surface: '#17142E',
    surfaceMuted: '#1E1A38',
    surfaceRaised: '#221D40',
    ink: '#F4F2FF',
    inkMuted: '#ABA5CC',
    border: '#342E5C',
    borderStrong: '#7069A0',
    outline: '#4A4380',
    primary: '#B79DFF',
    onPrimary: '#150A40',
    primaryTonal: '#2C2458',
    onPrimaryTonal: '#D9CCFF',
    highlight: '#FFD166',
    onHighlight: '#16122B',
    danger: '#FF7A70',
    onDanger: '#16122B',
    success: '#5BD39A',
    artboard: '#FFFFFF',
    guide: 'rgba(88, 0, 255, 0.16)',
    scrim: 'rgba(0, 0, 0, 0.7)',
    onScrim: '#FFFFFF',
  },
};

export const rainbows: Record<Scheme, readonly string[]> = {
  light: ['#D93025', '#C75A00', '#1A5CFF', '#1E8E3E', '#4B0082', '#8E24AA'],
  dark: ['#FF6B5E', '#FFA24D', '#7FA6FF', '#5FD38A', '#A18CFF', '#E08CFF'],
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 28,
  full: 9999,
} as const;

export const chunky = {
  outlineWidth: 2,
  lip: 3,
} as const;

export const minTouchTarget = 44;

// Android can't pick a custom font's weight, so each weight is its own family
export const fonts = {
  heading: 'BricolageGrotesque_700Bold',
  headingHeavy: 'BricolageGrotesque_800ExtraBold',
  text: 'Figtree_400Regular',
  textMedium: 'Figtree_500Medium',
  textBold: 'Figtree_700Bold',
  signature: 'Pacifico',
} as const;

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

export const typography = {
  display: { fontFamily: fonts.headingHeavy, fontSize: 34, lineHeight: 40 },
  title1: { fontFamily: fonts.headingHeavy, fontSize: 28, lineHeight: 34 },
  title2: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 28 },
  artTitle: { fontFamily: fonts.signature, fontSize: 28, lineHeight: 40 },
  headline: { fontFamily: fonts.heading, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.text, fontSize: 17, lineHeight: 24 },
  callout: { fontFamily: fonts.textMedium, fontSize: 16, lineHeight: 22 },
  subhead: { fontFamily: fonts.text, fontSize: 15, lineHeight: 20 },
  footnote: { fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.textBold, fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typography;

// Headings stop growing sooner than body text, as iOS's own titles do, so a word never
// splits across lines at the largest text sizes
export const maxTextScale: Partial<Record<TypeVariant, number>> = {
  display: 1.6,
  title1: 1.8,
  title2: 2,
  artTitle: 1.8,
};
export type ColorToken = keyof Palette;
