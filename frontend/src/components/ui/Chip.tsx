import { Pressable, StyleSheet } from 'react-native';
import { chunky, minTouchTarget, radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primaryTonal : colors.surface,
          borderColor: selected ? colors.outline : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      {selected && <Icon name="checkmark" size={16} color={colors.onPrimaryTonal} />}
      <AppText variant="callout" color={selected ? 'onPrimaryTonal' : 'ink'} maxFontSizeMultiplier={1.6}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.md,
    borderWidth: chunky.outlineWidth,
    borderBottomWidth: chunky.outlineWidth + chunky.lip,
    borderRadius: radii.full,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
});
