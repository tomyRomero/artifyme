import { useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { router, useRootNavigationState, type Href } from 'expo-router';
import type * as ExpoNotifications from 'expo-notifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { forgetPushToken, keepPushToken } from '@/api/account';
import { easProjectId, inExpoGo } from '@/lib/device';
import { usePreferences } from '@/lib/preferences';
import { useSession } from '@/lib/session';

export type NotificationSupport =
  { available: true; allowed: boolean; canAsk: boolean } | { available: false; reason: 'expo-go' | 'not-set-up' };

// The channel the API sends to on Android (ExpoPushSender.AndroidChannel)
const ANDROID_CHANNEL = 'artworks';

// Only the app's own screens, whatever a notification's data says
const OPENABLE = /^\/(artwork\/[\w-]+|studio)$/;

const notificationKeys = { support: ['notifications'] as const };

// Loaded only where it can work: in Expo Go the library warns as soon as it's imported
function loadNotifications(): typeof ExpoNotifications {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded on first use, not at startup
  return require('expo-notifications');
}

export async function notificationSupport(): Promise<NotificationSupport> {
  if (inExpoGo()) {
    return { available: false, reason: 'expo-go' };
  }
  if (!easProjectId()) {
    return { available: false, reason: 'not-set-up' };
  }
  try {
    const { granted, canAskAgain } = await loadNotifications().getPermissionsAsync();
    return { available: true, allowed: granted, canAsk: canAskAgain };
  } catch {
    return { available: false, reason: 'not-set-up' };
  }
}

export function useNotificationSupport() {
  return useQuery({ queryKey: notificationKeys.support, queryFn: notificationSupport });
}

// iOS asks only once. After a refusal, only the Settings app can allow them.
export function useTurnOnNotifications() {
  const queryClient = useQueryClient();
  const preferences = usePreferences();

  return async (): Promise<boolean> => {
    const Notifications = loadNotifications();
    const before = await Notifications.getPermissionsAsync();
    if (!before.granted && !before.canAskAgain) {
      Alert.alert('Notifications are off for ArtifyMe', 'Allow them in Settings, then turn this on again.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return false;
    }

    const { granted } = before.granted ? before : await Notifications.requestPermissionsAsync();
    await queryClient.invalidateQueries({ queryKey: notificationKeys.support });
    if (granted) {
      preferences.setArtworkNotifications(true);
    } else {
      preferences.dismissArtworkNotificationsOffer();
    }
    return granted;
  };
}

export function useTurnOffNotifications() {
  const preferences = usePreferences();

  return () => {
    preferences.setArtworkNotifications(false);
    forgetPushToken().catch(() => {});
  };
}

// The server keeps one token per session, so each sign-in sends it, and each launch too in case it changed
export function usePushRegistration() {
  const current = useSession();
  const { loaded, artworkNotifications } = usePreferences();
  const support = useNotificationSupport().data;
  const sessionId = current.status === 'signedIn' ? current.sessionId : null;
  const wanted = loaded && artworkNotifications && support?.available === true && support.allowed;

  useEffect(() => {
    if (wanted && sessionId) {
      sendPushToken();
    }
  }, [wanted, sessionId]);
}

async function sendPushToken() {
  try {
    const Notifications = loadNotifications();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: 'Finished artworks',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: easProjectId() });
    await keepPushToken(data);
  } catch (error) {
    if (__DEV__) {
      console.warn("Couldn't register for notifications", error);
    }
  }
}

// A tap opens the artwork, or the studio after a failure. One that launched the app is handled once it's ready.
export function useNotificationTaps() {
  const navigationReady = useRootNavigationState()?.key !== undefined;

  useEffect(() => {
    if (!navigationReady || inExpoGo() || !easProjectId()) {
      return;
    }
    const Notifications = loadNotifications();
    // Open, the app shows the result itself, so a notification would only repeat it
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    const open = (response: ExpoNotifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && OPENABLE.test(url)) {
        router.push(url as Href);
      }
    };
    open(Notifications.getLastNotificationResponse());
    Notifications.clearLastNotificationResponse();
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [navigationReady]);
}
