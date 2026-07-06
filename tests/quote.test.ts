import { describe, it, expect } from 'vitest';
import { quoteSchema, quoteTotals } from '@/lib/validation/quote';
import { calculateVat } from '@/lib/vat';

const items = [
  { itemType: 'labour' as const, description: 'Replace front pads', quantity: 1.5, unitPrice: 80 },
  { itemType: 'part' as const, description: 'Brake pads — front set', quantity: 1, unitPrice: 95.5 },
  { itemType: 'part' as const, description: 'Discs (pair)', quantity: 2, unitPrice: 57.25 },
];

describe('quote totals', () => {
  it('sums labour and parts separately with cent precision', () => {
    const t = quoteTotals(items);
    expect(t.labour).toBe(120);
    expect(t.parts).toBe(210);
  });

  it('rounds each line at cent precision like the DB generated column', () => {
    // 3 × €33.333 → line = round(99.999, 2) = 100.00, not 99.99
    const t = quoteTotals([{ itemType: 'part', description: 'x', quantity: 3, unitPrice: 33.333 }]);
    expect(t.parts).toBe(100);
  });

  it('feeds the VAT engine to the spec example totals', () => {
    const t = quoteTotals(items);
    const vat = calculateVat(t.parts, t.labour);
    expect(vat.labourVat).toBe(16.2); // 120 × 13.5%
    expect(vat.partsVat).toBe(48.3); // 210 × 23%
    expect(vat.grandTotal).toBe(394.5);
  });
});

describe('quote schema', () => {
  const base = {
    items,
    isPriority: false,
    estimatedDurationHours: '2.5',
    warrantyInfo: '12 months',
    notes: '',
  };

  it('accepts a valid quote and coerces numerics', () => {
    const r = quoteSchema.parse(base);
    expect(r.estimatedDurationHours).toBe(2.5);
    expect(r.items).toHaveLength(3);
  });

  it('requires at least one item', () => {
    expect(quoteSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it('rejects negative prices, zero quantities, and bad types', () => {
    expect(quoteSchema.safeParse({ ...base, items: [{ ...items[0], unitPrice: -5 }] }).success).toBe(false);
    expect(quoteSchema.safeParse({ ...base, items: [{ ...items[0], quantity: 0 }] }).success).toBe(false);
    expect(quoteSchema.safeParse({ ...base, items: [{ ...items[0], itemType: 'materials' }] }).success).toBe(false);
  });
});
