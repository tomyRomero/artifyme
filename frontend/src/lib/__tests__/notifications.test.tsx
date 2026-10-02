import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { type ReactNode } from 'react';
import { Alert, Linking } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as device from '@/lib/device';
import {
  notificationSupport,
  useNotificationTaps,
  usePushRegistration,
  useTurnOffNotifications,
  useTurnOnNotifications,
} from '@/lib/notifications';
import { PreferencesProvider, usePreferences } from '@/lib/preferences';
import { session } from '@/lib/session';
import {
  fakeResponse,
  fakeTokens,
  notificationPermission,
  setUpNotifications,
  store,
  testQueryClient,
} from '@/test-utils';

jest.mock('expo-router', () => require('@/test-utils/router').expoRouter);

const PUSH_TOKEN = 'https://api.test/api/v1/auth/sessions/current/push-token';

const fetchMock = jest.fn<(url: string, init: RequestInit) => Promise<Response>>();
const notifications = jest.mocked(Notifications);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={testQueryClient()}>
    <PreferencesProvider>{children}</PreferencesProvider>
  </QueryClientProvider>
);

function pushTokenCalls() {
  return fetchMock.mock.calls
    .filter(([url]) => url === PUSH_TOKEN)
    .map(([, init]) => ({ method: init.method, body: init.body && JSON.parse(init.body as string) }));
}

