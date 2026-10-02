import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { Stroke } from '@/api/types';
import { PreferencesProvider } from '@/lib/preferences';
import { Sketch } from '../Sketch';

const stroke = (changes: Partial<Stroke>): Stroke => ({
  path: ['M1,1', 'L9,9'],
  color: '#FF0000',
  size: 6,
  ...changes,
});

// The SVG props as the native view gets them: a color, or a reference to a pattern
async function renderSketch(strokes: Stroke[]) {
  await render(
    <PreferencesProvider>
      <Sketch strokes={strokes} width={256} height={384} />
    </PreferencesProvider>,
  );
  return screen.getAllByTestId('stroke').map(({ props }) => ({
    pattern: props.stroke.brushRef as string | undefined,
    opacity: props.strokeOpacity as number | undefined,
  }));
}

describe('Sketch', () => {
  it('draws a pen, and an older stroke without a brush, as a solid line', async () => {
    const drawn = await renderSketch([stroke({ brush: 'pen' }), stroke({})]);

    expect(drawn).toEqual([
      { pattern: undefined, opacity: undefined },
      { pattern: undefined, opacity: undefined },
    ]);
  });

  it("draws a pencil with the paper's grain, one grain per color", async () => {
    const drawn = await renderSketch([
      stroke({ brush: 'pencil' }),
      stroke({ brush: 'pencil' }),
      stroke({ brush: 'pencil', color: '#0000FF' }),
    ]);

    expect(drawn.map((line) => line.pattern)).toEqual(['grain-FF0000', 'grain-FF0000', 'grain-0000FF']);
  });

  it('draws a marker see-through, so crossing strokes build up', async () => {
    const [marker] = await renderSketch([stroke({ brush: 'marker' })]);

    expect(marker).toEqual({ pattern: undefined, opacity: 0.6 });
  });
});
