import { appVersion } from '@/lib/device';
import { session, type Tokens } from '@/lib/session';
import type { SessionTokens } from './types';

const TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  readonly body?: unknown;
  readonly retryAfterSeconds?: number;
  readonly sessionEnded: boolean;
  readonly timedOut: boolean;

  get code(): string | undefined {
    const code = (this.body as { code?: unknown } | null | undefined)?.code;
    return typeof code === 'string' ? code : undefined;
  }

  constructor(
    message: string,
    readonly status: number,
    details: { body?: unknown; retryAfterSeconds?: number; sessionEnded?: boolean; timedOut?: boolean } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.body = details.body;
    this.retryAfterSeconds = details.retryAfterSeconds;
    this.sessionEnded = details.sessionEnded ?? false;
    this.timedOut = details.timedOut ?? false;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: Method;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  auth?: boolean;
  // false keeps a refused access token from being renewed
  renew?: boolean;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const sent = options.auth === false ? null : session.tokens();
  const response = await send(path, options, sent?.access ?? null);
  if (response.status !== 401 || sent === null || options.renew === false) {
    return read<T>(response);
  }

  // Access token expired or refused: renew and retry once
  const renewed = await renewTokens(sent.refresh);
  if (renewed) {
    const retried = await send(path, options, renewed.access);
    if (retried.status !== 401) {
      return read<T>(retried);
    }
    // Still refused with new tokens, so the session was ended elsewhere
    await session.expire(renewed.refresh);
  }
  return read<T>(response, true);
}

let renewal: Promise<Tokens | null> | null = null;

// Concurrent 401s share one refresh: refresh tokens are single-use, and sending one twice
// ends the session.
async function renewTokens(staleRefreshToken: string): Promise<Tokens | null> {
  const current = session.tokens();
  if (current === null || current.refresh !== staleRefreshToken) {
    return current;
  }

  renewal ??= (async () => {
    try {
      const response = await send(
        '/api/v1/auth/sessions/refresh',
        { method: 'POST', body: { refreshToken: staleRefreshToken, appVersion: appVersion() } },
        null,
      );
      await session.save(await read<SessionTokens>(response));
      return session.tokens();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await session.expire(staleRefreshToken);
        return null;
      }
      // Offline: keep the session and fail this request
      throw error;
    }
  })().finally(() => {
    renewal = null;
  });
  return renewal;
}

async function send(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
  const { method = 'GET', query, body, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) {
    cancel();
  }
  signal?.addEventListener('abort', cancel);
  const timer = setTimeout(cancel, TIMEOUT_MS);

  try {
    return await fetch(urlFor(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      // Cancelled by the caller, not a failure
      throw error;
    }
    throw controller.signal.aborted
      ? new ApiError('ArtifyMe is taking too long to answer. Try again.', 0, { timedOut: true })
      : new ApiError("Couldn't reach ArtifyMe. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

async function read<T>(response: Response, sessionEnded = false): Promise<T> {
  const data = await readBody(response);
  if (response.ok) {
    return data as T;
  }
  throw new ApiError(messageFor(response.status, data), response.status, {
    body: data,
    retryAfterSeconds: retryAfter(response),
    sessionEnded,
  });
}

function urlFor(path: string, query: RequestOptions['query']): string {
  const baseUrl = process.env.EXPO_PUBLIC_DOTNET_API_URL;
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_DOTNET_API_URL is not set. Copy frontend/.env-example to frontend/.env.');
  }

  const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
  const params = Object.entries(query ?? {})
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return params.length === 0 ? url : `${url}?${params.join('&')}`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => '');
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Problem details; a field-level validation error is the most specific message
function messageFor(status: number, body: unknown): string {
  if (body && typeof body === 'object') {
    const { errors, detail, title } = body as Record<string, unknown>;
    const firstError =
      errors && typeof errors === 'object'
        ? Object.values(errors as Record<string, unknown>)
            .flat()
            .find((value) => typeof value === 'string')
        : undefined;
    const text = [firstError, detail, title].find(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
    if (text) {
      return text;
    }
  }

  switch (status) {
    case 401:
      return 'Your session has ended. Sign in again.';
    case 403:
      return "You don't have access to that.";
    case 404:
      return "That couldn't be found.";
    case 429:
      return 'Too many attempts. Wait a minute and try again.';
    default:
      return status >= 500
        ? 'Something went wrong on our side. Try again shortly.'
        : 'Something went wrong. Try again.';
  }
}

function retryAfter(response: Response): number | undefined {
  const seconds = Number(response.headers.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}
