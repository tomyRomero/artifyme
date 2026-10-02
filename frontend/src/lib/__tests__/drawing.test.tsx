import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import type { Stroke } from '@/api/types';
import { DrawingProvider, useDrawing } from '@/lib/drawing';
import { session } from '@/lib/session';
import { fakeTokens, store, storedValue } from '@/test-utils';

function stroke(color: string): Stroke {
  return { path: ['M1,1 ', '2,2 '], color, size: 4 };
}

const wrapper = ({ children }: { children: ReactNode }) => <DrawingProvider>{children}</DrawingProvider>;

function renderDrawings() {
  return renderHook(() => ({ fresh: useDrawing(), edit: useDrawing('a1') }), { wrapper });
}

describe('useDrawing', () => {
  it('draws, undoes and redoes', async () => {
    const { result } = await renderDrawings();

    await act(async () => {
      result.current.fresh.draw(stroke('#000000'));
      result.current.fresh.draw(stroke('#FF0000'));
    });
    expect(result.current.fresh.paths.map((s) => s.color)).toEqual(['#000000', '#FF0000']);
    expect(result.current.fresh.canRedo).toBe(false);

    await act(async () => result.current.fresh.undo());
    expect(result.current.fresh.paths.map((s) => s.color)).toEqual(['#000000']);
    expect(result.current.fresh.canRedo).toBe(true);

    await act(async () => result.current.fresh.redo());
    expect(result.current.fresh.paths.map((s) => s.color)).toEqual(['#000000', '#FF0000']);
    expect(result.current.fresh.canRedo).toBe(false);
  });

  it('undoes a clear, bringing every stroke back', async () => {
    const { result } = await renderDrawings();
    await act(async () => {
      result.current.fresh.draw(stroke('#000000'));
      result.current.fresh.draw(stroke('#FF0000'));
    });

    await act(async () => result.current.fresh.clear());
    expect(result.current.fresh.paths).toEqual([]);

    await act(async () => result.current.fresh.undo());
    expect(result.current.fresh.paths.map((s) => s.color)).toEqual(['#000000', '#FF0000']);

    await act(async () => result.current.fresh.redo());
    expect(result.current.fresh.paths).toEqual([]);
  });

  it('forgets what could be redone once something new is drawn', async () => {
    const { result } = await renderDrawings();
    await act(async () => {
      result.current.fresh.draw(stroke('#000000'));
      result.current.fresh.undo();
    });
    expect(result.current.fresh.canRedo).toBe(true);

    await act(async () => result.current.fresh.draw(stroke('#0000FF')));

    expect(result.current.fresh.canRedo).toBe(false);
    await act(async () => result.current.fresh.redo());
    expect(result.current.fresh.paths.map((s) => s.color)).toEqual(['#0000FF']);
  });

  it('undoes back to where the drawing started, and no further', async () => {
    const { result } = await renderDrawings();
    await act(async () => result.current.edit.start([stroke('#000000')]));
    expect(result.current.edit.canUndo).toBe(false);

    await act(async () => result.current.edit.draw(stroke('#FF0000')));
    expect(result.current.edit.canUndo).toBe(true);
    await act(async () => {
      result.current.edit.undo();
      result.current.edit.undo();
    });

    expect(result.current.edit.paths.map((s) => s.color)).toEqual(['#000000']);
    expect(result.current.edit.canUndo).toBe(false);
  });

  it('ignores a stroke without points', async () => {
    const { result } = await renderDrawings();

    await act(async () => result.current.fresh.draw({ path: [], color: '#000000', size: 4 }));

    expect(result.current.fresh.paths).toEqual([]);
  });

  it('counts an edit as changed only while its strokes differ from the artwork', async () => {
    const original = [stroke('#000000')];
    const { result } = await renderDrawings();
    await act(async () => result.current.edit.start(original));
    expect(result.current.edit.changed).toBe(false);

    await act(async () => result.current.edit.clear());
    expect(result.current.edit.changed).toBe(true);

    await act(async () => result.current.edit.start(original));
    await act(async () => result.current.edit.draw(stroke('#FF0000')));
    expect(result.current.edit.changed).toBe(true);

    await act(async () => result.current.edit.undo());
    expect(result.current.edit.changed).toBe(false);

    await act(async () => result.current.edit.start([]));
    await act(async () => {
      result.current.edit.undo();
      result.current.edit.redo();
      result.current.edit.clear();
    });
    expect(result.current.edit.changed).toBe(false);
    expect(result.current.edit.canUndo).toBe(false);
  });

  it("keeps the Create tab's drawing apart from an edit, and forgets the edit when it closes", async () => {
    const { result } = await renderDrawings();
    await act(async () => result.current.fresh.draw(stroke('#00FF00')));

    await act(async () => result.current.edit.start([stroke('#000000')]));
    await act(async () => result.current.edit.clear());
    await act(async () => result.current.edit.discard());

    expect(result.current.fresh.paths.map((s) => s.color)).toEqual(['#00FF00']);
    expect(result.current.edit.paths).toEqual([]);
    expect(result.current.edit.changed).toBe(false);
  });
});

