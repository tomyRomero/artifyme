import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ApiError, request } from '@/api/client';
import { session } from '@/lib/session';
import { fakeResponse, fakeTokens } from '@/test-utils';

const fetchMock = jest.fn<(url: string, init: RequestInit) => Promise<Response>>();

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test/';
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(async () => {
  fetchMock.mockReset();
  await session.signOut();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('sending a request', () => {
  it('calls the API address with the query, a JSON body and the access token', async () => {
    const tokens = fakeTokens();
    await session.save(tokens);
    fetchMock.mockResolvedValue(fakeResponse(200, { saved: true }));

    const result = await request<{ saved: boolean }>('/api/things', {
      method: 'POST',
      query: { page: 2, search: 'a cat & a dog', missing: undefined },
      body: { name: 'thing' },
    });

    expect(result).toEqual({ saved: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/things?page=2&search=a%20cat%20%26%20a%20dog');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"name":"thing"}');
    expect(init.headers).toMatchObject({
      Authorization: `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
    });
  });

  it('leaves the token off requests that must not carry it', async () => {
    await session.save(fakeTokens());
    fetchMock.mockResolvedValue(fakeResponse(200, {}));

    await request('/api/v1/auth/sessions', { method: 'POST', body: {}, auth: false });

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('returns nothing for an empty response', async () => {
    fetchMock.mockResolvedValue(fakeResponse(204));

    await expect(request('/api/v1/generations/active')).resolves.toBeUndefined();
  });
});

describe('turning failures into messages', () => {
  it.each([
    [
      'a field-level validation message',
      400,
      {
        title: 'One or more validation errors occurred.',
        errors: { Password: ['Password must be at least 12 characters.'] },
      },
      'Password must be at least 12 characters.',
    ],
    [
      'a problem title',
      409,
      { title: 'An account with this email already exists.' },
      'An account with this email already exists.',
    ],
    ['a problem detail', 400, { title: 'Bad request', detail: 'The sketch is empty.' }, 'The sketch is empty.'],
    ['a fallback when the body says nothing', 500, undefined, 'Something went wrong on our side. Try again shortly.'],
    [
      'a fallback for a body that is not JSON',
      502,
      '<html>Bad gateway</html>',
      'Something went wrong on our side. Try again shortly.',
    ],
  ])('uses %s', async (_case, status, body, message) => {
    fetchMock.mockResolvedValue(fakeResponse(status, body));

    const error = await request('/api/things').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, message });
  });

  it('keeps the problem body and the Retry-After wait', async () => {
    const problem = { title: 'The studio is busy right now.', activeGenerationId: 'abc' };
    fetchMock.mockResolvedValue(fakeResponse(429, problem, { 'Retry-After': '30' }));

    const error = await request('/api/things').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 429, body: problem, retryAfterSeconds: 30 });
  });

  it('reports an unreachable API', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(request('/api/things')).rejects.toMatchObject({
      status: 0,
      timedOut: false,
      message: "Couldn't reach ArtifyMe. Check your connection and try again.",
    });
  });

  it('gives up on an API that takes too long', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('Aborted')))),
    );

    const pending = request('/api/things');
    jest.advanceTimersByTime(30_000);

    await expect(pending).rejects.toMatchObject({
      status: 0,
      timedOut: true,
      message: 'ArtifyMe is taking too long to answer. Try again.',
    });
  });

  it('passes a cancel from the caller through unchanged', async () => {
    const cancelled = new Error('Aborted');
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(cancelled))),
    );
    const controller = new AbortController();

    const pending = request('/api/things', { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toBe(cancelled);
  });
});

describe('a 401 from the API', () => {
  const refreshed = (tokens: ReturnType<typeof fakeTokens>) => fakeResponse(200, tokens);
  const isRefresh = (url: string) => url.endsWith('/api/v1/auth/sessions/refresh');

  it('renews the tokens and sends the request again', async () => {
    const first = fakeTokens();
    const second = fakeTokens();
    await session.save(first);
    fetchMock
      .mockResolvedValueOnce(fakeResponse(401))
      .mockResolvedValueOnce(refreshed(second))
      .mockResolvedValueOnce(fakeResponse(200, { items: [] }));

    await expect(request('/api/v1/artworks')).resolves.toEqual({ items: [] });

    const [refreshUrl, refreshInit] = fetchMock.mock.calls[1];
    expect(isRefresh(refreshUrl)).toBe(true);
    expect(JSON.parse(refreshInit.body as string)).toMatchObject({ refreshToken: first.refreshToken });
    expect(fetchMock.mock.calls[2][1].headers).toMatchObject({ Authorization: `Bearer ${second.accessToken}` });
    expect(session.tokens()).toEqual({ access: second.accessToken, refresh: second.refreshToken });
  });

  it('renews once for requests that get a 401 at the same time', async () => {
    await session.save(fakeTokens());
    const second = fakeTokens();
    let refreshes = 0;
    fetchMock.mockImplementation(async (url, init) => {
      if (isRefresh(url)) {
        refreshes += 1;
        return refreshed(second);
      }
      const authorization = (init.headers as Record<string, string>).Authorization;
      return authorization === `Bearer ${second.accessToken}` ? fakeResponse(200, {}) : fakeResponse(401);
    });

    await Promise.all([request('/api/a'), request('/api/b'), request('/api/c')]);

    // Sending the same refresh token twice would end the session
    expect(refreshes).toBe(1);
  });

  it('ends the session when the refresh token is refused too', async () => {
    const tokens = fakeTokens();
    await session.save(tokens);
    fetchMock.mockResolvedValueOnce(fakeResponse(401)).mockResolvedValueOnce(fakeResponse(401));

    await expect(request('/api/v1/artworks')).rejects.toMatchObject({ status: 401, sessionEnded: true });

    expect(session.get()).toEqual({ status: 'signedOut', expired: true });
  });

  it('keeps the session when the renewal fails because the API is unreachable', async () => {
    const tokens = fakeTokens();
    await session.save(tokens);
    fetchMock.mockResolvedValueOnce(fakeResponse(401)).mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(request('/api/v1/artworks')).rejects.toMatchObject({ status: 0 });

    expect(session.tokens()).toEqual({ access: tokens.accessToken, refresh: tokens.refreshToken });
  });

  it('is a plain error for a request sent without tokens', async () => {
    const tokens = fakeTokens();
    await session.save(tokens);
    fetchMock.mockResolvedValue(fakeResponse(401, { title: 'Invalid email or password.' }));

    await expect(request('/api/v1/auth/sessions', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      message: 'Invalid email or password.',
      sessionEnded: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(session.get()).toEqual({ status: 'signedIn', sessionId: tokens.sessionId });
  });
});
