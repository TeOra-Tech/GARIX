import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { usePurchaseSupport, useStartPurchase, type BuyProduct } from '@/lib/payments';
import { Button, ErrorText } from '@/components/ui';

/**
 * "Buy credits" / "Upgrade to Garix Pro". Renders nothing where the store doesn't allow
 * buying in the app (outside the EU, or before the store programme is approved).
 */
export function BuyButton({ garageId, product, title, variant = 'primary' }: {
  garageId: string; product: BuyProduct; title: string; variant?: 'primary' | 'secondary';
}) {
  const support = usePurchaseSupport();
  const start = useStartPurchase();
  const qc = useQueryClient();
  const awaitingReturn = useRef(false);

  // Coming back from the checkout: the webhook may already have added the credits or plan.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !awaitingReturn.current) return;
      awaitingReturn.current = false;
      for (const key of ['credit_wallets', 'credit_transactions', 'garage_subscription', 'garages', 'garage_quotes_today']) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    });
    return () => sub.remove();
  }, [qc]);

  if (!support.data) return null;
  return (
    <>
      <Button
        title={title}
        variant={variant}
        loading={start.isPending}
        onPress={() =>
          start.mutate({ garageId, product }, { onSuccess: (r) => { if (r === 'opened') awaitingReturn.current = true; } })
        }
      />
      <ErrorText>{start.isError ? 'Couldn’t open the checkout. Try again.' : null}</ErrorText>
    </>
  );
}
