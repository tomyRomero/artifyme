import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getArtwork } from '@/api/artworks';
import { fakeResponse } from '@/test-utils';

const fetchMock = jest.fn<(url: string, init: RequestInit) => Promise<Response>>();

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(() => {
  fetchMock.mockReset();
});

describe('getArtwork', () => {
  it('returns null for an artwork that is missing or not yours', async () => {
    fetchMock.mockResolvedValue(fakeResponse(404, { title: 'Artwork not found.' }));

    await expect(getArtwork('someone-elses')).resolves.toBeNull();
  });

  it('still fails for other errors', async () => {
    fetchMock.mockResolvedValue(fakeResponse(500));

    await expect(getArtwork('a1')).rejects.toMatchObject({ status: 500 });
  });
});
