import { Easing } from 'react-native';

export const durations = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export const easeOut = Easing.bezier(0.2, 0, 0, 1);

// Tests switch this off so fake timers drive animations
export const nativeDriver = true;
