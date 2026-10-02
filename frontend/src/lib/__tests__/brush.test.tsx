import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { BrushProvider, useBrush } from '@/lib/brush';
import { BRUSH_SIZE } from '@/lib/sketch';
import { store, storedValue } from '@/test-utils';

const wrapper = ({ children }: { children: ReactNode }) => <BrushProvider>{children}</BrushProvider>;

describe('useBrush', () => {
  it('remembers the six colors picked last, the latest first and each once', async () => {
    const { result } = await renderHook(() => useBrush(), { wrapper });

    for (const color of ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006', '#000007', '#000003']) {
      await act(async () => result.current.pickColor(color));
    }

    expect(result.current.color).toBe('#000003');
    expect(result.current.recent).toEqual(['#000003', '#000007', '#000006', '#000005', '#000004', '#000002']);
  });

  it('goes back to the pen when a color is picked while erasing', async () => {
    const { result } = await renderHook(() => useBrush(), { wrapper });
    await act(async () => result.current.setTool('eraser'));

    await act(async () => result.current.pickColor('#FF0000'));

    expect(result.current.tool).toBe('pen');
  });

  it('keeps a pencil or a shape when a color is picked', async () => {
    const { result } = await renderHook(() => useBrush(), { wrapper });
    await act(async () => result.current.setTool('ellipse'));

    await act(async () => result.current.pickColor('#FF0000'));

    expect(result.current.tool).toBe('ellipse');
  });

  it('keeps the size whole and within the slider', async () => {
    const { result } = await renderHook(() => useBrush(), { wrapper });

    await act(async () => result.current.setSize(12.4));
    expect(result.current.size).toBe(12);

    await act(async () => result.current.setSize(500));
    expect(result.current.size).toBe(BRUSH_SIZE.max);
  });
});

describe('the brush between launches', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function launch() {
    const rendered = await renderHook(() => useBrush(), { wrapper });
    await act(async () => {});
    return rendered;
  }

  it('keeps the color, size and recent colors, but opens on the pen', async () => {
    const first = await launch();
    await act(async () => {
      first.result.current.pickColor('#FA3741');
      first.result.current.setSize(20);
      first.result.current.setTool('eraser');
    });
    await act(async () => jest.advanceTimersByTime(1000));
    expect(storedValue('brush')).toEqual({ color: '#FA3741', size: 20, recent: ['#FA3741'] });
    await first.unmount();

    const second = await launch();

    expect(second.result.current).toMatchObject({ tool: 'pen', color: '#FA3741', size: 20, recent: ['#FA3741'] });
  });

  it('ignores a stored brush of the wrong shape', async () => {
    store('brush', { color: 42, size: 'big', recent: [] });

    const { result } = await launch();

    expect(result.current.color).toBe('#171A21');
  });
});
