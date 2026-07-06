'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';
import type { ReviewData } from '@/lib/validation/review';

export type Review = Tables<'reviews'> & {
  review_photos: Tables<'review_photos'>[];
};

export function reviewPhotoUrl(storagePath: string): string {
  return createClient().storage.from('review-photos').getPublicUrl(storagePath).data.publicUrl;
}

/** The (single) review for a request — drives the post-completion prompt. */
export function useRequestReview(requestId: string) {
  return useQuery({
    queryKey: ['reviews', 'request', requestId],
    queryFn: async (): Promise<Review | null> => {
      const { data, error } = await createClient()
        .from('reviews')
        .select('*, review_photos(*)')
        .eq('request_id', requestId)
        .maybeSingle();
      if (error) throw error;
      return data as Review | null;
    },
  });
}

export function useCreateReview(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      garageId,
      data,
      photos,
    }: {
      garageId: string;
      data: ReviewData;
      photos: File[];
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data: review, error } = await supabase
        .from('reviews')
        .insert({
          request_id: requestId,
          garage_id: garageId,
          customer_id: user.id,
          rating_quality: data.quality,
          rating_communication: data.communication,
          rating_price: data.price,
          rating_speed: data.speed,
          rating_overall: data.overall,
          body: data.body || null,
        })
        .select()
        .single();
      if (error) throw error;

      for (const photo of photos) {
        const ext = photo.name.includes('.') ? photo.name.slice(photo.name.lastIndexOf('.')) : '';
        const path = `${user.id}/${review.id}/${crypto.randomUUID()}${ext}`;
        const up = await supabase.storage.from('review-photos').upload(path, photo);
        if (up.error) continue; // photo failures don't invalidate the review
        await supabase.from('review_photos').insert({ review_id: review.id, storage_path: path });
      }
      return review;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['garages'] });
    },
  });
}

/** All reviews for the owner's garage — the respond screen. */
export function useGarageReviews(garageId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', 'garage', garageId],
    enabled: !!garageId,
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await createClient()
        .from('reviews')
        .select('*, review_photos(*)')
        .eq('garage_id', garageId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
  });
}

export function useRespondToReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      // RLS lets the garage update its reviews; only these two columns are sent.
      const { error } = await createClient()
        .from('reviews')
        .update({ garage_response: response, garage_responded_at: new Date().toISOString() })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}

export function useCompleteJob(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await createClient().rpc('complete_job', { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_requests'] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}
