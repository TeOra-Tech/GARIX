import { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { reviewPhotoUrl, useCompleteJob, useCreateReview, useRequestReview, type PickedPhoto, type Review } from '@/lib/reviews';
import { MAX_REVIEW_PHOTOS, RATING_CATEGORIES, reviewSchema, type RatingKey } from '@/shared/validation/review';
import { Body, Button, Card, ErrorText, H2, Input, Muted } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

function StarInput({ label, value, onChange, error }: { label: string; value: number; onChange: (v: number) => void; error?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.charcoal }}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
            accessibilityState={{ checked: value === n }}
            onPress={() => onChange(n)}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 28, color: n <= value ? colors.gold : colors.line }}>★</Text>
          </Pressable>
        ))}
      </View>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

function SubmittedReview({ review }: { review: Review }) {
  return (
    <Card>
      <H2>Your review</H2>
      {RATING_CATEGORIES.map((c) => {
        const v = review[`rating_${c.key}`];
        return (
          <View key={c.key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>{c.label}</Muted>
            <Text accessibilityLabel={`${v} out of 5`} style={{ color: colors.gold, fontSize: 16 }}>
              {'★'.repeat(v)}
              <Text style={{ color: colors.line }}>{'★'.repeat(5 - v)}</Text>
            </Text>
          </View>
        );
      })}
      {review.body ? <Body>{review.body}</Body> : null}
      {review.review_photos.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {review.review_photos.map((p) => (
            <Image key={p.id} source={{ uri: reviewPhotoUrl(p.storage_path) }} accessibilityLabel="Review photo" style={{ width: 64, height: 64, borderRadius: 8 }} />
          ))}
        </View>
      )}
      {review.garage_response ? (
        <View style={{ borderLeftWidth: 3, borderLeftColor: colors.gold, paddingLeft: 10 }}>
          <Body style={{ fontFamily: fonts.semibold }}>Garage response</Body>
          <Muted>{review.garage_response}</Muted>
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Post-completion block on the request screen: mark-complete when a quote is accepted,
 * the review form once the job is complete, then the submitted review.
 */
export function ReviewSection({ requestId, garageId, status }: { requestId: string; garageId: string | null; status: string }) {
  const review = useRequestReview(requestId, status === 'completed');
  const complete = useCompleteJob(requestId);
  const create = useCreateReview(requestId);
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({ quality: 0, communication: 0, price: 0, speed: 0, overall: 0 });
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (status === 'accepted') {
    return (
      <Card>
        <H2>Job done?</H2>
        <Muted>Once the garage has finished, mark the job complete — then you can leave a review.</Muted>
        <ErrorText>{complete.isError ? 'Could not mark the job complete. Try again.' : null}</ErrorText>
        <Button
          title="Mark job complete"
          loading={complete.isPending}
          onPress={() =>
            Alert.alert('Mark the job complete?', 'Only do this once the garage has finished the work.', [
              { text: 'Not yet', style: 'cancel' },
              { text: 'Mark complete', onPress: () => complete.mutate() },
            ])
          }
        />
      </Card>
    );
  }

  if (status !== 'completed' || !garageId || review.isPending) return null;
  if (review.data) return <SubmittedReview review={review.data} />;

  async function addPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_REVIEW_PHOTOS - photos.length,
      quality: 0.7,
    });
    if (result.canceled) return;
    const picked = result.assets.map((a, i) => ({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', fileName: a.fileName ?? `review-${Date.now()}-${i}.jpg` }));
    setPhotos((p) => [...p, ...picked].slice(0, MAX_REVIEW_PHOTOS));
  }

  function submit() {
    const parsed = reviewSchema.safeParse({ ...ratings, body });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return setErrors(fieldErrors);
    }
    setErrors({});
    create.mutate({ garageId: garageId!, data: parsed.data, photos });
  }

  return (
    <Card>
      <H2>How did it go?</H2>
      <Muted>Your review is public and verified — it can only come from a completed Garix job.</Muted>
      {RATING_CATEGORIES.map((c) => (
        <StarInput key={c.key} label={c.label} value={ratings[c.key]} error={errors[c.key]} onChange={(v) => setRatings((r) => ({ ...r, [c.key]: v }))} />
      ))}
      <Input
        accessibilityLabel="Your review"
        placeholder="What went well? Anything the garage could improve? (optional)"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={2000}
        style={{ minHeight: 96, textAlignVertical: 'top' }}
      />
      {photos.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {photos.map((p, i) => (
            <Pressable key={p.uri} accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`} onPress={() => setPhotos((all) => all.filter((x) => x.uri !== p.uri))}>
              <Image source={{ uri: p.uri }} style={{ width: 64, height: 64, borderRadius: 8 }} />
            </Pressable>
          ))}
        </View>
      )}
      {photos.length < MAX_REVIEW_PHOTOS && (
        <Button title={`Add photos (up to ${MAX_REVIEW_PHOTOS})`} variant="secondary" onPress={addPhotos} />
      )}
      <ErrorText>
        {create.isError ? 'Could not post your review. Try again.' : Object.keys(errors).length ? 'Rate each category from 1 to 5 stars.' : null}
      </ErrorText>
      <Button title="Post review" onPress={submit} loading={create.isPending} />
    </Card>
  );
}
