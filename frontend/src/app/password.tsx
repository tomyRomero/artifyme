import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { router } from 'expo-router';
import * as yup from 'yup';
import { changePassword } from '@/api/account';
import { AppText, Banner, Button, EmptyState, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useForm } from '@/hooks/use-form';
import { errorMessage } from '@/lib/alerts';
import { newPassword, passwordHint } from '@/lib/validation';
import { spacing } from '@/theme/tokens';

const rules = yup.object({
  currentPassword: yup.string().required('Enter your current password'),
  newPassword,
});

export default function ChangePasswordScreen() {
  const form = useForm(rules, { currentPassword: '', newPassword: '' });
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  const newPasswordInput = useRef<TextInput>(null);

  const submit = async () => {
    if (!form.validate()) {
      return;
    }
    setFailure(null);
    setBusy(true);
    try {
      await changePassword(form.values.currentPassword, form.values.newPassword);
      setChanged(true);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (changed) {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <EmptyState
          title="Password changed"
          body="Any other phones signed in to your account were signed out. This one stays signed in."
          action={{ label: 'Done', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top', 'bottom']} header={<ScreenHeader close />}>
      <View style={styles.content}>
        <AppText variant="title1" accessibilityRole="header">
          Change password
        </AppText>

        {failure && <Banner tone="error" message={failure} />}

        <TextField
          label="Current password"
          {...form.field('currentPassword')}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => newPasswordInput.current?.focus()}
        />
        <TextField
          ref={newPasswordInput}
          label="New password"
          helper={passwordHint}
          {...form.field('newPassword')}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <Button size="lg" label="Change password" onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
