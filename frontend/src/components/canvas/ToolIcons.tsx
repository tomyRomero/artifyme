import { Circle, G, Line, Path, Rect, Svg } from 'react-native-svg';

interface ToolIconProps {
  color: string;
  size?: number;
  filled?: boolean;
}

// Ionicons has no eraser, pen nib, marker or plain line

export function EraserIcon({ color, size = 24, filled = false }: ToolIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G transform="rotate(-45 12 12)">
        {filled && <Rect x={3} y={8} width={7} height={8} rx={2} fill={color} />}
        <Rect x={3} y={8} width={18} height={8} rx={2} stroke={color} strokeWidth={2} fill="none" />
        <Line x1={10} y1={8} x2={10} y2={16} stroke={color} strokeWidth={2} />
      </G>
    </Svg>
  );
}

export function PenIcon({ color, size = 24, filled = false }: ToolIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 22 L6 12 L8 3 H16 L18 12 Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        fill={color}
        fillOpacity={filled ? 0.35 : 0}
      />
      <Line x1={12} y1={22} x2={12} y2={14} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={11.5} r={1.6} fill={color} />
    </Svg>
  );
}

export function MarkerIcon({ color, size = 24, filled = false }: ToolIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G transform="rotate(-45 12 12)">
        <Path d="M9 8.5 L3 10.5 V13.5 L9 15.5 Z" stroke={color} strokeWidth={2} strokeLinejoin="round" fill={color} />
        <Rect
          x={9}
          y={6}
          width={13}
          height={12}
          rx={2}
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={filled ? 0.35 : 0}
        />
      </G>
    </Svg>
  );
}

export function LineIcon({ color, size = 24 }: ToolIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1={5} y1={19} x2={19} y2={5} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}
