import { describe, expect, it } from 'vitest';
import {
  reminderSchema,
  reminderTypeLabel,
  recordTypeLabel,
  serviceRecordSchema,
  transferSchema,
} from '@/lib/validation/vehicle-care';

describe('serviceRecordSchema', () => {
  const base = {
    eventType: 'engine_service',
    eventDate: '2026-07-01',
    title: '',
    description: '',
    partsReplaced: '',
    mileageKm: '',
    costEur: '',
    garageName: '',
    warrantyUntil: '',
    nextDueDate: '',
    nextDueMileageKm: '',
  };

  it('accepts a minimal record and nulls empty optionals', () => {
    const parsed = serviceRecordSchema.parse(base);
    expect(parsed.eventType).toBe('engine_service');
    expect(parsed.mileageKm).toBeNull();
    expect(parsed.costEur).toBeNull();
    expect(parsed.warrantyUntil).toBeNull();
  });

  it('coerces numeric strings', () => {
    const parsed = serviceRecordSchema.parse({ ...base, mileageKm: '120500', costEur: '349.99' });
    expect(parsed.mileageKm).toBe(120500);
    expect(parsed.costEur).toBeCloseTo(349.99);
  });

  it('rejects a missing service date', () => {
    expect(serviceRecordSchema.safeParse({ ...base, eventDate: '' }).success).toBe(false);
  });

  it('rejects negative cost and mileage', () => {
    expect(serviceRecordSchema.safeParse({ ...base, costEur: '-1' }).success).toBe(false);
    expect(serviceRecordSchema.safeParse({ ...base, mileageKm: '-5' }).success).toBe(false);
  });

  it('rejects unknown record types', () => {
    expect(serviceRecordSchema.safeParse({ ...base, eventType: 'flux_capacitor' }).success).toBe(false);
  });
});

describe('reminderSchema', () => {
  const base = {
    reminderType: 'nct',
    title: '',
    dueDate: '2026-09-01',
    dueMileageKm: '',
    intervalMonths: '',
    notes: '',
  };

  it('accepts a minimal reminder', () => {
    const parsed = reminderSchema.parse(base);
    expect(parsed.reminderType).toBe('nct');
    expect(parsed.intervalMonths).toBeNull();
  });

  it('requires a due date', () => {
    expect(reminderSchema.safeParse({ ...base, dueDate: '' }).success).toBe(false);
  });

  it("requires a title when type is 'other'", () => {
    expect(reminderSchema.safeParse({ ...base, reminderType: 'other' }).success).toBe(false);
    expect(
      reminderSchema.safeParse({ ...base, reminderType: 'other', title: 'Coolant flush' }).success,
    ).toBe(true);
  });

  it('bounds the repeat interval', () => {
    expect(reminderSchema.safeParse({ ...base, intervalMonths: '0' }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...base, intervalMonths: '12' }).success).toBe(true);
    expect(reminderSchema.safeParse({ ...base, intervalMonths: '999' }).success).toBe(false);
  });
});

describe('transferSchema', () => {
  it('normalises the email', () => {
    expect(transferSchema.parse({ toEmail: '  NewOwner@Example.COM ' }).toEmail).toBe(
      'newowner@example.com',
    );
  });

  it('rejects invalid emails', () => {
    expect(transferSchema.safeParse({ toEmail: 'not-an-email' }).success).toBe(false);
  });
});

describe('labels', () => {
  it('maps known types and falls back gracefully', () => {
    expect(recordTypeLabel('gearbox_service')).toBe('Gearbox service');
    expect(recordTypeLabel('ownership_change')).toBe('Ownership change');
    expect(recordTypeLabel('mystery')).toBe('Other');
    expect(reminderTypeLabel('road_tax')).toBe('Road tax');
    expect(reminderTypeLabel('mystery')).toBe('Other');
  });
});
