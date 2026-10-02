import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as LocalAuthentication from 'expo-local-authentication';
import { inExpoGo } from '@/lib/device';

export interface BiometricSupport {
  available: boolean;
  // "Face ID", "Touch ID" or a generic name, for labels
  name: string;
}

// Unavailable without hardware or anything enrolled
export async function biometricSupport(): Promise<BiometricSupport> {
  // Expo Go on iOS reports Face ID as set up, but can't use it, so iOS asks for the passcode instead
  if (Platform.OS === 'ios' && inExpoGo()) {
    return { available: false, name: biometricName([]) };
  }
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return { available: hardware && enrolled, name: biometricName(types) };
  } catch {
    // A failed check must leave the app open, never locked
    return { available: false, name: biometricName([]) };
  }
}

export function useBiometrics() {
  return useQuery({ queryKey: ['biometrics'], queryFn: biometricSupport });
}

export function biometricName(types: LocalAuthentication.AuthenticationType[]): string {
  const { FACIAL_RECOGNITION, FINGERPRINT } = LocalAuthentication.AuthenticationType;
  if (Platform.OS === 'ios') {
    return types.includes(FINGERPRINT) && !types.includes(FACIAL_RECOGNITION) ? 'Touch ID' : 'Face ID';
  }
  return types.includes(FINGERPRINT) ? 'fingerprint' : 'biometrics';
}

// The phone's passcode is offered when the biometric read fails
export async function promptBiometrics(promptMessage = 'Unlock ArtifyMe'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancel' });
    return result.success;
  } catch {
    return false;
  }
}

export type LockState = 'checking' | 'locked' | 'open';

// Decided once per launch: a restored session with the lock on waits for an unlock
export function useAppLock({ ready, signedIn, enabled }: { ready: boolean; signedIn: boolean; enabled: boolean }) {
  const [state, setState] = useState<LockState>('checking');

  // Nothing to lock when signed out or with the lock off. Signing out from the lock screen
  // opens the app, signed out.
  if ((state === 'checking' && ready && (!signedIn || !enabled)) || (state === 'locked' && !signedIn)) {
    setState('open');
  }

  const checking = state === 'checking' && ready && signedIn && enabled;
  useEffect(() => {
    if (!checking) {
      return;
    }
    let cancelled = false;
    biometricSupport().then(({ available }) => {
      if (!cancelled) {
        setState(available ? 'locked' : 'open');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [checking]);

  const unlock = useCallback(async () => {
    if (await promptBiometrics()) {
      setState('open');
    }
  }, []);

  return { state, unlock };
}
