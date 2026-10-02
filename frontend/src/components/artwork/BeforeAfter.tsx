import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AppText, Icon } from '@/components/ui';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function BeforeAfter() {
  const { colors } = useTheme();

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="image"
      accessibilityLabel="A sketch of a couch, and the painted couch made from it"
    >
      <Framed label="Your sketch">
        <Image source={require('@/assets/images/sample-sketch.png')} style={styles.image} contentFit="contain" />
      </Framed>
      <Icon name="arrow-forward" size={24} color={colors.primary} />
      <Framed label="The artwork">
        <Image source={require('@/assets/images/sample-artwork.png')} style={styles.image} contentFit="cover" />
      </Framed>
    </View>
  );
}

function Framed({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.side}>
      <View style={[styles.frame, { borderColor: colors.border, backgroundColor: colors.artboard }]}>{children}</View>
      <AppText variant="footnote" color="inkMuted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  side: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  frame: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
