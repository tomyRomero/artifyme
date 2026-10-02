import { ApiError, request } from './client';
import type { ArtworkChanges, ArtworkDetails, ArtworkPage, GalleryFilters } from './types';

const ARTWORKS = '/api/v1/artworks';

export function listArtworks(
  page: number,
  pageSize: number,
  filters?: GalleryFilters,
  signal?: AbortSignal,
): Promise<ArtworkPage> {
  const search = filters?.search.trim() || undefined;
  const sort = filters?.sort === 'oldest' ? 'oldest' : undefined;
  return request(ARTWORKS, { query: { page, pageSize, search, style: filters?.style ?? undefined, sort }, signal });
}

// null when it doesn't exist or belongs to someone else
export async function getArtwork(id: string, signal?: AbortSignal): Promise<ArtworkDetails | null> {
  try {
    return await request<ArtworkDetails>(artworkPath(id), { signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function updateArtwork(id: string, changes: ArtworkChanges): Promise<void> {
  await request(artworkPath(id), { method: 'PATCH', body: changes });
}

export async function deleteArtwork(id: string): Promise<void> {
  await request(artworkPath(id), { method: 'DELETE' });
}

function artworkPath(id: string): string {
  return `${ARTWORKS}/${encodeURIComponent(id)}`;
}
