import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { minTouchTarget, radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface ListSectionProps {
  title?: string;
  footer?: string;
  children: ReactNode;
}

export function ListSection({ title, footer, children }: ListSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      {title && (
        <AppText variant="footnote" color="inkMuted" accessibilityRole="header" style={styles.inset}>
          {title}
        </AppText>
      )}
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
      {footer && (
        <AppText variant="footnote" color="inkMuted" style={styles.inset}>
          {footer}
        </AppText>
      )}
    </View>
  );
}

interface ListRowProps {
  icon: IconName;
  label: string;
  detail?: string;
  onPress?: () => void;
  destructive?: boolean;
  trailing?: ReactNode;
}

export function ListRow({ icon, label, detail, onPress, destructive = false, trailing }: ListRowProps) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : colors.ink;

  const content = (
    <>
      <Icon name={icon} size={22} color={destructive ? colors.danger : colors.inkMuted} />
      <View style={styles.words}>
        <AppText style={{ color: tint }}>{label}</AppText>
        {detail && (
          <AppText variant="footnote" color="inkMuted">
            {detail}
          </AppText>
        )}
      </View>
      {trailing ?? (onPress && !destructive && <Icon name="chevron-forward" size={18} color={colors.inkMuted} />)}
    </>
  );

  if (!onPress) {
    return (
      <View accessible={!trailing} style={styles.row}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      {content}
    </Pressable>
  );
}

interface SwitchRowProps {
  icon: IconName;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SwitchRow({ icon, label, value, onValueChange, disabled = false }: SwitchRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      style={[styles.row, disabled && styles.disabled]}
    >
      <Icon name={icon} size={22} color={colors.inkMuted} />
      <View style={styles.words}>
        <AppText>{label}</AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

export function ListDivider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  inset: {
    paddingHorizontal: spacing.lg,
  },
  group: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: minTouchTarget + spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  words: {
    flex: 1,
    gap: spacing.xxs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 22 + spacing.md,
  },
});
