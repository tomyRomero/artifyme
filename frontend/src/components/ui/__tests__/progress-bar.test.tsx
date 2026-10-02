import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PreferencesProvider } from '@/lib/preferences';
import { ProgressBar } from '../ProgressBar';

// 204 wide: 200 inside its 2-point outline
async function renderBar(props: React.ComponentProps<typeof ProgressBar>) {
  await render(
    <PreferencesProvider>
      <ProgressBar {...props} />
    </PreferencesProvider>,
  );
  const bar = screen.getByRole('progressbar');
  await fireEvent(bar, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 204, height: 16 } } });
  return bar;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ProgressBar', () => {
  it('fills to the progress and says how far along it is', async () => {
    const bar = await renderBar({ progress: 0.4, accessibilityLabel: 'Painting' });

    expect(bar).toHaveAccessibleName('Painting');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: 80 });
  });

  it('never fills past the ends', async () => {
    const bar = await renderBar({ progress: 1.5, accessibilityLabel: 'Painting' });

    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });
  });

  it('sweeps a short bar across while how far along is unknown', async () => {
    const bar = await renderBar({ accessibilityLabel: 'Sending your sketch' });

    expect(bar.props.accessibilityValue).toBeUndefined();
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: 70 });
  });

  it('holds still, full and faint, when the phone asks for less motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    await renderBar({ accessibilityLabel: 'Sending your sketch' });
    await act(async () => {});

    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: 200, opacity: 0.35 });
  });
});
