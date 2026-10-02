import { contrast } from '@/theme/contrast';

export interface Swatch {
  name: string;
  color: string;
}

export const swatches: readonly Swatch[] = [
  { name: 'Charcoal', color: '#171A21' },
  { name: 'Slate blue', color: '#7A93AC' },
  { name: 'Steel blue', color: '#33658A' },
  { name: 'Light blue', color: '#6874E7' },
  { name: 'Blue', color: '#0000FF' },
  { name: 'Violet', color: '#9400D3' },

  { name: 'Crimson', color: '#B8304F' },
  { name: 'Red', color: '#FF0000' },
  { name: 'Tomato', color: '#FA3741' },
  { name: 'Pink', color: '#DFAEB4' },
  { name: 'Tangerine', color: '#F26419' },
  { name: 'Orange', color: '#FF7F00' },

  { name: 'Sunflower', color: '#F6AE2D' },
  { name: 'Yellow', color: '#FFFF00' },
  { name: 'Green', color: '#00FF00' },
  { name: 'Olive', color: '#758E4F' },
  { name: 'Brown', color: '#8B4513' },
  { name: 'White', color: '#FFFFFF' },
];

export const DEFAULT_COLOR = swatches[0].color;

export function colorName(color: string): string {
  return swatches.find((swatch) => swatch.color.toLowerCase() === color.toLowerCase())?.name ?? color;
}

export function markOn(color: string): string {
  return contrast('#000000', color) >= contrast('#FFFFFF', color) ? '#000000' : '#FFFFFF';
}
