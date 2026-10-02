import { beforeEach, expect, jest } from '@jest/globals';

// expo-secure-store, in memory
jest.mock('expo-secure-store', () => {
  const items = new Map<string, string>();
  return {
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      items.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      items.delete(key);
    },
  };
});

// No biometrics unless a test sets them up
jest.mock('expo-local-authentication', () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
  supportedAuthenticationTypesAsync: jest.fn(async () => []),
  authenticateAsync: jest.fn(async () => ({ success: false, error: 'not_available' })),
}));

// Never allowed unless a test sets that up (see setUpNotifications in test-utils)
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true, status: 'undetermined' })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false, status: 'denied' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ type: 'expo', data: 'ExponentPushToken[this-phone]' })),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Zero insets, without a native provider
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('expo-device', () => ({ modelName: 'iPhone 17' }));

// expo-media-library extends a native class that doesn't exist under Jest
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  Asset: { create: jest.fn(async () => ({})) },
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => {}),
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => '0f8fad5b-d9cb-469f-a165-70867728950e',
}));

// The app's files, in memory (see storedValue in test-utils)
jest.mock('expo-file-system', () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    // A download creates the file, holding the URL it came from
    static async downloadFileAsync(url: string, destination: File) {
      files.set(destination.uri, url);
      return destination;
    }
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
    }
    get exists() {
      return files.has(this.uri);
    }
    create() {
      files.set(this.uri, '');
    }
    write(content: string) {
      files.set(this.uri, content);
    }
    async text() {
      const content = files.get(this.uri);
      if (content === undefined) {
        throw new Error(`No file at ${this.uri}`);
      }
      return content;
    }
    delete() {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: 'documents' }, cache: { uri: 'cache' } }, files };
});

beforeEach(() => {
  jest.requireMock<{ files: Map<string, string> }>('expo-file-system').files.clear();
  // A test that checks nothing passes whatever the code does
  expect.hasAssertions();
});
