import { useEffect, useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { router, SplashScreen, Stack, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { LockScreen } from '@/components/shared/LockScreen';
import { useAppLock } from '@/lib/biometrics';
import { BrushProvider } from '@/lib/brush';
import { DrawingProvider } from '@/lib/drawing';
import { useNotificationTaps, usePushRegistration } from '@/lib/notifications';
import { PreferencesProvider, usePreferences } from '@/lib/preferences';
import { queryClient } from '@/lib/query-client';
import { session, useSession } from '@/lib/session';
import { fonts, radii } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export { ErrorBoundary } from 'expo-router';

// A link straight to a modal screen still has the tabs beneath it to go back to
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Kept up until the fonts and the session are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    ...Ionicons.font,
    [fonts.heading]: BricolageGrotesque_700Bold,
    [fonts.headingHeavy]: BricolageGrotesque_800ExtraBold,
    [fonts.text]: Figtree_400Regular,
    [fonts.textMedium]: Figtree_500Medium,
    [fonts.textBold]: Figtree_700Bold,
    [fonts.signature]: require('@/assets/fonts/Pacifico-Regular.ttf'),
  });
  const sessionRestored = useSession().status !== 'loading';
  const ready = fontsLoaded && sessionRestored;

  useEffect(() => {
    session.restore();
  }, []);

  // Rethrown so the error boundary shows it
  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  if (!ready) {
    return null;
  }

  return <RootLayoutNav />;
}

// Clear cached data on sign-out, and explain when the session ended by itself
function useSessionEnd() {
  const current = useSession();

  useEffect(() => {
    if (current.status !== 'signedOut') {
      return;
    }
    queryClient.clear();
    if (current.expired) {
      Alert.alert('Signed out', 'Your session has ended. Sign in again to see and save your artworks.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/login') },
      ]);
    }
  }, [current]);
}

function RootLayoutNav() {
  useSessionEnd();

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider>
          <DrawingProvider>
            <BrushProvider>
              <AppStack />
            </BrushProvider>
          </DrawingProvider>
        </PreferencesProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function useWelcome() {
  const { loaded, welcomed } = usePreferences();
  const navigationReady = useRootNavigationState()?.key !== undefined;
  const opened = useRef(false);

  useEffect(() => {
    if (loaded && !welcomed && navigationReady && !opened.current) {
      opened.current = true;
      router.push('/welcome');
    }
  }, [loaded, welcomed, navigationReady]);
}

function AppStack() {
  const { scheme, colors } = useTheme();
  const { loaded, appLock } = usePreferences();
  const signedIn = useSession().status === 'signedIn';
  const lock = useAppLock({ ready: loaded, signedIn, enabled: appLock });
  const locked = lock.state !== 'open';
  useWelcome();
  usePushRegistration();
  useNotificationTaps();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.canvas);
  }, [colors.canvas]);

  // Wait for the stored theme so dark mode never flashes light, and for the lock so nothing shows behind it
  useEffect(() => {
    if (loaded && lock.state !== 'checking') {
      SplashScreen.hideAsync();
    }
  }, [loaded, lock.state]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View
        style={styles.root}
        accessibilityElementsHidden={locked}
        importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}
      >
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="about" options={{ presentation: 'modal' }} />
          <Stack.Screen name="artwork/[id]" options={{ presentation: 'modal' }} />
          {/* No swipe to dismiss, so a stray swipe can't lose a sketch */}
          <Stack.Screen name="studio" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="welcome" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen
            name="palette"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.5, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: radii.xl,
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen name="devices" />
          <Stack.Screen name="contact" options={{ presentation: 'modal' }} />
          <Stack.Screen name="login" options={{ presentation: 'modal' }} />
          <Stack.Screen name="signup" options={{ presentation: 'modal' }} />
          <Stack.Screen name="password" options={{ presentation: 'modal' }} />
          <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
      {lock.state === 'locked' && <LockScreen onUnlock={lock.unlock} />}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
