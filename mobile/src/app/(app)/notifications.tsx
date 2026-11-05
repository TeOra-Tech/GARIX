import { useEffect } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { notificationRoute, useMarkNotificationsRead, useNotifications } from '@/lib/inbox';
import { Body, Card, ErrorText, Loading, Muted, Screen } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

const when = (d: string) => new Date(d).toLocaleString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function Notifications() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();
  const hasUnread = notifications.data?.some((n) => !n.read_at) ?? false;

  // Opening the list counts as seeing them (the unread dots stay for this visit).
  const { mutate: markAllRead } = markRead;
  useEffect(() => {
    if (hasUnread) markAllRead();
  }, [hasUnread, markAllRead]);

  return (
    <Screen edges={['bottom']}>
      {notifications.isPending && <Loading />}
      {notifications.isError && <ErrorText>Could not load notifications.</ErrorText>}
      {notifications.data?.length === 0 && <Muted>Nothing yet. We’ll let you know when a garage quotes or messages you.</Muted>}
      {notifications.data?.map((n) => {
        const route = notificationRoute(n);
        return (
          <Card
            key={n.id}
            onPress={route ? () => router.push(route as Href) : undefined}
            accessibilityLabel={`${n.read_at ? '' : 'Unread. '}${n.title}`}
          >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              {!n.read_at && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.navy, marginTop: 8 }} />}
              <View style={{ flex: 1, gap: 4 }}>
                <Body style={{ fontFamily: n.read_at ? fonts.medium : fonts.semibold }}>{n.title}</Body>
                {n.body ? <Muted>{n.body}</Muted> : null}
                <Muted style={{ fontSize: 12 }}>{when(n.created_at)}</Muted>
              </View>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
