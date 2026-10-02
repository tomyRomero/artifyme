import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { signOut } from '@/api/account';
import type { UserProfile } from '@/api/types';
import {
  AppText,
  Button,
  ListDivider,
  ListRow,
  LargeTitleScreen,
  ListSection,
  SegmentedControl,
  Skeleton,
  SwitchRow,
} from '@/components/ui';
import { useProfile } from '@/hooks/use-profile';
import { promptBiometrics, useBiometrics } from '@/lib/biometrics';
import { appVersion, inExpoGo } from '@/lib/device';
import { useNotificationSupport, useTurnOffNotifications, useTurnOnNotifications } from '@/lib/notifications';
import { usePreferences, type Appearance } from '@/lib/preferences';
import { useSession } from '@/lib/session';
import { chunky, radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const APPEARANCES: readonly { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function ProfileScreen() {
  const signedIn = useSession().status === 'signedIn';
  const profile = useProfile();
  const preferences = usePreferences();
  const biometrics = useBiometrics();

  // Kept behind Face ID only when Face ID can open it again
  const keepFor =
    preferences.biometricSignIn && biometrics.data?.available && profile.data
      ? { email: profile.data.email }
      : undefined;

  return (
    <LargeTitleScreen title="Profile">
      <View style={styles.content}>
        {signedIn ? (
          <Identity profile={profile.data} failed={profile.isError} onRetry={() => profile.refetch()} />
        ) : (
          <SignInCard />
        )}

        <ListSection title="Appearance">
          <View style={styles.inset}>
            <SegmentedControl
              accessibilityLabel="Appearance"
              options={APPEARANCES}
              value={preferences.appearance}
              onChange={preferences.setAppearance}
            />
          </View>
          <ListDivider />
          <SwitchRow
            icon="pulse-outline"
            label="Haptics"
            value={preferences.haptics}
            onValueChange={preferences.setHaptics}
          />
        </ListSection>

        {signedIn && <SecuritySection />}

        {signedIn && <NotificationsSection />}

        {signedIn && (
          <ListSection title="Account">
            <ListRow icon="phone-portrait-outline" label="Devices" onPress={() => router.push('/devices')} />
            <ListDivider />
            <ListRow icon="key-outline" label="Change password" onPress={() => router.push('/password')} />
            <ListDivider />
            <ListRow icon="log-out-outline" label="Sign out" destructive onPress={() => signOut(keepFor)} />
            <ListDivider />
            <ListRow
              icon="trash-outline"
              label="Delete account"
              destructive
              onPress={() => router.push('/delete-account')}
            />
          </ListSection>
        )}

        <ListSection title="About">
          <ListRow icon="information-circle-outline" label="About ArtifyMe" onPress={() => router.push('/about')} />
          <ListDivider />
          <ListRow icon="person-outline" label="Contact the developer" onPress={() => router.push('/contact')} />
        </ListSection>

        <AppText variant="footnote" color="inkMuted" style={styles.version}>
          ArtifyMe {appVersion()}
        </AppText>
      </View>
    </LargeTitleScreen>
  );
}

function SecuritySection() {
  const preferences = usePreferences();
  const biometrics = useBiometrics();
  const available = biometrics.data?.available ?? false;
  const name = biometrics.data?.name ?? 'Face ID';

  // Asking once first proves it works, so it can't shut its owner out
  const turnOn = (set: (on: boolean) => void) => async (on: boolean) => {
    if (!on) {
      set(false);
    } else if (await promptBiometrics(`Use ${name} with ArtifyMe`)) {
      set(true);
    }
  };

  const footer = available
    ? `Sign back in with ${name} after signing out, without your password. The lock asks for ${name} or your passcode when ArtifyMe opens.`
    : inExpoGo()
      ? "Expo Go can't use Face ID. It works in the installed app."
      : `Set up ${name} in the phone's Settings to use it.`;

  return (
    <ListSection title="Security" footer={biometrics.data ? footer : undefined}>
      <SwitchRow
        icon="scan-outline"
        label={`Sign in with ${name}`}
        value={preferences.biometricSignIn && available}
        onValueChange={turnOn(preferences.setBiometricSignIn)}
        disabled={!available}
      />
      <ListDivider />
      <SwitchRow
        icon="lock-closed-outline"
        label={`Lock with ${name}`}
        value={preferences.appLock && available}
        onValueChange={turnOn(preferences.setAppLock)}
        disabled={!available}
      />
    </ListSection>
  );
}

function NotificationsSection() {
  const preferences = usePreferences();
  const support = useNotificationSupport().data;
  const turnOn = useTurnOnNotifications();
  const turnOff = useTurnOffNotifications();
  const allowed = support?.available === true && support.allowed;

  const footer = !support
    ? undefined
    : support.available
      ? support.allowed || support.canAsk
        ? 'A notification when an artwork finishes painting, so you can leave the app while it paints.'
        : 'Notifications are off for ArtifyMe in Settings.'
      : support.reason === 'expo-go'
        ? "Expo Go can't receive notifications. They work in the installed app."
        : "This build isn't set up for notifications.";

  return (
    <ListSection title="Notifications" footer={footer}>
      <SwitchRow
        icon="notifications-outline"
        label="When an artwork is ready"
        value={preferences.artworkNotifications && allowed}
        onValueChange={(on) => (on ? turnOn() : turnOff())}
        disabled={support?.available !== true}
      />
    </ListSection>
  );
}

function Identity({
  profile,
  failed,
  onRetry,
}: {
  profile: UserProfile | undefined;
  failed: boolean;
  onRetry: () => void;
}) {
  const { colors } = useTheme();

  if (!profile && failed) {
    return (
      <View style={styles.identity}>
        <AppText color="inkMuted" style={styles.identityWords}>
          {"Your name and email couldn't be loaded."}
        </AppText>
        <Button variant="ghost" label="Retry" onPress={onRetry} />
      </View>
    );
  }
  if (!profile) {
    return (
      <View accessible accessibilityLabel="Loading your profile" style={styles.identity}>
        <Skeleton style={styles.avatar} />
        <View style={styles.identityWords}>
          <Skeleton style={{ height: 22, width: '60%' }} />
          <Skeleton style={{ height: 16, width: '80%' }} />
        </View>
      </View>
    );
  }

  const name = `${profile.firstName} ${profile.lastName}`;
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  return (
    <View accessible accessibilityLabel={`Signed in as ${name}, ${profile.email}`} style={styles.identity}>
      <View style={[styles.avatar, { backgroundColor: colors.primaryTonal }]}>
        <AppText variant="title2" color="onPrimaryTonal">
          {initials}
        </AppText>
      </View>
      <View style={styles.identityWords}>
        <AppText variant="title2">{name}</AppText>
        <AppText variant="subhead" color="inkMuted">
          {profile.email}
        </AppText>
      </View>
    </View>
  );
}

function SignInCard() {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
      <AppText variant="title2" accessibilityRole="header">
        Sign in to keep your art
      </AppText>
      <AppText color="inkMuted">Your artworks are saved to your account, ready on any phone you sign in on.</AppText>
      <Button label="Sign in" onPress={() => router.push('/login')} />
      <Button variant="ghost" label="Create an account" onPress={() => router.push('/signup')} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  inset: {
    padding: spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityWords: {
    flex: 1,
    gap: spacing.xxs,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: chunky.outlineWidth,
    borderRadius: radii.lg,
  },
  version: {
    textAlign: 'center',
  },
});
