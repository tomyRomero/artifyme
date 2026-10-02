import { Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { getArtwork } from '@/api/artworks';
import { alertError } from '@/lib/alerts';
import { useHaptics } from '@/lib/haptics';
import { saveImageToPhotos, shareImage } from '@/lib/images';
import { artworkKeys, useDeleteArtwork } from './use-artworks';

const FRESH_LINKS_MS = 10 * 60_000;

export function useArtworkActions() {
  const queryClient = useQueryClient();
  const deletion = useDeleteArtwork();
  const haptic = useHaptics();

  // The gallery only has thumbnail links, so fetch the details if needed
  const imageUrl = async (id: string): Promise<string | null> => {
    const artwork = await queryClient.fetchQuery({
      queryKey: artworkKeys.detail(id),
      queryFn: ({ signal }) => getArtwork(id, signal),
      staleTime: FRESH_LINKS_MS,
    });
    if (!artwork?.aiImageUrl) {
      Alert.alert('No image yet', "This artwork doesn't have an image to share or save.");
      return null;
    }
    return artwork.aiImageUrl;
  };

  return {
    share: async (id: string) => {
      try {
        const url = await imageUrl(id);
        if (url) {
          await shareImage(url);
        }
      } catch (error) {
        alertError("Couldn't share this artwork", error);
      }
    },

    saveToPhotos: async (id: string): Promise<boolean> => {
      try {
        const url = await imageUrl(id);
        if (!url) {
          return false;
        }
        const saved = await saveImageToPhotos(url);
        if (!saved) {
          Alert.alert(
            'Allow ArtifyMe to add photos',
            'To save artworks to Photos, allow ArtifyMe to add photos in Settings.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
        }
        return saved;
      } catch (error) {
        alertError("Couldn't save to Photos", error);
        return false;
      }
    },

    edit: (id: string) => router.push({ pathname: '/studio', params: { artwork: id } }),

    confirmDelete: (artwork: { id: string; title: string }, onDeleted?: () => void) =>
      Alert.alert(`Delete "${artwork.title}"?`, 'The artwork and its sketch are deleted for good.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            haptic('delete');
            deletion.mutate(artwork.id, {
              onSuccess: onDeleted,
              onError: (error) => alertError("Couldn't delete this artwork", error),
            });
          },
        },
      ]),

    deleting: deletion.isPending,
  };
}
