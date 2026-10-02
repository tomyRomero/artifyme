import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { biometricSupport, promptBiometrics, useAppLock } from '@/lib/biometrics';
import * as device from '@/lib/device';

const { FACIAL_RECOGNITION, FINGERPRINT } = LocalAuthentication.AuthenticationType;
const auth = jest.mocked(LocalAuthentication);

function enroll(types = [FACIAL_RECOGNITION]) {
  auth.hasHardwareAsync.mockResolvedValue(true);
  auth.isEnrolledAsync.mockResolvedValue(true);
  auth.supportedAuthenticationTypesAsync.mockResolvedValue(types);
}

beforeEach(() => {
  auth.hasHardwareAsync.mockResolvedValue(false);
  auth.isEnrolledAsync.mockResolvedValue(false);
  auth.supportedAuthenticationTypesAsync.mockResolvedValue([]);
  auth.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('biometricSupport', () => {
  it('is available once Face ID is set up, and named for it', async () => {
    enroll();

    expect(await biometricSupport()).toEqual({ available: true, name: 'Face ID' });
  });

  it('names Touch ID on an iPhone with a fingerprint reader', async () => {
    enroll([FINGERPRINT]);

    expect((await biometricSupport()).name).toBe('Touch ID');
  });

  it('is unavailable with nothing enrolled', async () => {
    auth.hasHardwareAsync.mockResolvedValue(true);

    expect((await biometricSupport()).available).toBe(false);
  });

  it("is unavailable in Expo Go on iOS, which can't use Face ID and would ask for the passcode", async () => {
    enroll();
    jest.spyOn(device, 'inExpoGo').mockReturnValue(true);

    expect(await biometricSupport()).toEqual({ available: false, name: 'Face ID' });
  });

  it('is unavailable when the check itself fails, so the app is never locked by mistake', async () => {
    auth.hasHardwareAsync.mockRejectedValue(new Error('Keychain unavailable'));

    expect((await biometricSupport()).available).toBe(false);
  });
});

describe('promptBiometrics', () => {
  it('unlocks only on success', async () => {
    expect(await promptBiometrics()).toBe(false);

    auth.authenticateAsync.mockResolvedValue({ success: true });
    expect(await promptBiometrics()).toBe(true);

    auth.authenticateAsync.mockRejectedValue(new Error('busy'));
    expect(await promptBiometrics()).toBe(false);
  });
});

describe('useAppLock', () => {
  async function launch(options: { ready?: boolean; signedIn?: boolean; enabled?: boolean } = {}) {
    const props = { ready: true, signedIn: true, enabled: true, ...options };
    const hook = await renderHook((current: typeof props) => useAppLock(current), { initialProps: props });
    await act(async () => {});
    return hook;
  }

  it('locks a restored session when the lock is on and Face ID is set up', async () => {
    enroll();

    const { result } = await launch();

    expect(result.current.state).toBe('locked');
  });

  it('stays open with the lock off, when signed out, or without Face ID', async () => {
    enroll();
    expect((await launch({ enabled: false })).result.current.state).toBe('open');
    expect((await launch({ signedIn: false })).result.current.state).toBe('open');

    auth.isEnrolledAsync.mockResolvedValue(false);
    expect((await launch()).result.current.state).toBe('open');
  });

  it('waits for the stored settings before deciding', async () => {
    enroll();

    const { result } = await launch({ ready: false });

    expect(result.current.state).toBe('checking');
  });

  it('opens once unlocked, and stays locked after a failed or cancelled read', async () => {
    enroll();
    const { result } = await launch();

    await act(async () => result.current.unlock());
    expect(result.current.state).toBe('locked');

    auth.authenticateAsync.mockResolvedValue({ success: true });
    await act(async () => result.current.unlock());
    expect(result.current.state).toBe('open');
  });

  it('opens, signed out, when the session is signed out from the lock screen', async () => {
    enroll();
    const { result, rerender } = await launch();

    await act(async () => rerender({ ready: true, signedIn: false, enabled: true }));

    expect(result.current.state).toBe('open');
  });
});
