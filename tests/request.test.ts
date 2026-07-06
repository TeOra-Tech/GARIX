import { describe, it, expect } from 'vitest';
import { serviceRequestSchema, attachmentProblems } from '@/lib/validation/request';

const base = {
  vehicleId: '4c8e2a4e-3f0b-4b58-9a4e-111111111111',
  serviceCategoryId: '4c8e2a4e-3f0b-4b58-9a4e-222222222222',
  problemCategoryId: '',
  title: 'Grinding noise when braking',
  description: 'Started last week, gets worse at low speed. No warning lights on the dash.',
  urgency: 'this_week',
  locationTown: 'Naas',
  locationCounty: 'Kildare',
  lat: 53.2191,
  lng: -6.6598,
  collectionRequired: false,
  expectedCompletionDate: '',
  budgetAmount: '400',
};

describe('service request schema', () => {
  it('accepts a complete request and coerces budget', () => {
    const r = serviceRequestSchema.parse(base);
    expect(r.budgetAmount).toBe(400);
    expect(r.problemCategoryId).toBeNull();
    expect(r.expectedCompletionDate).toBeNull();
  });

  it('requires a meaningful title and description', () => {
    expect(serviceRequestSchema.safeParse({ ...base, title: 'Hi' }).success).toBe(false);
    expect(serviceRequestSchema.safeParse({ ...base, description: 'Broken.' }).success).toBe(false);
  });

  it('rejects past completion dates and absurd budgets', () => {
    expect(serviceRequestSchema.safeParse({ ...base, expectedCompletionDate: '2020-01-01' }).success).toBe(false);
    expect(serviceRequestSchema.safeParse({ ...base, budgetAmount: '0' }).success).toBe(false);
    expect(serviceRequestSchema.safeParse({ ...base, budgetAmount: '999999' }).success).toBe(false);
  });

  it('bounds coordinates to Ireland', () => {
    expect(serviceRequestSchema.safeParse({ ...base, lat: 40.7, lng: -74.0 }).success).toBe(false);
    expect(serviceRequestSchema.safeParse({ ...base, lat: null, lng: null }).success).toBe(true);
  });

  it('rejects unknown urgency and county', () => {
    expect(serviceRequestSchema.safeParse({ ...base, urgency: 'yesterday' }).success).toBe(false);
    expect(serviceRequestSchema.safeParse({ ...base, locationCounty: 'Yorkshire' }).success).toBe(false);
  });
});

describe('attachment rules', () => {
  const file = (name: string, type: string, mb: number) =>
    new File([new ArrayBuffer(mb * 1024 * 1024)], name, { type });

  it('accepts a few images and videos', () => {
    expect(attachmentProblems([file('a.jpg', 'image/jpeg', 1), file('b.mp4', 'video/mp4', 5)])).toBeNull();
  });

  it('rejects oversized files, wrong types, and too many files', () => {
    expect(attachmentProblems([file('big.jpg', 'image/jpeg', 11)])).toMatch(/under 10 MB/);
    expect(attachmentProblems([file('doc.pdf', 'application/pdf', 1)])).toMatch(/photos and videos/);
    expect(attachmentProblems(Array.from({ length: 6 }, (_, i) => file(`p${i}.jpg`, 'image/jpeg', 1)))).toMatch(/at most 5/);
  });
});
