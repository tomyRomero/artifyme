import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import type { ArtworkDetails } from '@/api/types';
import { CompareSlider } from '@/components/artwork/CompareSlider';
import { HowItWasMade } from '@/components/artwork/HowItWasMade';
import { ZoomableImage } from '@/components/artwork/ZoomableImage';
import { LoadError } from '@/components/shared/LoadError';
import { AppText, Button, EmptyState, IconButton, Screen, SegmentedControl, Skeleton, Toast } from '@/components/ui';
import { useArtworkActions } from '@/hooks/use-artwork-actions';
import { useArtwork } from '@/hooks/use-artworks';
import { ARTBOARD } from '@/lib/sketch';
import { fullDate } from '@/lib/time';
import { radii, spacing } from '@/theme/tokens';

type Show = 'artwork' | 'sketch' | 'compare';

const SHOW_OPTIONS = [
  { value: 'artwork', label: 'Artwork' },
  { value: 'sketch', label: 'Sketch' },
  { value: 'compare', label: 'Compare' },
] as const;

const MAX_IMAGE_WIDTH = 640;

export default function ArtworkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useArtwork(id);
  const artwork = query.data;

  return (
    <Screen
      scroll
      edges={['top', 'bottom']}
      header={
        <View style={styles.header}>
          <IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />
        </View>
      }
    >
      {artwork ? (
        <Artwork artwork={artwork} />
      ) : query.isPending && query.fetchStatus === 'fetching' ? (
        <Loading />
      ) : query.isError ? (
        <LoadError title="Can't load this artwork" error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <EmptyState
          title="This artwork isn't here"
          body="It was deleted, or never existed."
          action={{ label: 'Back to the gallery', onPress: () => router.back() }}
        />
      )}
    </Screen>
  );
}

function Artwork({ artwork }: { artwork: ArtworkDetails }) {
  const actions = useArtworkActions();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [show, setShow] = useState<Show>('artwork');

  // Otherwise a drag on the divide that strays downward pulls the sheet closed
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: show !== 'compare' });
  }, [navigation, show]);
  const [saved, setSaved] = useState<number | null>(null);
  const image = imageSize(width);

  const saveToPhotos = async () => {
    if (await actions.saveToPhotos(artwork.id)) {
      setSaved(Date.now());
    }
  };

  return (
    <View style={styles.content}>
      <SegmentedControl accessibilityLabel="Show" options={SHOW_OPTIONS} value={show} onChange={setShow} />

      <View style={[styles.image, { width: image.width }]}>
        {show === 'compare' ? (
          <CompareSlider
            sketch={{ url: artwork.sketchImageUrl }}
            artwork={{ url: artwork.aiImageUrl }}
            accessibilityLabel={`${artwork.title}: sketch and artwork`}
          />
        ) : (
          // Remount to reset the zoom
          <ZoomableImage
            key={show}
            url={show === 'artwork' ? artwork.aiImageUrl : artwork.sketchImageUrl}
            width={image.width}
            height={image.height}
            accessibilityLabel={show === 'artwork' ? artwork.title : `The sketch for ${artwork.title}`}
          />
        )}
      </View>

      <View style={styles.words}>
        <AppText variant="artTitle" accessibilityRole="header">
          {artwork.title}
        </AppText>
        {artwork.description && <AppText>{artwork.description}</AppText>}
        <AppText variant="footnote" color="inkMuted">
          Made on {fullDate(artwork.creationDateTime)}
        </AppText>
      </View>

      {artwork.howItWasMade && <HowItWasMade artwork={artwork} making={artwork.howItWasMade} />}

      <View style={styles.actions}>
        <Button
          variant="secondary"
          icon="share-outline"
          label="Share"
          onPress={() => actions.share(artwork.id)}
          style={styles.action}
        />
        <Button
          variant="secondary"
          icon="download-outline"
          label="Save to Photos"
          onPress={saveToPhotos}
          style={styles.action}
        />
        <Button
          variant="secondary"
          icon="brush-outline"
          label="Edit"
          onPress={() => actions.edit(artwork.id)}
          style={styles.action}
        />
        <Button
          variant="destructive"
          icon="trash-outline"
          label="Delete"
          style={styles.action}
          loading={actions.deleting}
          onPress={() => actions.confirmDelete(artwork, () => router.back())}
        />
      </View>

      {saved !== null && <Toast key={saved} message="Saved to Photos" onHide={() => setSaved(null)} />}
    </View>
  );
}

function Loading() {
  const { width } = useWindowDimensions();
  const image = imageSize(width);
  return (
    <View accessible accessibilityLabel="Loading the artwork" style={styles.content}>
      <Skeleton style={{ height: 48 }} />
      <Skeleton style={[styles.image, image]} />
      <Skeleton style={{ height: 32, width: '60%' }} />
    </View>
  );
}

function imageSize(windowWidth: number) {
  const width = Math.min(windowWidth, MAX_IMAGE_WIDTH) - spacing.lg * 2;
  return { width, height: (width * ARTBOARD.height) / ARTBOARD.width };
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  image: {
    alignSelf: 'center',
    borderRadius: radii.lg,
  },
  words: {
    gap: spacing.sm,
  },
  // Two even columns
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  action: {
    flexGrow: 1,
    flexBasis: '40%',
  },
});
