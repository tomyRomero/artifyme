import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { minTouchTarget, radii, type ColorToken } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { Icon, type IconName } from './Icon';

interface IconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  color?: ColorToken;
  size?: number;
  disabled?: boolean;
  // For a toggle
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = 'ink',
  size = 24,
  disabled = false,
  selected,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      style={({ pressed }) => [styles.target, (pressed || disabled) && styles.dimmed, style]}
    >
      <Icon name={icon} size={size} color={colors[color]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  dimmed: {
    opacity: 0.5,
  },
});
