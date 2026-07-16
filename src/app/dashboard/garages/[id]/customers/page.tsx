'use client';

import { useParams } from 'next/navigation';
import { useGarageCustomers } from '@/lib/garages/portal';
import { formatEur } from '@/lib/vat';

export default function GarageCustomersPage() {
  const { id } = useParams<{ id: string }>();
  const customers = useGarageCustomers(id);

  return (
    <section className="py-8">
      <h2 className="font-display text-2xl font-bold">Customers</h2>
      <p className="mt-1 text-sm text-paper/60">
        Everyone who has accepted a quote from this garage — your book of business.
      </p>

      {customers.isPending && <p className="mt-6 text-paper/60">Loading customers…</p>}
      {customers.isError && (
        <p role="alert" className="mt-6 text-danger">Could not load customers. Refresh to try again.</p>
      )}
      {customers.data?.length === 0 && (
        <p className="mt-6 rounded-hex border border-ink-line bg-ink-soft p-8 text-center text-paper/60">
          No customers yet — they appear here after your first accepted quote.
        </p>
      )}

      {!!customers.data?.length && (
        <div className="mt-6 overflow-x-auto rounded-hex border border-ink-line bg-ink-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-paper/40">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 text-right font-medium">Jobs</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3 text-right font-medium">Last job</th>
              </tr>
            </thead>
            <tbody>
              {customers.data.map((c) => (
                <tr key={c.customer_id} className="border-b border-ink-line/50 last:border-0">
                  <td className="px-4 py-3 font-medium">{c.full_name}</td>
                  <td className="px-4 py-3 text-paper/70">
                    <a href={`mailto:${c.email}`} className="hover:text-volt-bright hover:underline">
                      {c.email}
                    </a>
                    {c.mobile_number && (
                      <span className="block text-xs text-paper/50">{c.mobile_number}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {c.jobs_completed}/{c.jobs_total}
                    <span className="block text-xs text-paper/40">done/total</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {c.total_value != null ? formatEur(Number(c.total_value)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-paper/60">
                    {c.last_job_at
                      ? new Date(c.last_job_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
