import { router } from 'expo-router';
import { EmptyState, Screen } from '@/components/ui';

// Only reached through a link; the tab itself opens the studio
export default function CreateTab() {
  return (
    <Screen scroll>
      <EmptyState
        title="Draw something"
        body="Sketch it, say what it is, and it's painted into an artwork."
        action={{ label: 'Start drawing', onPress: () => router.push('/studio') }}
      />
    </Screen>
  );
}
