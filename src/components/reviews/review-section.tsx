'use client';

import { useState } from 'react';
import {
  reviewPhotoUrl,
  useCompleteJob,
  useCreateReview,
  useRequestReview,
  type Review,
} from '@/lib/reviews/queries';
import {
  RATING_CATEGORIES,
  reviewPhotoProblems,
  reviewSchema,
  MAX_REVIEW_PHOTOS,
  type RatingKey,
} from '@/lib/validation/review';
import { inputCls } from '@/components/auth/field';
import { StarInput } from './star-input';

function SubmittedReview({ review }: { review: Review }) {
  return (
    <section className="mt-8 rounded-hex border border-volt/40 bg-volt/5 p-6">
      <h2 className="font-display text-xl font-semibold">Your review</h2>
      <dl className="mt-3 space-y-1 text-sm">
        {RATING_CATEGORIES.map((c) => {
          const v = review[`rating_${c.key}` as keyof Review] as number;
          return (
            <div key={c.key} className="flex justify-between">
              <dt className="text-paper/60">{c.label}</dt>
              <dd aria-label={`${v} out of 5`} className="text-signal">
                {'★'.repeat(v)}
                <span className="text-paper/20">{'★'.repeat(5 - v)}</span>
              </dd>
            </div>
          );
        })}
      </dl>
      {review.body && <p className="mt-3 text-sm text-paper/80">{review.body}</p>}
      {review.review_photos.length > 0 && (
        <ul className="mt-3 flex gap-2">
          {review.review_photos.map((p) => (
            <li key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={reviewPhotoUrl(p.storage_path)} alt="Review photo" className="h-16 w-16 rounded-lg object-cover" />
            </li>
          ))}
        </ul>
      )}
      {review.garage_response && (
        <p className="mt-4 border-l-2 border-volt pl-3 text-sm text-paper/70">
          <span className="font-medium text-paper">Garage response:</span> {review.garage_response}
        </p>
      )}
    </section>
  );
}

/**
 * Post-completion block on the request detail page:
 * mark-complete when accepted, the review prompt when completed,
 * the submitted review once it exists.
 */
export function ReviewSection({
  requestId,
  garageId,
  status,
}: {
  requestId: string;
  garageId: string | null;
  status: string;
}) {
  const review = useRequestReview(requestId);
  const complete = useCompleteJob(requestId);
  const create = useCreateReview(requestId);

  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    quality: 0, communication: 0, price: 0, speed: 0, overall: 0,
  });
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (status === 'accepted') {
    return (
      <section className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-6">
        <h2 className="font-display text-xl font-semibold">Job done?</h2>
        <p className="mt-2 text-sm text-paper/60">
          Once the garage has finished, mark the job complete — then you can leave a review.
        </p>
        {complete.isError && (
          <p role="alert" className="mt-3 text-sm text-signal">Could not mark the job complete. Try again.</p>
        )}
        <button
          type="button"
          className="btn-primary mt-4 !px-4 !py-2 text-sm"
          disabled={complete.isPending}
          onClick={() => complete.mutate()}
        >
          {complete.isPending ? 'Marking…' : 'Mark job complete'}
        </button>
      </section>
    );
  }

  if (status !== 'completed' || !garageId) return null;
  if (review.isPending) return null;
  if (review.data) return <SubmittedReview review={review.data} />;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reviewSchema.safeParse({ ...ratings, body });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    const photoProblem = reviewPhotoProblems(photos);
    if (photoProblem) {
      setErrors({ photos: photoProblem });
      return;
    }
    setErrors({});
    create.mutate({ garageId: garageId!, data: parsed.data, photos });
  }

  return (
    <section className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-6">
      <h2 className="font-display text-xl font-semibold">How did it go?</h2>
      <p className="mt-2 text-sm text-paper/60">
        Your review is public and verified — it can only come from a completed Garix job.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <div className="space-y-3">
          {RATING_CATEGORIES.map((c) => (
            <StarInput
              key={c.key}
              name={`rating-${c.key}`}
              label={c.label}
              value={ratings[c.key]}
              error={errors[c.key]}
              onChange={(v) => setRatings((r) => ({ ...r, [c.key]: v }))}
            />
          ))}
        </div>
        <textarea
          aria-label="Your review"
          rows={4}
          className={inputCls}
          placeholder="What stood out? Would you go back?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
        />
        <div>
          <label className="text-sm text-paper/60" htmlFor="review-photos">
            Photos (optional, up to {MAX_REVIEW_PHOTOS})
          </label>
          <input
            id="review-photos"
            type="file"
            accept="image/*"
            multiple
            className="mt-1 block w-full text-sm text-paper/70 file:mr-4 file:rounded-lg file:border-0 file:bg-volt file:px-4 file:py-2 file:font-display file:font-semibold file:text-white hover:file:bg-volt-bright"
            onChange={(e) => {
              setPhotos((prev) => [...prev, ...Array.from(e.target.files ?? [])].slice(0, MAX_REVIEW_PHOTOS));
              e.target.value = '';
            }}
          />
          {photos.length > 0 && (
            <p className="mt-1 text-xs text-paper/50">
              {photos.map((p) => p.name).join(', ')}{' '}
              <button type="button" className="underline hover:text-signal" onClick={() => setPhotos([])}>
                clear
              </button>
            </p>
          )}
          {errors['photos'] && <p role="alert" className="mt-1 text-sm text-signal">{errors['photos']}</p>}
        </div>
        {create.isError && (
          <p role="alert" className="text-sm text-signal">Could not submit your review. Try again.</p>
        )}
        <button type="submit" className="btn-primary !px-4 !py-2 text-sm" disabled={create.isPending}>
          {create.isPending ? 'Submitting…' : 'Submit review'}
        </button>
      </form>
    </section>
  );
}
