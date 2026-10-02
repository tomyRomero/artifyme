import { ApiError, request } from './client';
import { appVersion, deviceModel, getInstallId, platform } from '@/lib/device';
import { session } from '@/lib/session';
import type { DeviceSession, Registration, SessionTokens, UserProfile } from './types';

const PUSH_TOKEN = '/api/v1/auth/sessions/current/push-token';

export async function signIn(email: string, password: string): Promise<void> {
  const tokens = await request<SessionTokens>('/api/v1/auth/sessions', {
    method: 'POST',
    body: {
      email,
      password,
      installId: await getInstallId(),
      platform,
      deviceModel: deviceModel(),
      appVersion: appVersion(),
    },
    auth: false,
  });
  // Face ID only ever signs in to the latest account used here
  await session.forgetSaved();
  await session.save(tokens);
}

// 'ended' when the saved session was signed out elsewhere, expired, or locked by a biometrics change
export async function signInWithSaved(prompt: string): Promise<'signedIn' | 'cancelled' | 'ended'> {
  const saved = await session.openSaved(prompt);
  if (saved === 'cancelled') {
    return 'cancelled';
  }
  if (saved === 'gone') {
    await session.forgetSaved();
    return 'ended';
  }

  try {
    const tokens = await request<SessionTokens>('/api/v1/auth/sessions/refresh', {
      method: 'POST',
      body: { refreshToken: saved.refreshToken, appVersion: appVersion() },
      auth: false,
    });
    await session.forgetSaved();
    await session.save(tokens);
    return 'signedIn';
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await session.forgetSaved();
      return 'ended';
    }
    throw error;
  }
}

// With `keepFor`, the session stays behind Face ID for signing back in, so the server isn't told
export async function signOut(keepFor?: { email: string }): Promise<void> {
  if (keepFor) {
    // The kept session is still signed in on the server, but this phone shouldn't hear about it. Not renewed,
    // which would replace the refresh token being kept.
    request(PUSH_TOKEN, { method: 'DELETE', renew: false }).catch(() => {});
    if (await session.signOutAndSave(keepFor.email)) {
      return;
    }
  }
  const refreshToken = session.tokens()?.refresh;
  await session.signOut();
  if (refreshToken) {
    // Not awaited: the phone is signed out either way, and offline it shouldn't hang
    request('/api/v1/auth/sessions/sign-out', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => {});
  }
}

export function register(registration: Registration): Promise<UserProfile> {
  return request('/api/v1/users', { method: 'POST', body: registration, auth: false });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request('/api/v1/users/me/password', { method: 'PUT', body: { currentPassword, newPassword } });
}

export async function deleteAccount(password: string): Promise<void> {
  await request('/api/v1/users/me', { method: 'DELETE', body: { password } });
  await session.forgetSaved();
  await session.signOut();
}

export function getProfile(signal?: AbortSignal): Promise<UserProfile> {
  return request('/api/v1/users/me', { signal });
}

export async function keepPushToken(token: string): Promise<void> {
  await request(PUSH_TOKEN, { method: 'PUT', body: { token } });
}

export async function forgetPushToken(): Promise<void> {
  await request(PUSH_TOKEN, { method: 'DELETE' });
}

export function listDevices(signal?: AbortSignal): Promise<DeviceSession[]> {
  return request('/api/v1/auth/sessions', { signal });
}

export async function signOutDevice(id: string): Promise<void> {
  await request(`/api/v1/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
