import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import CanvasScreen from '@/app/studio';
import type { Stroke } from '@/api/types';
import type { Studio } from '@/lib/studio';
import { session } from '@/lib/session';
import { fakeTokens, store } from '@/test-utils';
import { goBack } from '@/test-utils/router';
import { couch, fakeStudioApi, generation, renderInStudio } from '@/test-utils/studio';

// Screen tests live outside src/app/, where every file is a route

jest.mock('expo-router', () => require('@/test-utils/router').expoRouter);

let api: ReturnType<typeof fakeStudioApi>;
let studio: () => Studio;

beforeAll(() => {
  process.env.EXPO_PUBLIC_DOTNET_API_URL = 'https://api.test';
});

beforeEach(async () => {
  jest.clearAllMocks();
  api = fakeStudioApi();
  global.fetch = api.fetch as unknown as typeof fetch;
  await session.signOut();
});

const drawn = (): Stroke[] => studio().drawing.paths;

// Half the artboard's size, so one point is two units
async function renderCanvas(artworkId?: string) {
  studio = await renderInStudio(<CanvasScreen />, artworkId);
  if (artworkId) {
    await waitFor(() => expect(studio().status).toBe('ready'));
  }
  await fireEvent(screen.getByTestId('artboard-space'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 256, height: 384 } },
  });
}

async function drag(...points: [number, number][]) {
  const [[x, y], ...moves] = points;
  await act(async () =>
    fireGestureHandler(getByGestureTestId('draw'), [
      { state: State.BEGAN, x, y },
      { state: State.ACTIVE, x, y },
      ...moves.map(([moveX, moveY]) => ({ x: moveX, y: moveY })),
      { state: State.END },
    ]),
  );
}

// The gesture's own callbacks, for moments the test helper can't stop at
function drawCallbacks() {
  const { handlers } = getByGestureTestId('draw') as unknown as {
    handlers: Record<'onBegin' | 'onUpdate' | 'onFinalize' | 'onTouchesDown', (event: object) => void>;
  };
  return handlers;
}

describe('the canvas', () => {
  it('draws a smoothed stroke in artboard units, added to the drawing when the finger lifts', async () => {
    await renderCanvas();

    await drag([5, 5], [5.2, 5], [55, 5]);

    expect(drawn()).toEqual([{ path: ['M10,10', 'Q80,10 95,10', 'L110,10'], color: '#171A21', size: 6 }]);
  });

  it('draws a dot for a tap', async () => {
    await renderCanvas();

    await drag([20, 30]);

    expect(drawn().map((stroke) => stroke.path)).toEqual([['M40,60', 'L40.1,60']]);
  });

  it('shows the stroke while it is drawn, over the earlier ones', async () => {
    await renderCanvas();
    await drag([5, 5], [50, 50]);
    const finger = drawCallbacks();

    await act(async () => {
      finger.onTouchesDown({ numberOfTouches: 1 });
      finger.onBegin({ x: 100, y: 100 });
      finger.onUpdate({ x: 120, y: 100 });
    });

    expect(screen.getAllByTestId('stroke')).toHaveLength(2);
    expect(drawn()).toHaveLength(1);
  });

  it('keeps every point when touches arrive faster than the screen redraws', async () => {
    await renderCanvas();
    const finger = drawCallbacks();

    await act(async () => {
      finger.onBegin({ x: 0, y: 0 });
      finger.onUpdate({ x: 50, y: 0 });
      finger.onUpdate({ x: 100, y: 0 });
      finger.onFinalize({});
    });

    expect(drawn()[0].path).toEqual(['M0,0', 'Q70,0 115.5,0', 'Q161,0 180.5,0', 'L200,0']);
  });

  it('keeps the stroke so far when the system takes the touch away', async () => {
    await renderCanvas();

    await act(async () =>
      fireGestureHandler(getByGestureTestId('draw'), [
        { state: State.BEGAN, x: 5, y: 5 },
        { state: State.ACTIVE, x: 5, y: 5 },
        { x: 55, y: 5 },
        { state: State.CANCELLED },
      ]),
    );
    await drag([5, 100]);

    expect(drawn()).toHaveLength(2);
  });

  it('drops the stroke a finger began when a second finger joins it', async () => {
    await renderCanvas();
    const finger = drawCallbacks();

    await act(async () => {
      finger.onTouchesDown({ numberOfTouches: 1 });
      finger.onBegin({ x: 10, y: 10 });
      finger.onTouchesDown({ numberOfTouches: 2 });
      finger.onUpdate({ x: 60, y: 10 });
    });
    expect(screen.queryAllByTestId('stroke')).toHaveLength(0);

    await act(async () => finger.onFinalize({}));
    expect(drawn()).toEqual([]);

    await drag([5, 5], [50, 5]);
    expect(drawn()).toHaveLength(1);
  });

  it('undoes the last stroke with a two-finger tap', async () => {
    await renderCanvas();
    await drag([5, 5], [50, 5]);
    await drag([5, 50], [50, 50]);

    await act(async () =>
      fireGestureHandler(getByGestureTestId('two-finger-tap'), [
        { state: State.BEGAN },
        { state: State.ACTIVE },
        { state: State.END },
      ]),
    );

    expect(drawn()).toHaveLength(1);
  });

  it('tells screen readers what the canvas is and how much is on it', async () => {
    await renderCanvas();
    expect(screen.getByLabelText('Drawing canvas').props.accessibilityValue).toEqual({ text: 'Empty' });

    await drag([5, 5], [50, 5]);

    expect(screen.getByLabelText('Drawing canvas').props.accessibilityValue).toEqual({ text: '1 stroke' });
  });
});

