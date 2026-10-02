import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ArtworkDetails, HowItWasMade as Making } from '@/api/types';
import SignedImage from '@/components/shared/SignedImage';
import { AppText, Icon } from '@/components/ui';
import { useStyles } from '@/hooks/use-styles';
import { duration } from '@/lib/time';
import { chunky, radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const DEVICES: Record<string, string> = { mps: 'Apple GPU', cuda: 'NVIDIA GPU', cpu: 'CPU' };

// Folded away until it's opened
export function HowItWasMade({ artwork, making }: { artwork: ArtworkDetails; making: Making }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const styleName = useStyles().data?.find((style) => style.id === artwork.style)?.name ?? artwork.style;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel="How it was made"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <Icon name="color-wand-outline" size={22} color={colors.primary} />
        <AppText variant="headline" style={styles.grow}>
          How it was made
        </AppText>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.inkMuted} />
      </Pressable>
      {open && <Details artwork={artwork} making={making} styleName={styleName} />}
    </View>
  );
}

function Details({
  artwork,
  making,
  styleName,
}: {
  artwork: ArtworkDetails;
  making: Making;
  styleName: string | null;
}) {
  const { colors } = useTheme();
  const seconds = making.startedAt ? (Date.parse(making.finishedAt) - Date.parse(making.startedAt)) / 1000 : null;

  const rows: [string, string | null][] = [
    ['Your words', artwork.description],
    ['Style', styleName],
    ['Prompt', making.prompt],
    ['Model', making.model],
    ['Steps', String(making.steps)],
    ['Seed', String(making.seed)],
    ['Painted in', seconds === null ? null : duration(seconds)],
    ['Ran on', making.device ? (DEVICES[making.device] ?? making.device) : null],
  ];

  return (
    <View style={styles.body}>
      <View style={styles.pictures}>
        <Picture label="1 · Your sketch" url={artwork.sketchImageUrl} />
        <Icon name="arrow-forward" size={16} color={colors.borderStrong} style={styles.arrow} />
        <Picture label="2 · The outline it followed" url={making.outlineImageUrl} />
        <Icon name="arrow-forward" size={16} color={colors.borderStrong} style={styles.arrow} />
        <Picture label="3 · The painting" url={artwork.aiImageUrl} />
      </View>
      <View style={styles.rows}>
        {rows
          .filter((row): row is [string, string] => Boolean(row[1]))
          .map(([label, value]) => (
            <View key={label} style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
              <AppText variant="subhead" color="inkMuted" style={styles.label}>
                {label}
              </AppText>
              <AppText variant="subhead" style={styles.grow}>
                {value}
              </AppText>
            </View>
          ))}
      </View>
    </View>
  );
}

function Picture({ label, url }: { label: string; url: string | null }) {
  const { colors } = useTheme();

  return (
    <View style={styles.picture}>
      <SignedImage
        url={url}
        contentFit="cover"
        style={[styles.image, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
        accessibilityIgnoresInvertColors
      />
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: chunky.outlineWidth,
    borderBottomWidth: chunky.outlineWidth + chunky.lip,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
  grow: {
    flex: 1,
  },
  body: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  pictures: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  picture: {
    flex: 1,
    gap: spacing.xs,
  },
  image: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  arrow: {
    marginTop: 48,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  label: {
    width: 96,
  },
});
