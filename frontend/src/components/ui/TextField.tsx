import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { radii, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { Icon } from './Icon';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  helper?: string;
  error?: string;
  ref?: Ref<TextInput>;
}

export function TextField({ label, helper, error, secureTextEntry, ref, onFocus, onBlur, ...input }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.borderStrong;

  return (
    <View style={styles.field}>
      {/* The input carries the label for screen readers, so it isn't read twice */}
      <AppText variant="callout" accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </AppText>
      {/* The focus ring only changes color, so focusing doesn't shift the layout */}
      <View style={[styles.ring, { borderColor: focused ? colors.primary : 'transparent' }]}>
        <View style={[styles.box, { backgroundColor: colors.surface, borderColor }]}>
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            placeholderTextColor={colors.inkMuted}
            selectionColor={colors.primary}
            secureTextEntry={secureTextEntry && !revealed}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            style={[styles.input, { color: colors.ink }]}
            {...input}
          />
          {secureTextEntry && (
            <IconButton
              icon={revealed ? 'eye-off-outline' : 'eye-outline'}
              accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
              color="inkMuted"
              onPress={() => setRevealed((shown) => !shown)}
            />
          )}
        </View>
      </View>
      {error ? (
        <View style={styles.message} accessible accessibilityRole="alert" accessibilityLabel={error}>
          <Icon name="alert-circle" size={16} color={colors.danger} />
          <AppText variant="footnote" color="danger" style={styles.messageText}>
            {error}
          </AppText>
        </View>
      ) : helper ? (
        <AppText variant="footnote" color="inkMuted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  ring: {
    borderWidth: 2,
    borderRadius: radii.md + 2,
    marginHorizontal: -2,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  // No lineHeight: on iOS it pushes single-line text off center
  input: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    paddingHorizontal: spacing.lg - 1,
    paddingVertical: spacing.md,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  messageText: {
    flexShrink: 1,
  },
});
