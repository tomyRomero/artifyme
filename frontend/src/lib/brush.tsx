import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { BrushType } from '@/api/types';
import { BRUSH_SIZE, type Shape } from '@/lib/sketch';
import { readStored, useStoredLater } from '@/lib/stored';
import { DEFAULT_COLOR } from '@/lib/swatches';

// The eraser paints white, which is enough with a white background and no layers
export type Tool = BrushType | Shape | 'eraser';

export const BRUSHES: readonly { tool: BrushType; label: string }[] = [
  { tool: 'pen', label: 'Pen' },
  { tool: 'pencil', label: 'Pencil' },
  { tool: 'marker', label: 'Marker' },
];

export const SHAPES: readonly { tool: Shape; label: string }[] = [
  { tool: 'line', label: 'Line' },
  { tool: 'rectangle', label: 'Rectangle' },
  { tool: 'ellipse', label: 'Ellipse' },
];

export function isShape(tool: Tool): tool is Shape {
  return SHAPES.some((shape) => shape.tool === tool);
}

const RECENT_COLORS = 6;

// The tool isn't stored, so the app always opens on the pen
const STORED_BRUSH = 'brush';

interface BrushSettings {
  tool: Tool;
  color: string;
  size: number;
  recent: string[];
}

export interface Brush extends BrushSettings {
  setTool: (tool: Tool) => void;
  pickColor: (color: string) => void;
  setSize: (size: number) => void;
}

const BrushContext = createContext<Brush | undefined>(undefined);

export function BrushProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BrushSettings>({
    tool: 'pen',
    color: DEFAULT_COLOR,
    size: BRUSH_SIZE.default,
    recent: [],
  });

  const [storedRead, setStoredRead] = useState(false);
  useEffect(() => {
    readStored(STORED_BRUSH).then((stored) => {
      if (isKept(stored)) {
        setSettings((current) => ({
          ...current,
          color: stored.color,
          size: wholeSize(stored.size),
          recent: stored.recent.slice(0, RECENT_COLORS),
        }));
      }
      setStoredRead(true);
    });
  }, []);

  const { color, size, recent } = settings;
  const kept = useMemo(() => ({ color, size, recent }), [color, size, recent]);
  useStoredLater(STORED_BRUSH, kept, storedRead);

  const value = useMemo<Brush>(
    () => ({
      ...settings,
      setTool: (tool) => setSettings((current) => ({ ...current, tool })),
      pickColor: (color) =>
        setSettings((current) => ({
          ...current,
          tool: current.tool === 'eraser' ? 'pen' : current.tool,
          color,
          recent: [color, ...current.recent.filter((recent) => recent !== color)].slice(0, RECENT_COLORS),
        })),
      setSize: (size) => setSettings((current) => ({ ...current, size: wholeSize(size) })),
    }),
    [settings],
  );

  return <BrushContext value={value}>{children}</BrushContext>;
}

function wholeSize(size: number): number {
  return Math.round(Math.min(BRUSH_SIZE.max, Math.max(BRUSH_SIZE.min, size)));
}

function isKept(value: unknown): value is Pick<BrushSettings, 'color' | 'size' | 'recent'> {
  const kept = value as Partial<BrushSettings> | null;
  return (
    typeof kept?.color === 'string' &&
    typeof kept.size === 'number' &&
    Array.isArray(kept.recent) &&
    kept.recent.every((recent) => typeof recent === 'string')
  );
}

export function useBrush(): Brush {
  const context = useContext(BrushContext);
  if (!context) {
    throw new Error('useBrush must be used within a BrushProvider');
  }
  return context;
}
