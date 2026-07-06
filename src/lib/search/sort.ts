import type { Database } from '@/types/database';

export type GarageSearchResult =
  Database['public']['Functions']['search_garages']['Returns'][number];

export const SORTS = ['recommended', 'nearest', 'rating', 'reviews'] as const;
export type SortKey = (typeof SORTS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  recommended: 'Recommended',
  nearest: 'Nearest',
  rating: 'Best rated',
  reviews: 'Most reviews',
};

/** Rating weighted by review volume so one 5★ review doesn't top the list. */
export function recommendedScore(r: Pick<GarageSearchResult, 'avg_rating' | 'review_count'>): number {
  return Number(r.avg_rating) * Math.log(r.review_count + 1);
}

export function sortResults(results: GarageSearchResult[], sort: SortKey): GarageSearchResult[] {
  const rows = [...results];
  switch (sort) {
    case 'nearest':
      return rows.sort((a, b) => Number(a.distance_km) - Number(b.distance_km));
    case 'rating':
      return rows.sort(
        (a, b) => Number(b.avg_rating) - Number(a.avg_rating) || b.review_count - a.review_count,
      );
    case 'reviews':
      return rows.sort(
        (a, b) => b.review_count - a.review_count || Number(b.avg_rating) - Number(a.avg_rating),
      );
    case 'recommended':
      return rows.sort(
        (a, b) =>
          recommendedScore(b) - recommendedScore(a) || Number(a.distance_km) - Number(b.distance_km),
      );
  }
}
