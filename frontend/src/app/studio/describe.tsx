import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { updateArtwork } from '@/api/artworks';
import type { Style } from '@/api/types';
import { Sketch } from '@/components/canvas/Sketch';
import { SketchExport, type SketchCapture } from '@/components/canvas/SketchExport';
import { AppText, Banner, Button, Chip, IconButton, Screen, TextField } from '@/components/ui';
import { artworkKeys } from '@/hooks/use-artworks';
import { useFieldErrors } from '@/hooks/use-form';
import { useStyles } from '@/hooks/use-styles';
import { errorMessage } from '@/lib/alerts';
import { useSession } from '@/lib/session';
import { useCloseStudio, useStudio, type Words } from '@/lib/studio';
import { suggestTitle, TITLE_MAX_LENGTH } from '@/lib/title';
import { artworkWords } from '@/lib/validation';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const PREVIEW = { width: 96, height: 144 };

export default function DescribeScreen() {
  const studio = useStudio();
  const { drawing, words, artwork } = studio;
  const close = useCloseStudio();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const signedIn = useSession().status === 'signedIn';

  const fields = useFieldErrors<Words>(artworkWords);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sketch = useRef<SketchCapture>(null);

  const styleOptions = useStyles().data ?? [];
  const style = styleOptions.find((candidate) => candidate.id === words.style) ?? null;

  const editing = artwork !== null;
  const styleChanged = editing && words.style !== artwork.style;
  const wordsOnly = editing && !drawing.changed && !styleChanged;
  // The title follows the description until it's changed by hand
  const titleIsSuggested = words.title === '' || words.title === suggestTitle(words.description);

  const change = (next: Words) => {
    studio.setWords(next);
    fields.recheck(next);
  };
  const changeDescription = (description: string) =>
    change({ ...words, description, title: titleIsSuggested ? suggestTitle(description) : words.title });
  const changeTitle = (title: string) => change({ ...words, title });

  const submit = async () => {
    if (!fields.validate(words)) {
      return;
    }
    if (!signedIn) {
      router.push('/login');
      return;
    }

    setFailure(null);
    if (wordsOnly) {
      setSaving(true);
      try {
        await updateArtwork(artwork.id, { title: words.title.trim(), description: words.description.trim() });
        await queryClient.invalidateQueries({ queryKey: artworkKeys.all });
        close();
      } catch (error) {
        setFailure(errorMessage(error));
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      studio.generate(await sketch.current!.capture());
      router.push('/studio/generation');
    } catch {
      setFailure("Couldn't read your sketch. Try again.");
    }
  };

  return (
    <Screen
      scroll
      edges={['top', 'bottom']}
      header={
        <View style={styles.header}>
          <IconButton icon="chevron-back" accessibilityLabel="Back to the sketch" onPress={() => router.back()} />
        </View>
      }
    >
      <View style={styles.content}>
        <AppText variant="title1" accessibilityRole="header">
          What did you draw?
        </AppText>
        <View style={styles.intro}>
          <View
            style={[styles.preview, { borderColor: colors.border }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Sketch strokes={drawing.paths} width={PREVIEW.width} height={PREVIEW.height} />
          </View>
          <AppText variant="subhead" color="inkMuted" style={styles.introText}>
            Say what it is in a few words. The image is painted from your sketch and what you write.
          </AppText>
        </View>

        {failure && <Banner tone="error" message={failure} />}

        <TextField
          label="Description"
          placeholder="A cat asleep on a red sofa"
          value={words.description}
          onChangeText={changeDescription}
          onBlur={() => fields.check('description', words)}
          error={fields.errors.description}
          multiline
          autoFocus={!editing}
          maxLength={500}
        />
        <TextField
          label="Title"
          helper={titleIsSuggested && words.title ? 'Suggested from your description' : undefined}
          value={words.title}
          onChangeText={changeTitle}
          onBlur={() => fields.check('title', words)}
          error={fields.errors.title}
          maxLength={TITLE_MAX_LENGTH}
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        {styleOptions.length > 0 && (
          <StylePicker
            options={styleOptions}
            selected={words.style}
            onSelect={(id) => studio.setWords({ ...words, style: id })}
          />
        )}
        <PromptPreview description={words.description.trim()} style={style} />

        <View style={styles.actions}>
          {editing && !wordsOnly && (
            <AppText variant="footnote" color="inkMuted">
              {drawing.changed ? 'The sketch has changed' : 'The style has changed'}, so a new image will be made.
            </AppText>
          )}
          <Button size="lg" label={submitLabel(signedIn, editing, wordsOnly)} onPress={submit} loading={saving} />
        </View>
      </View>

      <SketchExport ref={sketch} strokes={drawing.paths} />
    </Screen>
  );
}

function StylePicker({
  options,
  selected,
  onSelect,
}: {
  options: Style[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <View style={styles.styles}>
      <AppText variant="headline" accessibilityRole="header">
        Style
      </AppText>
      <View style={styles.chips}>
        <Chip label="None" selected={selected === null} onPress={() => onSelect(null)} />
        {options.map((option) => (
          <Chip
            key={option.id}
            label={option.name}
            selected={option.id === selected}
            onPress={() => onSelect(option.id)}
          />
        ))}
      </View>
    </View>
  );
}

// The style's words are highlighted, so it's clear what the chip adds
function PromptPreview({ description, style }: { description: string; style: Style | null }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.prompt, { backgroundColor: colors.surfaceMuted }]}>
      <AppText variant="caption" color="onPrimaryTonal">
        What the model reads
      </AppText>
      <AppText color={description ? 'ink' : 'inkMuted'}>
        {description || 'Your description'}
        {style && (
          <AppText
            style={{ backgroundColor: colors.highlight, color: colors.onHighlight }}
          >{`, ${style.words}`}</AppText>
        )}
      </AppText>
    </View>
  );
}

function submitLabel(signedIn: boolean, editing: boolean, wordsOnly: boolean): string {
  if (!signedIn) {
    return 'Sign in to generate';
  }
  if (wordsOnly) {
    return 'Save changes';
  }
  return editing ? 'Make a new image' : 'Generate';
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  preview: {
    borderWidth: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  introText: {
    flex: 1,
  },
  actions: {
    gap: spacing.sm,
  },
  styles: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  prompt: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
  },
});
