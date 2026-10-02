import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { chunky, radii, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { IconButton } from './IconButton';
import { Icon } from './Icon';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  accessibilityLabel: string;
  placeholder: string;
  maxLength?: number;
  busy?: boolean;
}

export function SearchField({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder,
  maxLength,
  busy = false,
}: SearchFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[styles.box, { backgroundColor: colors.surface, borderColor: focused ? colors.primary : colors.outline }]}
    >
      <View style={styles.icon}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} accessibilityLabel="Searching" />
        ) : (
          <Icon name="search" size={20} color={colors.inkMuted} />
        )}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        selectionColor={colors.primary}
        maxLength={maxLength}
        returnKeyType="search"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, { color: colors.ink }]}
      />
      {value.length > 0 && (
        <IconButton
          icon="close-circle"
          accessibilityLabel="Clear search"
          color="inkMuted"
          size={20}
          onPress={() => onChangeText('')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingLeft: spacing.md,
    borderWidth: chunky.outlineWidth,
    borderBottomWidth: chunky.outlineWidth + chunky.lip,
    borderRadius: radii.full,
  },
  icon: {
    width: 20,
    alignItems: 'center',
  },
  // No lineHeight: on iOS it pushes single-line text off center
  input: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
});
