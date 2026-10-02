import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import ProfileScreen from '@/app/(tabs)/profile';
import { PreferencesProvider } from '@/lib/preferences';
import { session } from '@/lib/session';
import { fakeResponse, fakeTokens, setUpNotifications, storedValue, testQueryClient } from '@/test-utils';

jest.mock('expo-router', () => require('@/test-utils/router').expoRouter);

const fetchMock = jest.fn<(url: string, init: RequestInit) => Promise<Response>>();
const auth = jest.mocked(LocalAuthentication);
const signedOut: string[] = [];
const pushTokenCalls: string[] = [];
const refreshes: string[] = [];
let pushTokenAnswer = 204;

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
  global.fetch = fetchMock as unknown as typeof fetch;
});

let profileFails = false;

beforeEach(async () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  signedOut.length = 0;
  pushTokenCalls.length = 0;
  refreshes.length = 0;
  pushTokenAnswer = 204;
  profileFails = false;
  await session.forgetSaved();
  auth.hasHardwareAsync.mockResolvedValue(true);
  auth.isEnrolledAsync.mockResolvedValue(true);
  auth.supportedAuthenticationTypesAsync.mockResolvedValue([LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]);
  auth.authenticateAsync.mockResolvedValue({ success: true });
  fetchMock.mockImplementation(async (url, init) => {
    const { pathname } = new URL(url);
    if (pathname === '/api/v1/users/me') {
      if (profileFails) {
        return fakeResponse(500, { title: 'Server error' });
      }
      return fakeResponse(200, {
        userId: 1,
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        createdAt: '2026-01-01T00:00:00Z',
      });
    }
    if (pathname === '/api/v1/auth/sessions/current/push-token') {
      pushTokenCalls.push(init.method!);
      return fakeResponse(pushTokenAnswer);
    }
    if (pathname === '/api/v1/auth/sessions/refresh') {
      refreshes.push(JSON.parse(init.body as string).refreshToken);
      return fakeResponse(200, fakeTokens());
    }
    if (pathname === '/api/v1/auth/sessions/sign-out') {
      signedOut.push(JSON.parse(init.body as string).refreshToken);
      return fakeResponse(204);
    }
    throw new Error(`Unexpected ${pathname}`);
  });
});

