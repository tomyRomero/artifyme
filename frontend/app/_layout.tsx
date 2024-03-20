import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import {  useEffect } from 'react';
import { AppProvider } from '../lib/AppContext';


export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    DancingScript: require('../assets/fonts/DancingScript-VariableFont_wght.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav/>;
}

function RootLayoutNav() {
  return (
    <AppProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="artwork/[id]" options={{ headerShown: false , presentation: 'containedModal'}} />
              <Stack.Screen name="editartwork/[id]" options={{ headerShown: false , presentation: 'containedModal'}} />
              <Stack.Screen name="canvas" options={{headerShown: false, presentation: 'containedModal', gestureEnabled: false}} />
              <Stack.Screen name="login" options={{headerShown: false, presentation: 'containedModal', gestureEnabled: false}} />
              <Stack.Screen name="signup" options={{headerShown: false, presentation: 'containedModal', gestureEnabled: false}} />
            </Stack>
    </AppProvider>
  );
}
