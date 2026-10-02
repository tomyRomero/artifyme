import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { Generation } from '@/api/types';
import { AppText, Icon, ProgressBar } from '@/components/ui';
import { stageOf, stageProgress, stageText } from '@/lib/generation-stage';
import { chunky, radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function PaintingCard({ generation }: { generation: Generation }) {
  const { colors } = useTheme();
  const stage = stageOf(generation, null);
  const text = stageText(stage);
  const title = generation.artworkId ? 'Painting a new image' : 'Painting a new artwork';

  const open = () =>
    router.push(generation.artworkId ? { pathname: '/studio', params: { artwork: generation.artworkId } } : '/studio');

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${text}`}
      accessibilityHint="Opens its progress"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.outline },
        pressed && styles.pressed,
      ]}
    >
      {generation.preview ? (
        <Image
          source={{ uri: generation.preview }}
          style={[styles.preview, { borderColor: colors.border }]}
          transition={400}
        />
      ) : (
        <Icon name="color-palette-outline" size={28} color={colors.primary} />
      )}
      <View style={styles.words}>
        <AppText variant="headline">{title}</AppText>
        <AppText variant="subhead" color="inkMuted">
          {text}
        </AppText>
        <ProgressBar rainbow progress={stageProgress(stage)} accessibilityLabel={text} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: chunky.outlineWidth,
    borderRadius: radii.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  preview: {
    width: 40,
    height: 60,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  words: {
    flex: 1,
    gap: spacing.xs,
  },
});
