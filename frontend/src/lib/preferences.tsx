import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance as SystemAppearance, useColorScheme } from 'react-native';
import { readStored, useStoredLater } from '@/lib/stored';

export type Theme = 'light' | 'dark';
export type Appearance = 'system' | Theme;

interface Stored {
  appearance: Appearance;
  haptics: boolean;
  welcomed: boolean;
  undoTipSeen: boolean;
  grid: boolean;
  appLock: boolean;
  biometricSignIn: boolean;
  biometricSignInOffered: boolean;
  artworkNotifications: boolean;
  artworkNotificationsOffered: boolean;
}

const DEFAULTS: Stored = {
  appearance: 'system',
  haptics: true,
  welcomed: false,
  undoTipSeen: false,
  grid: false,
  appLock: false,
  biometricSignIn: false,
  biometricSignInOffered: false,
  artworkNotifications: false,
  artworkNotificationsOffered: false,
};
const STORED_PREFERENCES = 'preferences';

interface Preferences extends Stored {
  theme: Theme;
  loaded: boolean;
  setAppearance: (appearance: Appearance) => void;
  setHaptics: (haptics: boolean) => void;
  finishWelcome: () => void;
  dismissUndoTip: () => void;
  setGrid: (grid: boolean) => void;
  setAppLock: (appLock: boolean) => void;
  setBiometricSignIn: (on: boolean) => void;
  dismissBiometricSignInOffer: () => void;
  setArtworkNotifications: (on: boolean) => void;
  dismissArtworkNotificationsOffer: () => void;
}

const PreferencesContext = createContext<Preferences | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [stored, setStored] = useState<Stored>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    readStored(STORED_PREFERENCES).then((value) => {
      setStored((current) => ({ ...current, ...knownChoices(value) }));
      setLoaded(true);
    });
  }, []);
  useStoredLater(STORED_PREFERENCES, stored, loaded);

  // So native alerts, menus and the keyboard follow the choice too
  useEffect(() => {
    SystemAppearance.setColorScheme(stored.appearance === 'system' ? 'unspecified' : stored.appearance);
  }, [stored.appearance]);

  const theme: Theme =
    stored.appearance === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : stored.appearance;

  const value = useMemo<Preferences>(
    () => ({
      ...stored,
      theme,
      loaded,
      setAppearance: (appearance) => setStored((current) => ({ ...current, appearance })),
      setHaptics: (haptics) => setStored((current) => ({ ...current, haptics })),
      finishWelcome: () => setStored((current) => ({ ...current, welcomed: true })),
      dismissUndoTip: () => setStored((current) => ({ ...current, undoTipSeen: true })),
      setGrid: (grid) => setStored((current) => ({ ...current, grid })),
      setAppLock: (appLock) => setStored((current) => ({ ...current, appLock })),
      setBiometricSignIn: (on) =>
        setStored((current) => ({ ...current, biometricSignIn: on, biometricSignInOffered: true })),
      dismissBiometricSignInOffer: () => setStored((current) => ({ ...current, biometricSignInOffered: true })),
      setArtworkNotifications: (on) =>
        setStored((current) => ({ ...current, artworkNotifications: on, artworkNotificationsOffered: true })),
      dismissArtworkNotificationsOffer: () =>
        setStored((current) => ({ ...current, artworkNotificationsOffered: true })),
    }),
    [stored, theme, loaded],
  );

  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences(): Preferences {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

const SWITCHES = [
  'haptics',
  'welcomed',
  'undoTipSeen',
  'grid',
  'appLock',
  'biometricSignIn',
  'biometricSignInOffered',
  'artworkNotifications',
  'artworkNotificationsOffered',
] as const satisfies readonly (keyof Stored)[];

function knownChoices(value: unknown): Partial<Stored> {
  const stored = (value ?? {}) as Record<string, unknown>;
  const choices: Partial<Stored> = {};
  if (stored.appearance === 'system' || stored.appearance === 'light' || stored.appearance === 'dark') {
    choices.appearance = stored.appearance;
  }
  for (const name of SWITCHES) {
    const choice = stored[name];
    if (typeof choice === 'boolean') {
      choices[name] = choice;
    }
  }
  return choices;
}
