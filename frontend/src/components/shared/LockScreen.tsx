import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { signOut } from '@/api/account';
import { AppText, Button, Wordmark } from '@/components/ui';
import { useBiometrics } from '@/lib/biometrics';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

// The prompt opens by itself; Unlock retries after a cancel, and Sign out is the way back to a password
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { colors } = useTheme();
  const name = useBiometrics().data?.name ?? 'Face ID';

  useEffect(() => {
    onUnlock();
  }, [onUnlock]);

  return (
    <View testID="lock-screen" style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <Wordmark size="lg" />
      <AppText variant="title2" accessibilityRole="header" style={styles.centered}>
        ArtifyMe is locked
      </AppText>
      <AppText color="inkMuted" style={styles.centered}>
        Unlock with {name} or your passcode.
      </AppText>
      <View style={styles.actions}>
        <Button size="lg" label="Unlock" onPress={onUnlock} />
        <Button variant="ghost" label="Sign out" onPress={() => signOut()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  centered: {
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
