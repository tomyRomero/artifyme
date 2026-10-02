import { Text } from 'react-native';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const NAME = 'ArtifyMe';

interface WordmarkProps {
  size?: 'sm' | 'lg';
}

// One Text element, so screen readers say "ArtifyMe" rather than spelling it
export function Wordmark({ size = 'sm' }: WordmarkProps) {
  const { rainbow } = useTheme();
  const fontSize = size === 'lg' ? 40 : 24;

  return (
    <Text
      accessibilityLabel={NAME}
      accessibilityRole="header"
      // A logo in a fixed-height bar, so it grows only a little with the text size
      maxFontSizeMultiplier={1.2}
      style={{ fontFamily: fonts.signature, fontSize, lineHeight: fontSize * 1.4 }}
    >
      {[...NAME].map((letter, index) => (
        <Text key={index} style={{ color: rainbow[index % rainbow.length] }}>
          {letter}
        </Text>
      ))}
    </Text>
  );
}
