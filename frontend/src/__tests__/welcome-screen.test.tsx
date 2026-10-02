import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo, Dimensions } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import WelcomeScreen from '@/app/welcome';
import { PreferencesProvider, usePreferences } from '@/lib/preferences';

jest.mock('expo-router', () => require('@/test-utils/router').expoRouter);

let welcomed: () => boolean;

beforeEach(() => {
  // The pictures animate on timers
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderWelcome() {
  let current: boolean;
  function PreferencesHandle() {
    current = usePreferences().welcomed;
    return null;
  }

  await render(
    <PreferencesProvider>
      <WelcomeScreen />
      <PreferencesHandle />
    </PreferencesProvider>,
  );
  await act(async () => {});
  welcomed = () => current;
}

async function swipeTo(page: number) {
  await fireEvent(screen.getByTestId('welcome-pages'), 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { x: page * Dimensions.get('window').width, y: 0 } },
  });
}

describe('the welcome', () => {
  it('goes through its pages, then starts drawing', async () => {
    await renderWelcome();

    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(router.replace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Start drawing' }));

    expect(router.replace).toHaveBeenCalledWith('/studio');
    expect(welcomed()).toBe(true);
  });

  it('follows the pages as they are swiped', async () => {
    await renderWelcome();

    await swipeTo(2);
    expect(screen.getByRole('button', { name: 'Start drawing' })).toBeTruthy();

    await swipeTo(1);
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('can be skipped, and is not shown again', async () => {
    await renderWelcome();
    expect(welcomed()).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));

    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(welcomed()).toBe(true);
  });

  it('types the example words once their page shows, which screen readers hear whole', async () => {
    await renderWelcome();
    expect(screen.queryByText('A comfy gray couch')).toBeNull();
    expect(screen.getByLabelText('What did you draw? A comfy gray couch')).toBeTruthy();

    await swipeTo(1);
    await act(async () => jest.advanceTimersByTime(1000));
    expect(screen.queryByText('A comfy gray couch')).toBeNull();
    await act(async () => jest.advanceTimersByTime(1000));

    expect(screen.getByText('A comfy gray couch', { includeHiddenElements: true })).toBeTruthy();
  });

  it('shows the example words already typed when the phone asks for less motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    await renderWelcome();

    expect(screen.getByText('A comfy gray couch', { includeHiddenElements: true })).toBeTruthy();
  });

  it('tells screen readers which page each title is on', async () => {
    await renderWelcome();

    expect(screen.getByRole('header', { name: 'Sketch anything. Page 1 of 3' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Say what it is. Page 2 of 3' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Watch it come to life. Page 3 of 3' })).toBeTruthy();
  });
});
