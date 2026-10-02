import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { signOut } from '@/api/account';
import * as LocalAuthentication from 'expo-local-authentication';
import { PreferencesProvider } from '@/lib/preferences';
import { testQueryClient } from '@/test-utils';
import { LockScreen } from '../LockScreen';

jest.mock('@/api/account', () => ({ signOut: jest.fn() }));

describe('LockScreen', () => {
  it('asks for Touch ID straight away, again on Unlock, and offers to sign out instead', async () => {
    const unlock = jest.fn();
    jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
    jest
      .mocked(LocalAuthentication.supportedAuthenticationTypesAsync)
      .mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
    await render(
      <QueryClientProvider client={testQueryClient()}>
        <PreferencesProvider>
          <LockScreen onUnlock={unlock} />
        </PreferencesProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('header', { name: 'ArtifyMe is locked' })).toBeTruthy();
    expect(await screen.findByText('Unlock with Touch ID or your passcode.')).toBeTruthy();
    expect(unlock).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
    expect(unlock).toHaveBeenCalledTimes(2);

    // A full sign-out: the lock couldn't be passed, so nothing is kept for Face ID
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledWith();
  });
});
