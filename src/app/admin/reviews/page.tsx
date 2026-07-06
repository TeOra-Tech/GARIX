'use client';

import { useAdminReviews, useSetReviewHidden } from '@/lib/admin/queries';
import { cn } from '@/lib/utils';

export default function AdminReviewsPage() {
  const reviews = useAdminReviews();
  const setHidden = useSetReviewHidden();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Review moderation</h1>
      {reviews.isPending && <p className="mt-8 text-paper/60">Loading…</p>}
      {reviews.data?.length === 0 && <p className="mt-8 text-paper/60">No reviews yet.</p>}

      <ul className="mt-6 space-y-4">
        {reviews.data?.map((r) => (
          <li key={r.id} className={cn('rounded-hex border p-6', r.is_hidden ? 'border-signal/40 bg-signal/5' : 'border-ink-line bg-ink-soft')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                <span className="font-medium">{r.user_profiles?.full_name ?? 'Customer'}</span>
                <span className="text-paper/50"> on </span>
                <span className="font-medium">{r.garages?.name ?? 'garage'}</span>
                <span className="ml-2 text-signal">{'★'.repeat(r.rating_overall)}</span>
              </p>
              <div className="flex items-center gap-3 text-xs">
                {r.fraud_score != null && Number(r.fraud_score) > 0.5 && (
                  <span className="rounded-full border border-signal/50 px-2 py-0.5 text-signal-soft">
                    Fraud score {Number(r.fraud_score).toFixed(2)}
                  </span>
                )}
                {r.is_hidden && <span className="text-signal-soft">Hidden from public</span>}
                <span className="text-paper/40">
                  {new Date(r.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            {r.body && <p className="mt-3 text-sm text-paper/80">{r.body}</p>}
            {r.garage_response && (
              <p className="mt-2 border-l-2 border-volt pl-3 text-sm text-paper/60">Response: {r.garage_response}</p>
            )}
            <button
              type="button"
              className={cn('mt-4 !px-4 !py-2 text-sm', r.is_hidden ? 'btn-primary' : 'btn-ghost !border-signal/50 text-signal-soft')}
              disabled={setHidden.isPending}
              onClick={() => setHidden.mutate({ reviewId: r.id, hidden: !r.is_hidden })}
            >
              {r.is_hidden ? 'Unhide review' : 'Hide review'}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
