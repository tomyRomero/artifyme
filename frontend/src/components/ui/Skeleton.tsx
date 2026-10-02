import { useEffect, useState } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useReduceMotion } from '@/hooks/use-accessibility';
import { nativeDriver } from '@/theme/motion';
import { radii } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ style }: SkeletonProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: nativeDriver }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: nativeDriver }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
      opacity.setValue(1);
    };
  }, [reduceMotion, opacity]);

  return (
    <Animated.View
      testID="skeleton"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ backgroundColor: colors.surfaceMuted, borderRadius: radii.md, opacity }, style]}
    />
  );
}
