import { describe, expect, it } from '@jest/globals';
import { contrast } from '../contrast';
import { palettes, rainbows, type ColorToken, type Scheme } from '../tokens';

const schemes: Scheme[] = ['light', 'dark'];

// Text needs 4.5:1
const textPairs: [ColorToken, ColorToken][] = [
  ...(['canvas', 'surface', 'surfaceMuted', 'surfaceRaised'] as const).flatMap(
    (background): [ColorToken, ColorToken][] => [
      ['ink', background],
      ['inkMuted', background],
    ],
  ),
  ['onPrimary', 'primary'],
  ['primary', 'canvas'],
  ['primary', 'surface'],
  ['onPrimaryTonal', 'primaryTonal'],
  ['onHighlight', 'highlight'],
  ['danger', 'canvas'],
  ['danger', 'surface'],
  ['onDanger', 'danger'],
  ['success', 'canvas'],
  ['success', 'surface'],
];

// Input outlines and swatch rings need 3:1
const componentPairs: [ColorToken, ColorToken][] = [
  ['borderStrong', 'surface'],
  ['borderStrong', 'canvas'],
];

describe.each(schemes)('the %s palette', (scheme) => {
  const colors = palettes[scheme];

  it.each(textPairs)('makes %s readable on %s', (foreground, background) => {
    expect(contrast(colors[foreground], colors[background])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(componentPairs)('makes %s visible on %s', (foreground, background) => {
    expect(contrast(colors[foreground], colors[background])).toBeGreaterThanOrEqual(3);
  });

  it('keeps every wordmark letter readable as large text on the canvas', () => {
    for (const letter of rainbows[scheme]) {
      expect(contrast(letter, colors.canvas)).toBeGreaterThanOrEqual(3);
    }
  });
});
