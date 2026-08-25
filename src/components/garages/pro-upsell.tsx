import Link from 'next/link';
import { PRO_PRICE_EUR } from '@/lib/garage-plan/queries';

/** Inline upsell shown when a Basic garage hits a Pro-only feature. */
export function ProUpsell({
  garageId,
  feature,
  body,
}: {
  garageId: string;
  feature: string;
  body?: string;
}) {
  return (
    <div className="mt-6 rounded-hex border border-gold/40 bg-gold/10 p-6">
      <p className="text-sm font-semibold">
        {feature} is a <span className="text-gold-ink">Pro</span> feature.
      </p>
      {body && <p className="mt-1 text-sm text-paper/70">{body}</p>}
      <Link
        href={`/dashboard/garages/${garageId}/plan`}
        className="btn-primary mt-4 inline-flex !px-4 !py-2 text-sm"
      >
        Upgrade to Pro — €{PRO_PRICE_EUR}/mo
      </Link>
    </div>
  );
}
