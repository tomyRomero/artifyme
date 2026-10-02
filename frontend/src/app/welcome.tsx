import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { BeforeAfter } from '@/components/artwork/BeforeAfter';
import { AppText, Button, Screen } from '@/components/ui';
import { DrawingCouch } from '@/components/welcome/DrawingCouch';
import { useReduceMotion } from '@/hooks/use-accessibility';
import { usePreferences } from '@/lib/preferences';
import { durations, easeOut } from '@/theme/motion';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const PAGES: { title: string; body: string; picture: (showing: boolean) => ReactNode }[] = [
  {
    title: 'Sketch anything',
    body: 'Draw with your finger. A few simple lines are all it takes.',
    picture: (showing) => (
      <Frame>
        <DrawingCouch active={showing} />
      </Frame>
    ),
  },
  {
    title: 'Say what it is',
    body: 'A few words tell the painter what your lines are meant to be.',
    picture: (showing) => <SampleDescription typing={showing} />,
  },
  {
    title: 'Watch it come to life',
    body: "It's painted from your sketch, following your lines, and kept in your gallery.",
    picture: () => <BeforeAfter />,
  },
];

const SAMPLE_WORDS = 'A comfy gray couch';
const TYPING_PAUSE_MS = 500;
const LETTER_MS = 60;

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const preferences = usePreferences();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  const finish = (startDrawing: boolean) => {
    preferences.finishWelcome();
    if (startDrawing) {
      router.replace('/studio');
    } else {
      router.back();
    }
  };

  const next = () => {
    if (last) {
      finish(true);
      return;
    }
    pager.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <View style={styles.header}>
        <Button variant="ghost" label="Skip" onPress={() => finish(false)} />
      </View>

      <ScrollView
        ref={pager}
        testID="welcome-pages"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
      >
        {PAGES.map((item, index) => (
          // Scrolls at the largest text sizes
          <ScrollView
            key={item.title}
            style={{ width }}
            contentContainerStyle={styles.page}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.picture}>{item.picture(index === page)}</View>
            <View style={styles.words}>
              <AppText
                variant="title1"
                accessibilityRole="header"
                accessibilityLabel={`${item.title}. Page ${index + 1} of ${PAGES.length}`}
              >
                {item.title}
              </AppText>
              <AppText color="inkMuted">{item.body}</AppText>
            </View>
          </ScrollView>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Dots page={page} />
        <Button size="lg" label={last ? 'Start drawing' : 'Next'} onPress={next} />
      </View>
    </Screen>
  );
}

function Dots({ page }: { page: number }) {
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {PAGES.map((item, index) => (
        <Dot key={item.title} current={index === page} />
      ))}
    </View>
  );
}

function Dot({ current }: { current: boolean }) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [long] = useState(() => new Animated.Value(current ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      long.setValue(current ? 1 : 0);
      return;
    }
    // Size and color can't use the native driver
    const change = Animated.timing(long, {
      toValue: current ? 1 : 0,
      duration: durations.fast,
      easing: easeOut,
      useNativeDriver: false,
    });
    change.start();
    return () => change.stop();
  }, [current, reduceMotion, long]);

  return (
    <Animated.View
      testID={current ? 'current-dot' : 'dot'}
      style={[
        styles.dot,
        {
          width: long.interpolate({ inputRange: [0, 1], outputRange: [8, 24] }),
          backgroundColor: long.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primary] }),
        },
      ]}
    />
  );
}

function SampleDescription({ typing }: { typing: boolean }) {
  const { colors } = useTheme();
  const words = useTyped(SAMPLE_WORDS, typing);

  return (
    <View style={styles.sample} accessible accessibilityLabel={`What did you draw? ${SAMPLE_WORDS}`}>
      <AppText variant="callout">What did you draw?</AppText>
      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
        <AppText>{words}</AppText>
        <View style={[styles.caret, { backgroundColor: colors.primary }]} />
      </View>
    </View>
  );
}

function useTyped(text: string, typing: boolean): string {
  const reduceMotion = useReduceMotion();
  const [letters, setLetters] = useState(0);

  useEffect(() => {
    setLetters(0);
    if (!typing || reduceMotion) {
      return;
    }
    let typed = 0;
    let timer = setTimeout(function typeLetter() {
      typed += 1;
      setLetters(typed);
      if (typed < text.length) {
        timer = setTimeout(typeLetter, LETTER_MS);
      }
    }, TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [text, typing, reduceMotion]);

  return reduceMotion ? text : text.slice(0, letters);
}

function Frame({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.frame, { borderColor: colors.border, backgroundColor: colors.artboard }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  picture: {
    alignItems: 'stretch',
  },
  words: {
    gap: spacing.sm,
  },
  footer: {
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: radii.full,
  },
  frame: {
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  sample: {
    gap: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  caret: {
    width: 2,
    height: 22,
    marginLeft: 1,
  },
});
