'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMyGarage } from '@/lib/garages/queries';
import { reviewPhotoUrl, useGarageReviews, useRespondToReview, type Review } from '@/lib/reviews/queries';
import { responseSchema, RATING_CATEGORIES } from '@/lib/validation/review';
import { inputCls } from '@/components/auth/field';

function ReviewCard({ review }: { review: Review }) {
  const respond = useRespondToReview();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = responseSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    respond.mutate({ reviewId: review.id, response: parsed.data });
  }

  return (
    <li className="rounded-hex border border-ink-line bg-ink-soft p-6">
      <div className="flex items-center justify-between">
        <span aria-label={`${review.rating_overall} out of 5 overall`} className="text-gold">
          {'★'.repeat(review.rating_overall)}
          <span className="text-paper/20">{'★'.repeat(5 - review.rating_overall)}</span>
        </span>
        <span className="text-xs text-paper/40">
          {new Date(review.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-paper/50">
        {RATING_CATEGORIES.filter((c) => c.key !== 'overall').map((c) => (
          <div key={c.key}>
            <dt className="inline">{c.label}: </dt>
            <dd className="inline text-paper/80">{review[`rating_${c.key}` as keyof Review] as number}/5</dd>
          </div>
        ))}
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

      {review.garage_response ? (
        <p className="mt-4 border-l-2 border-volt pl-3 text-sm text-paper/70">
          <span className="font-medium text-paper">Your response:</span> {review.garage_response}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-2" noValidate>
          <textarea
            aria-label="Respond to this review"
            rows={2}
            className={inputCls}
            placeholder="Thank the customer or add context — your response is public."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
          />
          {(error || respond.isError) && (
            <p role="alert" className="text-sm text-danger">{error ?? 'Could not save your response. Try again.'}</p>
          )}
          <button type="submit" className="btn-ghost !px-4 !py-2 text-sm" disabled={respond.isPending}>
            {respond.isPending ? 'Saving…' : 'Respond'}
          </button>
        </form>
      )}
    </li>
  );
}

export default function GarageReviewsPage() {
  const garage = useMyGarage();
  const reviews = useGarageReviews(garage.data?.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/dashboard/garage" className="text-sm text-paper/60 hover:text-volt-bright">
        &larr; My garage
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-bold">Reviews</h1>
        {garage.data && garage.data.review_count > 0 && (
          <p className="text-sm text-paper/60">
            <span className="text-gold">★</span> {Number(garage.data.avg_rating).toFixed(1)} average ·{' '}
            {garage.data.review_count} review{garage.data.review_count > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {garage.isSuccess && !garage.data && (
        <p className="mt-8 text-paper/60">Register a garage to receive reviews.</p>
      )}
      {reviews.data?.length === 0 && (
        <p className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-8 text-center text-paper/60">
          No reviews yet — they arrive after customers complete jobs with you.
        </p>
      )}
      <ul className="mt-6 space-y-4">
        {reviews.data?.map((r) => <ReviewCard key={r.id} review={r} />)}
      </ul>
    </main>
  );
}
