import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { router } from 'expo-router';
import * as yup from 'yup';
import { register, signIn } from '@/api/account';
import { AppText, Banner, Button, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useForm } from '@/hooks/use-form';
import { errorMessage } from '@/lib/alerts';
import { email, newPassword, passwordHint, personName } from '@/lib/validation';
import { spacing } from '@/theme/tokens';

const rules = yup.object({
  firstName: personName('First name'),
  lastName: personName('Last name'),
  email,
  password: newPassword,
});

export default function CreateAccountScreen() {
  const form = useForm(rules, { firstName: '', lastName: '', email: '', password: '' });
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastNameInput = useRef<TextInput>(null);
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);

  const submit = async () => {
    if (!form.validate()) {
      return;
    }
    setFailure(null);
    setBusy(true);
    const { values } = form;
    try {
      await register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      await signIn(values.email.trim(), values.password);
      router.back();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll edges={['top', 'bottom']} header={<ScreenHeader close />}>
      <View style={styles.content}>
        <View style={styles.intro}>
          <AppText variant="title1" accessibilityRole="header">
            Create your account
          </AppText>
          <AppText color="inkMuted">Your artworks are kept in your account, ready on any phone you sign in on.</AppText>
        </View>

        {failure && <Banner tone="error" message={failure} />}

        <TextField
          label="First name"
          {...form.field('firstName')}
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => lastNameInput.current?.focus()}
        />
        <TextField
          ref={lastNameInput}
          label="Last name"
          {...form.field('lastName')}
          autoComplete="family-name"
          textContentType="familyName"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailInput.current?.focus()}
        />
        <TextField
          ref={emailInput}
          label="Email"
          {...form.field('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordInput.current?.focus()}
        />
        <TextField
          ref={passwordInput}
          label="Password"
          helper={passwordHint}
          {...form.field('password')}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <Button size="lg" label="Create account" onPress={submit} loading={busy} />
        <View style={styles.switch}>
          <AppText color="inkMuted">Already have an account?</AppText>
          <Button variant="ghost" label="Sign in" onPress={() => router.replace('/login')} />
        </View>
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
  switch: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
