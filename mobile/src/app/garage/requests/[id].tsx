import { useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGarage } from '@/lib/garage-context';
import {
  isProSubscription,
  submitErrorMessage,
  useFeedRequest,
  useGarageQuotes,
  useGarageSubscription,
  usePlansEnabled,
  useQuoteCosts,
  useSubmitQuote,
  useVatRates,
  useWallet,
} from '@/lib/garage';
import { calculateVat, formatEur } from '@/shared/vat';
import { quoteSchema, quoteTotals } from '@/shared/validation/quote';
import { URGENCY_LABELS } from '@/shared/validation/request';
import { DateField } from '@/components/date-field';
import { Body, Button, Card, ChoiceList, ErrorText, Field, H1, H2, Input, Loading, Muted, Pill, Screen, TextField } from '@/components/ui';
import { colors, fonts, space } from '@/lib/theme';

type Item = { itemType: 'labour' | 'part'; description: string; quantity: string; unitPrice: string };
const NEW_ITEM: Item = { itemType: 'labour', description: '', quantity: '1', unitPrice: '' };

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Muted style={strong ? { color: colors.charcoal, fontFamily: fonts.semibold } : undefined}>{label}</Muted>
      <Body style={strong ? { fontFamily: fonts.bold, color: colors.navy } : undefined}>{value}</Body>
    </View>
  );
}

