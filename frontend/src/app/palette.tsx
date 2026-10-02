import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ColorSwatch } from '@/components/canvas/ColorSwatch';
import { AppText } from '@/components/ui';
import { useBrush } from '@/lib/brush';
import { useHaptics } from '@/lib/haptics';
import { colorName, swatches } from '@/lib/swatches';
import { spacing } from '@/theme/tokens';

export default function PaletteSheet() {
  const brush = useBrush();
  const haptic = useHaptics();

  const pick = (color: string) => {
    haptic('pick');
    brush.pickColor(color);
    router.back();
  };

  const swatchFor = (color: string) => (
    <ColorSwatch
      key={color}
      color={color}
      selected={color === brush.color}
      onPress={() => pick(color)}
      accessibilityLabel={colorName(color)}
    />
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppText variant="title2" accessibilityRole="header">
        Color
      </AppText>
      {brush.recent.length > 0 && (
        <View style={styles.section}>
          <AppText variant="footnote" color="inkMuted">
            Recent
          </AppText>
          <View style={styles.swatches}>{brush.recent.map(swatchFor)}</View>
        </View>
      )}
      <View style={styles.section}>
        <AppText variant="footnote" color="inkMuted">
          All colors
        </AppText>
        <View style={styles.swatches}>{swatches.map((swatch) => swatchFor(swatch.color))}</View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
