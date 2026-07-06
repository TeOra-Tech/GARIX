'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMyGarage } from '@/lib/garages/queries';
import {
  submitErrorMessage,
  useQuoteCosts,
  useSingleFeedRequest,
  useSubmitQuote,
  useVatRates,
  useWallet,
} from '@/lib/quotes/queries';
import { quoteSchema, quoteTotals, type QuoteItemData } from '@/lib/validation/quote';
import { calculateVat, formatEur, IRELAND_VAT } from '@/lib/vat';
import { URGENCY_LABELS } from '@/lib/validation/request';
import { Field, inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

type ItemRow = { itemType: 'labour' | 'part'; description: string; quantity: string; unitPrice: string };

const EMPTY_ROW: ItemRow = { itemType: 'labour', description: '', quantity: '1', unitPrice: '' };

function parsedItems(rows: ItemRow[]): QuoteItemData[] {
  const items: QuoteItemData[] = [];
  for (const r of rows) {
    const qty = Number(r.quantity);
    const price = Number(r.unitPrice);
    if (r.description.trim() && qty > 0 && price >= 0 && r.unitPrice !== '') {
      items.push({ itemType: r.itemType, description: r.description.trim(), quantity: qty, unitPrice: price });
    }
  }
  return items;
}

export default function WriteQuotePage() {
  const { id: requestId } = useParams<{ id: string }>();
  const router = useRouter();

  const garage = useMyGarage();
  const isActive = garage.data?.status === 'active';
  const request = useSingleFeedRequest(requestId, !!garage.data);
  const rates = useVatRates();
  const costs = useQuoteCosts();
  const wallet = useWallet(garage.data?.id);
  const submit = useSubmitQuote();

  const [rows, setRows] = useState<ItemRow[]>([{ ...EMPTY_ROW }]);
  const [isPriority, setIsPriority] = useState(false);
  const [duration, setDuration] = useState('');
  const [warranty, setWarranty] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const liveItems = parsedItems(rows);
  const totals = quoteTotals(liveItems);
  const vat = calculateVat(totals.parts, totals.labour, rates.data ?? IRELAND_VAT);
  const cost = isPriority ? (costs.data?.priority ?? 5) : (costs.data?.standard ?? 2);
  const balance = wallet.data?.balance ?? 0;

  function setRow(i: number, patch: Partial<ItemRow>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = quoteSchema.safeParse({
      items: rows.filter((r) => r.description.trim() || r.unitPrice !== ''),
      isPriority,
      estimatedDurationHours: duration,
      warrantyInfo: warranty,
      notes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (!garage.data) return;
    submit.mutate(
      { requestId, garageId: garage.data.id, data: parsed.data },
      {
        onSuccess: () => router.push('/dashboard/garage/requests?quoted=1'),
        onError: (err) => setError(submitErrorMessage(err, cost)),
      },
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/dashboard/garage/requests" className="text-sm text-paper/60 hover:text-volt-bright">
        &larr; Request feed
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Write a quote</h1>

      {!isActive && garage.isSuccess && (
        <p role="alert" className="mt-8 rounded-lg border border-signal/40 bg-signal/10 p-4 text-sm text-signal-soft">
          Your garage must be verified before you can quote.
        </p>
      )}

      {request.isError && (
        <p role="alert" className="mt-8 text-signal">This request is no longer available.</p>
      )}

      {isActive && request.data && (
        <>
          <section className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-6">
            <h2 className="font-display text-lg font-semibold">{request.data.title}</h2>
            <p className="mt-2 text-sm text-paper/70">{request.data.description}</p>
            <p className="mt-3 text-xs text-paper/40">
              {[
                request.data.service_category?.name,
                URGENCY_LABELS[request.data.urgency],
                `${request.data.location_town}, Co. ${request.data.location_county}`,
                request.data.budget_amount != null && `Budget ${formatEur(Number(request.data.budget_amount))}`,
                request.data.collection_required && 'Collection required',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </section>

          <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]" noValidate>
            <div className="space-y-6">
              <section>
                <h2 className="font-display text-xl font-semibold">Line items</h2>
                <div className="mt-4 space-y-3">
                  {rows.map((row, i) => {
                    const lineTotal =
                      row.unitPrice !== '' && Number(row.quantity) > 0
                        ? Math.round(Number(row.quantity) * Number(row.unitPrice) * 100) / 100
                        : null;
                    return (
                      <div key={i} className="grid grid-cols-[6.5rem_1fr] gap-2 rounded-lg border border-ink-line p-3 sm:grid-cols-[6.5rem_1fr_4.5rem_6.5rem_5.5rem_2rem] sm:items-center">
                        <select
                          aria-label={`Item ${i + 1} type`}
                          className={cn(inputCls, '!px-2 !py-2 text-sm')}
                          value={row.itemType}
                          onChange={(e) => setRow(i, { itemType: e.target.value as ItemRow['itemType'] })}
                        >
                          <option value="labour">Labour</option>
                          <option value="part">Part</option>
                        </select>
                        <input
                          aria-label={`Item ${i + 1} description`}
                          className={cn(inputCls, '!px-3 !py-2 text-sm')}
                          placeholder={row.itemType === 'labour' ? 'e.g. Replace front pads (1.5 hrs)' : 'e.g. Brake pads — front set'}
                          value={row.description}
                          onChange={(e) => setRow(i, { description: e.target.value })}
                        />
                        <input
                          aria-label={`Item ${i + 1} quantity`}
                          inputMode="decimal"
                          className={cn(inputCls, '!px-3 !py-2 text-sm')}
                          placeholder="Qty"
                          value={row.quantity}
                          onChange={(e) => setRow(i, { quantity: e.target.value })}
                        />
                        <input
                          aria-label={`Item ${i + 1} unit price in euro`}
                          inputMode="decimal"
                          className={cn(inputCls, '!px-3 !py-2 text-sm')}
                          placeholder="€ each"
                          value={row.unitPrice}
                          onChange={(e) => setRow(i, { unitPrice: e.target.value })}
                        />
                        <span className="text-right text-sm text-paper/60">
                          {lineTotal != null ? formatEur(lineTotal) : '—'}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove item ${i + 1}`}
                          className="text-paper/40 hover:text-signal disabled:opacity-30"
                          disabled={rows.length === 1}
                          onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                        >
                          &#10005;
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn-ghost mt-3 !px-4 !py-2 text-sm"
                  onClick={() => setRows((rs) => [...rs, { ...EMPTY_ROW, itemType: 'part' }])}
                >
                  Add line item
                </button>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Estimated duration (hours, optional)" htmlFor="duration">
                  <input id="duration" inputMode="decimal" className={inputCls} value={duration}
                    onChange={(e) => setDuration(e.target.value)} placeholder="2.5" />
                </Field>
                <Field label="Warranty (optional)" htmlFor="warranty">
                  <input id="warranty" className={inputCls} value={warranty}
                    onChange={(e) => setWarranty(e.target.value)} placeholder="e.g. 12 months on parts and labour" />
                </Field>
              </div>
              <Field label="Notes to the customer (optional)" htmlFor="notes">
                <textarea id="notes" rows={3} className={inputCls} value={notes}
                  onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
              </Field>

              <label className="flex items-start gap-3 rounded-lg border border-ink-line p-4 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-volt" checked={isPriority}
                  onChange={(e) => setIsPriority(e.target.checked)} />
                <span>
                  <span className="font-medium">Priority quote</span>
                  <span className="text-paper/60">
                    {' '}— shown first to the customer ({costs.data?.priority ?? 5} credits instead of {costs.data?.standard ?? 2})
                  </span>
                </span>
              </label>
            </div>

            {/* ---------- Live VAT preview ---------- */}
            <aside className="h-fit rounded-hex border border-ink-line bg-ink-soft p-6 font-mono text-sm lg:sticky lg:top-20">
              <h2 className="font-display text-lg font-semibold">Quote preview</h2>
              <dl className="mt-4 space-y-2">
                {[
                  ['Labour', formatEur(vat.labourNet)],
                  [`Labour VAT @ ${(vat.rates.labour * 100).toFixed(1)}%`, formatEur(vat.labourVat)],
                  ['Parts', formatEur(vat.partsNet)],
                  [`Parts VAT @ ${(vat.rates.parts * 100).toFixed(0)}%`, formatEur(vat.partsVat)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-paper/80">
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-ink-line pt-3 font-display text-base font-bold text-signal">
                  <dt>Grand total</dt>
                  <dd>{formatEur(vat.grandTotal)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-paper/50">
                Submitting costs <span className="text-paper">{cost} credits</span> — balance {balance}.
              </p>
              {error && <p role="alert" className="mt-3 text-xs text-signal">{error}</p>}
              <button type="submit" className="btn-primary mt-4 w-full" disabled={submit.isPending || liveItems.length === 0}>
                {submit.isPending ? 'Submitting…' : 'Submit quote'}
              </button>
            </aside>
          </form>
        </>
      )}
    </main>
  );
}
