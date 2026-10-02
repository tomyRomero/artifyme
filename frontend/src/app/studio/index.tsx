import { useEffect, useState } from 'react';
import { AccessibilityInfo, Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Stroke } from '@/api/types';
import { Artboard } from '@/components/canvas/Artboard';
import { Toolbar } from '@/components/canvas/Toolbar';
import { Banner, Button, IconButton, Screen, Toast } from '@/components/ui';
import { isShape, useBrush } from '@/lib/brush';
import { useHaptics } from '@/lib/haptics';
import { usePreferences } from '@/lib/preferences';
import { ARTBOARD } from '@/lib/sketch';
import { useCloseStudio, useStudio } from '@/lib/studio';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function CanvasScreen() {
  const studio = useStudio();
  const { drawing } = studio;
  const close = useCloseStudio();
  const brush = useBrush();
  const preferences = usePreferences();
  const haptic = useHaptics();
  const { colors } = useTheme();
  const [scale, setScale] = useState(0);
  const [cleared, setCleared] = useState<number | null>(null);

  // Jump to a generation still running from a previous visit
  useEffect(() => {
    if (studio.resumed) {
      router.push('/studio/generation');
    }
  }, [studio.resumed]);

  const leave = () => {
    if (!studio.artwork || !drawing.changed) {
      close();
      return;
    }
    Alert.alert('Discard your changes?', 'The artwork keeps the drawing it has.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: close },
    ]);
  };

  const draw = (stroke: Stroke) => {
    drawing.draw(stroke);
    setCleared(null);
  };

  const undo = () => {
    if (!drawing.canUndo) {
      return;
    }
    drawing.undo();
    setCleared(null);
    haptic('undo');
    AccessibilityInfo.announceForAccessibility('Undone');
  };

  const undoWithTwoFingers = () => {
    undo();
    preferences.dismissUndoTip();
  };

  const redo = () => {
    drawing.redo();
    setCleared(null);
    haptic('undo');
    AccessibilityInfo.announceForAccessibility('Redone');
  };

  const clear = () => {
    drawing.clear();
    setCleared(Date.now());
    haptic('clear');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="close" accessibilityLabel="Close" onPress={leave} />
        <IconButton
          icon="trash-outline"
          accessibilityLabel="Clear canvas"
          onPress={clear}
          disabled={drawing.paths.length === 0}
        />
        <IconButton icon="arrow-undo-outline" accessibilityLabel="Undo" onPress={undo} disabled={!drawing.canUndo} />
        <IconButton icon="arrow-redo-outline" accessibilityLabel="Redo" onPress={redo} disabled={!drawing.canRedo} />
        <IconButton
          icon={preferences.grid ? 'grid' : 'grid-outline'}
          accessibilityLabel="Guide grid"
          selected={preferences.grid}
          onPress={() => preferences.setGrid(!preferences.grid)}
        />
        <View style={styles.spacer} />
        {/* Capped so it fits beside the icons */}
        <Button
          label="Next"
          onPress={() => router.push('/studio/describe')}
          disabled={drawing.paths.length === 0}
          maxFontSizeMultiplier={2}
        />
      </View>

      {preferences.loaded && !preferences.undoTipSeen && (
        <View style={styles.tip}>
          <Banner
            tone="info"
            message="Tip: tap with two fingers to undo."
            action={{ label: 'Got it', onPress: preferences.dismissUndoTip }}
          />
        </View>
      )}

      <View style={styles.board}>
        <Artboard
          strokes={drawing.paths}
          pen={{
            color: brush.tool === 'eraser' ? colors.artboard : brush.color,
            size: brush.size,
            brush: brush.tool === 'pencil' || brush.tool === 'marker' ? brush.tool : 'pen',
            shape: isShape(brush.tool) ? brush.tool : null,
          }}
          grid={preferences.grid}
          onStroke={draw}
          onUndo={undoWithTwoFingers}
          onResize={(board) => setScale(board.width / ARTBOARD.width)}
        />
        {cleared !== null && (
          <View style={styles.toast}>
            <Toast
              key={cleared}
              message="Canvas cleared"
              action={{ label: 'Undo', onPress: undo }}
              onHide={() => setCleared(null)}
            />
          </View>
        )}
      </View>

      <Toolbar scale={scale} onOpenColors={() => router.push('/palette')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  tip: {
    marginBottom: spacing.md,
  },
  board: {
    flex: 1,
    marginBottom: spacing.md,
  },
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
  },
});
