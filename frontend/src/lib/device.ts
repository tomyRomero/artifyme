import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const INSTALL_ID_KEY = 'artifyme.installId';

let installId: string | null = null;

export async function getInstallId(): Promise<string> {
  if (installId) {
    return installId;
  }
  installId = await SecureStore.getItemAsync(INSTALL_ID_KEY);
  if (!installId) {
    installId = Crypto.randomUUID();
    await SecureStore.setItemAsync(INSTALL_ID_KEY, installId);
  }
  return installId;
}

export const platform: 'ios' | 'android' = Platform.OS === 'android' ? 'android' : 'ios';

// "iPhone 17 Pro" or "Pixel 9", so the devices list can tell phones apart
export function deviceModel(): string | undefined {
  return Device.modelName?.slice(0, 100) ?? undefined;
}

// Expo Go can't use some native features, such as Face ID on iOS
export function inExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

// Set by `eas init`. Push notifications are addressed through it, so a build without one goes without them.
export function easProjectId(): string | undefined {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
}

export function appVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}
