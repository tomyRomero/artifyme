import { usePreferences } from '@/lib/preferences';
import { palettes, rainbows, type Palette, type Scheme } from './tokens';

export interface Theme {
  scheme: Scheme;
  colors: Palette;
  rainbow: readonly string[];
}

export function useTheme(): Theme {
  const scheme = usePreferences().theme;
  return { scheme, colors: palettes[scheme], rainbow: rainbows[scheme] };
}
