'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { GarageSearchResult } from './sort';

export type SearchParams = {
  lat: number;
  lng: number;
  radiusKm: number;
  categoryId: string | null;
  minRating: number | null;
  minReviews: number | null;
  evOnly: boolean;
  collection: boolean;
  openNow: boolean;
};

export function useSearchGarages(params: SearchParams) {
  return useQuery({
    queryKey: ['search_garages', params],
    queryFn: async (): Promise<GarageSearchResult[]> => {
      const { data, error } = await createClient().rpc('search_garages', {
        p_lat: params.lat,
        p_lng: params.lng,
        p_radius_km: params.radiusKm,
        p_category: params.categoryId ?? undefined,
        p_min_rating: params.minRating ?? undefined,
        p_min_reviews: params.minReviews ?? undefined,
        p_ev_only: params.evOnly,
        p_collection: params.collection,
        p_open_now: params.openNow,
      });
      if (error) throw error;
      return data;
    },
  });
}
