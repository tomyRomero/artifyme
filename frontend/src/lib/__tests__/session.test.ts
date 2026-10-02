import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';
import { session } from '@/lib/session';
import { fakeTokens } from '@/test-utils';

beforeEach(async () => {
  await session.signOut();
});

describe('restoring the session at launch', () => {
  it('picks up the tokens saved by an earlier launch', async () => {
    const tokens = fakeTokens();
    await session.save(tokens);

    await session.restore();

    expect(session.get()).toEqual({ status: 'signedIn', sessionId: tokens.sessionId });
    expect(session.tokens()).toEqual({ access: tokens.accessToken, refresh: tokens.refreshToken });
  });

  it('can start without an access token; the first request renews it', async () => {
    await SecureStore.setItemAsync('artifyme.sessionId', 'session-1');
    await SecureStore.setItemAsync('artifyme.refreshToken', 'refresh-saved');

    await session.restore();

    expect(session.tokens()).toEqual({ access: null, refresh: 'refresh-saved' });
  });

  it('starts signed out with nothing saved', async () => {
    await session.restore();

    expect(session.get()).toEqual({ status: 'signedOut', expired: false });
  });
});

describe('signing in and out', () => {
  it('keeps the tokens in secure storage, and deletes them on sign-out', async () => {
    const tokens = fakeTokens();

    await session.save(tokens);
    expect(await SecureStore.getItemAsync('artifyme.refreshToken')).toBe(tokens.refreshToken);

    await session.signOut();
    expect(session.tokens()).toBeNull();
    expect(session.get()).toEqual({ status: 'signedOut', expired: false });
    expect(await SecureStore.getItemAsync('artifyme.refreshToken')).toBeNull();
    expect(await SecureStore.getItemAsync('artifyme.accessToken')).toBeNull();
  });

  it('tells subscribers when the session starts or ends, not when its tokens are renewed', async () => {
    const listener = jest.fn();
    const unsubscribe = session.subscribe(listener);

    await session.save(fakeTokens());
    await session.save(fakeTokens());
    await session.signOut();
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('when the API refuses the refresh token', () => {
  it('signs out and remembers that the session expired', async () => {
    const tokens = fakeTokens();
    await session.save(tokens);

    await session.expire(tokens.refreshToken);

    expect(session.get()).toEqual({ status: 'signedOut', expired: true });
  });

  it('ignores a refusal of an older token once the user has signed in again', async () => {
    const old = fakeTokens('session-old');
    const current = fakeTokens('session-new');
    await session.save(current);

    await session.expire(old.refreshToken);

    expect(session.get()).toEqual({ status: 'signedIn', sessionId: 'session-new' });
  });
});
