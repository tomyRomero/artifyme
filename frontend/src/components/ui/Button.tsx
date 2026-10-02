import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { chunky, minTouchTarget, radii, spacing, type ColorToken } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  maxFontSizeMultiplier?: number;
  style?: StyleProp<ViewStyle>;
}

const faces: Record<ButtonVariant, { fill: ColorToken | null; text: ColorToken }> = {
  primary: { fill: 'primary', text: 'onPrimary' },
  secondary: { fill: 'primaryTonal', text: 'onPrimaryTonal' },
  ghost: { fill: null, text: 'primary' },
  destructive: { fill: 'danger', text: 'onDanger' },
};

// Filled buttons sit on a lip and sink onto it when pressed
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  maxFontSizeMultiplier,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const face = faces[variant];
  const isChunky = face.fill !== null;
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.pressable, isChunky && { paddingBottom: chunky.lip }, disabled && styles.disabled, style]}
    >
      {({ pressed }) => (
        <>
          {isChunky && <View style={[styles.lip, { backgroundColor: colors.outline }]} />}
          <View
            style={[
              styles.face,
              size === 'lg' ? styles.large : styles.medium,
              isChunky && {
                backgroundColor: colors[face.fill!],
                borderColor: colors.outline,
                borderWidth: chunky.outlineWidth,
              },
              pressed && (isChunky ? { transform: [{ translateY: chunky.lip }] } : styles.ghostPressed),
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors[face.text]} />
            ) : (
              <>
                {icon && <Icon name={icon} size={20} color={colors[face.text]} />}
                <AppText variant="headline" color={face.text} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  {label}
                </AppText>
              </>
            )}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: minTouchTarget,
  },
  lip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: chunky.lip,
    borderRadius: radii.md,
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
  },
  medium: {
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  large: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  ghostPressed: {
    opacity: 0.6,
  },
});
