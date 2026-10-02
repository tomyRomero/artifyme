import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PreferencesProvider } from '@/lib/preferences';
import { LargeTitleScreen } from '../LargeTitleScreen';

// The scroll drives the fade in JS, where the test can see it
jest.mock('@/theme/motion', () => ({ ...jest.requireActual<object>('@/theme/motion'), nativeDriver: false }));

async function renderScreen() {
  await render(
    <PreferencesProvider>
      <LargeTitleScreen title="Profile">
        <Text>Appearance</Text>
      </LargeTitleScreen>
    </PreferencesProvider>,
  );
  await fireEvent(screen.getByRole('header', { name: 'Profile' }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 48 } },
  });
}

const scrollTo = (y: number) =>
  fireEvent.scroll(screen.getByTestId('large-title-scroll'), { nativeEvent: { contentOffset: { x: 0, y } } });

describe('LargeTitleScreen', () => {
  it('fades the small title into the bar once the big one has scrolled under it, and back', async () => {
    await renderScreen();

    await scrollTo(60);
    expect(screen.getByTestId('collapsed-title', { includeHiddenElements: true })).toHaveStyle({ opacity: 1 });

    await scrollTo(0);
    expect(screen.getByTestId('collapsed-title', { includeHiddenElements: true })).toHaveStyle({ opacity: 0 });
  });

  it('leaves the small title to sight only, so screen readers hear the title once', async () => {
    await renderScreen();

    expect(screen.getAllByText('Profile')).toHaveLength(1);
  });
});
