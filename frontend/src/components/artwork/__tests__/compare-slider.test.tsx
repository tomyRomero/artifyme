import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { CompareSlider, SWEEP_DELAY_MS, SWEEP_LEG_MS } from '@/components/artwork/CompareSlider';
import { PreferencesProvider } from '@/lib/preferences';

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// 200 points wide, so the divide starts 100 points in
async function renderSlider(onArtworkLoad?: () => void) {
  await render(
    <PreferencesProvider>
      <CompareSlider
        sketch={{ url: 'https://api.test/sketch.png?sig=1' }}
        artwork={{ url: 'https://api.test/image.webp?sig=1' }}
        accessibilityLabel="Couch"
        onArtworkLoad={onArtworkLoad}
      />
    </PreferencesProvider>,
  );
  const slider = screen.getByRole('adjustable', { name: 'Couch' });
  await fireEvent(slider, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 300 } } });
  return slider;
}

async function showArtwork() {
  await fireEvent(screen.getByTestId('artwork-image', { includeHiddenElements: true }), 'load', {
    nativeEvent: { source: { url: 'https://api.test/image.webp?sig=1', width: 512, height: 768 } },
  });
}

const wait = (ms: number) => act(async () => jest.advanceTimersByTime(ms));

describe('CompareSlider', () => {
  it('starts halfway, half sketch and half artwork', async () => {
    const slider = await renderSlider();

    expect(slider.props.accessibilityValue).toEqual({ text: '50% artwork' });
    expect(screen.getByTestId('sketch-side')).toHaveStyle({ width: 100 });
  });

  it('follows a finger dragging the divide', async () => {
    const slider = await renderSlider();

    await act(async () =>
      fireGestureHandler(getByGestureTestId('compare'), [
        { state: State.BEGAN, x: 100 },
        { state: State.ACTIVE, x: 60 },
        { x: 50 },
        { state: State.END, x: 50 },
      ]),
    );

    expect(screen.getByTestId('sketch-side')).toHaveStyle({ width: 50 });
    expect(slider.props.accessibilityValue).toEqual({ text: '75% artwork' });
  });

  it('stops at the edges', async () => {
    await renderSlider();

    await act(async () =>
      fireGestureHandler(getByGestureTestId('compare'), [
        { state: State.BEGAN, x: 100 },
        { state: State.ACTIVE, x: 400 },
        { x: 400 },
      ]),
    );

    expect(screen.getByTestId('sketch-side')).toHaveStyle({ width: 200 });
  });

  it('is felt as a notch each time the divide passes the middle', async () => {
    await renderSlider();

    await act(async () =>
      fireGestureHandler(getByGestureTestId('compare'), [
        { state: State.BEGAN, x: 100 },
        { state: State.ACTIVE, x: 60 },
        { x: 100 },
        { x: 140 },
        { x: 150 },
        { x: 40 },
        { state: State.END, x: 40 },
      ]),
    );

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);
  });

  it('moves a tenth at a time for screen readers, more artwork on the way up', async () => {
    const slider = await renderSlider();

    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(slider.props.accessibilityValue).toEqual({ text: '60% artwork' });

    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(slider.props.accessibilityValue).toEqual({ text: '40% artwork' });
  });

  it('moves the divide to where the picture is tapped', async () => {
    const slider = await renderSlider();

    await act(async () =>
      fireGestureHandler(getByGestureTestId('compare-tap'), [
        { state: State.BEGAN, x: 150 },
        { state: State.ACTIVE, x: 150 },
        { state: State.END, x: 150 },
      ]),
    );

    expect(slider.props.accessibilityValue).toEqual({ text: '25% artwork' });
  });

  describe('once the artwork shows', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('sweeps the divide to each side and back to the middle, once the artwork shows', async () => {
      const slider = await renderSlider();
      const artworkShare = () => parseInt(slider.props.accessibilityValue.text, 10);
      await wait(SWEEP_DELAY_MS * 2);
      expect(artworkShare()).toBe(50);

      await showArtwork();
      const seen: number[] = [];
      for (let elapsed = 0; elapsed <= SWEEP_DELAY_MS + 3 * SWEEP_LEG_MS + 100; elapsed += 50) {
        await wait(50);
        seen.push(artworkShare());
      }

      expect(Math.min(...seen)).toBeLessThan(50);
      expect(Math.max(...seen)).toBeGreaterThan(50);
      expect(seen.at(-1)).toBe(50);
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });

    it('stops sweeping once touched', async () => {
      const slider = await renderSlider();
      await showArtwork();
      await wait(SWEEP_DELAY_MS + 100);

      await act(async () =>
        fireGestureHandler(getByGestureTestId('compare-tap'), [
          { state: State.BEGAN, x: 20 },
          { state: State.ACTIVE, x: 20 },
          { state: State.END, x: 20 },
        ]),
      );
      await wait(SWEEP_LEG_MS * 3);

      expect(slider.props.accessibilityValue).toEqual({ text: '90% artwork' });
    });

    it('holds still when the phone asks for less motion', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      const slider = await renderSlider();
      await act(async () => {});
      await showArtwork();

      await wait(SWEEP_DELAY_MS + SWEEP_LEG_MS);

      expect(slider.props.accessibilityValue).toEqual({ text: '50% artwork' });
    });
  });
});
