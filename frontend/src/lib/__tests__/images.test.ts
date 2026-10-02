import { describe, expect, it } from '@jest/globals';
import { imageCacheKey } from '@/lib/images';

describe('imageCacheKey', () => {
  it('is the same for two signed links to one image', () => {
    const first =
      'https://account.r2.cloudflarestorage.com/artifyme/users/1/a1b2.webp?X-Amz-Date=20261001T120000Z&X-Amz-Signature=abc';
    const second =
      'https://account.r2.cloudflarestorage.com/artifyme/users/1/a1b2.webp?X-Amz-Date=20261001T130000Z&X-Amz-Signature=xyz';

    expect(imageCacheKey(first)).toBe(imageCacheKey(second));
  });

  it('differs between images', () => {
    expect(imageCacheKey('https://bucket.example/users/1/a.webp?X-Amz-Signature=1')).not.toBe(
      imageCacheKey('https://bucket.example/users/1/b.webp?X-Amz-Signature=1'),
    );
  });
});
