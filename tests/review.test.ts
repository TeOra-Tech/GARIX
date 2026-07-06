import { describe, it, expect } from 'vitest';
import { reviewSchema, responseSchema, reviewPhotoProblems } from '@/lib/validation/review';

const base = { quality: 5, communication: 4, price: 4, speed: 5, overall: 5, body: 'Sound garage, sorted the clutch in a day.' };

describe('review schema', () => {
  it('accepts a full five-category rating', () => {
    const r = reviewSchema.parse(base);
    expect(r.overall).toBe(5);
    expect(r.body).toContain('clutch');
  });

  it('requires every category within 1–5', () => {
    expect(reviewSchema.safeParse({ ...base, price: 0 }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, speed: 6 }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, overall: undefined }).success).toBe(false);
  });

  it('allows an empty body', () => {
    expect(reviewSchema.safeParse({ ...base, body: '' }).success).toBe(true);
  });
});

describe('garage response', () => {
  it('requires substance and bounds length', () => {
    expect(responseSchema.safeParse('Thanks a million!').success).toBe(true);
    expect(responseSchema.safeParse(' ').success).toBe(false);
    expect(responseSchema.safeParse('x'.repeat(1001)).success).toBe(false);
  });
});

describe('review photos', () => {
  const img = (mb: number) => new File([new ArrayBuffer(mb * 1024 * 1024)], 'p.jpg', { type: 'image/jpeg' });

  it('accepts up to three images under 5 MB', () => {
    expect(reviewPhotoProblems([img(1), img(2), img(4)])).toBeNull();
  });

  it('rejects a fourth photo, oversize files, and non-images', () => {
    expect(reviewPhotoProblems([img(1), img(1), img(1), img(1)])).toMatch(/at most 3/);
    expect(reviewPhotoProblems([img(6)])).toMatch(/under 5 MB/);
    expect(reviewPhotoProblems([new File([''], 'a.pdf', { type: 'application/pdf' })])).toMatch(/only photos/);
  });
});
