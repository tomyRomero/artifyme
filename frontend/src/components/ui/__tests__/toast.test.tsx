import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PreferencesProvider } from '@/lib/preferences';
import { Toast, TOAST_DURATION_MS } from '../Toast';

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

beforeEach(() => {
  jest.useFakeTimers();
  announce.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Toast', () => {
  it('says what happened, offers its action, and hides on its own', async () => {
    const undo = jest.fn();
    const hide = jest.fn();
    await render(
      <PreferencesProvider>
        <Toast message="Canvas cleared" action={{ label: 'Undo', onPress: undo }} onHide={hide} />
      </PreferencesProvider>,
    );

    expect(announce).toHaveBeenCalledWith('Canvas cleared');
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(hide).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1));
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("doesn't restart its timer when the screen behind it redraws", async () => {
    const hide = jest.fn();
    const toast = (onHide: () => void) => (
      <PreferencesProvider>
        <Toast message="Canvas cleared" onHide={onHide} />
      </PreferencesProvider>
    );
    await render(toast(() => hide()));

    await act(async () => jest.advanceTimersByTime(TOAST_DURATION_MS / 2));
    await screen.rerender(toast(() => hide()));
    await act(async () => jest.advanceTimersByTime(TOAST_DURATION_MS / 2));

    expect(hide).toHaveBeenCalledTimes(1);
  });
});
