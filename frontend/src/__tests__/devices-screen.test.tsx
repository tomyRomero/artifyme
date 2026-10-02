import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Alert } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import DevicesScreen from '@/app/devices';
import type { DeviceSession } from '@/api/types';
import { PreferencesProvider } from '@/lib/preferences';
import { session } from '@/lib/session';
import { fakeResponse, fakeTokens, testQueryClient } from '@/test-utils';

jest.mock('expo-router', () => require('@/test-utils/router').expoRouter);

const fetchMock = jest.fn<(url: string, init: RequestInit) => Promise<Response>>();
const alertMock = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

function device(id: string, changes: Partial<DeviceSession> = {}): DeviceSession {
  return {
    id,
    platform: 'ios',
    deviceModel: null,
    appVersion: '1.0.0',
    createdAt: '2026-09-01T12:00:00Z',
    lastSeenAt: new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString(),
    current: false,
    ...changes,
  };
}

let devices: DeviceSession[] = [];

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(async () => {
  jest.clearAllMocks();
  devices = [device('other', { platform: 'android' }), device('this', { current: true })];
  await session.save(fakeTokens());
  fetchMock.mockImplementation(async (url, init) => {
    const { pathname } = new URL(url);
    if (pathname === '/api/v1/auth/sessions' && init.method === 'GET') {
      return fakeResponse(200, devices);
    }
    if (pathname.startsWith('/api/v1/auth/sessions/') && init.method === 'DELETE') {
      devices = devices.filter((item) => item.id !== pathname.split('/').pop());
      return fakeResponse(204);
    }
    throw new Error(`Unexpected ${init.method ?? 'GET'} ${pathname}`);
  });
});

async function renderDevices() {
  await render(
    <QueryClientProvider client={testQueryClient()}>
      <PreferencesProvider>
        <DevicesScreen />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

describe('the devices', () => {
  it('lists this device first, then the others with when they were last used', async () => {
    await renderDevices();

    const names = await screen.findAllByText(/iPhone|Android phone/);
    expect(names.map((name) => name.props.children)).toEqual(['iPhone', 'Android phone']);
    expect(screen.getByText('This device · Version 1.0.0')).toBeTruthy();
    expect(screen.getByText('Last used 3 days ago · Version 1.0.0')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Sign out/ })).toHaveLength(1);
  });

  it('signs another device out, after asking', async () => {
    await renderDevices();

    await fireEvent.press(await screen.findByRole('button', { name: 'Sign out Android phone' }));
    const buttons = alertMock.mock.calls.at(-1)![2]!;
    await act(async () => buttons.find((button) => button.text === 'Sign out')!.onPress!());

    await waitFor(() => expect(screen.queryByText('Android phone')).toBeNull());
    expect(devices.map((item) => item.id)).toEqual(['this']);
  });
});
