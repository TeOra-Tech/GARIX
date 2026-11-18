import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useGarage } from '@/lib/garage-context';
import { useGarageConversations } from '@/lib/garage';
import { useUnreadCounts } from '@/lib/inbox';
import { Body, Card, ErrorText, Loading, Muted, Screen } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

const when = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export default function GarageMessages() {
  const { garage } = useGarage();
  const conversations = useGarageConversations(garage?.id);
  const unread = useUnreadCounts();

  return (
    <Screen edges={[]}>
      {conversations.isPending && <Loading />}
      {conversations.isError && <ErrorText>Could not load your messages. Reopen the tab to retry.</ErrorText>}
      {conversations.data?.length === 0 && <Muted>No conversations yet. Customers can message you once you’ve quoted on their request.</Muted>}
      {conversations.data?.map((c) => {
        const count = unread.data?.get(c.id) ?? 0;
        const name = c.customer?.full_name ?? 'Customer';
        return (
          <Card key={c.id} onPress={() => router.push(`/garage/messages/${c.id}`)} accessibilityLabel={`${name}${count ? `, ${count} unread` : ''}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Body style={{ flex: 1, fontFamily: count ? fonts.bold : fonts.semibold }}>{name}</Body>
              {count > 0 && (
                <View style={{ backgroundColor: colors.navy, borderRadius: 999, minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' }}>
                  <Text style={{ color: colors.white, fontFamily: fonts.semibold, fontSize: 12 }}>{count}</Text>
                </View>
              )}
            </View>
            {c.service_requests?.title ? <Muted>Re: {c.service_requests.title}</Muted> : null}
            <Muted>{when(c.last_message_at ?? c.created_at)}</Muted>
          </Card>
        );
      })}
    </Screen>
  );
}
