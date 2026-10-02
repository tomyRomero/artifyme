import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PreferencesProvider } from '@/lib/preferences';
import { TextField } from '../TextField';

async function renderInTheme(element: React.ReactElement) {
  await render(<PreferencesProvider>{element}</PreferencesProvider>);
}

describe('TextField', () => {
  it('shows helper text until there is an error, then the error as an alert', async () => {
    const field = (error?: string) => <TextField label="Password" helper="Use 12 to 128 characters." error={error} />;
    await renderInTheme(field());
    expect(screen.getByText('Use 12 to 128 characters.')).toBeTruthy();

    await screen.rerender(<PreferencesProvider>{field('Password is required')}</PreferencesProvider>);

    expect(screen.queryByText('Use 12 to 128 characters.')).toBeNull();
    expect(screen.getByRole('alert', { name: 'Password is required' })).toBeTruthy();
  });

  it('hides a password until asked to show it', async () => {
    await renderInTheme(<TextField label="Password" secureTextEntry />);
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));

    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy();
  });
});
