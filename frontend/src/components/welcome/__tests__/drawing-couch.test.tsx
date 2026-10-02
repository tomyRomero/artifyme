import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { DrawingCouch } from '@/components/welcome/DrawingCouch';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderCouch(active: boolean) {
  await render(<DrawingCouch active={active} />);
  await act(async () => {});
}

const hidden = () =>
  screen
    .getAllByTestId('couch-stroke', { includeHiddenElements: true })
    .map((stroke) => Number(stroke.props.strokeDashoffset ?? 0));

describe('DrawingCouch', () => {
  it('draws itself a line at a time while its page shows', async () => {
    await renderCouch(true);
    expect(screen.getByRole('image', { name: 'A couch, drawn line by line' })).toBeTruthy();
    expect(hidden().every((offset) => offset > 0)).toBe(true);

    await act(async () => jest.advanceTimersByTime(1000));
    const partway = hidden();
    expect(partway[0]).toBe(0);
    expect(partway.at(-1)).toBeGreaterThan(0);

    await act(async () => jest.advanceTimersByTime(2000));
    expect(hidden().every((offset) => offset === 0)).toBe(true);
  });

  it('is simply there off its page', async () => {
    await renderCouch(false);

    expect(hidden().every((offset) => offset === 0)).toBe(true);
  });

  it('holds still, drawn, when the phone asks for less motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    await renderCouch(true);

    expect(hidden().every((offset) => offset === 0)).toBe(true);
  });
});
