import { z } from 'zod';
import { IRISH_COUNTIES, eircodeSchema, emailSchema } from './auth';

export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export const DAY_LABELS: Record<WeekDay, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

const daySchema = z
  .object({
    open: z.string().regex(timeRe, 'Use HH:MM'),
    close: z.string().regex(timeRe, 'Use HH:MM'),
  })
  .refine((d) => d.open < d.close, { message: 'Opening time must be before closing time' });

/** {"mon":{"open":"08:30","close":"18:00"},...} — a missing day means closed. */
export const openingHoursSchema = z.record(z.enum(WEEK_DAYS), daySchema);

export const garageSchema = z.object({
  name: z.string().trim().min(2, 'Enter the garage name').max(120),
  contactPerson: z.string().trim().min(2, 'Enter a contact person').max(120),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^(\+353|0)\d{7,10}$/, 'Enter a valid Irish phone number')),
  email: emailSchema.optional().or(z.literal('').transform(() => null)),
  website: z
    .string()
    .trim()
    .url('Enter a full URL, e.g. https://example.ie')
    .max(200)
    .optional()
    .or(z.literal('').transform(() => null)),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  yearsInBusiness: z.coerce
    .number()
    .int()
    .min(0)
    .max(150)
    .nullable()
    .or(z.literal('').transform(() => null)),
  serviceRadiusKm: z.coerce
    .number()
    .int()
    .min(1, 'Radius must be at least 1 km')
    .max(500, 'Radius can be at most 500 km'),
  isEvSpecialist: z.boolean().default(false),
  offersCollection: z.boolean().default(false),
  openingHours: openingHoursSchema,
  address: z.object({
    line1: z.string().trim().min(1, 'Address line 1 is required').max(200),
    line2: z.string().trim().max(200).optional().or(z.literal('')),
    town: z.string().trim().min(1, 'Town or city is required').max(100),
    county: z.enum(IRISH_COUNTIES, { errorMap: () => ({ message: 'Choose your county' }) }),
    eircode: eircodeSchema.optional().or(z.literal('')),
  }),
  // Nullable so edits can keep the stored point; registration refines to require it.
  lat: z.number().min(51).max(56).nullable(),
  lng: z.number().min(-11).max(-5).nullable(),
  serviceCategoryIds: z.array(z.string().uuid()).min(1, 'Pick at least one service you offer'),
});

/** Registration must geocode the premises — garage_locations.location is NOT NULL. */
export const registerGarageSchema = garageSchema.refine((g) => g.lat !== null && g.lng !== null, {
  path: ['lat'],
  message: 'Use the search to pin your premises on the map',
});

export type GarageInput = z.input<typeof garageSchema>;
export type GarageData = z.output<typeof garageSchema>;

export const certificationSchema = z.object({
  name: z.string().trim().min(2, 'Enter the certification name').max(120),
  issuingBody: z.string().trim().max(120).optional().or(z.literal('')),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .or(z.literal('').transform(() => null)),
});

export type CertificationData = z.output<typeof certificationSchema>;
