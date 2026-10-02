import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, Stack, useGlobalSearchParams } from 'expo-router';
import { EmptyState, Screen } from '@/components/ui';
import { StudioProvider, useStudio } from '@/lib/studio';
import { useTheme } from '@/theme/use-theme';

export default function StudioLayout() {
  const { artwork } = useGlobalSearchParams<{ artwork?: string }>();
  // The URL changes between screens, so keep the id from the first one
  const [artworkId] = useState(artwork);

  return (
    <StudioProvider artworkId={artworkId}>
      <StudioScreens />
    </StudioProvider>
  );
}

function StudioScreens() {
  const { status } = useStudio();
  const { colors } = useTheme();

  if (status === 'loading') {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Opening the artwork" />
        </View>
      </Screen>
    );
  }
  if (status === 'missing') {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <EmptyState
          title="This artwork can't be opened"
          body="It may have been deleted, or you're offline."
          action={{ label: 'Close', onPress: () => router.back() }}
        />
      </Screen>
    );
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
