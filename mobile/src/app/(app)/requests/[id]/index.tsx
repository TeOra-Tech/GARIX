import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  DELETABLE_REQUEST_STATUSES,
  EDITABLE_REQUEST_STATUSES,
  requestActionError,
  useAcceptQuote,
  useDeleteRequest,
  useMyRequest,
  useRequestQuotes,
  vehicleName,
  type QuoteWithGarage,
} from '@/lib/queries';
import { URGENCY_LABELS } from '@/shared/validation/request';
import { formatEur } from '@/shared/vat';
import { Body, Button, Card, ErrorText, H1, H2, Loading, Muted, Pill, Screen } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });

function QuoteCard({ q, now, canAccept, accepted, onAccept, accepting }: {
  q: QuoteWithGarage; now: number; canAccept: boolean; accepted: boolean; onAccept: () => void; accepting: boolean;
}) {
  const expired = new Date(q.valid_until).getTime() < now;
  const rating = q.garages?.avg_rating ? `${Number(q.garages.avg_rating).toFixed(1)} ★ (${q.garages.review_count ?? 0})` : 'No reviews yet';
  return (
    <Card style={accepted ? { borderColor: colors.navy, borderWidth: 2 } : q.status !== 'submitted' && !accepted ? { opacity: 0.6 } : undefined}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Body style={{ fontFamily: fonts.semibold }}>{q.garages?.name ?? 'Garage'}</Body>
          <Muted>{rating}</Muted>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Body style={{ fontFamily: fonts.bold, color: colors.navy, fontSize: 18 }}>{formatEur(Number(q.grand_total ?? 0))}</Body>
          <Muted>incl. VAT</Muted>
        </View>
      </View>
      {q.is_priority && <Pill text="Priority quote" tone="success" />}
      <View style={{ gap: 2 }}>
        {[
          ['Labour', formatEur(Number(q.labour_cost))],
          [`VAT on labour (${(Number(q.labour_vat_rate) * 100).toFixed(1).replace('.0', '')}%)`, formatEur(Number(q.labour_vat ?? 0))],
          ['Parts', formatEur(Number(q.parts_cost))],
          [`VAT on parts (${(Number(q.parts_vat_rate) * 100).toFixed(0)}%)`, formatEur(Number(q.parts_vat ?? 0))],
        ].map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>{k}</Muted>
            <Muted style={{ color: colors.charcoal }}>{v}</Muted>
          </View>
        ))}
      </View>
      {q.quote_items.length > 0 && (
        <View style={{ gap: 2 }}>
          {q.quote_items.map((i) => (
            <Muted key={i.id}>• {i.description} × {i.quantity}</Muted>
          ))}
        </View>
      )}
      <Muted>
        {[
          q.earliest_start_date ? `Can start ${fmtDate(q.earliest_start_date)}` : null,
          q.estimated_duration_hours ? `About ${q.estimated_duration_hours} h` : null,
          expired ? 'Expired' : `Valid until ${fmtDate(q.valid_until)}`,
        ].filter(Boolean).join(' · ')}
      </Muted>
      {q.warranty_info ? <Muted>Warranty: {q.warranty_info}</Muted> : null}
      {q.notes ? <Body>{q.notes}</Body> : null}
      {accepted && <Pill text="Accepted" tone="success" />}
      {canAccept && q.status === 'submitted' && !expired && <Button title="Accept this quote" onPress={onAccept} loading={accepting} />}
    </Card>
  );
}

export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = useMyRequest(id);
  const quotes = useRequestQuotes(id);
  const accept = useAcceptQuote(id);
  const remove = useDeleteRequest(id);
  const [now] = useState(() => Date.now());
  const r = request.data;

  if (request.isPending) return <Screen edges={['bottom']}><Loading /></Screen>;
  if (!r) return <Screen edges={['bottom']}><ErrorText>Could not load this request.</ErrorText></Screen>;

  const quoteCount = quotes.data?.length ?? 0;
  const canAccept = ['open', 'quoted'].includes(r.status);
  const sorted = [...(quotes.data ?? [])].sort(
    (a, b) => Number(b.is_priority) - Number(a.is_priority) || Number(a.grand_total) - Number(b.grand_total),
  );

  function confirmAccept(q: QuoteWithGarage) {
    Alert.alert(
      `Accept ${q.garages?.name ?? 'this garage'}’s quote?`,
      `${formatEur(Number(q.grand_total ?? 0))} including VAT. The other quotes will be declined and the garage will be in touch.`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Accept', onPress: () => accept.mutate(q.id) },
      ],
    );
  }

  function confirmDelete() {
    const hasQuotes = quoteCount > 0;
    Alert.alert(
      hasQuotes ? 'Cancel this request?' : 'Delete this request?',
      hasQuotes
        ? 'Garages have already quoted, so the request will be closed rather than erased. We’ll let them know.'
        : 'The request and its photos will be permanently deleted.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: hasQuotes ? 'Cancel request' : 'Delete',
          style: 'destructive',
          onPress: () => remove.mutate(undefined, { onSuccess: (outcome) => outcome === 'deleted' && router.back() }),
        },
      ],
    );
  }

  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: 6 }}>
        <H1>{r.title}</H1>
        <Muted>
          {[r.vehicles ? `${vehicleName(r.vehicles)} (${r.vehicles.registration_number})` : null, URGENCY_LABELS[r.urgency as keyof typeof URGENCY_LABELS], r.location_town]
            .filter(Boolean).join(' · ')}
        </Muted>
        <Pill text={r.status.replace('_', ' ')} />
      </View>
      <Body>{r.description}</Body>

      {r.status === 'accepted' && (
        <Card style={{ backgroundColor: '#EEF2FA', borderColor: colors.navy }}>
          <Body>Quote accepted — the garage will be in touch. You can message them on garix.ie for now.</Body>
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {EDITABLE_REQUEST_STATUSES.includes(r.status) && (
          <Button title="Edit" variant="secondary" style={{ flex: 1 }} onPress={() => router.push(`/requests/${id}/edit`)} />
        )}
        {DELETABLE_REQUEST_STATUSES.includes(r.status) && (
          <Button title={quoteCount > 0 ? 'Cancel request' : 'Delete'} variant="dangerOutline" style={{ flex: 1 }} onPress={confirmDelete} loading={remove.isPending} />
        )}
      </View>
      <ErrorText>{remove.isError ? requestActionError(remove.error) : null}</ErrorText>

      <H2>Quotes{quoteCount ? ` (${quoteCount})` : ''}</H2>
      {quotes.isPending && <Loading />}
      {quoteCount === 0 && !quotes.isPending && (
        <Muted>No quotes yet. Garages near you can see your request — we’ll notify you when the first quote lands.</Muted>
      )}
      <ErrorText>{accept.isError ? 'Could not accept that quote — it may have expired. Pull down to refresh and try again.' : null}</ErrorText>
      {sorted.map((q) => (
        <QuoteCard
          key={q.id}
          q={q}
          now={now}
          canAccept={canAccept}
          accepted={r.accepted_quote_id === q.id || q.status === 'accepted'}
          accepting={accept.isPending && accept.variables === q.id}
          onAccept={() => confirmAccept(q)}
        />
      ))}
    </Screen>
  );
}
