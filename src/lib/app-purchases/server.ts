import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '@/types/database';

/**
 * A purchase started from the mobile app arrives here as `?app_link=<id>` on the
 * wallet or plan page. The id ties the Stripe checkout to the store token the app
 * recorded, so the webhook can report the sale to Apple or Google.
 */
export const appLinkIdSchema = z.string().uuid().optional();

/** How long an app link stays usable (Apple's commission window is 7 days from the tap). */
const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class AppLinkError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

/**
 * Checks the link belongs to this user and garage and was started for this product.
 * `client` can be the caller's own client (RLS lets owners read their links) or an admin client.
 */
export async function verifyAppLink(
  client: SupabaseClient<Database>,
  { linkId, userId, garageId, product }: { linkId: string; userId: string; garageId: string; product: 'credits' | 'pro' },
) {
  const { data: link } = await client
    .from('app_purchase_links')
    .select('id, user_id, garage_id, product, created_at')
    .eq('id', linkId)
    .maybeSingle();
  if (!link || link.user_id !== userId || link.garage_id !== garageId) throw new AppLinkError('APP_LINK_NOT_FOUND', 404);
  if (link.product !== product) throw new AppLinkError('APP_LINK_WRONG_PRODUCT');
  if (Date.now() - new Date(link.created_at).getTime() > LINK_TTL_MS) throw new AppLinkError('APP_LINK_EXPIRED', 410);
  return link;
}

/** Where Stripe sends app buyers afterwards: a page that hands them back to the app. */
export function appReturnUrls(origin: string) {
  return {
    success_url: `${origin}/app/purchase-complete?status=success`,
    cancel_url: `${origin}/app/purchase-complete?status=cancelled`,
  };
}
