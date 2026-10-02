import type { Stroke } from '@/api/types';

// Strokes are stored in the model's pixel units (see inference/app/images.py)
export const ARTBOARD = { width: 512, height: 768 } as const;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export function fitArtboard(space: Size): Size {
  const scale = Math.max(0, Math.min(space.width / ARTBOARD.width, space.height / ARTBOARD.height));
  return { width: ARTBOARD.width * scale, height: ARTBOARD.height * scale };
}

export const BRUSH_SIZE = { min: 2, max: 48, default: 6 } as const;

export type Shape = 'line' | 'rectangle' | 'ellipse';

// A drag shorter than this is a slip, not a shape
const MIN_SHAPE = 4;
// How far a cubic's handles reach to bend a quarter circle
const KAPPA = 0.5523;

export function shapePath(shape: Shape, from: Point, to: Point): string[] {
  if (Math.abs(to.x - from.x) < MIN_SHAPE && Math.abs(to.y - from.y) < MIN_SHAPE) {
    return [];
  }
  if (shape === 'line') {
    return [`M${xy(from)}`, `L${xy(to)}`];
  }
  if (shape === 'rectangle') {
    return [`M${xy(from)}`, `L${xy({ x: to.x, y: from.y })}`, `L${xy(to)}`, `L${xy({ x: from.x, y: to.y })}`, 'Z'];
  }

  const center = midpoint(from, to);
  const rx = Math.abs(to.x - from.x) / 2;
  const ry = Math.abs(to.y - from.y) / 2;
  const [right, bottom, left, top] = [
    { x: center.x + rx, y: center.y },
    { x: center.x, y: center.y + ry },
    { x: center.x - rx, y: center.y },
    { x: center.x, y: center.y - ry },
  ];
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    `M${xy(right)}`,
    `C${xy({ x: right.x, y: right.y + ky })} ${xy({ x: bottom.x + kx, y: bottom.y })} ${xy(bottom)}`,
    `C${xy({ x: bottom.x - kx, y: bottom.y })} ${xy({ x: left.x, y: left.y + ky })} ${xy(left)}`,
    `C${xy({ x: left.x, y: left.y - ky })} ${xy({ x: top.x - kx, y: top.y })} ${xy(top)}`,
    `C${xy({ x: top.x + kx, y: top.y })} ${xy({ x: right.x, y: right.y - ky })} ${xy(right)}`,
    'Z',
  ];
}

// Filters the jitter of a finger held still
const MIN_DISTANCE = 2;
// Smoothing: how much of the previous point each new point keeps
const STREAMLINE = 0.3;

export function smoothPoint(last: Point | undefined, finger: Point): Point | null {
  if (!last) {
    return finger;
  }
  if (Math.hypot(finger.x - last.x, finger.y - last.y) < MIN_DISTANCE) {
    return null;
  }
  return {
    x: last.x + (finger.x - last.x) * (1 - STREAMLINE),
    y: last.y + (finger.y - last.y) * (1 - STREAMLINE),
  };
}

// Smoothing lags the finger, so end exactly where it lifted
export function endStroke(points: Point[], finger: Point): Point[] {
  const last = points.at(-1);
  if (last && Math.hypot(finger.x - last.x, finger.y - last.y) < MIN_DISTANCE / 2) {
    return points;
  }
  return [...points, finger];
}

// Quadratic curves through the midpoints; a tap becomes a dot
export function toPath(points: Point[]): string[] {
  const [first, ...rest] = points;
  if (!first) {
    return [];
  }
  if (rest.length === 0) {
    // Some renderers skip zero-length lines
    return [`M${xy(first)}`, `L${xy({ x: first.x + 0.1, y: first.y })}`];
  }

  const path = [`M${xy(first)}`];
  for (let i = 0; i < rest.length - 1; i++) {
    path.push(`Q${xy(rest[i])} ${xy(midpoint(rest[i], rest[i + 1]))}`);
  }
  path.push(`L${xy(rest[rest.length - 1])}`);
  return path;
}

// Older strokes have segments ending in spaces; joining works for both
export function strokePath(stroke: Stroke): string {
  return stroke.path.join('');
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function xy({ x, y }: Point): string {
  return `${round(x)},${round(y)}`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
