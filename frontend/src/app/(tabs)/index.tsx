import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { ApiError } from '@/api/client';
import type { GalleryFilters } from '@/api/types';
import { ArtworkCard, ArtworkCardSkeleton } from '@/components/artwork/ArtworkCard';
import { PaintingCard } from '@/components/artwork/PaintingCard';
import { LoadError } from '@/components/shared/LoadError';
import { AppText, Banner, Button, Chip, EmptyState, Entrance, Screen, SearchField, Toast } from '@/components/ui';
import { useGallery } from '@/hooks/use-artworks';
import { useDebounced } from '@/hooks/use-debounced';
import { useActiveGeneration } from '@/hooks/use-generation-flow';
import { useStyles } from '@/hooks/use-styles';
import { useSession } from '@/lib/session';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const MAX_WIDTH = 1000;
// Delay so a new card animates in after the studio has closed
const ARRIVAL_DELAY_MS = 350;
// Waits for a pause in typing before searching
const SEARCH_DELAY_MS = 300;
const SEARCH_MAX_LENGTH = 100;

export default function GalleryScreen() {
  const signedIn = useSession().status === 'signedIn';

  if (!signedIn) {
    return (
      <Screen scroll edges={[]}>
        <EmptyState
          title="Sign in to keep your art"
          body="Your artworks are saved to your account, ready on any phone you sign in on."
          action={{ label: 'Sign in', onPress: () => router.push('/login') }}
          secondaryAction={{ label: 'Try without an account', onPress: () => router.push('/studio') }}
        />
      </Screen>
    );
  }
  return <Gallery />;
}

function Gallery() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [style, setStyle] = useState<string | null>(null);
  const [sort, setSort] = useState<GalleryFilters['sort']>('newest');
  const settledSearch = useDebounced(search.trim(), SEARCH_DELAY_MS);
  const filters = useMemo(() => ({ search: settledSearch, style, sort }), [settledSearch, style, sort]);
  const filtered = filters.search !== '' || filters.style !== null;

  const gallery = useGallery(filters);
  const styleName = useStyles().data?.find((option) => option.id === style)?.name ?? style;
  const inView = useIsFocused();
  const arrivals = useArrivals(
    gallery.artworks,
    gallery.isSuccess && !gallery.isPlaceholderData && inView,
    JSON.stringify(filters),
  );
  const painting = useActiveGeneration();
  const [refreshing, setRefreshing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const contentWidth = Math.min(width, MAX_WIDTH) - spacing.lg * 2;
  const cardWidth = (contentWidth - spacing.lg * (columns - 1)) / columns;

  const loading = gallery.isPending && gallery.fetchStatus === 'fetching';
  const offline = gallery.error instanceof ApiError && gallery.error.status === 0;
  // Nothing to search or sort until there's art
  const showFilters = loading || filtered || gallery.artworks.length > 0;

  const clearFilters = () => {
    setSearch('');
    setStyle(null);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await gallery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const title = (
    <View style={[styles.title, { width: contentWidth }]}>
      <AppText variant="display" accessibilityRole="header" style={styles.titleText}>
        Gallery
      </AppText>
      {showFilters && (
        <Button
          variant="ghost"
          icon="swap-vertical"
          label={sort === 'newest' ? 'Newest first' : 'Oldest first'}
          maxFontSizeMultiplier={1.6}
          onPress={() => setSort((current) => (current === 'newest' ? 'oldest' : 'newest'))}
        />
      )}
    </View>
  );

  const header = (
    <View style={styles.header}>
      {showFilters && (
        <>
          <SearchField
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search your gallery"
            placeholder="Search titles and descriptions"
            maxLength={SEARCH_MAX_LENGTH}
            busy={gallery.isPlaceholderData}
          />
          <StyleFilter selected={style} onSelect={setStyle} />
        </>
      )}
      {gallery.isError && gallery.artworks.length > 0 && (
        <Banner
          tone={offline ? 'offline' : 'error'}
          message={
            offline ? "Can't reach ArtifyMe. Showing the artworks already loaded." : "Couldn't refresh your gallery."
          }
          action={{ label: 'Retry', onPress: () => gallery.refetch() }}
        />
      )}
      {painting && <PaintingCard generation={painting} />}
    </View>
  );

  const empty = loading ? (
    <View accessible accessibilityLabel="Loading your gallery" style={[styles.row, styles.skeletons]}>
      {Array.from({ length: columns * 2 }, (_, index) => (
        <ArtworkCardSkeleton key={index} width={cardWidth} />
      ))}
    </View>
  ) : gallery.isError ? (
    <LoadError title="Can't load your gallery" error={gallery.error} onRetry={() => gallery.refetch()} />
  ) : filtered ? (
    <EmptyState
      title="No matches"
      body={noMatches(filters.search, styleName)}
      action={{ label: 'Clear filters', onPress: clearFilters }}
    />
  ) : painting ? null : (
    <EmptyState
      title="Your gallery is empty"
      body="Draw something and we'll turn it into art."
      action={{ label: 'Start drawing', onPress: () => router.push('/studio') }}
    />
  );

  return (
    <Screen edges={[]} padded={false} header={title} scrolled={scrolled}>
      <FlatList
        // FlatList can't change numColumns on the fly
        key={columns}
        testID="gallery"
        data={gallery.artworks}
        numColumns={columns}
        keyExtractor={(artwork) => artwork.id}
        renderItem={({ item }) => {
          const card = <ArtworkCard artwork={item} width={cardWidth} onSavedToPhotos={() => setSaved(Date.now())} />;
          return arrivals.has(item.id) ? (
            <Entrance testID="arriving" delay={ARRIVAL_DELAY_MS}>
              {card}
            </Entrance>
          ) : (
            card
          );
        }}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        contentContainerStyle={[styles.content, { width: contentWidth + spacing.lg * 2 }]}
        style={styles.list}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          gallery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} accessibilityLabel="Loading more artworks" />
          ) : null
        }
        onEndReached={() => {
          if (gallery.hasNextPage && !gallery.isFetchingNextPage && !gallery.isError && !gallery.isPlaceholderData) {
            gallery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.6}
        onScroll={(event) => setScrolled(event.nativeEvent.contentOffset.y > 0)}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      />
      {saved !== null && (
        <View style={styles.toast}>
          <Toast key={saved} message="Saved to Photos" onHide={() => setSaved(null)} />
        </View>
      )}
    </Screen>
  );
}

