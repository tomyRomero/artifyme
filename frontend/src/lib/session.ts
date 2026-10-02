import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { SessionTokens } from '@/api/types';

// Lives outside React so the API client can read and renew tokens. Tokens are kept in SecureStore.
export type Session =
  { status: 'loading' } | { status: 'signedOut'; expired: boolean } | { status: 'signedIn'; sessionId: string };

export interface Tokens {
  access: string | null;
  refresh: string;
}

const KEYS = {
  sessionId: 'artifyme.sessionId',
  refreshToken: 'artifyme.refreshToken',
  accessToken: 'artifyme.accessToken',
};

// A signed-out session kept for signing back in with Face ID. Only the phone's
// biometrics open the token, and enrolling a new face or finger locks it for good.
const SAVED = {
  refreshToken: 'artifyme.saved.refreshToken',
  email: 'artifyme.saved.email',
};
const BIOMETRIC: SecureStore.SecureStoreOptions = { requireAuthentication: true };

let current: Session = { status: 'loading' };
let tokens: Tokens | null = null;
const listeners = new Set<() => void>();

function set(next: Session) {
  current = next;
  listeners.forEach((listener) => listener());
}

async function end(expired: boolean) {
  tokens = null;
  set({ status: 'signedOut', expired });
  await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key))).catch(() => {});
}

export const session = {
  get: (): Session => current,

  tokens: (): Tokens | null => tokens,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async restore() {
    try {
      const [sessionId, refresh, access] = await Promise.all([
        SecureStore.getItemAsync(KEYS.sessionId),
        SecureStore.getItemAsync(KEYS.refreshToken),
        SecureStore.getItemAsync(KEYS.accessToken),
      ]);
      if (sessionId && refresh) {
        tokens = { access, refresh };
        set({ status: 'signedIn', sessionId });
        return;
      }
    } catch {}
    set({ status: 'signedOut', expired: false });
  },

  // Store the new refresh token before anything can send the old one again
  async save(next: SessionTokens) {
    await SecureStore.setItemAsync(KEYS.sessionId, next.sessionId);
    await SecureStore.setItemAsync(KEYS.refreshToken, next.refreshToken);
    await SecureStore.setItemAsync(KEYS.accessToken, next.accessToken);
    tokens = { access: next.accessToken, refresh: next.refreshToken };
    if (current.status !== 'signedIn' || current.sessionId !== next.sessionId) {
      set({ status: 'signedIn', sessionId: next.sessionId });
    }
  },

  signOut: () => end(false),

  // Ignore a stale token, so a slow request can't sign out a newer session
  async expire(refreshToken: string) {
    if (tokens?.refresh === refreshToken) {
      await end(true);
    }
  },

  // Signs out but keeps the session behind biometrics. False if it couldn't be kept.
  async signOutAndSave(email: string): Promise<boolean> {
    const refresh = tokens?.refresh;
    if (!refresh) {
      return false;
    }
    try {
      await SecureStore.setItemAsync(SAVED.refreshToken, refresh, BIOMETRIC);
      await SecureStore.setItemAsync(SAVED.email, email);
    } catch {
      await session.forgetSaved();
      return false;
    }
    await end(false);
    return true;
  },

  // Who the saved session belongs to, read without asking for Face ID
  async saved(): Promise<{ email: string } | null> {
    try {
      const email = await SecureStore.getItemAsync(SAVED.email);
      return email ? { email } : null;
    } catch {
      return null;
    }
  },

  // Asks for Face ID. 'gone' when biometrics changed since it was saved.
  async openSaved(prompt: string): Promise<{ refreshToken: string } | 'cancelled' | 'gone'> {
    try {
      const refreshToken = await SecureStore.getItemAsync(SAVED.refreshToken, {
        ...BIOMETRIC,
        authenticationPrompt: prompt,
      });
      return refreshToken ? { refreshToken } : 'gone';
    } catch {
      return 'cancelled';
    }
  },

  async forgetSaved() {
    await Promise.all(Object.values(SAVED).map((key) => SecureStore.deleteItemAsync(key))).catch(() => {});
  },
};

export function useSession(): Session {
  return useSyncExternalStore(session.subscribe, session.get);
}
