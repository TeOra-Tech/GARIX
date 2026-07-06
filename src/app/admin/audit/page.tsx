'use client';

import { useAuditLogs } from '@/lib/admin/queries';

export default function AdminAuditPage() {
  const logs = useAuditLogs();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Audit log</h1>
      {logs.isPending && <p className="mt-8 text-paper/60">Loading…</p>}
      {logs.data?.length === 0 && <p className="mt-8 text-paper/60">No audit entries yet.</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-paper/40">
              <th className="py-2 pr-4 font-medium">When</th>
              <th className="py-2 pr-4 font-medium">Actor</th>
              <th className="py-2 pr-4 font-medium">Action</th>
              <th className="py-2 pr-4 font-medium">Entity</th>
              <th className="py-2 font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {logs.data?.map((l) => (
              <tr key={l.id} className="border-b border-ink-line/50 align-top">
                <td className="whitespace-nowrap py-2.5 pr-4 text-paper/50">
                  {new Date(l.created_at).toLocaleString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-2.5 pr-4">{l.actor?.full_name ?? 'System'}</td>
                <td className="py-2.5 pr-4 font-mono text-xs text-volt-bright">{l.action}</td>
                <td className="py-2.5 pr-4 text-paper/70">{l.entity_type}</td>
                <td className="max-w-md py-2.5 font-mono text-xs text-paper/50">
                  {l.before_state && <>−{JSON.stringify(l.before_state)}<br /></>}
                  {l.after_state && <>+{JSON.stringify(l.after_state)}</>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
