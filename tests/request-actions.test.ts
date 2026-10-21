import { describe, expect, it } from 'vitest';
import {
  DELETABLE_REQUEST_STATUSES,
  EDITABLE_REQUEST_STATUSES,
  requestActionError,
} from '@/lib/requests/queries';

describe('request edit/delete rules', () => {
  it('allows editing only before the first quote', () => {
    expect([...EDITABLE_REQUEST_STATUSES]).toEqual(['draft', 'open']);
  });

  it('allows deleting until a quote is accepted', () => {
    for (const s of ['draft', 'open', 'quoted', 'expired']) expect(DELETABLE_REQUEST_STATUSES).toContain(s);
    for (const s of ['accepted', 'in_progress', 'completed']) expect(DELETABLE_REQUEST_STATUSES).not.toContain(s);
  });
});

describe('requestActionError', () => {
  it('maps RPC errors to plain messages', () => {
    expect(requestActionError({ message: 'REQUEST_NOT_EDITABLE' })).toMatch(/already quoted/);
    expect(requestActionError({ message: 'REQUEST_NOT_DELETABLE' })).toMatch(/under way/);
    expect(requestActionError({ message: 'VEHICLE_NOT_OWNED' })).toMatch(/your own vehicles/);
    expect(requestActionError(new Error('network'))).toBe('Something went wrong. Try again.');
    expect(requestActionError(null)).toBe('Something went wrong. Try again.');
  });
});
