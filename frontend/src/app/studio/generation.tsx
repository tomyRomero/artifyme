import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { isInProgress } from '@/api/generations';
import type { ArtworkDetails, Generation } from '@/api/types';
import { CompareSlider } from '@/components/artwork/CompareSlider';
import { Reveal } from '@/components/artwork/Reveal';
import { Sketch } from '@/components/canvas/Sketch';
import { AppText, Banner, Button, Icon, IconButton, ProgressBar, Screen } from '@/components/ui';
import { useArtwork } from '@/hooks/use-artworks';
import { alertError } from '@/lib/alerts';
import { useHaptics } from '@/lib/haptics';
import { useNotificationSupport, useTurnOnNotifications } from '@/lib/notifications';
import { usePreferences } from '@/lib/preferences';
import { stageOf, stageProgress, stageText, type Problem, type Stage } from '@/lib/generation-stage';
import { shareImage } from '@/lib/images';
import { ARTBOARD } from '@/lib/sketch';
import { useCloseStudio, useStudio } from '@/lib/studio';
import { chunky, radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function GenerationScreen() {
  const studio = useStudio();
  const close = useCloseStudio();
  const stage = stageOf(studio.flow.generation, studio.startError);
  const made = useArtwork(stage.kind === 'done' ? stage.artworkId : null);
  // A redrawn artwork is refetched; until then the cached one has the old image
  const artwork = made.data && !made.isFetching ? made.data : null;

  const leave = useEffectEvent(() => {
    studio.flow.reset();
    router.back();
  });
  useEffect(() => {
    if (stage.kind === 'cancelled') {
      leave();
    }
  }, [stage.kind]);

  useMilestones(stage, artwork !== null);

  return (
    <Screen
      scroll
      edges={['top', 'bottom']}
      header={
        <View style={styles.header}>
          <IconButton icon="close" accessibilityLabel="Close" onPress={close} />
        </View>
      }
    >
      {artwork ? (
        <Result artwork={artwork} />
      ) : stage.kind === 'failed' ? (
        <ProblemCard problem={stage.problem} />
      ) : (
        <Progress stage={stage} />
      )}
    </Screen>
  );
}

function Progress({ stage }: { stage: Stage }) {
  const studio = useStudio();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [cancelFailed, setCancelFailed] = useState(false);
  const generation = studio.flow.generation;
  const frames = useFrames(generation);
  // A frame from the strip, shown instead of the latest step until it's tapped again
  const [pinned, setPinned] = useState<Frame | null>(null);
  const frameWidth = Math.min(width * 0.55, 280);
  const frameSize = { width: frameWidth, height: (frameWidth * ARTBOARD.height) / ARTBOARD.width };
  const live = generation?.preview ?? null;
  const shown = pinned ?? (live && generation ? { step: generation.step, uri: live } : null);
  const text = stageText(stage);
  const support = useNotificationSupport().data;
  const notifying = usePreferences().artworkNotifications && support?.available === true && support.allowed;

  return (
    <View style={styles.progress}>
      <Framed>
        {shown ? (
          <>
            <Image source={{ uri: shown.uri }} style={frameSize} contentFit="cover" transition={400} />
            <View style={[styles.badge, { backgroundColor: colors.scrim }]}>
              {!pinned && <View style={[styles.liveDot, { backgroundColor: colors.highlight }]} />}
              <AppText variant="caption" color="onScrim">
                {pinned ? `Step ${pinned.step}` : 'Live preview'}
              </AppText>
            </View>
          </>
        ) : (
          <Sketch
            strokes={studio.sent?.paths ?? studio.drawing.paths}
            width={frameSize.width}
            height={frameSize.height}
          />
        )}
      </Framed>
      {frames.length > 0 && (
        <Filmstrip
          frames={frames}
          pinned={pinned}
          onPick={(frame) => setPinned(frame.step === pinned?.step ? null : frame)}
        />
      )}
      <View style={styles.status}>
        <AppText variant="headline" style={styles.centeredText}>
          {text}
        </AppText>
        <ProgressBar rainbow progress={stageProgress(stage)} accessibilityLabel={text} />
        <AppText variant="footnote" color="inkMuted" style={styles.centeredText}>
          {notifying
            ? "You can close this. You'll get a notification when it's ready."
            : 'You can close this. The painting carries on, and the artwork will be in your gallery.'}
        </AppText>
      </View>
      {generation && isInProgress(generation) && <NotificationOffer />}
      {cancelFailed && <Banner tone="error" message="Couldn't cancel. It may be about to finish." />}
      {generation && isInProgress(generation) && (
        <Button
          variant="secondary"
          label="Cancel"
          loading={studio.flow.isCancelling}
          onPress={() => {
            setCancelFailed(false);
            studio.flow.cancel({ onError: () => setCancelFailed(true) });
          }}
        />
      )}
    </View>
  );
}

// Offered once, while something is painting: the moment leaving the app is most tempting
function NotificationOffer() {
  const preferences = usePreferences();
  const support = useNotificationSupport().data;
  const turnOn = useTurnOnNotifications();

  if (
    support?.available !== true ||
    !support.canAsk ||
    preferences.artworkNotifications ||
    preferences.artworkNotificationsOffered
  ) {
    return null;
  }
  return (
    <Banner
      tone="info"
      message="Get a notification when it's ready?"
      action={{ label: 'Notify me', onPress: turnOn }}
      dismiss={{ label: 'Not now', onPress: preferences.dismissArtworkNotificationsOffer }}
    />
  );
}

function ProblemCard({ problem }: { problem: Problem }) {
  const studio = useStudio();
  const { colors } = useTheme();
  // Describe is only underneath when this visit sent the sketch
  const fromDescribe = studio.sent !== null;

  const describe = {
    label: 'Change the description',
    onPress: () => {
      studio.flow.reset();
      if (fromDescribe) {
        router.back();
      } else {
        router.replace('/studio/describe');
      }
    },
  };

  const primary = (() => {
    switch (problem.action) {
      case 'sign-in':
        return { label: 'Sign in', onPress: () => router.push('/login') };
      case 'describe':
        return describe;
      case 'retry':
        return fromDescribe ? { label: 'Try again', onPress: studio.sendAgain } : null;
    }
  })();

  const editSketch = () => {
    studio.flow.reset();
    router.dismissAll();
  };

  return (
    <View style={styles.centered}>
      <Icon name={problem.icon} size={48} color={colors.inkMuted} />
      <View style={styles.status}>
        <AppText variant="title2" accessibilityRole="header" style={styles.centeredText}>
          {problem.title}
        </AppText>
        <AppText color="inkMuted" style={styles.centeredText}>
          {problem.message}
        </AppText>
      </View>
      <View style={styles.actions}>
        {primary && <Button size="lg" label={primary.label} onPress={primary.onPress} />}
        {problem.reword && <Button variant="ghost" label={describe.label} onPress={describe.onPress} />}
        <Button
          variant={primary ? 'ghost' : 'primary'}
          size={primary ? 'md' : 'lg'}
          label="Edit the sketch"
          onPress={editSketch}
        />
      </View>
    </View>
  );
}

function Result({ artwork }: { artwork: ArtworkDetails }) {
  const studio = useStudio();
  const close = useCloseStudio();
  const { colors } = useTheme();
  const [loaded, setLoaded] = useState(false);

  const share = async () => {
    if (!artwork.aiImageUrl) {
      return;
    }
    try {
      await shareImage(artwork.aiImageUrl);
    } catch (error) {
      alertError("Couldn't share this image", error);
    }
  };

  const done = () => (studio.artwork ? close() : router.dismissTo('/'));

  return (
    <View style={styles.result}>
      <Reveal strokes={artwork.paths} ready={loaded}>
        <CompareSlider
          sketch={{ url: artwork.sketchImageUrl }}
          artwork={{ url: artwork.aiImageUrl }}
          accessibilityLabel={`${artwork.title}: sketch and artwork`}
          onArtworkLoad={() => setLoaded(true)}
        />
      </Reveal>
      <View>
        <AppText variant="artTitle" accessibilityRole="header">
          {artwork.title}
        </AppText>
        {artwork.description && <AppText color="inkMuted">{artwork.description}</AppText>}
      </View>
      <View style={styles.saved}>
        <Icon name="checkmark-circle" size={20} color={colors.success} />
        <AppText variant="subhead" color="success">
          Saved to your gallery
        </AppText>
      </View>
      <View style={styles.row}>
        {studio.sent && (
          <Button
            variant="secondary"
            icon="refresh"
            label="Try again"
            accessibilityLabel="Try again: a new image from the same sketch"
            onPress={studio.sendAgain}
          />
        )}
        <Button variant="secondary" icon="share-outline" label="Share" onPress={share} />
      </View>
      <Button size="lg" label="Done" onPress={done} />
    </View>
  );
}

interface Frame {
  step: number;
  uri: string;
}

// The first preview, then one about every quarter of the way
function useFrames(generation: Generation | null): Frame[] {
  const [frames, setFrames] = useState<Frame[]>([]);
  const step = generation?.step ?? 0;
  const total = generation?.totalSteps ?? 0;
  const preview = generation?.preview ?? null;

  if (preview && total > 0) {
    const last = frames.at(-1);
    if (!last || Math.floor((last.step / total) * 4) < Math.floor((step / total) * 4)) {
      setFrames([...frames, { step, uri: preview }]);
    }
  }

  return frames;
}

function Filmstrip({
  frames,
  pinned,
  onPick,
}: {
  frames: Frame[];
  pinned: Frame | null;
  onPick: (frame: Frame) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.filmstrip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <AppText variant="caption" color="inkMuted">
        Steps so far
      </AppText>
      <View style={styles.frames}>
        {frames.map((frame) => {
          const selected = frame.step === pinned?.step;
          return (
            <Pressable
              key={frame.step}
              onPress={() => onPick(frame)}
              style={styles.frame}
              testID={`frame-${frame.step}`}
            >
              <Image
                source={{ uri: frame.uri }}
                style={[
                  styles.frameImage,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    borderWidth: selected ? 3 : chunky.outlineWidth,
                  },
                ]}
                contentFit="cover"
              />
              <AppText variant="caption">{frame.step}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Framed({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.framed, { borderColor: colors.border }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </View>
  );
}

// Announce milestones only, not every step
function useMilestones(stage: Stage, ready: boolean) {
  const haptic = useHaptics();
  const announced = useRef<string | null>(null);
  const progress = stageProgress(stage) ?? 0;
  const milestone = ready
    ? 'Your artwork is ready'
    : stage.kind === 'queued'
      ? 'In line'
      : stage.kind === 'painting'
        ? progress >= 0.5
          ? 'Halfway there'
          : 'Painting'
        : stage.kind === 'failed'
          ? stage.problem.title
          : null;

  const announce = useEffectEvent((words: string) => {
    AccessibilityInfo.announceForAccessibility(words);
    if (ready) {
      haptic('success');
    } else if (stage.kind === 'failed') {
      haptic('failure');
    }
  });
  useEffect(() => {
    if (milestone && milestone !== announced.current) {
      announced.current = milestone;
      announce(milestone);
    }
  }, [milestone]);
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  // From the top, so the steps and Cancel appearing later don't shift the picture
  progress: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centeredText: {
    textAlign: 'center',
  },
  status: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  framed: {
    borderWidth: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  filmstrip: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  frames: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  frame: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  frameImage: {
    width: 44,
    height: 66,
    borderRadius: radii.sm,
  },
  result: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
