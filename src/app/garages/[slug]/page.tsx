import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WEEK_DAYS, DAY_LABELS } from '@/lib/validation/garage';
import { cn } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('garages').select('name, description').eq('slug', slug).maybeSingle();
  if (!data) return { title: 'Garage not found' };
  return { title: data.name, description: data.description ?? undefined };
}

function photoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/garage-photos/${path}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating.toFixed(1)} out of 5`} className="text-signal">
      {'★'.repeat(Math.round(rating))}
      <span className="text-paper/20">{'★'.repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

export default async function GarageProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // RLS scopes visibility: everyone sees active garages; owners/admins also see their own.
  const { data: garage } = await supabase
    .from('garages')
    .select(
      '*, garage_locations(*), garage_services(*, repair_categories(name)), garage_photos(*), garage_certifications(*)',
    )
    .eq('slug', slug)
    .maybeSingle();
  if (!garage) notFound();

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, user_profiles!reviews_customer_id_fkey(full_name)')
    .eq('garage_id', garage.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const location = garage.garage_locations.find((l) => l.is_primary) ?? garage.garage_locations[0];
  const hours = (garage.opening_hours ?? {}) as Record<string, { open: string; close: string }>;
  const photos = [...garage.garage_photos].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      {garage.status !== 'active' && (
        <p className="mb-8 rounded-lg border border-signal/40 bg-signal/10 p-4 text-sm text-signal-soft">
          This profile is awaiting verification and is only visible to you.
        </p>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">{garage.name}</h1>
          <p className="mt-2 text-paper/60">
            {location && `${location.town}, Co. ${location.county}`}
            {garage.years_in_business != null && ` · ${garage.years_in_business} years in business`}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm">
            {garage.review_count > 0 ? (
              <>
                <Stars rating={Number(garage.avg_rating)} />
                <span className="text-paper/70">
                  {Number(garage.avg_rating).toFixed(1)} · {garage.review_count} review
                  {garage.review_count > 1 ? 's' : ''}
                </span>
              </>
            ) : (
              <span className="text-paper/40">No reviews yet</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {garage.is_ev_specialist && (
            <span className="rounded-full border border-volt/50 px-3 py-1 text-xs text-volt-bright">EV specialist</span>
          )}
          {garage.offers_collection && (
            <span className="rounded-full border border-volt/50 px-3 py-1 text-xs text-volt-bright">Collects vehicles</span>
          )}
          <span className="rounded-full border border-ink-line px-3 py-1 text-xs text-paper/60">
            {garage.completed_jobs_count} jobs completed
          </span>
        </div>
      </header>

      {garage.description && (
        <p className="mt-8 max-w-2xl whitespace-pre-wrap text-paper/80">{garage.description}</p>
      )}

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">Services</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {garage.garage_services.map((s) => (
            <li key={s.id} className="rounded-full border border-ink-line bg-ink-soft px-4 py-1.5 text-sm">
              {s.repair_categories?.name}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="font-display text-2xl font-bold">Opening hours</h2>
          <dl className="mt-4 space-y-1 text-sm">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="flex justify-between border-b border-ink-line py-2">
                <dt className="text-paper/60">{DAY_LABELS[d]}</dt>
                <dd className={cn(!hours[d] && 'text-paper/40')}>
                  {hours[d] ? `${hours[d].open} – ${hours[d].close}` : 'Closed'}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold">Find us</h2>
          {location && (
            <address className="mt-4 text-sm not-italic leading-relaxed text-paper/80">
              {location.line1}
              {location.line2 && <><br />{location.line2}</>}
              <br />
              {location.town}, Co. {location.county}
              {location.eircode && <><br />{location.eircode}</>}
            </address>
          )}
          <p className="mt-3 text-sm text-paper/60">
            Service radius: {garage.service_radius_km} km
            {garage.phone && <><br />Phone: {garage.phone}</>}
            {garage.website && (
              <>
                <br />
                <a href={garage.website} rel="noopener noreferrer" target="_blank" className="text-volt-bright hover:underline">
                  {garage.website}
                </a>
              </>
            )}
          </p>
        </section>
      </div>

      {photos.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">Gallery</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p) => (
              <li key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(p.storage_path)}
                  alt={p.caption ?? `${garage.name} photo`}
                  className="aspect-square w-full rounded-lg object-cover"
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {garage.garage_certifications.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">Certifications</h2>
          <ul className="mt-4 space-y-2">
            {garage.garage_certifications.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg border border-ink-line bg-ink-soft p-4 text-sm">
                <span className="font-medium">{c.name}</span>
                {c.issuing_body && <span className="text-paper/50">— {c.issuing_body}</span>}
                {c.verified && (
                  <span className="ml-auto rounded-full border border-volt/50 px-2 py-0.5 text-xs text-volt-bright">
                    Verified
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">Reviews</h2>
        {!reviews?.length && (
          <p className="mt-4 text-sm text-paper/50">
            No reviews yet — reviews come from completed Garix jobs only.
          </p>
        )}
        <ul className="mt-4 space-y-4">
          {reviews?.map((r) => (
            <li key={r.id} className="rounded-hex border border-ink-line bg-ink-soft p-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.user_profiles?.full_name ?? 'Garix customer'}</span>
                <Stars rating={r.rating_overall} />
              </div>
              {r.body && <p className="mt-3 text-sm text-paper/80">{r.body}</p>}
              {r.garage_response && (
                <p className="mt-3 border-l-2 border-volt pl-3 text-sm text-paper/60">
                  <span className="font-medium text-paper/80">Response from {garage.name}:</span>{' '}
                  {r.garage_response}
                </p>
              )}
              <p className="mt-3 text-xs text-paper/40">
                {new Date(r.created_at).toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 rounded-hex border border-ink-line bg-ink-soft p-8 text-center">
        <p className="font-display text-lg font-semibold">Need work done on your car?</p>
        <Link href="/requests/new" className="btn-primary mt-4 inline-flex">
          Post a repair request
        </Link>
      </div>
    </main>
  );
}
