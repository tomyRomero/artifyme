import { describe, expect, it } from '@jest/globals';
import { colorName, markOn } from '@/lib/swatches';

describe('swatches', () => {
  it('names a color whatever the case of its digits', () => {
    expect(colorName('#fa3741')).toBe('Tomato');
    expect(colorName('#123456')).toBe('#123456');
  });

  it('marks light colors in black and dark ones in white', () => {
    expect(markOn('#FFFF00')).toBe('#000000');
    expect(markOn('#FFFFFF')).toBe('#000000');
    expect(markOn('#171A21')).toBe('#FFFFFF');
    expect(markOn('#0000FF')).toBe('#FFFFFF');
  });
});
