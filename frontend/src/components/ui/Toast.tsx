import { useEffect, useEffectEvent } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { chunky, radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Entrance } from './Entrance';

interface ToastProps {
  message: string;
  action?: { label: string; onPress: () => void };
  onHide: () => void;
}

export const TOAST_DURATION_MS = 4000;

export function Toast({ message, action, onHide }: ToastProps) {
  const { colors } = useTheme();

  // Latest onHide without restarting the timer
  const hide = useEffectEvent(onHide);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(() => hide(), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <Entrance rise={spacing.sm}>
      <View
        testID="toast"
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: colors.surfaceRaised, borderColor: colors.outline }]}
      >
        <AppText variant="subhead" style={styles.message}>
          {message}
        </AppText>
        {action && <Button label={action.label} onPress={action.onPress} variant="ghost" />}
      </View>
    </Entrance>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: chunky.outlineWidth,
    borderRadius: radii.md,
  },
  message: {
    flex: 1,
  },
});
