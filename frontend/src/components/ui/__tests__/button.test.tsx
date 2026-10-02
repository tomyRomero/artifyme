import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PreferencesProvider } from '@/lib/preferences';
import { minTouchTarget } from '@/theme/tokens';
import { Button } from '../Button';
import { IconButton } from '../IconButton';

async function renderInTheme(element: React.ReactElement) {
  await render(<PreferencesProvider>{element}</PreferencesProvider>);
}

describe('Button', () => {
  it('ignores presses while disabled, and says so', async () => {
    const onPress = jest.fn();
    await renderInTheme(<Button label="Generate" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Generate' });
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('shows it is busy while loading, keeps its name, and ignores presses', async () => {
    const onPress = jest.fn();
    await renderInTheme(<Button label="Sign in" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Sign in' });
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
    expect(screen.queryByText('Sign in')).toBeNull();
  });
});

describe('IconButton', () => {
  it('is named by its label, presses, and is at least 44 points to touch', async () => {
    const onPress = jest.fn();
    await renderInTheme(<IconButton icon="arrow-undo" accessibilityLabel="Undo" onPress={onPress} size={16} />);

    const button = screen.getByRole('button', { name: 'Undo' });
    await fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
    const style = StyleSheet.flatten(button.props.style);
    expect(style.minWidth).toBeGreaterThanOrEqual(minTouchTarget);
    expect(style.minHeight).toBeGreaterThanOrEqual(minTouchTarget);
  });
});
