import { useState } from 'react';
import { Text, View } from 'react-native';
import { useGarage } from '@/lib/garage-context';
import { isProSubscription, useGarageReviews, useGarageSubscription, usePlansEnabled, useRespondToReview, type GarageReview } from '@/lib/garage';
import { RATING_CATEGORIES, responseSchema } from '@/shared/validation/review';
import { Body, Button, Card, ErrorText, Input, Loading, Muted, Screen } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

function Stars({ value }: { value: number }) {
  return (
    <Text accessibilityLabel={`${value} out of 5`} style={{ fontSize: 18, color: colors.gold }}>
      {'★'.repeat(value)}
      <Text style={{ color: colors.line }}>{'★'.repeat(5 - value)}</Text>
    </Text>
  );
}

function ReviewCard({ review, canReply }: { review: GarageReview; canReply: boolean }) {
  const respond = useRespondToReview();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const parsed = responseSchema.safeParse(draft);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    respond.mutate({ reviewId: review.id, response: parsed.data });
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stars value={review.rating_overall} />
        <Muted style={{ fontSize: 12 }}>
          {new Date(review.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Muted>
      </View>
      <Muted style={{ fontSize: 13 }}>
        {RATING_CATEGORIES.filter((c) => c.key !== 'overall')
          .map((c) => `${c.label} ${review[`rating_${c.key}`]}/5`)
          .join(' · ')}
      </Muted>
      {review.body ? <Body>{review.body}</Body> : null}

      {review.garage_response ? (
        <View style={{ borderLeftWidth: 3, borderLeftColor: colors.gold, paddingLeft: 10 }}>
          <Body style={{ fontFamily: fonts.semibold }}>Your response</Body>
          <Muted>{review.garage_response}</Muted>
        </View>
      ) : !canReply ? (
        <Muted>Replying to reviews is a Pro feature.</Muted>
      ) : (
        <View style={{ gap: 8 }}>
          <Input
            accessibilityLabel="Respond to this review"
            placeholder="Thank the customer or add context — your response is public."
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={1000}
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />
          <ErrorText>{error ?? (respond.isError ? 'Could not save your response. Try again.' : null)}</ErrorText>
          <Button title="Respond" variant="secondary" onPress={submit} loading={respond.isPending} />
        </View>
      )}
    </Card>
  );
}

export default function GarageReviews() {
  const { garage } = useGarage();
  const reviews = useGarageReviews(garage?.id);
  const plansEnabled = usePlansEnabled();
  const sub = useGarageSubscription(garage?.id);
  // Replying is a Pro feature once plans are on (same rule as the web).
  const canReply = !plansEnabled.data || isProSubscription(sub.data);

  return (
    <Screen edges={[]}>
      {garage && garage.review_count > 0 && (
        <Body>
          <Text style={{ color: colors.gold }}>★</Text> {Number(garage.avg_rating).toFixed(1)} average · {garage.review_count} review
          {garage.review_count > 1 ? 's' : ''}
        </Body>
      )}
      <Muted>Reviews are written by customers and can’t be edited or removed.{canReply ? ' You can respond publicly.' : ''}</Muted>
      {reviews.isPending && <Loading />}
      {reviews.isError && <ErrorText>Could not load reviews. Reopen the tab to retry.</ErrorText>}
      {reviews.data?.length === 0 && <Muted>No reviews yet. Customers can review you after a job is marked complete.</Muted>}
      {reviews.data?.map((r) => <ReviewCard key={r.id} review={r} canReply={canReply} />)}
    </Screen>
  );
}