describe('the canvas tools', () => {
  it("erases by drawing in the artboard's white", async () => {
    await renderCanvas();

    await fireEvent.press(screen.getByRole('button', { name: 'Eraser' }));
    await drag([5, 5], [50, 5]);

    expect(drawn()[0].color).toBe('#FFFFFF');
    expect(screen.getByRole('button', { name: 'Eraser' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Pen' })).not.toBeSelected();
  });

  it('keeps the brush each stroke was drawn with, leaving the pen unwritten', async () => {
    await renderCanvas();

    await drag([5, 5], [50, 5]);
    await fireEvent.press(screen.getByRole('button', { name: 'Pencil' }));
    await drag([5, 50], [50, 50]);
    await fireEvent.press(screen.getByRole('button', { name: 'Marker' }));
    await drag([5, 90], [50, 90]);

    expect(drawn().map((stroke) => stroke.brush)).toEqual([undefined, 'pencil', 'marker']);
    expect(screen.getByRole('button', { name: 'Marker' })).toBeSelected();
  });

  it('draws a shape from corner to corner, showing it while it is dragged', async () => {
    await renderCanvas();
    await fireEvent.press(screen.getByRole('button', { name: 'Rectangle' }));
    const { onBegin, onUpdate, onFinalize } = drawCallbacks();

    await act(async () => onBegin({ x: 10, y: 10 }));
    await act(async () => onUpdate({ x: 30, y: 20 }));
    await act(async () => onUpdate({ x: 60, y: 40 }));
    expect(screen.getAllByTestId('stroke')).toHaveLength(1);
    expect(drawn()).toEqual([]);
    await act(async () => onFinalize({}));

    expect(drawn()).toEqual([{ path: ['M20,20', 'L120,20', 'L120,80', 'L20,80', 'Z'], color: '#171A21', size: 6 }]);
    expect(screen.getByLabelText('Drawing canvas')).toHaveProp(
      'accessibilityHint',
      'Drag to draw a rectangle. Tap with two fingers to undo.',
    );
    expect(screen.getByLabelText('Line width')).toBeTruthy();
  });

  it("doesn't draw a shape from a tap", async () => {
    await renderCanvas();
    await fireEvent.press(screen.getByRole('button', { name: 'Ellipse' }));

    await drag([20, 20], [21, 21]);

    expect(drawn()).toEqual([]);
  });

  it('shows a guide grid on the canvas, but not in the sketch or its strokes', async () => {
    await renderCanvas();
    expect(screen.queryByTestId('guide-grid')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Guide grid' }));

    // Only the canvas has it, not the sketch sent to the model
    expect(screen.getAllByTestId('guide-grid', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Guide grid' })).toBeSelected();
    expect(studio().drawing.paths).toEqual([]);
  });

  it('keeps the guide grid over a stroke while it is drawn, so erasing never hides it', async () => {
    await renderCanvas();
    await fireEvent.press(screen.getByRole('button', { name: 'Guide grid' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Eraser' }));

    await act(async () => drawCallbacks().onBegin({ x: 10, y: 10 }));

    const layers = screen
      .getByTestId('artboard')
      .children.map((layer) => (typeof layer === 'string' ? layer : layer.props.testID));
    expect(layers.indexOf('guide-grid')).toBeGreaterThan(layers.indexOf('live-stroke'));
    expect(layers.indexOf('live-stroke')).toBeGreaterThan(-1);
  });

  it('draws with the size set on the slider', async () => {
    await renderCanvas();

    await fireEvent(screen.getByLabelText('Brush size'), 'valueChange', 20);
    await drag([5, 5], [50, 5]);

    expect(drawn()[0].size).toBe(20);
  });

  it('shows the brush at the size it draws on this board', async () => {
    await renderCanvas();

    await fireEvent(screen.getByLabelText('Brush size'), 'valueChange', 20);

    // The board is half size, so 20 units is 10 points
    expect(screen.getByTestId('brush-preview', { includeHiddenElements: true })).toHaveStyle({ width: 10, height: 10 });
  });

  it('undoes and redoes with the buttons, which are off when there is nothing to undo or redo', async () => {
    await renderCanvas();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    await drag([5, 5], [50, 5]);

    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(drawn()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Redo' }));
    expect(drawn()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('clears without asking, and offers to undo it', async () => {
    await renderCanvas();
    expect(screen.getByRole('button', { name: 'Clear canvas' })).toBeDisabled();
    await drag([5, 5], [50, 5]);
    await drag([5, 50], [50, 50]);

    await fireEvent.press(screen.getByRole('button', { name: 'Clear canvas' }));
    expect(drawn()).toEqual([]);
    const note = screen.getByTestId('toast');
    expect(within(note).getByText('Canvas cleared')).toBeTruthy();

    await fireEvent.press(within(note).getByRole('button', { name: 'Undo' }));
    expect(drawn()).toHaveLength(2);
    expect(screen.queryByText('Canvas cleared')).toBeNull();
  });

  it('is felt when the tool changes, not when the one in use is tapped', async () => {
    await renderCanvas();

    await fireEvent.press(screen.getByRole('button', { name: 'Pen' }));
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Eraser' }));
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('drops the note about clearing once something new is drawn', async () => {
    await renderCanvas();
    await drag([5, 5], [50, 5]);
    await fireEvent.press(screen.getByRole('button', { name: 'Clear canvas' }));

    await drag([5, 50], [50, 50]);

    expect(screen.queryByText('Canvas cleared')).toBeNull();
  });

  it('moves on to describing the sketch, once there is one', async () => {
    await renderCanvas();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    await drag([5, 5], [50, 5]);
    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));

    expect(router.push).toHaveBeenCalledWith('/studio/describe');
  });
});

describe('the tip about undoing', () => {
  const loadPreferences = () => act(async () => {});

  it('shows until it is dismissed', async () => {
    await renderCanvas();
    await loadPreferences();
    expect(screen.getByLabelText('Tip: tap with two fingers to undo.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));

    expect(screen.queryByLabelText('Tip: tap with two fingers to undo.')).toBeNull();
  });

  it('goes once two fingers have undone something', async () => {
    await renderCanvas();
    await loadPreferences();
    await drag([5, 5], [50, 5]);

    await act(async () =>
      fireGestureHandler(getByGestureTestId('two-finger-tap'), [
        { state: State.BEGAN },
        { state: State.ACTIVE },
        { state: State.END },
      ]),
    );

    expect(screen.queryByLabelText('Tip: tap with two fingers to undo.')).toBeNull();
  });

  it('stays gone on later launches', async () => {
    store('preferences', { undoTipSeen: true });

    await renderCanvas();
    await loadPreferences();

    expect(screen.queryByLabelText('Tip: tap with two fingers to undo.')).toBeNull();
  });
});

describe('leaving the canvas', () => {
  it('closes a new sketch without asking, keeping it as a draft', async () => {
    await renderCanvas();
    await drag([5, 5], [50, 5]);

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(goBack).toHaveBeenCalled();
    expect(drawn()).toHaveLength(1);
  });

  it('asks before discarding changes to an artwork', async () => {
    await session.save(fakeTokens());
    api.artwork = couch;
    const confirm = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderCanvas('a1');
    await drag([5, 5], [50, 5]);

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(goBack).not.toHaveBeenCalled();
    const [title, , buttons] = confirm.mock.calls[0];
    expect(title).toBe('Discard your changes?');

    await act(async () => buttons!.find((button) => button.text === 'Discard')!.onPress!());
    expect(goBack).toHaveBeenCalled();
  });

  it("closes an artwork that wasn't changed without asking", async () => {
    await session.save(fakeTokens());
    api.artwork = couch;
    await renderCanvas('a1');
    expect(drawn()).toEqual(couch.paths);

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(goBack).toHaveBeenCalled();
  });

  it('opens on the progress of a sketch still painting from before', async () => {
    await session.save(fakeTokens());
    api.active = generation({ status: 'running', step: 5 });

    await renderCanvas();

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/studio/generation'));
  });
});
