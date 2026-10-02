import { useImperativeHandle, useRef, type Ref } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { Stroke } from '@/api/types';
import { ARTBOARD } from '@/lib/sketch';
import { Sketch } from './Sketch';

export interface SketchCapture {
  capture: () => Promise<string>;
}

interface SketchExportProps {
  strokes: Stroke[];
  ref: Ref<SketchCapture>;
}

// Rendered offscreen at the model's pixel size and captured as the generation's input
export function SketchExport({ strokes, ref }: SketchExportProps) {
  const view = useRef<View>(null);
  useImperativeHandle(ref, () => ({
    capture: () => captureRef(view, { format: 'png', result: 'data-uri' }),
  }));

  const density = PixelRatio.get();
  return (
    <View
      ref={view}
      collapsable={false}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.offscreen}
    >
      <Sketch strokes={strokes} width={ARTBOARD.width / density} height={ARTBOARD.height / density} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Offscreen rather than hidden: a transparent view captures as blank
  offscreen: {
    position: 'absolute',
    left: -10_000,
    top: 0,
  },
});
