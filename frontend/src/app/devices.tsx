import { Fragment } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { DeviceSession } from '@/api/types';
import { LoadError } from '@/components/shared/LoadError';
import { AppText, Button, ListDivider, ListRow, ListSection, Screen, ScreenHeader, Skeleton } from '@/components/ui';
import { useDevices, useSignOutDevice } from '@/hooks/use-devices';
import { alertError } from '@/lib/alerts';
import { timeAgoInSentence } from '@/lib/time';
import { spacing } from '@/theme/tokens';

export default function DevicesScreen() {
  const devices = useDevices();
  const signOut = useSignOutDevice();

  const confirmSignOut = (device: DeviceSession) =>
    Alert.alert(`Sign out ${deviceName(device)}?`, 'It will need to sign in again to see your artworks.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () =>
          signOut.mutate(device.id, { onError: (error) => alertError("Couldn't sign that device out", error) }),
      },
    ]);

  return (
    <Screen scroll edges={['top', 'bottom']} header={<ScreenHeader title="Devices" />}>
      <View style={styles.content}>
        <AppText color="inkMuted">The phones signed in to your account. Sign out one you no longer use.</AppText>

        {devices.data ? (
          <ListSection>
            {devices.data.map((device, index) => (
              <Fragment key={device.id}>
                {index > 0 && <ListDivider />}
                <ListRow
                  icon="phone-portrait-outline"
                  label={deviceName(device)}
                  detail={details(device)}
                  trailing={
                    device.current ? undefined : (
                      <Button
                        variant="ghost"
                        label="Sign out"
                        accessibilityLabel={`Sign out ${deviceName(device)}`}
                        onPress={() => confirmSignOut(device)}
                      />
                    )
                  }
                />
              </Fragment>
            ))}
          </ListSection>
        ) : devices.isError ? (
          <LoadError title="Can't load your devices" error={devices.error} onRetry={() => devices.refetch()} />
        ) : (
          <View accessible accessibilityLabel="Loading your devices" style={styles.loading}>
            <Skeleton style={styles.row} />
            <Skeleton style={styles.row} />
          </View>
        )}
      </View>
    </Screen>
  );
}

function deviceName(device: DeviceSession): string {
  return device.deviceModel ?? (device.platform === 'android' ? 'Android phone' : 'iPhone');
}

function details(device: DeviceSession): string {
  const when = device.current ? 'This device' : `Last used ${timeAgoInSentence(device.lastSeenAt)}`;
  return device.appVersion ? `${when} · Version ${device.appVersion}` : when;
}

const styles = StyleSheet.create({
  // Grows so an error can center in the space left
  content: {
    flexGrow: 1,
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  loading: {
    gap: spacing.sm,
  },
  row: {
    height: 64,
  },
});
