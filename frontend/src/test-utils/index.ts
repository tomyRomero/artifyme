import { jest } from '@jest/globals';
import * as Notifications from 'expo-notifications';
import { QueryClient } from '@tanstack/react-query';
import type { SessionTokens } from '@/api/types';
import * as device from '@/lib/device';

let issued = 0;

export function fakeTokens(sessionId = 'session-1'): SessionTokens {
  issued += 1;
  return {
    sessionId,
    accessToken: `access-${issued}`,
    accessTokenExpiresAt: '2026-09-30T12:15:00Z',
    refreshToken: `refresh-${issued}`,
    refreshTokenExpiresAt: '2026-12-29T12:00:00Z',
  };
}

export function fakeResponse(status: number, body?: unknown, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name] ?? null },
    text: async () => (body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function storedFiles(): Map<string, string> {
  return jest.requireMock<{ files: Map<string, string> }>('expo-file-system').files;
}

export function storedValue(name: string): unknown {
  const content = storedFiles().get(`documents/${name}.json`);
  return content === undefined ? undefined : JSON.parse(content);
}

export function store(name: string, value: unknown): void {
  storedFiles().set(`documents/${name}.json`, typeof value === 'string' ? value : JSON.stringify(value));
}

// No retries, and no gc timers, which would keep Jest from exiting
export function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
}

export function notificationPermission(
  granted: boolean,
  canAskAgain = true,
): Notifications.NotificationPermissionsStatus {
  const status = granted
    ? Notifications.PermissionStatus.GRANTED
    : canAskAgain
      ? Notifications.PermissionStatus.UNDETERMINED
      : Notifications.PermissionStatus.DENIED;
  return { granted, canAskAgain, status, expires: 'never' };
}

// An installed build linked to an Expo project, where notifications can work. The phone grants them when asked.
export function setUpNotifications({ allowed = false, canAsk = true } = {}) {
  jest.spyOn(device, 'easProjectId').mockReturnValue('test-project');
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(notificationPermission(allowed, canAsk));
  jest.mocked(Notifications.requestPermissionsAsync).mockImplementation(async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(notificationPermission(true));
    return notificationPermission(true);
  });
}
