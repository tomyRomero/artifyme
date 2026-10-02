import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui';
import { markOn } from '@/lib/swatches';
import { minTouchTarget, radii } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

export function ColorSwatch({ color, selected, onPress, accessibilityLabel }: ColorSwatchProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={[styles.target, { borderColor: selected ? colors.primary : 'transparent' }]}
    >
      <View style={[styles.swatch, { backgroundColor: color, borderColor: colors.borderStrong }]}>
        {selected && <Icon name="checkmark" size={20} color={markOn(color)} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: radii.full,
    borderWidth: 2,
    padding: 2,
  },
  swatch: {
    flex: 1,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
