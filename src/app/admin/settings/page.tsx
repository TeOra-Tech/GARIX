'use client';

import { useState } from 'react';
import { useAdminSettings, useSaveSetting } from '@/lib/admin/queries';
import { inputCls } from '@/components/auth/field';
import { cn } from '@/lib/utils';

function SettingRow({ setting }: { setting: { key: string; value: unknown; description: string | null } }) {
  const save = useSaveSetting();
  const [draft, setDraft] = useState(() => JSON.stringify(setting.value, null, 2));
  const [error, setError] = useState<string | null>(null);
  const dirty = draft !== JSON.stringify(setting.value, null, 2);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setError('Not valid JSON');
      return;
    }
    setError(null);
    save.mutate({ key: setting.key, value: parsed });
  }

  return (
    <li className="rounded-hex border border-ink-line bg-ink-soft p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-sm font-semibold text-volt-bright">{setting.key}</p>
        {setting.description && <p className="text-xs text-paper/50">{setting.description}</p>}
      </div>
      <form onSubmit={submit} className="mt-3">
        <textarea
          aria-label={`Value for ${setting.key}`}
          rows={Math.min(6, draft.split('\n').length)}
          className={cn(inputCls, 'font-mono text-sm')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
        />
        <div className="mt-2 flex items-center gap-3">
          <button type="submit" className="btn-primary !px-4 !py-1.5 text-sm" disabled={!dirty || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {save.isError && !error && <p role="alert" className="text-sm text-danger">Save failed.</p>}
          {save.isSuccess && !dirty && <p className="text-sm text-volt-bright">Saved.</p>}
        </div>
      </form>
    </li>
  );
}

export default function AdminSettingsPage() {
  const settings = useAdminSettings();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">System settings</h1>
      <p className="mt-2 text-sm text-paper/60">
        Live configuration — credit pricing takes effect on the next quote, no deploy needed.
      </p>
      {settings.isPending && <p className="mt-8 text-paper/60">Loading…</p>}
      <ul className="mt-6 space-y-4">
        {settings.data?.map((s) => <SettingRow key={s.key} setting={s} />)}
      </ul>
    </main>
  );
}
