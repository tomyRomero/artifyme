import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { Reveal, REVEAL_PATIENCE_MS } from '@/components/artwork/Reveal';
import { PreferencesProvider } from '@/lib/preferences';
import { durations } from '@/theme/motion';
import { line } from '@/test-utils/studio';

jest.mock('@/theme/motion', () => ({ ...jest.requireActual<object>('@/theme/motion'), nativeDriver: false }));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const reveal = (ready: boolean) => (
  <PreferencesProvider>
    <Reveal strokes={[line('#000000')]} ready={ready}>
      <View testID="artwork" />
    </Reveal>
  </PreferencesProvider>
);

async function renderReveal(ready = false) {
  await render(reveal(ready));
  await act(async () => {});
}

const sketch = () => screen.queryByTestId('reveal-sketch', { includeHiddenElements: true });
const wait = (ms: number) => act(async () => jest.advanceTimersByTime(ms));

describe('Reveal', () => {
  it('keeps the sketch over the artwork until the artwork has loaded, then fades it away', async () => {
    await renderReveal();
    await wait(1000);
    expect(sketch()).toHaveStyle({ opacity: 1 });

    await screen.rerender(reveal(true));
    await wait(durations.slow / 2);
    expect(sketch()).not.toHaveStyle({ opacity: 1 });
    await wait(durations.slow / 2);

    expect(sketch()).toBeNull();
  });

  it("reveals the artwork anyway when its image doesn't come", async () => {
    await renderReveal();

    await wait(REVEAL_PATIENCE_MS - 1);
    expect(sketch()).toHaveStyle({ opacity: 1 });
    await wait(1);
    await wait(durations.slow);

    expect(sketch()).toBeNull();
  });

  it('only fades when the phone asks for less motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    await renderReveal();

    expect(screen.getByTestId('artwork').parent).toHaveStyle({ transform: [] });
  });
});
