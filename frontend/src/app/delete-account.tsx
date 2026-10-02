import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as yup from 'yup';
import { deleteAccount } from '@/api/account';
import { AppText, Banner, Button, EmptyState, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useForm } from '@/hooks/use-form';
import { errorMessage } from '@/lib/alerts';
import { spacing } from '@/theme/tokens';

const rules = yup.object({
  password: yup.string().required('Enter your password'),
});

export default function DeleteAccountScreen() {
  const form = useForm(rules, { password: '' });
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const submit = async () => {
    if (!form.validate()) {
      return;
    }
    setFailure(null);
    setBusy(true);
    try {
      await deleteAccount(form.values.password);
      setDeleted(true);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (deleted) {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <EmptyState
          title="Account deleted"
          body="Your artworks and sketches are gone, and every phone was signed out. Thanks for making art with ArtifyMe."
          action={{ label: 'Done', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top', 'bottom']} header={<ScreenHeader close />}>
      <View style={styles.content}>
        <AppText variant="title1" accessibilityRole="header">
          Delete account
        </AppText>
        <AppText>
          This deletes your account and everything in it: every artwork, with its sketch. Every phone signed in to it is
          signed out.
        </AppText>
        <AppText variant="headline">{"This can't be undone."}</AppText>

        {failure && <Banner tone="error" message={failure} />}

        <TextField
          label="Password"
          helper="To be sure it's you"
          {...form.field('password')}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <Button size="lg" variant="destructive" label="Delete account" onPress={submit} loading={busy} />
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
