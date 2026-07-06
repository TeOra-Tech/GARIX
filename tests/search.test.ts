import { describe, it, expect } from 'vitest';
import { sortResults, recommendedScore, type GarageSearchResult } from '@/lib/search/sort';

function row(over: Partial<GarageSearchResult>): GarageSearchResult {
  return {
    garage_id: crypto.randomUUID(),
    name: 'G', slug: 'g', avg_rating: 0, review_count: 0, distance_km: 1,
    town: 'Naas', county: 'Kildare', logo_url: null, lat: 53, lng: -6.5,
    opening_hours: {}, is_ev_specialist: false, offers_collection: false,
    ...over,
  } as GarageSearchResult;
}

const near = row({ name: 'near', distance_km: 2, avg_rating: 3.5, review_count: 4 });
const rated = row({ name: 'rated', distance_km: 30, avg_rating: 5, review_count: 1 });
const popular = row({ name: 'popular', distance_km: 15, avg_rating: 4.6, review_count: 40 });
const all = [near, rated, popular];

describe('search sorting', () => {
  it('nearest sorts by distance', () => {
    expect(sortResults(all, 'nearest').map((r) => r.name)).toEqual(['near', 'popular', 'rated']);
  });

  it('rating sorts by average then review count', () => {
    expect(sortResults(all, 'rating').map((r) => r.name)).toEqual(['rated', 'popular', 'near']);
  });

  it('reviews sorts by review count', () => {
    expect(sortResults(all, 'reviews').map((r) => r.name)).toEqual(['popular', 'near', 'rated']);
  });

  it('recommended weights rating by review volume', () => {
    // 5★ with a single review must not beat 4.6★ with 40 reviews
    expect(sortResults(all, 'recommended')[0].name).toBe('popular');
    expect(recommendedScore(popular)).toBeGreaterThan(recommendedScore(rated));
  });

  it('recommended breaks score ties by distance and does not mutate input', () => {
    const a = row({ name: 'a', distance_km: 5 });
    const b = row({ name: 'b', distance_km: 1 });
    expect(sortResults([a, b], 'recommended').map((r) => r.name)).toEqual(['b', 'a']);
    expect(all.map((r) => r.name)).toEqual(['near', 'rated', 'popular']);
  });
});
