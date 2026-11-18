import { View } from 'react-native';
import { transferErrorMessage, useRespondTransfer, useTransfers } from '@/lib/vehicle-care';
import { Body, Button, Card, ErrorText, H2 } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

/** Vehicles other Garix users want to transfer to me. Renders nothing when there are none. */
export function TransferInbox() {
  const transfers = useTransfers();
  const respond = useRespondTransfer();
  const incoming = transfers.data?.rows.filter((t) => t.status === 'pending' && t.to_user_id === transfers.data.userId) ?? [];
  if (incoming.length === 0) return null;

  return (
    <Card style={{ borderColor: colors.navy }}>
      <H2>Vehicle transfer{incoming.length > 1 ? 's' : ''} waiting for you</H2>
      {incoming.map((t) => (
        <View key={t.id} style={{ gap: 8 }}>
          <Body>
            <Body style={{ fontFamily: fonts.semibold }}>{t.vehicle_label}</Body> — the current owner wants to transfer it to you.
            Its service history and reminders come with it.
          </Body>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              title="Accept"
              style={{ flex: 1 }}
              loading={respond.isPending && respond.variables?.transferId === t.id && respond.variables.accept}
              onPress={() => respond.mutate({ transferId: t.id, accept: true })}
            />
            <Button
              title="Decline"
              variant="secondary"
              style={{ flex: 1 }}
              loading={respond.isPending && respond.variables?.transferId === t.id && !respond.variables.accept}
              onPress={() => respond.mutate({ transferId: t.id, accept: false })}
            />
          </View>
        </View>
      ))}
      <ErrorText>{respond.isError ? transferErrorMessage(respond.error) : null}</ErrorText>
    </Card>
  );
}
