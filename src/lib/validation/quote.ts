import { z } from 'zod';

export const quoteItemSchema = z.object({
  itemType: z.enum(['labour', 'part'], { errorMap: () => ({ message: 'Pick labour or part' }) }),
  description: z.string().trim().min(2, 'Describe the line item').max(200),
  quantity: z.coerce
    .number()
    .positive('Quantity must be above zero')
    .max(999),
  unitPrice: z.coerce
    .number()
    .min(0, 'Price cannot be negative')
    .max(100000, 'Price looks too high'),
});

export const quoteSchema = z.object({
  items: z.array(quoteItemSchema).min(1, 'Add at least one line item').max(30),
  isPriority: z.boolean().default(false),
  estimatedDurationHours: z.coerce
    .number()
    .positive()
    .max(999)
    .nullable()
    .or(z.literal('').transform(() => null)),
  warrantyInfo: z.string().trim().max(500).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type QuoteItemData = z.output<typeof quoteItemSchema>;
export type QuoteData = z.output<typeof quoteSchema>;

/**
 * Nets per cost type, mirroring the DB exactly: each line_total is
 * round(quantity * unit_price, 2), summed in cents to avoid float drift.
 */
export function quoteTotals(items: QuoteItemData[]): { labour: number; parts: number } {
  let labourCents = 0;
  let partsCents = 0;
  for (const i of items) {
    const lineCents = Math.round(i.quantity * i.unitPrice * 100);
    if (i.itemType === 'labour') labourCents += lineCents;
    else partsCents += lineCents;
  }
  return { labour: labourCents / 100, parts: partsCents / 100 };
}
