// Customer-side reviews. Mirrors the web's src/lib/reviews/queries.ts.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { currentUserId, supabase } from './supabase';
import type { Tables } from '@/shared/database';
import type { ReviewData } from '@/shared/validation/review';

export type Review = Tables<'reviews'> & { review_photos: Tables<'review_photos'>[] };
export type PickedPhoto = { uri: string; mimeType: string; fileName: string };

export const reviewPhotoUrl = (storagePath: string) => supabase.storage.from('review-photos').getPublicUrl(storagePath).data.publicUrl;

/** The (single) review for a request — drives the post-completion prompt. */
export function useRequestReview(requestId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['reviews', 'request', requestId],
    enabled,
    queryFn: async (): Promise<Review | null> => {
      const { data, error } = await supabase.from('reviews').select('*, review_photos(*)').eq('request_id', requestId).maybeSingle();
      if (error) throw error;
      return data as Review | null;
    },
  });
}

/** complete_job checks server-side that the caller is the request's customer and the job is accepted. */
export function useCompleteJob(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('complete_job', { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_requests'] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export function useCreateReview(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ garageId, data, photos }: { garageId: string; data: ReviewData; photos: PickedPhoto[] }) => {
      const uid = await currentUserId();
      const { data: review, error } = await supabase
        .from('reviews')
        .insert({
          request_id: requestId,
          garage_id: garageId,
          customer_id: uid,
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
        try {
          const ext = photo.fileName.includes('.') ? photo.fileName.slice(photo.fileName.lastIndexOf('.')) : '.jpg';
          const path = `${uid}/${review.id}/${Math.random().toString(36).slice(2)}${Date.now()}${ext}`;
          const body = await (await fetch(photo.uri)).arrayBuffer();
          const up = await supabase.storage.from('review-photos').upload(path, body, { contentType: photo.mimeType });
          if (up.error) continue; // photo failures don't invalidate the review
          await supabase.from('review_photos').insert({ review_id: review.id, storage_path: path });
        } catch {
          // keep going — the review itself is saved
        }
      }
      return review;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['garages'] });
    },
  });
}
