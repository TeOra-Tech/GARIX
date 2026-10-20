import { describe, expect, it } from 'vitest';
import { BLOCKER_COPY, USER_KEYED_BUCKETS, isDeletionBlocker } from '@/lib/account/deletion';
import { listFiles, type StorageLister } from '@/lib/account/storage';

function fakeStorage(tree: Record<string, { name: string; id: string | null }[]>, fail?: string): StorageLister {
  return {
    from: () => ({
      list: async (prefix: string) =>
        prefix === fail ? { data: null, error: { message: 'boom' } } : { data: tree[prefix] ?? [], error: null },
    }),
  };
}

describe('listFiles', () => {
  it('collects files across nested folders', async () => {
    const storage = fakeStorage({
      u1: [
        { name: 'req-a', id: null },
        { name: 'loose.jpg', id: 'f0' },
      ],
      'u1/req-a': [
        { name: '1.jpg', id: 'f1' },
        { name: '2.mp4', id: 'f2' },
      ],
    });
    expect(await listFiles(storage, 'service-requests', 'u1')).toEqual([
      'u1/req-a/1.jpg',
      'u1/req-a/2.mp4',
      'u1/loose.jpg',
    ]);
  });

  it('returns nothing for an empty folder', async () => {
    expect(await listFiles(fakeStorage({}), 'documents', 'nobody')).toEqual([]);
  });

  it('surfaces storage errors so deletion can be retried', async () => {
    await expect(listFiles(fakeStorage({}, 'u1'), 'documents', 'u1')).rejects.toThrow('boom');
  });
});

describe('deletion blockers', () => {
  it('recognises every blocker the RPC can return', () => {
    for (const b of ['admin', 'owns_garage', 'active_billing', 'active_job', 'open_dispute']) {
      expect(isDeletionBlocker(b)).toBe(true);
      expect(BLOCKER_COPY[b as keyof typeof BLOCKER_COPY].text.length).toBeGreaterThan(0);
    }
    expect(isDeletionBlocker('something_else')).toBe(false);
  });

  it('sweeps only the {user_id}-keyed buckets', () => {
    expect([...USER_KEYED_BUCKETS].sort()).toEqual(['documents', 'review-photos', 'service-requests', 'vehicle-images']);
    expect(USER_KEYED_BUCKETS).not.toContain('garage-photos');
  });
});
