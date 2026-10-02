import { Pressable, StyleSheet, View } from 'react-native';
import { chunky, minTouchTarget, radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { AppText } from './AppText';

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.control, { borderColor: colors.outline, backgroundColor: colors.surface }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.option, selected && { backgroundColor: colors.primaryTonal }]}
          >
            <AppText variant="headline" color={selected ? 'onPrimaryTonal' : 'ink'} maxFontSizeMultiplier={1.4}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    flexDirection: 'row',
    padding: spacing.xxs,
    gap: spacing.xxs,
    borderWidth: chunky.outlineWidth,
    borderRadius: radii.md,
  },
  option: {
    flex: 1,
    minHeight: minTouchTarget - spacing.xxs * 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
  },
});
