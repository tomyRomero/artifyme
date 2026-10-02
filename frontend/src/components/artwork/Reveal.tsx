import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet } from 'react-native';
import type { Stroke } from '@/api/types';
import { Sketch } from '@/components/canvas/Sketch';
import { useReduceMotion } from '@/hooks/use-accessibility';
import { durations, easeOut, nativeDriver } from '@/theme/motion';
import { radii } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface RevealProps {
  strokes: Stroke[];
  ready: boolean;
  children: ReactNode;
}

// Reveal anyway after this, so a slow download never leaves the sketch up
export const REVEAL_PATIENCE_MS = 3000;

const BORDER = 1;

export function Reveal({ strokes, ready, children }: RevealProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [shown] = useState(() => new Animated.Value(0));
  const [waited, setWaited] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const revealing = ready || waited;

  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), REVEAL_PATIENCE_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!revealing) {
      return;
    }
    const reveal = Animated.timing(shown, {
      toValue: 1,
      duration: durations.slow,
      easing: easeOut,
      useNativeDriver: nativeDriver,
    });
    reveal.start(({ finished }) => finished && setRevealed(true));
    return () => reveal.stop();
  }, [revealing, shown]);

  const settle = reduceMotion ? [] : [{ scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }];

  return (
    <Animated.View style={{ transform: settle }}>
      {children}
      {!revealed && (
        <Animated.View
          testID="reveal-sketch"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onLayout={(event) => setSize(event.nativeEvent.layout)}
          style={[
            styles.cover,
            {
              opacity: shown.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              borderColor: colors.border,
              backgroundColor: colors.artboard,
            },
          ]}
        >
          <Sketch
            strokes={strokes}
            width={Math.max(0, size.width - BORDER * 2)}
            height={Math.max(0, size.height - BORDER * 2)}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.lg,
    borderWidth: BORDER,
    overflow: 'hidden',
  },
});
