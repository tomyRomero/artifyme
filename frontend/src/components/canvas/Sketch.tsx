import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Circle, Defs, Line, Path, Pattern, Rect, Svg } from 'react-native-svg';
import type { Stroke } from '@/api/types';
import { ARTBOARD, strokePath } from '@/lib/sketch';
import { useTheme } from '@/theme/use-theme';

interface SketchProps {
  strokes: Stroke[];
  width: number;
  height: number;
}

const viewBox = `0 0 ${ARTBOARD.width} ${ARTBOARD.height}`;

// Used by the canvas, the previews and the exported image, so a sketch looks the same everywhere
export const Sketch = memo(function Sketch({ strokes, width, height }: SketchProps) {
  const { colors } = useTheme();

  return (
    <Svg width={width} height={height} viewBox={viewBox}>
      <Grains strokes={strokes} />
      <Rect width={ARTBOARD.width} height={ARTBOARD.height} fill={colors.artboard} />
      {strokes.map((stroke, index) => (
        <StrokePath key={index} stroke={stroke} />
      ))}
    </Svg>
  );
});

export function StrokeLayer({ stroke, width, height }: { stroke: Stroke; width: number; height: number }) {
  return (
    <Svg testID="live-stroke" width={width} height={height} viewBox={viewBox} style={styles.layer} pointerEvents="none">
      <Grains strokes={[stroke]} />
      <StrokePath stroke={stroke} />
    </Svg>
  );
}

const GUIDE_SPACING = 64;

// Drawn over the strokes on the canvas only, so it never reaches the model
export function GuideGrid({ width, height, color }: { width: number; height: number; color: string }) {
  const columns = Array.from({ length: ARTBOARD.width / GUIDE_SPACING - 1 }, (_, index) => (index + 1) * GUIDE_SPACING);
  const rows = Array.from({ length: ARTBOARD.height / GUIDE_SPACING - 1 }, (_, index) => (index + 1) * GUIDE_SPACING);

  return (
    <Svg testID="guide-grid" width={width} height={height} viewBox={viewBox} style={styles.layer} pointerEvents="none">
      {columns.map((x) => (
        <Line key={`x${x}`} x1={x} y1={0} x2={x} y2={ARTBOARD.height} stroke={color} strokeWidth={1.5} />
      ))}
      {rows.map((y) => (
        <Line key={`y${y}`} x1={0} y1={y} x2={ARTBOARD.width} y2={y} stroke={color} strokeWidth={1.5} />
      ))}
    </Svg>
  );
}

function StrokePath({ stroke }: { stroke: Stroke }) {
  const d = strokePath(stroke);

  if (stroke.brush === 'pencil') {
    return (
      <Path testID="stroke" d={d} stroke={`url(#${grainId(stroke.color)})`} strokeWidth={stroke.size} {...ROUND} />
    );
  }
  if (stroke.brush === 'marker') {
    // Translucent, so crossing strokes build up like ink
    return (
      <Path
        testID="stroke"
        d={d}
        stroke={stroke.color}
        strokeOpacity={0.6}
        strokeWidth={stroke.size}
        fill="none"
        strokeLinecap="square"
        strokeLinejoin="round"
      />
    );
  }
  return <Path testID="stroke" d={d} stroke={stroke.color} strokeWidth={stroke.size} {...ROUND} />;
}

const ROUND = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

// A pencil's color is broken up by the paper's grain
function Grains({ strokes }: { strokes: Stroke[] }) {
  const pencilColors = [
    ...new Set(strokes.filter((stroke) => stroke.brush === 'pencil').map((stroke) => stroke.color)),
  ];
  if (pencilColors.length === 0) {
    return null;
  }

  return (
    <Defs>
      {pencilColors.map((color) => (
        <Pattern key={color} id={grainId(color)} patternUnits="userSpaceOnUse" width={6} height={6}>
          <Rect width={6} height={6} fill={color} fillOpacity={0.45} />
          <Circle cx={1} cy={1.5} r={1} fill={color} />
          <Circle cx={4} cy={0.8} r={0.7} fill={color} fillOpacity={0.8} />
          <Circle cx={2.6} cy={4.2} r={1.1} fill={color} />
          <Circle cx={5.2} cy={3.6} r={0.6} fill={color} fillOpacity={0.7} />
          <Circle cx={0.4} cy={5.1} r={0.5} fill={color} fillOpacity={0.6} />
        </Pattern>
      ))}
    </Defs>
  );
}

function grainId(color: string): string {
  return `grain-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