function tapped(url: unknown): Notifications.NotificationResponse {
  return { notification: { request: { content: { data: { url } } } } } as unknown as Notifications.NotificationResponse;
}

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(async () => {
  jest.clearAllMocks();
  await session.signOut();
  fetchMock.mockImplementation(async () => fakeResponse(204));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('notificationSupport', () => {
  it("is off in Expo Go, which can't receive them", async () => {
    jest.spyOn(device, 'inExpoGo').mockReturnValue(true);

    expect(await notificationSupport()).toEqual({ available: false, reason: 'expo-go' });
  });

  it('is off in a build without an Expo project to send through', async () => {
    expect(await notificationSupport()).toEqual({ available: false, reason: 'not-set-up' });
    expect(notifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it('says whether the phone allows them, and whether it can still be asked', async () => {
    setUpNotifications({ allowed: false, canAsk: false });

    expect(await notificationSupport()).toEqual({ available: true, allowed: false, canAsk: false });
  });
});

describe('turning notifications on', () => {
  async function renderTurnOn() {
    const { result } = await renderHook(() => ({ turnOn: useTurnOnNotifications(), preferences: usePreferences() }), {
      wrapper,
    });
    await act(async () => {});
    return result;
  }

  it('asks the phone, then keeps them on', async () => {
    setUpNotifications();
    const result = await renderTurnOn();

    await act(async () => {
      expect(await result.current.turnOn()).toBe(true);
    });

    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result.current.preferences.artworkNotifications).toBe(true);
  });

  it("takes no for an answer, and doesn't offer again", async () => {
    setUpNotifications();
    notifications.requestPermissionsAsync.mockResolvedValue(notificationPermission(false, false));
    const alert = jest.spyOn(Alert, 'alert');
    const result = await renderTurnOn();

    await act(async () => {
      expect(await result.current.turnOn()).toBe(false);
    });

    expect(result.current.preferences).toMatchObject({
      artworkNotifications: false,
      artworkNotificationsOffered: true,
    });
    expect(alert).not.toHaveBeenCalled();
  });

  it('points to Settings once the phone has said no', async () => {
    setUpNotifications({ canAsk: false });
    const alert = jest.spyOn(Alert, 'alert');
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const result = await renderTurnOn();

    await act(async () => {
      await result.current.turnOn();
    });

    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Notifications are off for ArtifyMe', expect.any(String), expect.any(Array));
    const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((button) => button.text === 'Open Settings')?.onPress?.();
    expect(openSettings).toHaveBeenCalled();
  });
});

describe('usePushRegistration', () => {
  it('sends the push token for each sign-in while notifications are on', async () => {
    setUpNotifications({ allowed: true });
    store('preferences', { artworkNotifications: true });
    await renderHook(() => usePushRegistration(), { wrapper });

    await act(async () => session.save(fakeTokens('session-1')));
    await waitFor(() => expect(pushTokenCalls()).toHaveLength(1));
    await act(async () => session.signOut());
    await act(async () => session.save(fakeTokens('session-2')));

    await waitFor(() => expect(pushTokenCalls()).toHaveLength(2));
    expect(pushTokenCalls()).toEqual([
      { method: 'PUT', body: { token: 'ExponentPushToken[this-phone]' } },
      { method: 'PUT', body: { token: 'ExponentPushToken[this-phone]' } },
    ]);
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project' });
  });

  it('sends nothing while they are off', async () => {
    setUpNotifications({ allowed: true });
    await renderHook(() => usePushRegistration(), { wrapper });

    await act(async () => session.save(fakeTokens()));
    await act(async () => {});

    expect(pushTokenCalls()).toEqual([]);
  });

  it('sends nothing when the phone has not allowed them', async () => {
    setUpNotifications({ allowed: false });
    store('preferences', { artworkNotifications: true });
    await renderHook(() => usePushRegistration(), { wrapper });

    await act(async () => session.save(fakeTokens()));
    await act(async () => {});

    expect(pushTokenCalls()).toEqual([]);
  });
});

describe('turning notifications off', () => {
  it('stops them reaching this phone', async () => {
    store('preferences', { artworkNotifications: true });
    await act(async () => session.save(fakeTokens()));
    const { result } = await renderHook(() => ({ turnOff: useTurnOffNotifications(), preferences: usePreferences() }), {
      wrapper,
    });
    await act(async () => {});

    await act(async () => result.current.turnOff());

    expect(result.current.preferences.artworkNotifications).toBe(false);
    expect(pushTokenCalls()).toEqual([{ method: 'DELETE', body: undefined }]);
  });
});

describe('useNotificationTaps', () => {
  function listenForTaps() {
    let tap: ((response: Notifications.NotificationResponse) => void) | undefined;
    notifications.addNotificationResponseReceivedListener.mockImplementation((listener) => {
      tap = listener;
      return { remove: jest.fn() };
    });
    return () => tap;
  }

  it('opens the artwork a notification was about', async () => {
    setUpNotifications({ allowed: true });
    const tap = listenForTaps();
    await renderHook(() => useNotificationTaps());
    await waitFor(() => expect(tap()).toBeDefined());

    await act(async () => tap()!(tapped('/artwork/a1')));

    expect(router.push).toHaveBeenCalledWith('/artwork/a1');
  });

  it('opens the screen from the notification that launched the app, once', async () => {
    setUpNotifications({ allowed: true });
    notifications.getLastNotificationResponse.mockReturnValueOnce(tapped('/studio'));

    await renderHook(() => useNotificationTaps());

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/studio'));
    expect(notifications.clearLastNotificationResponse).toHaveBeenCalled();
  });

  it('opens nothing outside the app', async () => {
    setUpNotifications({ allowed: true });
    const tap = listenForTaps();
    await renderHook(() => useNotificationTaps());
    await waitFor(() => expect(tap()).toBeDefined());

    await act(async () => {
      tap()!(tapped('https://example.com/artwork/a1'));
      tap()!(tapped('/artwork/../delete-account'));
      tap()!(tapped(42));
    });

    expect(router.push).not.toHaveBeenCalled();
  });

  it("doesn't show notifications while the app is open, since it shows the result itself", async () => {
    setUpNotifications({ allowed: true });

    await renderHook(() => useNotificationTaps());

    await waitFor(() => expect(notifications.setNotificationHandler).toHaveBeenCalled());
    const handler = notifications.setNotificationHandler.mock.calls[0][0]!;
    expect(await handler.handleNotification({} as Notifications.Notification)).toMatchObject({
      shouldShowBanner: false,
      shouldShowList: false,
    });
  });
});
