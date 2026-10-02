import { type ColorValue } from 'react-native';
import { router, Tabs } from 'expo-router';
import { AppText, Icon, IconButton, type IconName, Wordmark } from '@/components/ui';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

// Outline vs filled, so the selected tab doesn't rely on color alone
function tabIcon(resting: IconName, selected: IconName) {
  return function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Icon name={focused ? selected : resting} color={color} size={size} />;
  };
}

// Capped, because the tab bar's height is fixed
function tabLabel(text: string) {
  return function TabLabel({ color }: { color: ColorValue }) {
    return (
      <AppText variant="caption" maxFontSizeMultiplier={1.4} style={{ color }}>
        {text}
      </AppText>
    );
  };
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerTitle: () => <Wordmark />,
        headerTitleAlign: 'left',
        headerRight: () => (
          <IconButton
            icon="information-circle-outline"
            accessibilityLabel="About ArtifyMe"
            onPress={() => router.push('/about')}
            style={{ marginRight: spacing.sm }}
          />
        ),
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.canvas },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gallery',
          tabBarIcon: tabIcon('images-outline', 'images'),
          tabBarLabel: tabLabel('Gallery'),
        }}
      />
      {/* Create opens the studio as a modal instead */}
      <Tabs.Screen
        name="create"
        options={{ title: 'Create', tabBarIcon: tabIcon('brush-outline', 'brush'), tabBarLabel: tabLabel('Create') }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push('/studio');
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          // It has its own bar, whose title collapses as the settings scroll
          headerShown: false,
          tabBarIcon: tabIcon('person-circle-outline', 'person-circle'),
          tabBarLabel: tabLabel('Profile'),
        }}
      />
    </Tabs>
  );
}