describe('the draft of a new drawing', () => {
  const DRAFT = 'drawing-draft';

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function renderWithDraft() {
    const rendered = await renderDrawings();
    await act(async () => {});
    return rendered;
  }

  it('is kept on the phone a second after the drawing changes', async () => {
    const { result } = await renderWithDraft();

    await act(async () => result.current.fresh.draw(stroke('#000000')));
    expect(storedValue(DRAFT)).toBeUndefined();

    await act(async () => jest.advanceTimersByTime(1000));
    expect(storedValue(DRAFT)).toEqual([stroke('#000000')]);
  });

  it('comes back when the app opens again, without its undo steps', async () => {
    store(DRAFT, [stroke('#FF0000')]);

    const { result } = await renderWithDraft();

    expect(result.current.fresh.paths).toEqual([stroke('#FF0000')]);
    expect(result.current.fresh.changed).toBe(true);
    expect(result.current.fresh.canUndo).toBe(false);
  });

  it('is removed once the drawing is empty', async () => {
    store(DRAFT, [stroke('#FF0000')]);
    const { result } = await renderWithDraft();

    await act(async () => result.current.fresh.clear());
    await act(async () => jest.advanceTimersByTime(1000));

    expect(storedValue(DRAFT)).toBeUndefined();
  });

  it('is saved at once when the app leaves the screen', async () => {
    const addListener = jest.spyOn(AppState, 'addEventListener');
    const { result } = await renderWithDraft();
    const [, onChange] = addListener.mock.calls.at(-1)!;

    await act(async () => result.current.fresh.draw(stroke('#000000')));
    await act(async () => (onChange as (state: AppStateStatus) => void)('background'));

    expect(storedValue(DRAFT)).toEqual([stroke('#000000')]);
  });

  it("is ignored when it can't be read, or isn't a drawing", async () => {
    store(DRAFT, '[{"path": ["M1,1"');
    const broken = await renderWithDraft();
    expect(broken.result.current.fresh.paths).toEqual([]);

    store(DRAFT, [{ path: 'M1,1', color: '#000000', size: 4 }]);
    const misshapen = await renderWithDraft();
    expect(misshapen.result.current.fresh.paths).toEqual([]);

    store(DRAFT, [{ ...stroke('#000000'), brush: 'crayon' }]);
    const unknownBrush = await renderWithDraft();
    expect(unknownBrush.result.current.fresh.paths).toEqual([]);
  });

  it('keeps the brush of each stroke', async () => {
    store(DRAFT, [
      { ...stroke('#FF0000'), brush: 'pencil' },
      { ...stroke('#00FF00'), brush: null },
    ]);

    const { result } = await renderWithDraft();

    expect(result.current.fresh.paths.map((kept) => kept.brush)).toEqual(['pencil', null]);
  });

  it("isn't kept for an edit, whose artwork still has its drawing", async () => {
    const { result } = await renderWithDraft();

    await act(async () => {
      result.current.edit.start([stroke('#000000')]);
      result.current.edit.draw(stroke('#FF0000'));
    });
    await act(async () => jest.advanceTimersByTime(1000));

    expect(storedValue(DRAFT)).toBeUndefined();
  });
});

describe('signing out', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await session.save(fakeTokens());
  });

  afterEach(async () => {
    jest.useRealTimers();
    await session.signOut();
  });

  async function drawBoth() {
    const rendered = await renderDrawings();
    await act(async () => {
      rendered.result.current.fresh.draw(stroke('#000000'));
      rendered.result.current.edit.start([stroke('#FF0000')]);
      rendered.result.current.edit.draw(stroke('#00FF00'));
    });
    await act(async () => jest.advanceTimersByTime(1000));
    expect(storedValue('drawing-draft')).toEqual([stroke('#000000')]);
    return rendered;
  }

  it('clears every drawing and the saved draft, leaving nothing for whoever signs in next', async () => {
    const { result } = await drawBoth();

    await act(async () => session.signOut());

    expect(result.current.fresh.paths).toEqual([]);
    expect(result.current.fresh.canUndo).toBe(false);
    expect(result.current.edit.paths).toEqual([]);
    expect(storedValue('drawing-draft')).toBeUndefined();
  });

  it('keeps the drawing when the session ends by itself, for the same person signing back in', async () => {
    const { result } = await drawBoth();

    await act(async () => session.expire(session.tokens()!.refresh));

    expect(result.current.fresh.paths).toEqual([stroke('#000000')]);
    expect(storedValue('drawing-draft')).toEqual([stroke('#000000')]);
  });
});
