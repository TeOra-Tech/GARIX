'use client';

import { useState } from 'react';
import { useAdminUsers, useSetUserRole } from '@/lib/admin/queries';
import { useUserId } from '@/lib/messages/queries';
import { inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

const ROLES = ['customer', 'garage_owner', 'admin'] as const;

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const me = useUserId();
  const users = useAdminUsers(query);
  const setRole = useSetUserRole();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Users</h1>

      <form
        className="mt-6 flex max-w-md gap-2"
        onSubmit={(e) => { e.preventDefault(); setQuery(search); }}
      >
        <input aria-label="Search users" className={inputCls} placeholder="Search by name or email"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn-ghost shrink-0 !px-4">Search</button>
      </form>

      {users.isPending && <p className="mt-8 text-paper/60">Loading…</p>}
      {setRole.isError && <p role="alert" className="mt-4 text-sm text-danger">Role change failed.</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-paper/40">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Mobile</th>
              <th className="py-2 pr-4 font-medium">Joined</th>
              <th className="py-2 pr-4 font-medium">Flags</th>
              <th className="py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id} className="border-b border-ink-line/50">
                <td className="py-2.5 pr-4 font-medium">{u.full_name || '—'}</td>
                <td className="py-2.5 pr-4 text-paper/70">{u.email}</td>
                <td className="py-2.5 pr-4 text-paper/70">{u.mobile_number ?? '—'}</td>
                <td className="py-2.5 pr-4 text-paper/50">
                  {new Date(u.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="py-2.5 pr-4">
                  {u.data_deletion_requested_at && (
                    <span className="rounded-full border border-signal/50 px-2 py-0.5 text-xs text-signal-soft">
                      Deletion requested
                    </span>
                  )}
                </td>
                <td className="py-2.5">
                  <select
                    aria-label={`Role for ${u.full_name || u.email}`}
                    className={cn(inputCls, '!w-36 !px-2 !py-1.5 text-sm')}
                    value={u.role}
                    disabled={u.id === me.data || setRole.isPending}
                    onChange={(e) => setRole.mutate({ userId: u.id, role: e.target.value as (typeof ROLES)[number] })}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
