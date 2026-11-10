import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useGarage } from '@/lib/garage-context';
import { useGarageQuotes, type GarageQuote } from '@/lib/garage';
import { formatEur } from '@/shared/vat';
import { Body, Card, ChoiceList, ErrorText, Loading, Muted, Pill, Screen } from '@/components/ui';
import { fonts } from '@/lib/theme';

type View_ = 'jobs' | 'pending' | 'closed';

const shortDate = (d: string) => new Date(d).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });

function jobStatus(q: GarageQuote): { text: string; tone: 'success' | 'navy' | 'muted' } {
  const s = q.service_requests?.status;
  if (s === 'completed') return { text: 'Completed', tone: 'muted' };
  if (s === 'in_progress') return { text: 'In progress', tone: 'navy' };
  return { text: 'Won', tone: 'success' };
}

export default function GarageQuotes() {
  const { garage } = useGarage();
  const quotes = useGarageQuotes(garage?.id);
  const [tab, setTab] = useState<View_>('jobs');

  const all = quotes.data ?? [];
  const jobs = all.filter((q) => q.status === 'accepted');
  const pending = all.filter((q) => q.status === 'submitted');
  const closed = all.filter((q) => !['accepted', 'submitted'].includes(q.status));
  const shown = tab === 'jobs' ? jobs : tab === 'pending' ? pending : closed;

  return (
    <Screen edges={[]}>
      <ChoiceList
        label="Show"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'jobs', label: `Jobs won (${jobs.length})` },
          { value: 'pending', label: `Waiting on the customer (${pending.length})` },
          { value: 'closed', label: `Not chosen or expired (${closed.length})` },
        ]}
      />
      {quotes.isPending && <Loading />}
      {quotes.isError && <ErrorText>Could not load your quotes. Reopen the tab to retry.</ErrorText>}
      {quotes.isSuccess && shown.length === 0 && (
        <Muted>
          {tab === 'jobs'
            ? 'No jobs yet. When a customer accepts one of your quotes, it shows here.'
            : tab === 'pending'
              ? 'No quotes waiting. Send one from the Requests tab.'
              : 'Nothing here.'}
        </Muted>
      )}
      {shown.map((q) => {
        const pill = q.status === 'accepted' ? jobStatus(q) : q.status === 'submitted' ? { text: 'Sent', tone: 'navy' as const } : { text: q.status, tone: 'muted' as const };
        const req = q.service_requests;
        return (
          <Card key={q.id} onPress={() => router.push(`/garage/requests/${q.request_id}`)} accessibilityLabel={`${req?.title ?? 'Request'}, ${pill.text}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Body style={{ flex: 1, fontFamily: fonts.semibold }}>{req?.title ?? 'Request'}</Body>
              <Pill text={pill.text} tone={pill.tone} />
            </View>
            <Muted>
              {[formatEur(Number(q.grand_total ?? 0)), q.is_priority ? 'Priority' : null, req?.location_town].filter(Boolean).join(' · ')}
            </Muted>
            <Muted>
              {q.status === 'accepted' && req?.completed_at ? `Completed ${shortDate(req.completed_at)}` : `Sent ${shortDate(q.created_at)}`}
            </Muted>
          </Card>
        );
      })}
    </Screen>
  );
}
