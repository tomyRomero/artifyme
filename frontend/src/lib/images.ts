import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

// Signed URLs change on every response but stored images never do, so key the cache on the path
export function imageCacheKey(url: string): string {
  return url.split('?')[0];
}

// Share the file, since a signed link expires within the hour
export async function shareImage(url: string): Promise<void> {
  const file = await download(url);
  await Sharing.shareAsync(file.uri);
}

export async function saveImageToPhotos(url: string): Promise<boolean> {
  const { granted } = await MediaLibrary.requestPermissionsAsync(true);
  if (!granted) {
    return false;
  }
  const file = await download(url);
  await MediaLibrary.Asset.create(file.uri);
  return true;
}

function download(url: string): Promise<File> {
  const name = imageCacheKey(url).split('/').pop() || 'artwork';
  return File.downloadFileAsync(url, new File(Paths.cache, name), { idempotent: true });
}
