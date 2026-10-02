import { useEffect, useRef, type RefObject } from 'react';
import { AppState } from 'react-native';
import { File, Paths } from 'expo-file-system';

function fileFor(name: string): File {
  return new File(Paths.document, `${name}.json`);
}

export async function readStored(name: string): Promise<unknown> {
  try {
    const file = fileFor(name);
    return file.exists ? JSON.parse(await file.text()) : null;
  } catch {
    return null;
  }
}

export function writeStored(name: string, value: unknown): void {
  try {
    const file = fileFor(name);
    if (value === null) {
      if (file.exists) {
        file.delete();
      }
      return;
    }
    if (!file.exists) {
      file.create();
    }
    file.write(JSON.stringify(value));
  } catch (error) {
    if (__DEV__) {
      console.warn(`Couldn't save ${name}`, error);
    }
  }
}

const SAVE_DELAY_MS = 1000;

// Debounced, and flushed when the app goes to the background
export function useStoredLater(name: string, value: unknown, ready: boolean): void {
  const unsaved = useRef<{ value: unknown } | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    unsaved.current = { value };
    const timer = setTimeout(() => saveNow(name, unsaved), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [name, value, ready]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        saveNow(name, unsaved);
      }
    });
    return () => subscription.remove();
  }, [name]);
}

function saveNow(name: string, unsaved: RefObject<{ value: unknown } | null>) {
  if (unsaved.current) {
    writeStored(name, unsaved.current.value);
    unsaved.current = null;
  }
}
