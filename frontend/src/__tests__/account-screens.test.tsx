import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { type ReactElement } from 'react';
import { AccessibilityInfo, Alert } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import DeleteAccountScreen from '@/app/delete-account';
import SignInScreen from '@/app/login';
import ChangePasswordScreen from '@/app/password';
import CreateAccountScreen from '@/app/signup';
import { PreferencesProvider } from '@/lib/preferences';
import { session } from '@/lib/session';
import { fakeResponse, fakeTokens, storedValue, testQueryClient } from '@/test-utils';

jest.mock('expo-router', () => require('@/test-utils/router').expoRouter);

const fetchMock = jest.fn<(url: string, init: RequestInit) => Promise<Response>>();
const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
const auth = jest.mocked(LocalAuthentication);

let sent: Record<string, unknown[]> = {};
let answers: Record<string, Response> = {};

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(async () => {
  jest.clearAllMocks();
  sent = {};
  answers = {};
  await session.signOut();
  await session.forgetSaved();
  fetchMock.mockImplementation(async (url, init) => {
    const { pathname } = new URL(url);
    (sent[pathname] ??= []).push(JSON.parse(init.body as string));
    if (answers[pathname]) {
      return answers[pathname];
    }
    switch (pathname) {
      case '/api/v1/auth/sessions':
      case '/api/v1/auth/sessions/refresh':
        return fakeResponse(200, fakeTokens());
      case '/api/v1/users':
        return fakeResponse(201, { userId: 1 });
      case '/api/v1/users/me/password':
      case '/api/v1/users/me':
        return fakeResponse(204);
    }
    throw new Error(`Unexpected ${pathname}`);
  });
});

async function renderScreen(element: ReactElement) {
  await render(
    <QueryClientProvider client={testQueryClient()}>
      <PreferencesProvider>{element}</PreferencesProvider>
    </QueryClientProvider>,
  );
}

function setUpFaceId() {
  auth.hasHardwareAsync.mockResolvedValue(true);
  auth.isEnrolledAsync.mockResolvedValue(true);
  auth.supportedAuthenticationTypesAsync.mockResolvedValue([LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]);
  auth.authenticateAsync.mockResolvedValue({ success: true });
}

// Signed in, then signed out with Face ID sign-in on. Returns the kept refresh token.
async function saveSession(email = 'ada@example.com'): Promise<string> {
  const tokens = fakeTokens('saved-session');
  await session.save(tokens);
  await session.signOutAndSave(email);
  return tokens.refreshToken;
}

async function type(label: string, text: string) {
  await fireEvent.changeText(screen.getByLabelText(label), text);
}

