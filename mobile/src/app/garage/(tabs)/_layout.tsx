import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUnreadCounts } from '@/lib/inbox';
import { colors, fonts } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function GarageTabs() {
  const unread = useUnreadCounts();
  const unreadMessages = [...(unread.data?.values() ?? [])].reduce((a, b) => a + b, 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        headerTitleStyle: { fontFamily: fonts.semibold, color: colors.navy },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Requests', headerShown: false, tabBarIcon: icon('list-outline') }} />
      <Tabs.Screen name="quotes" options={{ title: 'Quotes & jobs', tabBarIcon: icon('document-text-outline') }} />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: icon('chatbubbles-outline'),
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.navy, fontFamily: fonts.semibold, fontSize: 11 },
          tabBarAccessibilityLabel: unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages',
        }}
      />
      <Tabs.Screen name="reviews" options={{ title: 'Reviews', tabBarIcon: icon('star-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Garage', tabBarIcon: icon('business-outline') }} />
    </Tabs>
  );
}
