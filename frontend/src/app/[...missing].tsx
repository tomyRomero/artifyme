import { router } from 'expo-router';
import { EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <Screen scroll edges={['top', 'bottom']}>
      <EmptyState
        title="Nothing here"
        body="This page doesn't exist."
        action={{ label: 'Go to the gallery', onPress: () => router.replace('/') }}
      />
    </Screen>
  );
}
