import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { Entrance } from '../Entrance';

jest.mock('@/theme/motion', () => ({ ...jest.requireActual<object>('@/theme/motion'), nativeDriver: false }));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderEntrance(delay?: number) {
  await render(
    <Entrance rise={12} delay={delay}>
      <View testID="content" />
    </Entrance>,
  );
  await act(async () => {});
  return () => screen.getByTestId('content').parent!;
}

describe('Entrance', () => {
  it('only fades in when the phone asks for less motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    const mover = await renderEntrance();

    expect(mover()).toHaveStyle({ opacity: 0, transform: [] });
  });
});
