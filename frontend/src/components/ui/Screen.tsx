import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface ScreenProps {
  children: ReactNode;
  // Stays in place while the content scrolls under it
  header?: ReactNode;
  // For a screen that scrolls its own list
  scrolled?: boolean;
  scroll?: boolean;
  // Tab screens leave the bottom to the tab bar
  edges?: ('top' | 'bottom')[];
  padded?: boolean;
}

// Android draws edge to edge too, so both platforms pad for the safe area
export function Screen({
  children,
  header,
  scrolled: listScrolled,
  scroll = false,
  edges = ['top'],
  padded = true,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [scrolled, setScrolled] = useState(false);
  const [windowTop, setWindowTop] = useState(0);

  const content = {
    paddingBottom: edges.includes('bottom') ? Math.max(insets.bottom, spacing.lg) : 0,
    paddingHorizontal: padded ? spacing.lg : 0,
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setScrolled(event.nativeEvent.contentOffset.y > 0);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      // It measures itself from its parent, but the keyboard from the top of the screen, which a sheet starts below
      keyboardVerticalOffset={windowTop}
      onLayout={(event) => event.currentTarget?.measureInWindow?.((_x, y) => setWindowTop(y))}
      style={[styles.fill, { backgroundColor: colors.canvas, paddingTop: edges.includes('top') ? insets.top : 0 }]}
    >
      {header && (
        <View
          testID="screen-header"
          style={[styles.header, { borderBottomColor: (listScrolled ?? scrolled) ? colors.border : 'transparent' }]}
        >
          {header}
        </View>
      )}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.grow, content]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onScroll={header ? onScroll : undefined}
          scrollEventThrottle={16}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, content]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  grow: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
