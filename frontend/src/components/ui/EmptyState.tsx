import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  illustration?: ReactNode;
}

export function EmptyState({ title, body, action, secondaryAction, illustration }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {illustration}
      <AppText variant="title2" accessibilityRole="header" style={styles.centered}>
        {title}
      </AppText>
      <AppText color="inkMuted" style={styles.centered}>
        {body}
      </AppText>
      {action && <Button label={action.label} onPress={action.onPress} size="lg" style={styles.action} />}
      {secondaryAction && <Button label={secondaryAction.label} onPress={secondaryAction.onPress} variant="ghost" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
  },
});
