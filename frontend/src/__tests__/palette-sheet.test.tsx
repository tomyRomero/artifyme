import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PaletteSheet from '@/app/palette';
import { BrushProvider, useBrush } from '@/lib/brush';
import { PreferencesProvider } from '@/lib/preferences';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

function Canvas() {
  return <Text testID="brush-color">{useBrush().color}</Text>;
}

async function renderSheet() {
  return render(
    <PreferencesProvider>
      <BrushProvider>
        <PaletteSheet />
        <Canvas />
      </BrushProvider>
    </PreferencesProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the color sheet', () => {
  it('offers the colors by name, with the current one selected', async () => {
    await renderSheet();

    expect(screen.getByRole('button', { name: 'Charcoal' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Tomato' })).not.toBeSelected();
    expect(screen.queryByText('Recent')).toBeNull();
  });

  it('draws with the color picked, closes, and offers it again next time', async () => {
    await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Tomato' }));

    expect(screen.getByTestId('brush-color')).toHaveTextContent('#FA3741');
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalled();
    expect(screen.getByText('Recent')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Tomato' })).toHaveLength(2);
  });
});
