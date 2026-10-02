import { Text, type TextProps } from 'react-native';
import { maxTextScale, typography, type ColorToken, type TypeVariant } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: ColorToken;
}

export function AppText({ variant = 'body', color = 'ink', style, maxFontSizeMultiplier, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? maxTextScale[variant]}
      {...rest}
      style={[typography[variant], { color: colors[color] }, style]}
    />
  );
}