function StyleFilter({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const options = useStyles().data;
  if (!options?.length) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chips}
      contentContainerStyle={styles.chipRow}
    >
      <Chip label="All styles" selected={selected === null} onPress={() => onSelect(null)} />
      {options.map((option) => (
        <Chip
          key={option.id}
          label={option.name}
          selected={option.id === selected}
          onPress={() => onSelect(option.id === selected ? null : option.id)}
        />
      ))}
    </ScrollView>
  );
}

function noMatches(search: string, styleName: string | null): string {
  if (search && styleName) {
    return `None of your ${styleName} artworks match "${search}".`;
  }
  if (search) {
    return `None of your artworks match "${search}".`;
  }
  return `None of your artworks are in ${styleName} yet.`;
}

const NO_ARRIVALS: ReadonlySet<string> = new Set();

// Artworks added at the top since this search first loaded, so they can animate in
function useArrivals(artworks: { id: string }[], loaded: boolean, view: string): ReadonlySet<string> {
  const [seen, setSeen] = useState<{ view: string; known: ReadonlySet<string> | null; arrivals: ReadonlySet<string> }>({
    view,
    known: null,
    arrivals: NO_ARRIVALS,
  });
  const fresh = seen.view !== view;
  const known = fresh ? null : seen.known;
  const arrivals = fresh ? NO_ARRIVALS : seen.arrivals;

  // Computed during render so the card's first frame is already animating
  if (loaded && (known === null || artworks.some((artwork) => !known.has(artwork.id)))) {
    const arrived = new Set(arrivals);
    if (known !== null) {
      for (const artwork of artworks) {
        if (known.has(artwork.id)) {
          break;
        }
        arrived.add(artwork.id);
      }
    }
    setSeen({ view, known: new Set([...(known ?? []), ...artworks.map((artwork) => artwork.id)]), arrivals: arrived });
  }

  return arrivals;
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.xl,
  },
  // The sort button drops below the title when large text leaves no room beside it
  title: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'center',
    columnGap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  titleText: {
    flexGrow: 1,
  },
  header: {
    gap: spacing.lg,
  },
  // Runs edge to edge, past the list's padding
  chips: {
    marginHorizontal: -spacing.lg,
  },
  chipRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  row: {
    gap: spacing.lg,
  },
  skeletons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xl,
  },
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
});
