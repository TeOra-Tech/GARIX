import { z } from 'zod';
import { normaliseReg } from '@/lib/vehicles/lookup';

export const FUEL_TYPES = [
  'petrol', 'diesel', 'hybrid', 'plugin_hybrid', 'electric', 'lpg', 'other',
] as const;

export const TRANSMISSIONS = ['manual', 'automatic', 'semi_automatic', 'cvt'] as const;

/**
 * Irish plates: 132-D-12345 (post-2013), 09-KE-1234 (1987–2012).
 * Kept permissive — UK imports etc. go through the same field.
 */
export const regNumberSchema = z
  .string()
  .trim()
  .min(1, 'Registration number is required')
  .transform(normaliseReg)
  .pipe(
    z
      .string()
      .max(14, 'That registration looks too long')
      .regex(/^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$/, 'Use letters, numbers and dashes only'),
  );

const uuidOrNull = z
  .string()
  .uuid()
  .nullable()
  .or(z.literal('').transform(() => null));

export const vehicleSchema = z
  .object({
    registrationNumber: regNumberSchema,
    makeId: uuidOrNull,
    makeText: z.string().trim().max(80).optional().or(z.literal('')),
    modelId: uuidOrNull,
    modelText: z.string().trim().max(80).optional().or(z.literal('')),
    variant: z.string().trim().max(80).optional().or(z.literal('')),
    year: z.coerce
      .number()
      .int()
      .min(1950, 'Year must be 1950 or later')
      .max(2100)
      .nullable()
      .or(z.literal('').transform(() => null)),
    engineId: uuidOrNull,
    engineSizeCustom: z.string().trim().max(30).optional().or(z.literal('')),
    fuelType: z.enum(FUEL_TYPES).nullable().or(z.literal('').transform(() => null)),
    transmission: z.enum(TRANSMISSIONS).nullable().or(z.literal('').transform(() => null)),
    vin: z.string().trim().max(17, 'A VIN is at most 17 characters').optional().or(z.literal('')),
    mileageKm: z.coerce
      .number()
      .int()
      .min(0, 'Mileage cannot be negative')
      .nullable()
      .or(z.literal('').transform(() => null)),
  })
  .superRefine((v, ctx) => {
    if (!v.makeId && !v.makeText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['makeId'],
        message: 'Choose a make, or tick “my make isn’t listed”',
      });
    }
  });

export type VehicleInput = z.input<typeof vehicleSchema>;
export type VehicleData = z.output<typeof vehicleSchema>;
