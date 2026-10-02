import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import SignedImage from '@/components/shared/SignedImage';
import { AppText, Icon } from '@/components/ui';
import { useReduceMotion } from '@/hooks/use-accessibility';
import { useHaptics } from '@/lib/haptics';
import { ARTBOARD } from '@/lib/sketch';
import { chunky, radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export interface Picture {
  url: string | null;
}

interface CompareSliderProps {
  sketch: Picture;
  artwork: Picture;
  accessibilityLabel?: string;
  onArtworkLoad?: () => void;
}

const STEP = 0.1;
const HANDLE = { width: 48, height: 36 };

// Once the artwork shows, the divide sweeps across and back, so it can be seen to move
export const SWEEP_DELAY_MS = 600;
export const SWEEP_LEG_MS = 450;
const SWEEP = [0.75, 0.25, 0.5];

export function CompareSlider({
  sketch,
  artwork,
  accessibilityLabel = 'Sketch and artwork',
  onArtworkLoad,
}: CompareSliderProps) {
  const { colors } = useTheme();
  const haptic = useHaptics();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  // 0 shows all artwork, 1 all sketch
  const [divide, setDivide] = useState(0.5);
  const [shown, setShown] = useState(false);
  const height = (width * ARTBOARD.height) / ARTBOARD.width;
  // -1 or 1 for the side of the middle, 0 before it has left it
  const side = useRef(0);
  const [sweep] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    if (!shown || reduceMotion) {
      return;
    }
    const following = sweep.addListener(({ value }) => setDivide(value));
    const legs = SWEEP.map((toValue) =>
      Animated.timing(sweep, {
        toValue,
        duration: SWEEP_LEG_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    );
    const animation = Animated.sequence([Animated.delay(SWEEP_DELAY_MS), ...legs]);
    animation.start();
    return () => {
      animation.stop();
      sweep.removeListener(following);
    };
  }, [shown, reduceMotion, sweep]);

  const move = (to: number) => {
    // A touch takes over from the sweep
    sweep.stopAnimation();
    const next = clamp(to);
    const nextSide = Math.sign(next - 0.5);
    if (nextSide !== 0) {
      if (side.current !== 0 && nextSide !== side.current) {
        haptic('pick');
      }
      side.current = nextSide;
    }
    setDivide(next);
  };

  // The gesture is created once and reads these refs
  const latest = useRef({ width, move });
  useLayoutEffect(() => {
    latest.current = { width, move };
  });

  /* eslint-disable react-hooks/refs -- the handlers read the refs on touches, never during render */
  const [gesture] = useState(() => {
    const moveTo = (x: number) => {
      if (latest.current.width > 0) {
        latest.current.move(x / latest.current.width);
      }
    };
    // Horizontal only, so vertical swipes still scroll
    const drag = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-8, 8])
      .failOffsetY([-12, 12])
      .onStart((event) => moveTo(event.x))
      .onUpdate((event) => moveTo(event.x))
      .withTestId('compare');
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((event, success) => {
        if (success) {
          moveTo(event.x);
        }
      })
      .withTestId('compare-tap');
    return Gesture.Race(drag, tap);
  });
  /* eslint-enable react-hooks/refs */

  const artworkShare = Math.round((1 - divide) * 100);
  const x = width * divide;

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: `${artworkShare}% artwork` }}
        accessibilityHint="Swipe up to show more of the artwork, down to show more of the sketch."
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => move(divide + (event.nativeEvent.actionName === 'increment' ? -STEP : STEP))}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[styles.frame, { borderColor: colors.border, backgroundColor: colors.artboard }]}
      >
        <PictureView
          testID="artwork-image"
          picture={artwork}
          style={StyleSheet.absoluteFill}
          onLoad={() => {
            setShown(true);
            onArtworkLoad?.();
          }}
          onError={onArtworkLoad}
        />
        <Tag label="Artwork" style={styles.right} />

        <View testID="sketch-side" style={[styles.sketchSide, { width: x }]}>
          <PictureView picture={sketch} style={{ width, height }} />
          <Tag label="Sketch" style={styles.left} />
        </View>

        <View pointerEvents="none" style={[styles.line, { left: x - 1, backgroundColor: colors.surface }]} />
        <View
          pointerEvents="none"
          style={[
            styles.handle,
            {
              left: x - HANDLE.width / 2,
              top: height / 2 - HANDLE.height / 2,
              backgroundColor: colors.surface,
              borderColor: colors.outline,
            },
          ]}
        >
          <Icon name="chevron-back" size={14} color={colors.ink} />
          <Icon name="chevron-forward" size={14} color={colors.ink} />
        </View>
      </View>
    </GestureDetector>
  );
}

interface PictureViewProps {
  picture: Picture;
  style: object;
  testID?: string;
  onLoad?: () => void;
  onError?: () => void;
}

function PictureView({ picture, style, testID, onLoad, onError }: PictureViewProps) {
  return (
    <SignedImage testID={testID} url={picture.url} style={style} contentFit="cover" onLoad={onLoad} onError={onError} />
  );
}

function Tag({ label, style }: { label: string; style: object }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: colors.surface }, style]}>
      <AppText variant="caption" maxFontSizeMultiplier={1.5}>
        {label}
      </AppText>
    </View>
  );
}

function clamp(share: number): number {
  return Math.round(Math.min(1, Math.max(0, share)) * 100) / 100;
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: ARTBOARD.width / ARTBOARD.height,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sketchSide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  line: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
  },
  handle: {
    position: 'absolute',
    width: HANDLE.width,
    height: HANDLE.height,
    borderRadius: radii.full,
    borderWidth: chunky.outlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    position: 'absolute',
    top: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.sm,
  },
  left: {
    left: spacing.sm,
  },
  right: {
    right: spacing.sm,
  },
});
