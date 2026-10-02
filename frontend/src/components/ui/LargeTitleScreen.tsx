import { useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nativeDriver } from '@/theme/motion';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { AppText } from './AppText';

const BAR_HEIGHT = 44;

// Like iOS Settings: the big title scrolls away and a small one fades into the bar above
export function LargeTitleScreen({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [scrollY] = useState(() => new Animated.Value(0));
  const [titleHeight, setTitleHeight] = useState(0);

  const collapsed = scrollY.interpolate({
    inputRange: [titleHeight * 0.5, Math.max(titleHeight, 1)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.fill, { backgroundColor: colors.canvas, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {/* The big title is the one screen readers hear */}
        <Animated.View
          testID="collapsed-title"
          style={{ opacity: collapsed }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <AppText variant="headline" maxFontSizeMultiplier={1.4}>
            {title}
          </AppText>
        </Animated.View>
        <Animated.View style={[styles.line, { backgroundColor: colors.border, opacity: collapsed }]} />
      </View>
      <Animated.ScrollView
        testID="large-title-scroll"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: nativeDriver,
        })}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
      >
        <AppText
          variant="display"
          accessibilityRole="header"
          onLayout={(event) => setTitleHeight(event.nativeEvent.layout.height)}
          style={styles.title}
        >
          {title}
        </AppText>
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  bar: {
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  title: {
    paddingBottom: spacing.sm,
  },
});
