import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface ScreenHeaderProps {
  title?: string;
  close?: boolean;
}

export function ScreenHeader({ title, close = false }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <IconButton
        icon={close ? 'close' : 'chevron-back'}
        accessibilityLabel={close ? 'Close' : 'Back'}
        onPress={() => router.back()}
      />
      {title && (
        <AppText variant="title2" accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  title: {
    flex: 1,
  },
});
