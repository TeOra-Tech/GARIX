import { describe, it, expect } from 'vitest';
import { calculateVat, IRELAND_VAT, formatEur } from '../src/lib/vat';

describe('Garix VAT engine (Ireland)', () => {
  it('applies 23% to parts and 13.5% to labour', () => {
    const r = calculateVat(100, 100);
    expect(r.partsVat).toBe(23.0);
    expect(r.labourVat).toBe(13.5);
    expect(r.totalVat).toBe(36.5);
    expect(r.grandTotal).toBe(236.5);
  });

  it('matches the spec formula: Parts + PartsVAT + Labour + LabourVAT', () => {
    const r = calculateVat(342.5, 187.25);
    expect(r.grandTotal).toBeCloseTo(
      r.partsNet + r.partsVat + r.labourNet + r.labourVat, 2,
    );
  });

  it('handles zero amounts', () => {
    const r = calculateVat(0, 0);
    expect(r.grandTotal).toBe(0);
  });

  it('rounds at cent precision without float drift', () => {
    const r = calculateVat(0.1, 0.1);        // 2.3c + 1.35c of VAT
    expect(r.partsVat).toBe(0.02);
    expect(r.labourVat).toBe(0.01);
    expect(r.grandTotal).toBe(0.23);
  });

  it('rejects negative inputs', () => {
    expect(() => calculateVat(-1, 0)).toThrow();
  });

  it('accepts admin-overridden rates', () => {
    const r = calculateVat(100, 100, { parts: 0.21, labour: 0.09 });
    expect(r.totalVat).toBe(30);
  });

  it('uses the current Irish statutory rates by default', () => {
    expect(IRELAND_VAT.parts).toBe(0.23);
    expect(IRELAND_VAT.labour).toBe(0.135);
  });

  it('formats euro for the Irish locale', () => {
    expect(formatEur(1234.5)).toContain('1,234.50');
  });
});
