import { useEffect, useState, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useReduceMotion } from '@/hooks/use-accessibility';
import { durations, easeOut, nativeDriver } from '@/theme/motion';
import { spacing } from '@/theme/tokens';

interface EntranceProps {
  children: ReactNode;
  rise?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Entrance({ children, rise = spacing.md, delay = 0, style, testID }: EntranceProps) {
  const reduceMotion = useReduceMotion();
  const [shown] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const arrive = Animated.timing(shown, {
      toValue: 1,
      delay,
      duration: durations.base,
      easing: easeOut,
      useNativeDriver: nativeDriver,
    });
    arrive.start();
    return () => arrive.stop();
  }, [shown, delay]);

  const transform = reduceMotion
    ? []
    : [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) }];

  return (
    <Animated.View testID={testID} style={[style, { opacity: shown, transform }]}>
      {children}
    </Animated.View>
  );
}
