import { useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { BrushType, Stroke } from '@/api/types';
import {
  ARTBOARD,
  endStroke,
  fitArtboard,
  shapePath,
  smoothPoint,
  toPath,
  type Point,
  type Shape,
  type Size,
} from '@/lib/sketch';
import { useTheme } from '@/theme/use-theme';
import { GuideGrid, Sketch, StrokeLayer } from './Sketch';

interface Pen {
  color: string;
  size: number;
  brush: BrushType;
  // Set while a shape tool is chosen: the drag draws it from corner to corner
  shape: Shape | null;
}

interface ArtboardProps {
  strokes: Stroke[];
  pen: Pen;
  grid?: boolean;
  onStroke: (stroke: Stroke) => void;
  onUndo: () => void;
  onResize?: (board: Size) => void;
}

interface Recording extends Pen {
  points: Point[];
  finger: Point;
}

const DRAG_TO_DRAW: Record<Shape, string> = {
  line: 'Drag to draw a line',
  rectangle: 'Drag to draw a rectangle',
  ellipse: 'Drag to draw an ellipse',
};

function recorded(current: Recording, finger: Point): Stroke {
  const path = current.shape ? shapePath(current.shape, current.points[0], finger) : toPath(current.points);
  // A pen is the default, so it isn't written down
  return { path, color: current.color, size: current.size, ...(current.brush !== 'pen' && { brush: current.brush }) };
}

export function Artboard({ strokes, pen, grid = false, onStroke, onUndo, onResize }: ArtboardProps) {
  const { colors } = useTheme();
  const [space, setSpace] = useState<Size>({ width: 0, height: 0 });
  const board = fitArtboard(space);

  const layout = (next: Size) => {
    setSpace(next);
    onResize?.(fitArtboard(next));
  };

  // A ref, so no points are lost when touches arrive faster than renders
  const recording = useRef<Recording | null>(null);
  const [live, setLive] = useState<Stroke | null>(null);
  const secondFinger = useRef(false);

  // The gesture is created once and reads the latest props from here
  const latest = useRef({ pen, onStroke, onUndo, scale: 0 });
  useLayoutEffect(() => {
    latest.current = { pen, onStroke, onUndo, scale: board.width > 0 ? ARTBOARD.width / board.width : 0 };
  });

  /* eslint-disable react-hooks/refs -- the handlers read the refs on touches, never during render */
  const [gesture] = useState(() => {
    const toArtboard = ({ x, y }: Point): Point => ({ x: x * latest.current.scale, y: y * latest.current.scale });
    const show = (current: Recording | null) => setLive(current && recorded(current, current.finger));

    const draw = Gesture.Pan()
      .minDistance(0)
      .runOnJS(true)
      // A second finger cancels the stroke and becomes a two-finger tap
      .onTouchesDown((event) => {
        secondFinger.current = event.numberOfTouches > 1;
        if (secondFinger.current) {
          recording.current = null;
          show(null);
        }
      })
      .onBegin((event) => {
        if (secondFinger.current || latest.current.scale === 0) {
          return;
        }
        const finger = toArtboard(event);
        recording.current = { ...latest.current.pen, points: [finger], finger };
        show(recording.current);
      })
      .onUpdate((event) => {
        const current = recording.current;
        if (!current) {
          return;
        }
        current.finger = toArtboard(event);
        if (current.shape) {
          show(current);
          return;
        }
        const next = smoothPoint(current.points.at(-1), current.finger);
        if (next) {
          current.points.push(next);
          show(current);
        }
      })
      // Also runs when the system cancels the touch, so the stroke is kept
      .onFinalize(() => {
        const current = recording.current;
        recording.current = null;
        secondFinger.current = false;
        show(null);
        if (current) {
          const points = current.shape ? current.points : endStroke(current.points, current.finger);
          latest.current.onStroke(recorded({ ...current, points }, current.finger));
        }
      })
      .withTestId('draw');

    const undo = Gesture.Tap()
      .minPointers(2)
      .runOnJS(true)
      .onEnd((_event, success) => {
        if (success) {
          latest.current.onUndo();
        }
      })
      .withTestId('two-finger-tap');

    return Gesture.Simultaneous(draw, undo);
  });
  /* eslint-enable react-hooks/refs */

  return (
    <View testID="artboard-space" style={styles.space} onLayout={(event) => layout(event.nativeEvent.layout)}>
      {board.width > 0 && (
        <GestureDetector gesture={gesture}>
          <View
            testID="artboard"
            style={board}
            accessible
            accessibilityLabel="Drawing canvas"
            accessibilityHint={`${pen.shape ? DRAG_TO_DRAW[pen.shape] : 'Draw with one finger'}. Tap with two fingers to undo.`}
            accessibilityValue={{ text: describe(strokes.length) }}
          >
            <Sketch strokes={strokes} width={board.width} height={board.height} />
            {live && <StrokeLayer stroke={live} width={board.width} height={board.height} />}
            {/* Over the stroke being drawn too, so erasing never hides it */}
            {grid && <GuideGrid width={board.width} height={board.height} color={colors.guide} />}
            {/* Thin ring so the white board doesn't glare in dark mode */}
            <View pointerEvents="none" style={[styles.ring, { borderColor: colors.border }]} />
          </View>
        </GestureDetector>
      )}
    </View>
  );
}

function describe(strokeCount: number): string {
  if (strokeCount === 0) {
    return 'Empty';
  }
  return strokeCount === 1 ? '1 stroke' : `${strokeCount} strokes`;
}

const styles = StyleSheet.create({
  space: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
  },
});
