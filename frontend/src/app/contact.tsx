import { Linking, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { AppText, type IconName, ListDivider, ListRow, ListSection, Screen, ScreenHeader } from '@/components/ui';
import { chunky, radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const EMAIL = 'tomyfletcher99@hotmail.com';

const TAGS = ['C#', 'ASP.NET Core', 'React', 'React Native', 'TypeScript', 'SQL Server', 'Azure', 'AWS'];

const STATS = [
  { label: 'Based in', value: 'Ocala, FL', spoken: 'Ocala, Florida' },
  { label: 'Works on', value: 'Full stack', spoken: 'Full stack' },
  { label: 'Languages', value: 'EN · ES', spoken: 'English and Spanish' },
];

const LINKS: { label: string; icon: IconName; url: string }[] = [
  { label: 'LinkedIn', icon: 'logo-linkedin', url: 'https://www.linkedin.com/in/tomyromero/' },
  { label: 'GitHub', icon: 'logo-github', url: 'https://github.com/tomyRomero' },
  { label: 'Portfolio site', icon: 'globe-outline', url: 'https://tomyromero.vercel.app' },
];

export default function ContactScreen() {
  const { colors } = useTheme();

  return (
    <Screen scroll edges={['top', 'bottom']} header={<ScreenHeader close title="Contact" />}>
      <View style={styles.content}>
        <View style={styles.profile}>
          <Image
            source={require('@/assets/images/headshot.jpg')}
            style={[styles.photo, { borderColor: colors.outline }]}
            accessibilityLabel="Tomy F. Romero"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.profileWords}>
            <AppText variant="title1" accessibilityRole="header">
              Tomy F. Romero
            </AppText>
            <AppText color="inkMuted">Full-Stack Software Engineer</AppText>
          </View>
        </View>

        <AppText>
          I build home care software at MEDsys, working across C#/.NET services, React frontends and the SQL Server
          behind scheduling, billing and authorizations. Nights and weekends I ship my own projects end to end, like
          this one.
        </AppText>

        <View style={styles.tags} accessibilityLabel={`Skills: ${TAGS.join(', ')}`} accessible>
          {TAGS.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.primaryTonal }]}>
              <AppText variant="caption" color="onPrimaryTonal">
                {tag}
              </AppText>
            </View>
          ))}
        </View>

        <View style={[styles.stats, { borderColor: colors.border }]}>
          {STATS.map(({ label, value, spoken }) => (
            <View key={label} style={styles.stat} accessible accessibilityLabel={`${label}: ${spoken}`}>
              <AppText variant="footnote" color="inkMuted">
                {label}
              </AppText>
              <AppText variant="headline">{value}</AppText>
            </View>
          ))}
        </View>

        <AppText color="inkMuted">
          Want to talk shop about .NET, React or SQL, or ask about one of my projects? Email is the fastest way to reach
          me.
        </AppText>

        <ListSection>
          <ListRow icon="mail-outline" label={EMAIL} onPress={() => Linking.openURL(`mailto:${EMAIL}`)} />
          {LINKS.map((link) => (
            <View key={link.label}>
              <ListDivider />
              <ListRow icon={link.icon} label={link.label} onPress={() => WebBrowser.openBrowserAsync(link.url)} />
            </View>
          ))}
        </ListSection>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    borderWidth: chunky.outlineWidth,
  },
  profileWords: {
    flex: 1,
    gap: spacing.xs,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
});