export default function GarageRequest() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { garage } = useGarage();
  const request = useFeedRequest(id);
  const quotes = useGarageQuotes(garage?.id);
  const rates = useVatRates();
  const costs = useQuoteCosts();
  const wallet = useWallet(garage?.id);
  const plansEnabled = usePlansEnabled().data ?? false;
  const sub = useGarageSubscription(garage?.id);
  const isPro = plansEnabled && isProSubscription(sub.data);
  const submit = useSubmitQuote();

  const [items, setItems] = useState<Item[]>([{ ...NEW_ITEM }]);
  const [isPriority, setIsPriority] = useState(false);
  const [hours, setHours] = useState('');
  const [startDate, setStartDate] = useState('');
  const [warranty, setWarranty] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const r = request.data;
  const myQuote = quotes.data?.find((q) => q.request_id === id);
  const cost = isPro ? 0 : isPriority ? costs.data?.priority ?? 5 : costs.data?.standard ?? 2;

  const parsedItems = items.map((i) => ({ itemType: i.itemType, description: i.description, quantity: Number(i.quantity) || 0, unitPrice: Number(i.unitPrice) || 0 }));
  const totals = quoteTotals(parsedItems);
  const vat = calculateVat(totals.parts, totals.labour, rates.data);

  const setItem = (i: number, patch: Partial<Item>) => setItems((all) => all.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  function send() {
    const parsed = quoteSchema.safeParse({
      items: items.map((i) => ({ itemType: i.itemType, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
      isPriority,
      estimatedDurationHours: hours,
      earliestStartDate: startDate,
      warrantyInfo: warranty,
      notes,
    });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    if (!garage) return;
    Alert.alert(
      'Send this quote?',
      `${formatEur(vat.grandTotal)} including VAT.${cost ? ` This uses ${cost} credits.` : ''}`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Send quote',
          onPress: () =>
            submit.mutate(
              { requestId: id, garageId: garage.id, data: parsed.data },
              { onSuccess: () => { Alert.alert('Quote sent', 'The customer has been notified.'); router.back(); } },
            ),
        },
      ],
    );
  }

  if (request.isPending) return <Screen edges={['bottom']}><Loading /></Screen>;
  if (!r) return <Screen edges={['bottom']}><ErrorText>This request is no longer available.</ErrorText></Screen>;

  const vehicle = r.vehicles
    ? [r.vehicles.year, r.vehicles.vehicle_makes?.name ?? r.vehicles.make_text, r.vehicles.vehicle_models?.name ?? r.vehicles.model_text].filter(Boolean).join(' ')
    : null;

  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: 6 }}>
        <H1>{r.title}</H1>
        <Muted>{[r.service_category?.name, URGENCY_LABELS[r.urgency as keyof typeof URGENCY_LABELS]].filter(Boolean).join(' · ')}</Muted>
      </View>
      <Card>
        {vehicle ? <Row label="Vehicle" value={vehicle} /> : null}
        {r.vehicles?.fuel_type ? <Row label="Fuel" value={r.vehicles.fuel_type.replace('_', ' ')} /> : null}
        {r.location_town ? <Row label="Location" value={`${r.location_town}${r.location_county ? `, Co. ${r.location_county}` : ''}`} /> : null}
        <Row label="Collection needed" value={r.collection_required ? 'Yes' : 'No'} />
        {r.budget_amount != null ? <Row label="Budget" value={formatEur(Number(r.budget_amount))} /> : null}
        {r.request_attachments.length ? <Row label="Photos" value={`${r.request_attachments.length} attached`} /> : null}
      </Card>
      <Body>{r.description}</Body>

      {myQuote ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <H2>Your quote</H2>
            <Pill text={myQuote.status} tone={myQuote.status === 'accepted' ? 'success' : 'navy'} />
          </View>
          <Row label="Total incl. VAT" value={formatEur(Number(myQuote.grand_total ?? 0))} strong />
          <Muted>Sent {new Date(myQuote.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}</Muted>
        </Card>
      ) : !['open', 'quoted'].includes(r.status) ? (
        <Muted>This request is no longer open for quotes.</Muted>
      ) : (
        <>
          <H2>Your quote</H2>
          {items.map((it, i) => (
            <Card key={i}>
              <ChoiceList
                label={`Line ${i + 1} type`}
                value={it.itemType}
                onChange={(v) => setItem(i, { itemType: v })}
                options={[{ value: 'labour', label: 'Labour' }, { value: 'part', label: 'Part' }]}
              />
              <TextField label="Description" value={it.description} onChangeText={(v) => setItem(i, { description: v })} maxLength={200}
                placeholder={it.itemType === 'labour' ? 'e.g. Replace front brake pads' : 'e.g. Front brake pads (pair)'} />
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <TextField label="Quantity" value={it.quantity} onChangeText={(v) => setItem(i, { quantity: v })} keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField label="Unit price € (ex VAT)" value={it.unitPrice} onChangeText={(v) => setItem(i, { unitPrice: v })} keyboardType="decimal-pad" />
                </View>
              </View>
              {items.length > 1 && (
                <Pressable accessibilityRole="button" onPress={() => setItems((all) => all.filter((_, j) => j !== i))} style={{ paddingVertical: 8 }}>
                  <Text style={{ fontFamily: fonts.semibold, color: colors.danger }}>Remove line</Text>
                </Pressable>
              )}
            </Card>
          ))}
          {items.length < 30 && <Button title="Add a line" variant="secondary" onPress={() => setItems((all) => [...all, { ...NEW_ITEM }])} />}

          <Card>
            <Row label="Labour" value={formatEur(vat.labourNet)} />
            <Row label={`VAT on labour (${(vat.rates.labour * 100).toFixed(1).replace('.0', '')}%)`} value={formatEur(vat.labourVat)} />
            <Row label="Parts" value={formatEur(vat.partsNet)} />
            <Row label={`VAT on parts (${(vat.rates.parts * 100).toFixed(0)}%)`} value={formatEur(vat.partsVat)} />
            <Row label="Total incl. VAT" value={formatEur(vat.grandTotal)} strong />
          </Card>

          <TextField label="Estimated hours (optional)" value={hours} onChangeText={setHours} keyboardType="decimal-pad" />
          <DateField label="Earliest start (optional)" value={startDate} onChange={setStartDate} optional minimumDate={new Date()} />
          <TextField label="Warranty (optional)" value={warranty} onChangeText={setWarranty} maxLength={500} placeholder="e.g. 12 months parts and labour" />
          <Field label="Notes for the customer (optional)">
            <Input accessibilityLabel="Notes for the customer" value={notes} onChangeText={setNotes} multiline maxLength={1000} style={{ minHeight: 96, textAlignVertical: 'top' }} />
          </Field>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 }}>
            <View style={{ flex: 1 }}>
              <Body style={{ fontFamily: fonts.medium }}>Priority quote</Body>
              <Muted>Shown first to the customer{isPro ? '' : ` · ${costs.data?.priority ?? 5} credits instead of ${costs.data?.standard ?? 2}`}</Muted>
            </View>
            <Switch accessibilityLabel="Priority quote" value={isPriority} onValueChange={setIsPriority} trackColor={{ true: colors.navy, false: colors.line }} />
          </View>

          <Muted>
            {isPro
              ? 'Included in Garix Pro — no credits used.'
              : `Sending uses ${cost} credits. You have ${wallet.data?.balance ?? 0}.`}
          </Muted>
          <ErrorText>{error ?? (submit.isError ? submitErrorMessage(submit.error, cost) : null)}</ErrorText>
          <Button title="Send quote" onPress={send} loading={submit.isPending} />
        </>
      )}
    </Screen>
  );
}

