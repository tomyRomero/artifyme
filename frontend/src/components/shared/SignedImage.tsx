import React from 'react';
import { Image, type ImageProps } from 'expo-image';
import { imageCacheKey } from '@/lib/images';

interface SignedImageProps extends Omit<ImageProps, 'source'> {
  url: string | null;
}

// Cached by image, not by the signed URL
export default function SignedImage({ url, ...props }: SignedImageProps) {
  const source = url ? { uri: url, cacheKey: imageCacheKey(url) } : require('@/assets/icons/not-found.png');
  return <Image source={source} transition={150} {...props} />;
}
