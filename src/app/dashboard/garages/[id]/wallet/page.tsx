'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { track } from '@/lib/analytics';
import { useOwnedGarage } from '@/lib/garages/portal';
import { useWallet } from '@/lib/quotes/queries';
import { TX_LABELS, useCreditPacks, useStartCheckout, useTransactions } from '@/lib/wallet/queries';
import { formatEur } from '@/lib/vat';
import { cn } from '@/lib/utils';

function WalletContent() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const purchase = params.get('purchase');

  const garage = useOwnedGarage(id);
  const wallet = useWallet(garage.data?.id);
  const packs = useCreditPacks();
  const transactions = useTransactions(garage.data?.id);
  const checkout = useStartCheckout();

  const balance = wallet.data?.balance ?? 0;
  const lowBalance = wallet.data != null && balance < (wallet.data.low_balance_threshold ?? 10);

  useEffect(() => {
    if (purchase === 'success') track('credits_purchased');
  }, [purchase]);

  if (!garage.data) return null;

  return (
    <section className="py-8">
      <h2 className="font-display text-2xl font-bold">Credit wallet</h2>

      {purchase === 'success' && (
        <p className="mt-6 rounded-lg border border-volt/40 bg-volt/10 p-4 text-sm" role="status">
          Payment received — your credits appear below as soon as Stripe confirms (usually seconds).
        </p>
      )}
      {purchase === 'cancelled' && (
        <p className="mt-6 rounded-lg border border-ink-line bg-ink-soft p-4 text-sm text-paper/60" role="status">
          Checkout cancelled — no payment was taken.
        </p>
      )}

      <div
        className={cn(
          'mt-6 rounded-hex border p-8',
          lowBalance ? 'border-signal/40 bg-signal/10' : 'border-ink-line bg-ink-soft',
        )}
      >
        <p className="text-sm text-paper/60">Balance for {garage.data.name}</p>
        <p className="mt-1 font-display text-5xl font-extrabold">
          {balance} <span className="text-xl font-semibold text-paper/50">credits</span>
        </p>
        <p className="mt-2 text-sm text-paper/50">1 credit = €1 · quotes cost 2 credits (5 for priority)</p>
        {lowBalance && (
          <p className="mt-3 text-sm text-signal-soft" role="alert">
            Low balance — top up below so you don&rsquo;t miss jobs in your area.
          </p>
        )}
      </div>

      <div className="mt-10">
        <h3 className="font-display text-xl font-bold">Buy credits</h3>
        {checkout.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            Could not start the checkout. Try again.
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {packs.data?.map((p) => (
            <button
              key={p.id}
              type="button"
              className="rounded-hex border border-ink-line bg-ink-soft p-5 text-center transition hover:border-volt disabled:opacity-50"
              disabled={checkout.isPending}
              onClick={() => checkout.mutate({ garageId: garage.data!.id, creditPackId: p.id })}
            >
              <span className="block font-display text-2xl font-bold text-volt-bright">{p.credits}</span>
              <span className="block text-xs uppercase tracking-wide text-paper/50">credits</span>
              <span className="mt-2 block font-display font-semibold">{formatEur(Number(p.price_eur))}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-paper/40">
          Secure payment via Stripe. Credits are added automatically after payment.
        </p>
      </div>

      <div className="mt-10">
        <h3 className="font-display text-xl font-bold">Transactions</h3>
        {transactions.isPending && <p className="mt-4 text-paper/60">Loading…</p>}
        {transactions.data?.length === 0 && (
          <p className="mt-4 rounded-hex border border-ink-line bg-ink-soft p-6 text-sm text-paper/60">
            No transactions yet — your ledger appears here after your first top-up or quote.
          </p>
        )}
        {!!transactions.data?.length && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-paper/40">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 text-right font-medium">Credits</th>
                <th className="py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.data.map((t) => (
                <tr key={t.id} className="border-b border-ink-line/50">
                  <td className="py-2.5 text-paper/60">
                    {new Date(t.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-2.5">
                    {TX_LABELS[t.type]}
                    {t.description && <span className="block text-xs text-paper/40">{t.description}</span>}
                  </td>
                  <td className={cn('py-2.5 text-right font-mono', t.amount > 0 ? 'text-volt-bright' : 'text-paper/80')}>
                    {t.amount > 0 ? `+${t.amount}` : t.amount}
                  </td>
                  <td className="py-2.5 text-right font-mono text-paper/60">{t.balance_after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <Suspense>
      <WalletContent />
    </Suspense>
  );
}
