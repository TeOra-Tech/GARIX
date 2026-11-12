// Buying credits and Garix Pro from the app. Payment happens on the garix.ie Stripe checkout,
// reached through each store's EU link-out programme:
//   * Android: Google Play external offers (Google shows its disclosure dialog first)
//   * iOS:     Apple's ExternalPurchaseCustomLink (Apple shows its disclosure sheet first)
// Each tap is recorded in app_purchase_links with the store's reporting token; the Stripe
// webhook links the payment to it and reports it to the store (see migration 00030).
import { Linking, Platform } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createBillingProgramReportingDetailsAndroid,
  getExternalPurchaseCustomLinkTokenIOS,
  initConnection,
  isBillingProgramAvailableAndroid,
  isEligibleForExternalPurchaseCustomLinkIOS,
  launchExternalLinkAndroid,
  showExternalPurchaseCustomLinkNoticeIOS,
} from 'expo-iap';
import { API_URL, currentUserId, supabase } from './supabase';

export type BuyProduct = 'credits' | 'pro';

let connected: Promise<unknown> | null = null;
function connect() {
  // Android needs the billing programme enabled on the connection before using it.
  connected ??= initConnection(Platform.OS === 'android' ? { enableBillingProgramAndroid: 'external-offer' } : undefined).catch((e) => {
    connected = null;
    throw e;
  });
  return connected;
}

/** Whether this device and store allow buying here (EU storefront, programme approved). */
export function usePurchaseSupport() {
  return useQuery({
    queryKey: ['purchase_support', Platform.OS],
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<boolean> => {
      try {
        if (Platform.OS === 'android') {
          await connect();
          return (await isBillingProgramAvailableAndroid('external-offer')).isAvailable;
        }
        if (Platform.OS === 'ios') return await isEligibleForExternalPurchaseCustomLinkIOS();
      } catch {
        // Not available (no Play/App Store, not approved, outside the EU…): hide buying.
      }
      return false;
    },
  });
}

const pagePath = (garageId: string, product: BuyProduct) => `/dashboard/garages/${garageId}/${product === 'pro' ? 'plan' : 'wallet'}`;

async function recordTap(row: {
  garageId: string; product: BuyProduct; platform: 'ios' | 'android'; token?: string; tokenType?: 'acquisition' | 'services';
}): Promise<string> {
  const { data, error } = await supabase
    .from('app_purchase_links')
    .insert({
      garage_id: row.garageId,
      user_id: await currentUserId(),
      platform: row.platform,
      program: row.platform === 'ios' ? 'apple_custom_link' : 'google_external_offer',
      product: row.product,
      external_token: row.token ?? null,
      token_type: row.tokenType ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Resolves 'opened' once the checkout is open in the browser, or 'cancelled' if the user backed out. */
export function useStartPurchase() {
  return useMutation({
    mutationFn: async ({ garageId, product }: { garageId: string; product: BuyProduct }): Promise<'opened' | 'cancelled'> => {
      if (Platform.OS === 'android') {
        await connect();
        const linkId = await recordTap({ garageId, product, platform: 'android' });
        const url = `${API_URL}${pagePath(garageId, product)}?app_link=${linkId}`;
        // Google's disclosure dialog; we open the link ourselves so the token is saved first.
        const continued = await launchExternalLinkAndroid({
          billingProgram: 'external-offer',
          launchMode: 'caller-will-launch-link',
          linkType: 'link-to-digital-content-offer',
          linkUri: url,
        });
        if (!continued) return 'cancelled';
        const { externalTransactionToken } = await createBillingProgramReportingDetailsAndroid('external-offer');
        const { error } = await supabase.from('app_purchase_links').update({ external_token: externalTransactionToken }).eq('id', linkId);
        if (error) throw error;
        await Linking.openURL(url);
        return 'opened';
      }

      if (Platform.OS === 'ios') {
        // Apple's disclosure sheet must be shown on every tap.
        const notice = await showExternalPurchaseCustomLinkNoticeIOS('browser');
        if (!notice.continued) return 'cancelled';
        // 'acquisition' for customers new to our external offers, else 'services'.
        let tokenType: 'acquisition' | 'services' = 'acquisition';
        let result = await getExternalPurchaseCustomLinkTokenIOS('acquisition');
        if (!result.token) {
          tokenType = 'services';
          result = await getExternalPurchaseCustomLinkTokenIOS('services');
        }
        if (!result.token) throw new Error(result.error ?? 'NO_EXTERNAL_PURCHASE_TOKEN');
        const linkId = await recordTap({ garageId, product, platform: 'ios', token: result.token, tokenType });
        await Linking.openURL(`${API_URL}${pagePath(garageId, product)}?app_link=${linkId}`);
        return 'opened';
      }

      throw new Error('UNSUPPORTED_PLATFORM');
    },
  });
}