async function renderProfile() {
  await render(
    <QueryClientProvider client={testQueryClient()}>
      <PreferencesProvider>
        <ProfileScreen />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

describe('the profile, signed in', () => {
  beforeEach(async () => {
    await session.save(fakeTokens());
  });

  it('shows who is signed in', async () => {
    await renderProfile();

    expect(await screen.findByLabelText('Signed in as Ada Lovelace, ada@example.com')).toBeTruthy();
    expect(screen.getByText('AL')).toBeTruthy();
  });

  it('turns on the Face ID lock once a Face ID read succeeds', async () => {
    jest.useFakeTimers();
    await renderProfile();
    const lock = await screen.findByRole('switch', { name: 'Lock with Face ID' });
    expect(
      screen.getByText(
        'Sign back in with Face ID after signing out, without your password. The lock asks for Face ID or your passcode when ArtifyMe opens.',
      ),
    ).toBeTruthy();

    auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    await fireEvent.press(lock);
    expect(lock).not.toBeChecked();

    await fireEvent.press(lock);
    expect(lock).toBeChecked();
    await act(async () => jest.advanceTimersByTime(1000));
    expect(storedValue('preferences')).toMatchObject({ appLock: true });
    jest.useRealTimers();
  });

  it("can't turn on the lock until Face ID is set up", async () => {
    auth.isEnrolledAsync.mockResolvedValue(false);
    await renderProfile();

    const lock = await screen.findByRole('switch', { name: 'Lock with Face ID' });
    expect(lock).toBeDisabled();
    expect(await screen.findByText("Set up Face ID in the phone's Settings to use it.")).toBeTruthy();
  });

  it('with Face ID sign-in on, signs out but keeps the session behind Face ID', async () => {
    const refresh = session.tokens()!.refresh;
    const saving = jest.spyOn(SecureStore, 'setItemAsync');
    await renderProfile();
    await fireEvent.press(await screen.findByRole('switch', { name: 'Sign in with Face ID' }));
    await screen.findByLabelText('Signed in as Ada Lovelace, ada@example.com');

    // The access token has expired, but renewing it would replace the refresh token being kept
    pushTokenAnswer = 401;

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(session.get().status).toBe('signedOut'));
    expect(signedOut).toEqual([]);
    expect(saving).toHaveBeenCalledWith('artifyme.saved.refreshToken', refresh, { requireAuthentication: true });
    expect(await session.saved()).toEqual({ email: 'ada@example.com' });
    await waitFor(() => expect(pushTokenCalls).toEqual(['DELETE']));
    await act(async () => {});
    expect(refreshes).toEqual([]);
  });

  it("can't turn on notifications in a build that isn't set up for them", async () => {
    await renderProfile();

    const notify = await screen.findByRole('switch', { name: 'When an artwork is ready' });
    expect(notify).toBeDisabled();
    expect(await screen.findByText("This build isn't set up for notifications.")).toBeTruthy();
  });

  it('turns notifications on once the phone allows them, and off again', async () => {
    setUpNotifications();
    await renderProfile();
    const notify = await screen.findByRole('switch', { name: 'When an artwork is ready' });
    await waitFor(() => expect(notify).toBeEnabled());

    await fireEvent.press(notify);
    await waitFor(() => expect(notify).toBeChecked());
    await fireEvent.press(notify);

    expect(notify).not.toBeChecked();
    await waitFor(() => expect(pushTokenCalls).toEqual(['DELETE']));
  });

  it('points to Settings when the phone has refused notifications', async () => {
    setUpNotifications({ canAsk: false });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderProfile();
    expect(await screen.findByText('Notifications are off for ArtifyMe in Settings.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('switch', { name: 'When an artwork is ready' }));

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Notifications are off for ArtifyMe', expect.any(String), expect.any(Array)),
    );
    expect(screen.getByRole('switch', { name: 'When an artwork is ready' })).not.toBeChecked();
  });

  it('offers to try again when the profile fails to load', async () => {
    profileFails = true;
    await renderProfile();

    expect(await screen.findByText("Your name and email couldn't be loaded.")).toBeTruthy();
    profileFails = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText('Signed in as Ada Lovelace, ada@example.com')).toBeTruthy();
  });

  it('signs out, here and on the server', async () => {
    const refresh = session.tokens()!.refresh;
    await renderProfile();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(session.get().status).toBe('signedOut'));
    expect(signedOut).toEqual([refresh]);
    expect(await session.saved()).toBeNull();
    expect(screen.getByText('Sign in to keep your art')).toBeTruthy();
  });
});

describe('the profile, for everyone', () => {
  beforeEach(async () => {
    await session.signOut();
  });

  it('asks a guest to sign in or create an account, with no account settings', async () => {
    await renderProfile();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(router.push).toHaveBeenCalledWith('/login');
    await fireEvent.press(screen.getByRole('button', { name: 'Create an account' }));
    expect(router.push).toHaveBeenCalledWith('/signup');
    expect(screen.queryByRole('button', { name: 'Devices' })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Lock with Face ID' })).toBeNull();
  });

  it('chooses the look, and turns haptics off', async () => {
    await renderProfile();
    expect(screen.getByRole('button', { name: 'System' })).toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: 'Dark' }));
    expect(screen.getByRole('button', { name: 'Dark' })).toBeSelected();

    await fireEvent.press(screen.getByRole('switch', { name: 'Haptics' }));
    expect(screen.getByRole('switch', { name: 'Haptics' })).not.toBeChecked();
  });
});
