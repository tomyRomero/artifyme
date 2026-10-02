import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BeforeAfter } from '@/components/artwork/BeforeAfter';
import { AppText, Button, Screen, ScreenHeader, Wordmark } from '@/components/ui';
import { appVersion } from '@/lib/device';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const STEPS = [
  { title: 'Sketch anything', body: 'Draw on the canvas with your finger: a few lines are enough.' },
  {
    title: 'Say what it is',
    body: 'A few words tell the painter what your lines are meant to be. Add a style if you like.',
  },
  {
    title: 'Watch it come to life',
    body: 'The painting forms step by step, following your lines, and waits in your gallery.',
  },
];

export default function AboutScreen() {
  const { colors } = useTheme();

  return (
    <Screen scroll edges={['top', 'bottom']} header={<ScreenHeader close title="About" />}>
      <View style={styles.content}>
        <View style={styles.intro}>
          <Wordmark size="lg" />
          <AppText variant="title2">Dive into your creativity</AppText>
          <AppText color="inkMuted">
            Discover a new love for sketching and doodling as ArtifyMe turns your drawings into artworks with AI.
          </AppText>
        </View>

        <BeforeAfter />

        <View style={styles.steps}>
          {STEPS.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <View style={[styles.number, { backgroundColor: colors.primaryTonal }]}>
                <AppText variant="headline" color="onPrimaryTonal">
                  {index + 1}
                </AppText>
              </View>
              <View style={styles.stepWords}>
                <AppText variant="headline">{step.title}</AppText>
                <AppText color="inkMuted">{step.body}</AppText>
              </View>
            </View>
          ))}
        </View>

        <AppText variant="footnote" color="inkMuted">
          The painting is done by Stable Diffusion with ControlNet, which follows the lines of your sketch.
        </AppText>

        <Button size="lg" label="Start drawing" onPress={() => router.replace('/studio')} />
        <Button variant="ghost" label="Made by Tomy F. Romero" onPress={() => router.replace('/contact')} />
        <AppText variant="footnote" color="inkMuted" style={styles.centered}>
          Version {appVersion()}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  intro: {
    gap: spacing.sm,
  },
  steps: {
    gap: spacing.lg,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  number: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepWords: {
    flex: 1,
    gap: spacing.xxs,
  },
  centered: {
    textAlign: 'center',
  },
});
