import React, {
  createContext,
  Dispatch,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { Stroke } from '@/api/types';
import { useSession } from '@/lib/session';
import { readStored, useStoredLater, writeStored } from '@/lib/stored';

export const NEW_DRAWING = 'new';

type Operation = { type: 'stroke'; stroke: Stroke } | { type: 'clear'; cleared: Stroke[] };

interface Entry {
  paths: Stroke[];
  original: Stroke[];
  done: Operation[];
  undone: Operation[];
}

type Action =
  | { type: 'start'; id: string; paths: Stroke[] }
  | { type: 'restore'; id: string; paths: Stroke[] }
  | { type: 'draw'; id: string; stroke: Stroke }
  | { type: 'undo'; id: string }
  | { type: 'redo'; id: string }
  | { type: 'clear'; id: string }
  | { type: 'discard'; id: string }
  | { type: 'reset' };

const NO_STROKES: Stroke[] = [];
const NO_OPERATIONS: Operation[] = [];
const BLANK: Entry = { paths: NO_STROKES, original: NO_STROKES, done: NO_OPERATIONS, undone: NO_OPERATIONS };

function apply(paths: Stroke[], operation: Operation): Stroke[] {
  return operation.type === 'stroke' ? [...paths, operation.stroke] : NO_STROKES;
}

function revert(paths: Stroke[], operation: Operation): Stroke[] {
  return operation.type === 'stroke' ? paths.slice(0, -1) : operation.cleared;
}

function drawingsReducer(drawings: Record<string, Entry>, action: Action): Record<string, Entry> {
  if (action.type === 'reset') {
    return {};
  }
  const entry = drawings[action.id] ?? BLANK;
  const update = (changes: Partial<Entry>) => ({ ...drawings, [action.id]: { ...entry, ...changes } });
  const perform = (operation: Operation) =>
    update({ paths: apply(entry.paths, operation), done: [...entry.done, operation], undone: NO_OPERATIONS });

  switch (action.type) {
    case 'start':
      return { ...drawings, [action.id]: { ...BLANK, paths: action.paths, original: action.paths } };
    case 'restore':
      return entry.paths.length > 0 ? drawings : { ...drawings, [action.id]: { ...BLANK, paths: action.paths } };
    case 'draw':
      return action.stroke.path.length === 0 ? drawings : perform({ type: 'stroke', stroke: action.stroke });
    case 'clear':
      return entry.paths.length === 0 ? drawings : perform({ type: 'clear', cleared: entry.paths });
    case 'undo': {
      const operation = entry.done.at(-1);
      return operation
        ? update({
            paths: revert(entry.paths, operation),
            done: entry.done.slice(0, -1),
            undone: [...entry.undone, operation],
          })
        : drawings;
    }
    case 'redo': {
      const operation = entry.undone.at(-1);
      return operation
        ? update({
            paths: apply(entry.paths, operation),
            done: [...entry.done, operation],
            undone: entry.undone.slice(0, -1),
          })
        : drawings;
    }
    case 'discard': {
      const { [action.id]: _discarded, ...rest } = drawings;
      return rest;
    }
  }
}

function isStrokes(value: unknown): value is Stroke[] {
  return (
    Array.isArray(value) &&
    value.every(
      (stroke) =>
        Array.isArray(stroke?.path) &&
        stroke.path.every((segment: unknown) => typeof segment === 'string') &&
        typeof stroke.color === 'string' &&
        typeof stroke.size === 'number' &&
        (stroke.brush == null || ['pen', 'pencil', 'marker'].includes(stroke.brush)),
    )
  );
}

// Compared by identity: undoing back to the start counts as unchanged
function isChanged({ paths, original }: Entry): boolean {
  return paths.length !== original.length || paths.some((stroke, index) => stroke !== original[index]);
}

const DrawingContext = createContext<{ drawings: Record<string, Entry>; dispatch: Dispatch<Action> } | undefined>(
  undefined,
);

// Only the new drawing is kept as a draft; an edit still has the artwork's drawing
const DRAFT = 'drawing-draft';

export function DrawingProvider({ children }: { children: ReactNode }) {
  const [drawings, dispatch] = useReducer(drawingsReducer, {});
  const value = useMemo(() => ({ drawings, dispatch }), [drawings]);

  const [draftRead, setDraftRead] = useState(false);
  useEffect(() => {
    readStored(DRAFT).then((draft) => {
      if (isStrokes(draft) && draft.length > 0) {
        dispatch({ type: 'restore', id: NEW_DRAWING, paths: draft });
      }
      setDraftRead(true);
    });
  }, []);

  const newPaths = drawings[NEW_DRAWING]?.paths ?? NO_STROKES;
  useStoredLater(DRAFT, newPaths.length > 0 ? newPaths : null, draftRead);

  // Signing out leaves nothing of that person's drawings behind. A session that ends by
  // itself keeps them, since the same person is likely to sign straight back in.
  const current = useSession();
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (current.status === 'signedIn') {
      wasSignedIn.current = true;
    } else if (current.status === 'signedOut' && wasSignedIn.current) {
      wasSignedIn.current = false;
      if (!current.expired) {
        dispatch({ type: 'reset' });
        writeStored(DRAFT, null);
      }
    }
  }, [current]);

  return <DrawingContext value={value}>{children}</DrawingContext>;
}

export interface Drawing {
  paths: Stroke[];
  changed: boolean;
  canUndo: boolean;
  canRedo: boolean;
  draw: (stroke: Stroke) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  start: (paths?: Stroke[]) => void;
  discard: () => void;
}

export function useDrawing(id: string = NEW_DRAWING): Drawing {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawing must be used within a DrawingProvider');
  }
  const { drawings, dispatch } = context;

  const actions = useMemo(
    () => ({
      draw: (stroke: Stroke) => dispatch({ type: 'draw', id, stroke }),
      undo: () => dispatch({ type: 'undo', id }),
      redo: () => dispatch({ type: 'redo', id }),
      clear: () => dispatch({ type: 'clear', id }),
      start: (paths: Stroke[] = NO_STROKES) => dispatch({ type: 'start', id, paths }),
      discard: () => dispatch({ type: 'discard', id }),
    }),
    [dispatch, id],
  );

  const entry = drawings[id] ?? BLANK;
  return {
    paths: entry.paths,
    changed: isChanged(entry),
    canUndo: entry.done.length > 0,
    canRedo: entry.undone.length > 0,
    ...actions,
  };
}
