import { useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, type GestureResponderEvent } from 'react-native';
import SignedImage from '@/components/shared/SignedImage';
import { radii } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface ZoomableImageProps {
  url: string | null;
  width: number;
  height: number;
  accessibilityLabel: string;
}

const MAX_ZOOM = 4;
const TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 300;

// Uses the iOS scroll view's built-in zoom; Android shows the image without zoom
export function ZoomableImage({ url, width, height, accessibilityLabel }: ZoomableImageProps) {
  const { colors } = useTheme();
  const scroll = useRef<ScrollView>(null);
  const zoomed = useRef(false);
  const lastTap = useRef(0);

  const tap = (event: GestureResponderEvent) => {
    const now = Date.now();
    if (now - lastTap.current > DOUBLE_TAP_MS) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    if (Platform.OS !== 'ios') {
      return;
    }
    const { locationX, locationY } = event.nativeEvent;
    const area = zoomed.current
      ? { x: 0, y: 0, width, height }
      : {
          x: locationX - width / TAP_ZOOM / 2,
          y: locationY - height / TAP_ZOOM / 2,
          width: width / TAP_ZOOM,
          height: height / TAP_ZOOM,
        };
    scroll.current?.scrollResponderZoomTo({ ...area, animated: true });
  };

  return (
    <ScrollView
      ref={scroll}
      style={[styles.frame, { width, height, backgroundColor: colors.surfaceMuted }]}
      maximumZoomScale={MAX_ZOOM}
      minimumZoomScale={1}
      centerContent
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      onScroll={(event) => {
        zoomed.current = event.nativeEvent.zoomScale > 1.01;
      }}
      scrollEventThrottle={100}
    >
      <Pressable onPress={tap} accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        <SignedImage url={url} style={{ width, height }} contentFit="contain" />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radii.lg,
  },
});
