import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Alert, StyleSheet, View, type TextInput } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as yup from 'yup';
import { signIn, signInWithSaved } from '@/api/account';
import { AppText, Banner, Button, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useForm } from '@/hooks/use-form';
import { errorMessage } from '@/lib/alerts';
import { promptBiometrics, useBiometrics } from '@/lib/biometrics';
import { usePreferences } from '@/lib/preferences';
import { session } from '@/lib/session';
import { email } from '@/lib/validation';
import { spacing } from '@/theme/tokens';

const rules = yup.object({
  email,
  password: yup.string().required('Password is required'),
});

const savedSignIn = ['saved-sign-in'];

export default function SignInScreen() {
  const form = useForm(rules, { email: '', password: '' });
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState<'password' | 'biometrics' | null>(null);
  const passwordInput = useRef<TextInput>(null);
  const preferences = usePreferences();
  const queryClient = useQueryClient();

  const biometrics = useBiometrics().data;
  const name = biometrics?.name ?? 'Face ID';
  const stored = useQuery({ queryKey: savedSignIn, queryFn: () => session.saved(), gcTime: 0 });
  const saved = biometrics?.available ? (stored.data ?? null) : null;

  const signInWithBiometrics = async () => {
    setFailure(null);
    setBusy('biometrics');
    try {
      const outcome = await signInWithSaved('Sign in to ArtifyMe');
      if (outcome === 'signedIn') {
        router.back();
      } else if (outcome === 'ended') {
        await queryClient.invalidateQueries({ queryKey: savedSignIn });
        setFailure(`${name} sign-in has ended. Sign in with your password.`);
      }
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  // Asked once on opening. The email is filled in too, for when Face ID is turned down.
  const askOnOpening = useEffectEvent((savedEmail: string) => {
    form.setValue('email', savedEmail);
    signInWithBiometrics();
  });
  const asked = useRef(false);
  useEffect(() => {
    if (saved && !asked.current) {
      asked.current = true;
      askOnOpening(saved.email);
    }
  }, [saved]);

  const forget = async () => {
    await session.forgetSaved();
    await queryClient.invalidateQueries({ queryKey: savedSignIn });
    form.setValue('email', '');
  };

  const submit = async () => {
    if (!form.validate()) {
      return;
    }
    setFailure(null);
    setBusy('password');
    try {
      await signIn(form.values.email.trim(), form.values.password);
      if (biometrics?.available && !preferences.biometricSignIn && !preferences.biometricSignInOffered) {
        offerBiometricSignIn(name, (on) =>
          on ? preferences.setBiometricSignIn(true) : preferences.dismissBiometricSignInOffer(),
        );
      }
      router.back();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll edges={['top', 'bottom']} header={<ScreenHeader close />}>
      <View style={styles.content}>
        <View style={styles.intro}>
          <AppText variant="title1" accessibilityRole="header">
            Welcome back
          </AppText>
          <AppText color="inkMuted">Sign in to make artworks and keep them in your gallery.</AppText>
        </View>

        {failure && <Banner tone="error" message={failure} />}

        {saved && (
          <View style={styles.saved}>
            <Button
              size="lg"
              icon="scan-outline"
              label={`Sign in with ${name}`}
              accessibilityLabel={`Sign in as ${saved.email} with ${name}`}
              onPress={signInWithBiometrics}
              loading={busy === 'biometrics'}
              disabled={busy === 'password'}
            />
            <View style={styles.row}>
              <AppText variant="subhead" color="inkMuted">
                {saved.email}
              </AppText>
              <Button variant="ghost" label="Not you?" accessibilityLabel={`Forget ${saved.email}`} onPress={forget} />
            </View>
          </View>
        )}

        <TextField
          label="Email"
          {...form.field('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          // "username" pairs it with the password for Keychain autofill
          textContentType="username"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordInput.current?.focus()}
        />
        <TextField
          ref={passwordInput}
          label="Password"
          {...form.field('password')}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <Button
          size="lg"
          variant={saved ? 'secondary' : 'primary'}
          label="Sign in"
          onPress={submit}
          loading={busy === 'password'}
          disabled={busy === 'biometrics'}
        />
        <View style={styles.row}>
          <AppText color="inkMuted">New to ArtifyMe?</AppText>
          <Button variant="ghost" label="Create an account" onPress={() => router.replace('/signup')} />
        </View>
      </View>
    </Screen>
  );
}

function offerBiometricSignIn(name: string, answer: (on: boolean) => void) {
  Alert.alert(
    `Sign in with ${name} next time?`,
    `When you sign out, ${name} signs you back in without your password.`,
    [
      { text: 'Not now', style: 'cancel', onPress: () => answer(false) },
      { text: 'Turn on', onPress: async () => answer(await promptBiometrics(`Use ${name} with ArtifyMe`)) },
    ],
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
  saved: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
