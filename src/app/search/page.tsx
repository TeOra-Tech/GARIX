'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRepairCategories } from '@/lib/requests/queries';
import { useSearchGarages } from '@/lib/search/queries';
import { sortResults, SORTS, SORT_LABELS, type SortKey } from '@/lib/search/sort';
import { hasGoogleMapsKey } from '@/lib/geo/google-maps';
import { searchPlaces, type PlaceResult } from '@/lib/geo/osm';
import { GarageMap } from '@/components/search/garage-map';
import { Field, inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

const DUBLIN = { lat: 53.3498, lng: -6.2603 };
const RADII = [10, 25, 50, 100];
const RATINGS = [
  { value: null, label: 'Any rating' },
  { value: 3, label: '3★ and up' },
  { value: 4, label: '4★ and up' },
  { value: 4.5, label: '4.5★ and up' },
];
const REVIEWS = [
  { value: null, label: 'Any' },
  { value: 1, label: '1+' },
  { value: 5, label: '5+' },
  { value: 10, label: '10+' },
];

export default function SearchPage() {
  const [center, setCenter] = useState(DUBLIN);
  const [centerLabel, setCenterLabel] = useState('Dublin');
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  const [radiusKm, setRadiusKm] = useState(50);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [minReviews, setMinReviews] = useState<number | null>(null);
  const [evOnly, setEvOnly] = useState(false);
  const [collection, setCollection] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [sort, setSort] = useState<SortKey>('recommended');
  const [view, setView] = useState<'list' | 'map'>('list');

  const categories = useRepairCategories();
  const search = useSearchGarages({
    lat: center.lat,
    lng: center.lng,
    radiusKm,
    categoryId,
    minRating,
    minReviews,
    evOnly,
    collection,
    openNow,
  });
  const results = search.data ? sortResults(search.data, sort) : [];

  async function runPlaceSearch() {
    if (placeQuery.trim().length < 3) return;
    setSearching(true);
    try {
      setPlaces(await searchPlaces(placeQuery));
    } catch {
      setPlaces([]);
    } finally {
      setSearching(false);
    }
  }

  function pickPlace(p: PlaceResult) {
    setCenter({ lat: p.lat, lng: p.lng });
    setCenterLabel(p.town ?? p.label.split(',')[0]);
    setPlaces(null);
    setPlaceQuery('');
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCenterLabel('your location');
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000 },
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Find a garage</h1>
      <p className="mt-2 text-paper/60">
        Showing garages within {radiusKm} km of <span className="text-paper">{centerLabel}</span>.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* ---------- Filters ---------- */}
        <aside className="space-y-5">
          <Field label="Location" htmlFor="loc">
            <div className="flex gap-2">
              <input
                id="loc"
                className={inputCls}
                value={placeQuery}
                onChange={(e) => setPlaceQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runPlaceSearch(); } }}
                placeholder="Town or area"
              />
              <button type="button" className="btn-ghost shrink-0 !px-3" onClick={runPlaceSearch} disabled={searching}>
                {searching ? '…' : 'Go'}
              </button>
            </div>
          </Field>
          {places && (
            <ul className="divide-y divide-ink-line rounded-lg border border-ink-line bg-ink-soft">
              {places.length === 0 && <li className="p-3 text-sm text-paper/50">No matches.</li>}
              {places.map((p) => (
                <li key={`${p.lat},${p.lng}`}>
                  <button type="button" className="w-full p-3 text-left text-sm hover:bg-volt/10" onClick={() => pickPlace(p)}>
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="text-sm text-volt-bright underline" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Locating…' : 'Use my location'}
          </button>

          <Field label="Distance" htmlFor="radius">
            <select id="radius" className={inputCls} value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
              {RADII.map((r) => <option key={r} value={r}>Within {r} km</option>)}
            </select>
          </Field>

          <Field label="Service type" htmlFor="category">
            <select id="category" className={inputCls} value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value || null)}>
              <option value="">All services</option>
              {categories.data?.parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rating" htmlFor="rating">
              <select id="rating" className={inputCls} value={minRating ?? ''} onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : null)}>
                {RATINGS.map((r) => <option key={r.label} value={r.value ?? ''}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Reviews" htmlFor="reviews">
              <select id="reviews" className={inputCls} value={minReviews ?? ''} onChange={(e) => setMinReviews(e.target.value ? Number(e.target.value) : null)}>
                {REVIEWS.map((r) => <option key={r.label} value={r.value ?? ''}>{r.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="space-y-2 text-sm">
            {[
              { label: 'Open now', checked: openNow, set: setOpenNow },
              { label: 'Collects vehicles', checked: collection, set: setCollection },
              { label: 'EV specialist', checked: evOnly, set: setEvOnly },
            ].map((f) => (
              <label key={f.label} className="flex items-center gap-2 text-paper/80">
                <input type="checkbox" className="h-4 w-4 accent-volt" checked={f.checked}
                  onChange={(e) => f.set(e.target.checked)} />
                {f.label}
              </label>
            ))}
          </div>
        </aside>

        {/* ---------- Results ---------- */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-paper/60" role="status">
              {search.isPending ? 'Searching…' : `${results.length} garage${results.length === 1 ? '' : 's'} found`}
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-paper/60">
                Sort
                <select aria-label="Sort results" className={cn(inputCls, '!w-auto !py-2')} value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}>
                  {SORTS.map((s) => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}
                </select>
              </label>
              {hasGoogleMapsKey && (
                <div className="flex rounded-lg border border-ink-line" role="group" aria-label="View">
                  {(['list', 'map'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={view === v}
                      className={cn(
                        'px-4 py-2 text-sm font-medium capitalize transition',
                        view === v ? 'bg-volt text-white' : 'text-paper/60 hover:text-paper',
                      )}
                      onClick={() => setView(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {search.isError && (
            <p role="alert" className="mt-8 text-signal">Search failed. Adjust the filters and try again.</p>
          )}

          {view === 'map' ? (
            <div className="mt-6">
              <GarageMap results={results} center={center} />
            </div>
          ) : (
            <>
              {search.isSuccess && results.length === 0 && (
                <div className="mt-8 rounded-hex border border-ink-line bg-ink-soft p-8 text-center text-paper/60">
                  No garages match those filters yet. Try widening the distance.
                </div>
              )}
              <ul className="mt-6 space-y-4">
                {results.map((r) => (
                  <li key={r.garage_id}>
                    <Link
                      href={`/garages/${r.slug}`}
                      className="block rounded-hex border border-ink-line bg-ink-soft p-6 transition hover:border-volt"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display text-lg font-semibold">{r.name}</h2>
                          <p className="mt-1 text-sm text-paper/60">
                            {r.town}, Co. {r.county} · {r.distance_km} km away
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          {r.review_count > 0 ? (
                            <>
                              <span className="text-signal">★</span>{' '}
                              <span className="font-medium">{Number(r.avg_rating).toFixed(1)}</span>{' '}
                              <span className="text-paper/50">({r.review_count})</span>
                            </>
                          ) : (
                            <span className="text-paper/40">No reviews yet</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.is_ev_specialist && (
                          <span className="rounded-full border border-volt/50 px-2.5 py-0.5 text-xs text-volt-bright">EV specialist</span>
                        )}
                        {r.offers_collection && (
                          <span className="rounded-full border border-volt/50 px-2.5 py-0.5 text-xs text-volt-bright">Collects</span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
