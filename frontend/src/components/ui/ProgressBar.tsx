import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';
import { useReduceMotion } from '@/hooks/use-accessibility';
import { nativeDriver } from '@/theme/motion';
import { chunky, radii } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface ProgressBarProps {
  // 0 to 1, or undefined for an indeterminate sweep
  progress?: number;
  rainbow?: boolean;
  accessibilityLabel: string;
}

const HEIGHT = 12;
const SWEEP = 0.35;

export function ProgressBar({ progress, rainbow = false, accessibilityLabel }: ProgressBarProps) {
  const { colors, rainbow: rainbowColors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [sweep] = useState(() => new Animated.Value(0));
  const known = progress !== undefined;
  const sweeping = !known && !reduceMotion;

  useEffect(() => {
    if (!sweeping) {
      return;
    }
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: nativeDriver,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      sweep.setValue(0);
    };
  }, [sweeping, sweep]);

  const share = known ? Math.min(1, Math.max(0, progress)) : sweeping ? SWEEP : 1;
  const fillWidth = width * share;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={known ? { min: 0, max: 100, now: Math.round(share * 100) } : undefined}
      onLayout={(event) => setWidth(Math.max(0, event.nativeEvent.layout.width - chunky.outlineWidth * 2))}
      style={[styles.track, { backgroundColor: colors.surfaceMuted, borderColor: colors.outline }]}
    >
      {/* A new view once the sweep stops: the native driver leaves its last offset on the old one */}
      <Animated.View
        key={sweeping ? 'sweeping' : 'filling'}
        testID="progress-fill"
        style={[
          styles.fill,
          { width: fillWidth },
          // With Reduce Motion an indeterminate bar holds still
          !known && !sweeping && styles.waiting,
          sweeping && {
            transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-fillWidth, width] }) }],
          },
        ]}
      >
        {rainbow ? (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id="rainbow" x1="0" y1="0" x2="1" y2="0">
                {rainbowColors.map((color, index) => (
                  <Stop key={color} offset={index / (rainbowColors.length - 1)} stopColor={color} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect width={width} height={HEIGHT} fill="url(#rainbow)" />
          </Svg>
        ) : (
          <View style={[styles.solid, { backgroundColor: colors.primary }]} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: HEIGHT + chunky.outlineWidth * 2,
    borderWidth: chunky.outlineWidth,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  fill: {
    height: HEIGHT,
    overflow: 'hidden',
    borderRadius: radii.full,
  },
  waiting: {
    opacity: 0.35,
  },
  solid: {
    flex: 1,
  },
});
