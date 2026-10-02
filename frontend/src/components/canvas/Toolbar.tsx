import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Icon } from '@/components/ui';
import { BRUSHES, isShape, SHAPES, useBrush, type Tool } from '@/lib/brush';
import { useHaptics } from '@/lib/haptics';
import { BRUSH_SIZE } from '@/lib/sketch';
import { colorName } from '@/lib/swatches';
import { chunky, minTouchTarget, radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { EraserIcon, LineIcon, MarkerIcon, PenIcon } from './ToolIcons';

interface ToolbarProps {
  scale: number;
  onOpenColors: () => void;
}

const DOT_BOX = 36;

function ToolIcon({ tool, color, selected }: { tool: Tool; color: string; selected: boolean }) {
  switch (tool) {
    case 'pen':
      return <PenIcon color={color} filled={selected} />;
    case 'pencil':
      return <Icon name={selected ? 'pencil' : 'pencil-outline'} size={24} color={color} />;
    case 'marker':
      return <MarkerIcon color={color} filled={selected} />;
    case 'line':
      return <LineIcon color={color} />;
    case 'rectangle':
      return <Icon name={selected ? 'square' : 'square-outline'} size={22} color={color} />;
    case 'ellipse':
      return <Icon name={selected ? 'ellipse' : 'ellipse-outline'} size={24} color={color} />;
    case 'eraser':
      return <EraserIcon color={color} filled={selected} />;
  }
}

export function Toolbar({ scale, onOpenColors }: ToolbarProps) {
  const brush = useBrush();
  const haptic = useHaptics();
  const { colors } = useTheme();
  const erasing = brush.tool === 'eraser';
  const dot = Math.min(DOT_BOX, Math.max(2, brush.size * scale));

  const choose = (tool: Tool) => {
    if (tool !== brush.tool) {
      haptic('pick');
      brush.setTool(tool);
    }
  };

  return (
    <View style={styles.chunky}>
      <View style={[styles.lip, { backgroundColor: colors.outline }]} />
      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
        <View style={styles.tools}>
          {[...BRUSHES, null, ...SHAPES, null, { tool: 'eraser' as const, label: 'Eraser' }].map((option, index) =>
            option ? (
              <ToolButton
                key={option.tool}
                label={option.label}
                selected={brush.tool === option.tool}
                onPress={() => choose(option.tool)}
              >
                {(color) => <ToolIcon tool={option.tool} color={color} selected={brush.tool === option.tool} />}
              </ToolButton>
            ) : (
              <View key={index} style={[styles.divider, { backgroundColor: colors.border }]} />
            ),
          )}
        </View>

        <View style={styles.size}>
          <View style={styles.dotBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View
              testID="brush-preview"
              style={[
                styles.dot,
                {
                  width: dot,
                  height: dot,
                  backgroundColor: erasing ? colors.artboard : brush.color,
                  borderColor: colors.borderStrong,
                  opacity: brush.tool === 'marker' ? 0.6 : 1,
                },
              ]}
            />
          </View>
          <Slider
            style={styles.slider}
            minimumValue={BRUSH_SIZE.min}
            maximumValue={BRUSH_SIZE.max}
            step={1}
            value={brush.size}
            onValueChange={brush.setSize}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.borderStrong}
            thumbTintColor={colors.primary}
            accessibilityLabel={erasing ? 'Eraser size' : isShape(brush.tool) ? 'Line width' : 'Brush size'}
          />
          <Pressable
            onPress={onOpenColors}
            accessibilityRole="button"
            accessibilityLabel={`Color: ${colorName(brush.color)}`}
            accessibilityHint="Opens the colors"
            style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
          >
            <View style={[styles.swatch, { backgroundColor: brush.color, borderColor: colors.borderStrong }]} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface ToolButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  children: (color: string) => ReactNode;
}

function ToolButton({ label, selected, onPress, children }: ToolButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.tool,
        selected && { backgroundColor: colors.primaryTonal },
        pressed && styles.pressed,
      ]}
    >
      {children(selected ? colors.onPrimaryTonal : colors.ink)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chunky: {
    paddingBottom: chunky.lip,
  },
  lip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: chunky.lip,
    borderRadius: radii.lg,
  },
  bar: {
    gap: spacing.xxs,
    padding: spacing.xs,
    borderWidth: chunky.outlineWidth,
    borderRadius: radii.lg,
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  tool: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  pressed: {
    opacity: 0.6,
  },
  size: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dotBox: {
    width: DOT_BOX,
    height: DOT_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: radii.full,
    borderWidth: 1,
  },
  slider: {
    flex: 1,
    height: minTouchTarget,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    borderWidth: 1,
  },
});
