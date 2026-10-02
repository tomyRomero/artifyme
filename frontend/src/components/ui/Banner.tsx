import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

type BannerTone = 'error' | 'offline' | 'info';

interface BannerProps {
  tone: BannerTone;
  message: string;
  action?: { label: string; onPress: () => void };
  // A close button, for a banner that offers something
  dismiss?: { label: string; onPress: () => void };
}

const icons = {
  error: 'alert-circle',
  offline: 'cloud-offline-outline',
  info: 'information-circle-outline',
} as const;

export function Banner({ tone, message, action, dismiss }: BannerProps) {
  const { colors } = useTheme();
  const accent = tone === 'error' ? colors.danger : colors.inkMuted;
  const alert = tone !== 'info';

  useEffect(() => {
    if (alert) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [alert, message]);

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.surface, borderColor: tone === 'error' ? colors.danger : colors.border },
      ]}
    >
      <View style={styles.row} accessible accessibilityRole={alert ? 'alert' : 'text'} accessibilityLabel={message}>
        <Icon name={icons[tone]} size={20} color={accent} />
        <AppText variant="subhead" style={styles.message}>
          {message}
        </AppText>
      </View>
      {action && <Button label={action.label} onPress={action.onPress} variant="ghost" />}
      {dismiss && (
        <IconButton
          icon="close"
          size={20}
          color="inkMuted"
          accessibilityLabel={dismiss.label}
          onPress={dismiss.onPress}
        />
      )}
    </View>
  );
}

// The action sits at the end of the message's line, and drops below it when there isn't room
const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    columnGap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 200,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  message: {
    flexShrink: 1,
  },
});
