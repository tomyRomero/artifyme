import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import type { ArtworkSummary } from '@/api/types';
import SignedImage from '@/components/shared/SignedImage';
import { AppText, Skeleton } from '@/components/ui';
import { useScreenReader } from '@/hooks/use-accessibility';
import { useArtworkActions } from '@/hooks/use-artwork-actions';
import { ARTBOARD } from '@/lib/sketch';
import { timeAgo, timeAgoInSentence } from '@/lib/time';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface ArtworkCardProps {
  artwork: ArtworkSummary;
  width: number;
  onSavedToPhotos?: () => void;
}

export function ArtworkCard({ artwork, width, onSavedToPhotos }: ArtworkCardProps) {
  const { colors } = useTheme();
  const actions = useArtworkActions();
  const screenReader = useScreenReader();
  const made = timeAgo(artwork.creationDateTime);

  const saveToPhotos = async () => {
    if (await actions.saveToPhotos(artwork.id)) {
      onSavedToPhotos?.();
    }
  };
  const run: Record<string, () => void> = {
    share: () => actions.share(artwork.id),
    save: saveToPhotos,
    edit: () => actions.edit(artwork.id),
    delete: () => actions.confirmDelete(artwork),
  };

  const href = { pathname: '/artwork/[id]', params: { id: artwork.id } } as const;
  const card = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={describe(artwork)}
      accessibilityActions={[
        { name: 'share', label: 'Share' },
        { name: 'save', label: 'Save to Photos' },
        { name: 'edit', label: 'Edit' },
        { name: 'delete', label: 'Delete' },
      ]}
      onAccessibilityAction={(event) => run[event.nativeEvent.actionName]?.()}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <SignedImage
        url={artwork.imageUrl}
        contentFit="cover"
        style={[styles.image, { width, height: imageHeight(width), backgroundColor: colors.surfaceMuted }]}
      />
      <View style={styles.words}>
        <AppText variant="headline" numberOfLines={2}>
          {artwork.title}
        </AppText>
        <AppText variant="footnote" color="inkMuted">
          {made}
        </AppText>
      </View>
    </Pressable>
  );

  // The native menu's wrapper hides the card from screen readers, which reach the same
  // actions through the card's own accessibility actions instead
  if (screenReader) {
    return (
      <Link href={href} asChild>
        {card}
      </Link>
    );
  }
  return (
    <Link href={href} asChild>
      <Link.Trigger>{card}</Link.Trigger>
      <Link.Menu>
        <Link.MenuAction icon="square.and.arrow.up" onPress={run.share}>
          Share
        </Link.MenuAction>
        <Link.MenuAction icon="square.and.arrow.down" onPress={run.save}>
          Save to Photos
        </Link.MenuAction>
        <Link.MenuAction icon="pencil" onPress={run.edit}>
          Edit
        </Link.MenuAction>
        <Link.MenuAction icon="trash" destructive onPress={run.delete}>
          Delete
        </Link.MenuAction>
      </Link.Menu>
    </Link>
  );
}

export function ArtworkCardSkeleton({ width }: { width: number }) {
  return (
    <View style={[styles.card, { width }]}>
      <Skeleton style={{ width, height: imageHeight(width), borderRadius: radii.lg }} />
      <Skeleton style={styles.titleLine} />
      <Skeleton style={styles.timeLine} />
    </View>
  );
}

// e.g. "Couch. A comfy couch. Made 3 days ago."
function describe(artwork: ArtworkSummary): string {
  return [artwork.title, artwork.description, `Made ${timeAgoInSentence(artwork.creationDateTime)}`]
    .filter((part): part is string => Boolean(part))
    .map((part) => part.trim().replace(/[.!?]+$/, ''))
    .join('. ')
    .concat('.');
}

function imageHeight(width: number): number {
  return (width * ARTBOARD.height) / ARTBOARD.width;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
  image: {
    borderRadius: radii.lg,
  },
  words: {
    gap: spacing.xxs,
  },
  titleLine: {
    height: 18,
    width: '80%',
    borderRadius: radii.sm,
  },
  timeLine: {
    height: 14,
    width: '45%',
    borderRadius: radii.sm,
  },
});