describe('signing in', () => {
  it('signs in with the trimmed email, then goes back to what needed it', async () => {
    await renderScreen(<SignInScreen />);
    await type('Email', ' ada@example.com ');
    await type('Password', 'correct horse battery');

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(sent['/api/v1/auth/sessions']).toEqual([
      expect.objectContaining({
        email: 'ada@example.com',
        password: 'correct horse battery',
        deviceModel: 'iPhone 17',
      }),
    ]);
    expect(session.get().status).toBe('signedIn');
  });

  it("says what's missing before sending anything", async () => {
    await renderScreen(<SignInScreen />);
    await type('Email', 'ada');

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter an email address like name@example.com')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
    expect(announce).toHaveBeenCalledWith('Enter an email address like name@example.com. Password is required.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('takes a mistake away as soon as it is fixed', async () => {
    await renderScreen(<SignInScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await type('Password', 'correct horse battery');

    expect(screen.queryByText('Password is required')).toBeNull();
    expect(screen.getByText('Email is required')).toBeTruthy();
  });

  it("shows the API's reason in the screen, not an alert", async () => {
    answers['/api/v1/auth/sessions'] = fakeResponse(401, { title: 'Invalid email or password.' });
    await renderScreen(<SignInScreen />);
    await type('Email', 'ada@example.com');
    await type('Password', 'wrong');

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert', { name: 'Invalid email or password.' })).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('signing in with Face ID', () => {
  beforeEach(() => {
    setUpFaceId();
  });

  it('asks for Face ID on opening and signs in with the saved session', async () => {
    const kept = await saveSession();
    await renderScreen(<SignInScreen />);

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(sent['/api/v1/auth/sessions/refresh']).toEqual([expect.objectContaining({ refreshToken: kept })]);
    expect(sent['/api/v1/auth/sessions']).toBeUndefined();
    expect(session.get().status).toBe('signedIn');
    expect(await session.saved()).toBeNull();
  });

  it('stays put with the email filled in when Face ID is turned down', async () => {
    await saveSession();
    jest.spyOn(SecureStore, 'getItemAsync').mockImplementation(async (key, options) => {
      if (options?.requireAuthentication) {
        throw new Error('User canceled the operation');
      }
      return key === 'artifyme.saved.email' ? 'ada@example.com' : null;
    });
    await renderScreen(<SignInScreen />);

    expect(await screen.findByRole('button', { name: 'Sign in as ada@example.com with Face ID' })).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText('Email').props.value).toBe('ada@example.com'));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    jest.mocked(SecureStore.getItemAsync).mockRestore();
  });

  it('falls back to the password when the saved session has ended', async () => {
    await saveSession();
    answers['/api/v1/auth/sessions/refresh'] = fakeResponse(401, { title: 'Your session has ended. Sign in again.' });
    await renderScreen(<SignInScreen />);

    expect(
      await screen.findByRole('alert', { name: 'Face ID sign-in has ended. Sign in with your password.' }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Sign in as ada@example.com with Face ID' })).toBeNull(),
    );
    expect(await session.saved()).toBeNull();
    expect(session.get().status).toBe('signedOut');
  });

  it('forgets the saved session for someone else', async () => {
    await saveSession();
    auth.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
    jest
      .spyOn(SecureStore, 'getItemAsync')
      .mockImplementation(async (key, options) =>
        options?.requireAuthentication
          ? Promise.reject(new Error('User canceled the operation'))
          : key === 'artifyme.saved.email'
            ? 'ada@example.com'
            : null,
      );
    await renderScreen(<SignInScreen />);
    await screen.findByRole('button', { name: 'Sign in as ada@example.com with Face ID' });
    jest.mocked(SecureStore.getItemAsync).mockRestore();

    await fireEvent.press(screen.getByRole('button', { name: 'Forget ada@example.com' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Sign in as ada@example.com with Face ID' })).toBeNull(),
    );
    expect(screen.getByLabelText('Email').props.value).toBe('');
    expect(await session.saved()).toBeNull();
  });

  it("drops someone else's saved session when signing in with a password", async () => {
    await saveSession('grace@example.com');
    jest
      .spyOn(SecureStore, 'getItemAsync')
      .mockImplementation(async (key, options) =>
        options?.requireAuthentication
          ? Promise.reject(new Error('User canceled the operation'))
          : key === 'artifyme.saved.email'
            ? 'grace@example.com'
            : null,
      );
    await renderScreen(<SignInScreen />);
    await screen.findByRole('button', { name: 'Sign in as grace@example.com with Face ID' });
    jest.mocked(SecureStore.getItemAsync).mockRestore();

    await type('Email', 'ada@example.com');
    await type('Password', 'correct horse battery');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(await session.saved()).toBeNull();
  });

  it('offers Face ID sign-in once after a password sign-in', async () => {
    jest.useFakeTimers();
    const offer = jest.spyOn(Alert, 'alert');
    await renderScreen(<SignInScreen />);
    await type('Email', 'ada@example.com');
    await type('Password', 'correct horse battery');

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.back).toHaveBeenCalled());

    expect(offer).toHaveBeenCalledWith('Sign in with Face ID next time?', expect.any(String), expect.any(Array));
    const turnOn = (offer.mock.calls[0][2] as { text: string; onPress: () => Promise<void> }[]).find(
      (button) => button.text === 'Turn on',
    )!;
    await act(async () => turnOn.onPress());
    await act(async () => jest.advanceTimersByTime(1000));
    expect(storedValue('preferences')).toMatchObject({ biometricSignIn: true, biometricSignInOffered: true });
    jest.useRealTimers();
  });
});

describe('creating an account', () => {
  async function fillIn() {
    await type('First name', ' Ada ');
    await type('Last name', ' Lovelace ');
    await type('Email', 'ada@example.com');
    await type('Password', 'correct horse battery');
  }

  it('creates the account, signs straight in, and goes back', async () => {
    await renderScreen(<CreateAccountScreen />);
    await fillIn();

    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(sent['/api/v1/users']).toEqual([
      { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', password: 'correct horse battery' },
    ]);
    expect(sent['/api/v1/auth/sessions']).toHaveLength(1);
  });

  it('keeps what was typed when the email is taken', async () => {
    answers['/api/v1/users'] = fakeResponse(409, { title: 'An account with this email already exists.' });
    await renderScreen(<CreateAccountScreen />);
    await fillIn();

    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert', { name: 'An account with this email already exists.' })).toBeTruthy();
    expect(screen.getByLabelText('First name').props.value).toBe(' Ada ');
  });
});

describe('changing the password', () => {
  beforeEach(async () => {
    await session.save(fakeTokens());
  });

  it('says it changed, and that other phones were signed out', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await type('Current password', 'correct horse battery');
    await type('New password', 'a brand new passphrase');

    await fireEvent.press(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Password changed')).toBeTruthy();
    expect(sent['/api/v1/users/me/password']).toEqual([
      { currentPassword: 'correct horse battery', newPassword: 'a brand new passphrase' },
    ]);
  });
});

describe('deleting the account', () => {
  beforeEach(async () => {
    await session.save(fakeTokens());
  });

  it('deletes it with the password, signs this phone out, and says so', async () => {
    await renderScreen(<DeleteAccountScreen />);
    await type('Password', 'correct horse battery');

    await fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));

    expect(await screen.findByText('Account deleted')).toBeTruthy();
    expect(sent['/api/v1/users/me']).toEqual([{ password: 'correct horse battery' }]);
    expect(session.get().status).toBe('signedOut');
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('says when the password is wrong, and stays signed in', async () => {
    answers['/api/v1/users/me'] = fakeResponse(400, { title: 'The password is incorrect.' });
    await renderScreen(<DeleteAccountScreen />);
    await type('Password', 'not it');

    await fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));

    expect(await screen.findByRole('alert', { name: 'The password is incorrect.' })).toBeTruthy();
    expect(session.get().status).toBe('signedIn');
  });
});
