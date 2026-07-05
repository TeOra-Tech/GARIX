import { describe, it, expect } from 'vitest';
import { vehicleSchema, regNumberSchema } from '@/lib/validation/vehicle';
import { normaliseReg } from '@/lib/vehicles/lookup';

const base = {
  registrationNumber: '191-D-12345',
  makeId: '4c8e2a4e-3f0b-4b58-9a4e-111111111111',
  makeText: '',
  modelId: '',
  modelText: '',
  variant: '',
  year: '2019',
  engineId: '',
  engineSizeCustom: '',
  fuelType: 'petrol',
  transmission: 'manual',
  vin: '',
  mileageKm: '120000',
};

describe('registration number', () => {
  it('normalises spacing and case to dash-separated uppercase', () => {
    expect(normaliseReg('  191 d 12345 ')).toBe('191-D-12345');
    expect(regNumberSchema.parse('09 ke 1234')).toBe('09-KE-1234');
    expect(regNumberSchema.parse('132-CE-77')).toBe('132-CE-77');
  });

  it('rejects empty and junk values', () => {
    expect(regNumberSchema.safeParse('').success).toBe(false);
    expect(regNumberSchema.safeParse('!!@@').success).toBe(false);
    expect(regNumberSchema.safeParse('1'.repeat(20)).success).toBe(false);
  });
});

describe('vehicle schema', () => {
  it('accepts a full manual entry and coerces numerics', () => {
    const r = vehicleSchema.parse(base);
    expect(r.year).toBe(2019);
    expect(r.mileageKm).toBe(120000);
    expect(r.makeId).toBe(base.makeId);
    expect(r.modelId).toBeNull();
  });

  it('requires either a make selection or free-text make', () => {
    const r = vehicleSchema.safeParse({ ...base, makeId: '', makeText: '' });
    expect(r.success).toBe(false);
    const ok = vehicleSchema.safeParse({ ...base, makeId: '', makeText: 'Lada' });
    expect(ok.success).toBe(true);
  });

  it('bounds the year and mileage', () => {
    expect(vehicleSchema.safeParse({ ...base, year: '1930' }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...base, mileageKm: '-5' }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...base, year: '', mileageKm: '' }).success).toBe(true);
  });

  it('rejects unknown fuel types and long VINs', () => {
    expect(vehicleSchema.safeParse({ ...base, fuelType: 'steam' }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...base, vin: 'X'.repeat(18) }).success).toBe(false);
  });
});
