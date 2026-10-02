import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { useReduceMotion } from '@/hooks/use-accessibility';
import { toPath, type Point } from '@/lib/sketch';
import { durations } from '@/theme/motion';

const COUCH: [number, number][][] = [
  [
    [50, 74],
    [49, 44],
    [53, 35],
    [62, 30],
    [178, 30],
    [187, 35],
    [191, 44],
    [190, 74],
  ],
  [
    [120, 31],
    [120, 78],
  ],
  [
    [66, 124],
    [67, 88],
    [63, 79],
    [51, 74],
    [39, 76],
    [31, 84],
    [29, 97],
    [31, 124],
  ],
  [
    [174, 124],
    [173, 88],
    [177, 79],
    [189, 74],
    [201, 76],
    [209, 84],
    [211, 97],
    [209, 124],
  ],
  [
    [67, 80],
    [173, 80],
  ],
  [
    [67, 98],
    [173, 98],
  ],
  [
    [120, 80],
    [120, 98],
  ],
  [
    [27, 124],
    [213, 124],
    [216, 127],
    [216, 135],
    [213, 138],
    [27, 138],
    [24, 135],
    [24, 127],
    [27, 124],
  ],
  [
    [40, 138],
    [40, 151],
  ],
  [
    [200, 138],
    [200, 151],
  ],
];

const VIEW_BOX = '0 0 240 160';
const INK = '#8B4513';
const WIDTH = 3;
const SPEED = 500;
const HOLD_MS = 1800;

const STROKES = (() => {
  let start = 0;
  return COUCH.map((coordinates) => {
    const points: Point[] = coordinates.map(([x, y]) => ({ x, y }));
    const length = points
      .slice(1)
      .reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
    const stroke = { d: toPath(points).join(''), start, length };
    start += length;
    return stroke;
  });
})();
const TOTAL = STROKES.reduce((sum, stroke) => sum + stroke.length, 0);

const DRAW_MS = (TOTAL / SPEED) * 1000;
const FADE_MS = durations.base;
const LOOP_MS = DRAW_MS + HOLD_MS + FADE_MS;

interface DrawingCouchProps {
  active: boolean;
}

export function DrawingCouch({ active }: DrawingCouchProps) {
  const reduceMotion = useReduceMotion();
  const drawing = active && !reduceMotion;
  const elapsed = useLoopTime(drawing);
  const drawn = (elapsed / 1000) * SPEED;
  const opacity = 1 - Math.max(0, elapsed - DRAW_MS - HOLD_MS) / FADE_MS;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="A couch, drawn line by line" style={styles.fill}>
      <Svg width="100%" height="100%" viewBox={VIEW_BOX}>
        {STROKES.map((stroke, index) =>
          drawing ? (
            // Drawn on by moving a gap along the dash pattern
            <Path
              key={index}
              testID="couch-stroke"
              d={stroke.d}
              {...ink}
              opacity={opacity}
              strokeDasharray={[stroke.length, stroke.length + WIDTH]}
              strokeDashoffset={(stroke.length + WIDTH) * (1 - clamp((drawn - stroke.start) / stroke.length))}
            />
          ) : (
            <Path key={index} testID="couch-stroke" d={stroke.d} {...ink} />
          ),
        )}
      </Svg>
    </View>
  );
}

// Time into the current loop, updated every frame. SVG props don't follow JS-driven
// Animated values on the new architecture, so the couch is redrawn from state.
function useLoopTime(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) {
      return;
    }
    const start = Date.now();
    setElapsed(0);
    let frame = requestAnimationFrame(function tick() {
      setElapsed((Date.now() - start) % LOOP_MS);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return elapsed;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

const ink = { fill: 'none', stroke: INK, strokeWidth: WIDTH, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
});
