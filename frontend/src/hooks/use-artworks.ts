import { useMemo } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { deleteArtwork, getArtwork, listArtworks } from '@/api/artworks';
import type { ArtworkPage, GalleryFilters } from '@/api/types';
import { useSession } from '@/lib/session';

export const NO_FILTERS: GalleryFilters = { search: '', style: null, sort: 'newest' };

export const artworkKeys = {
  all: ['artworks'] as const,
  gallery: ['artworks', 'gallery'] as const,
  filteredGallery: (filters: GalleryFilters) => ['artworks', 'gallery', filters] as const,
  detail: (id: string) => ['artworks', 'detail', id] as const,
};

export const GALLERY_PAGE_SIZE = 12;

export function useGallery(filters: GalleryFilters = NO_FILTERS) {
  const signedIn = useSession().status === 'signedIn';
  const query = useInfiniteQuery({
    queryKey: artworkKeys.filteredGallery(filters),
    queryFn: ({ pageParam, signal }) => listArtworks(pageParam, GALLERY_PAGE_SIZE, filters, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageNumber) => (lastPage.hasMore ? lastPageNumber + 1 : undefined),
    enabled: signedIn,
    // Keeps the last results on screen while a new search loads
    placeholderData: keepPreviousData,
  });

  // Offset paging shifts when an artwork is added, so a page can repeat one already shown
  const artworks = useMemo(() => {
    const seen = new Set<string>();
    return (query.data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((artwork) => {
        if (seen.has(artwork.id)) {
          return false;
        }
        seen.add(artwork.id);
        return true;
      });
  }, [query.data]);

  return { ...query, artworks };
}

export function useArtwork(id: string | null) {
  const signedIn = useSession().status === 'signedIn';
  return useQuery({
    queryKey: artworkKeys.detail(id ?? ''),
    queryFn: ({ signal }) => getArtwork(id!, signal),
    enabled: signedIn && id !== null,
  });
}

export function useDeleteArtwork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteArtwork,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: artworkKeys.detail(id) });
      queryClient.setQueriesData<InfiniteData<ArtworkPage>>(
        { queryKey: artworkKeys.gallery },
        (gallery) =>
          gallery && {
            ...gallery,
            pages: gallery.pages.map((page) => ({ ...page, items: page.items.filter((artwork) => artwork.id !== id) })),
          },
      );
      return queryClient.invalidateQueries({ queryKey: artworkKeys.gallery });
    },
  });
}
