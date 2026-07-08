import { z } from 'zod';

export const IRISH_COUNTIES = [
  'Carlow', 'Cavan', 'Clare', 'Cork', 'Donegal', 'Dublin', 'Galway', 'Kerry',
  'Kildare', 'Kilkenny', 'Laois', 'Leitrim', 'Limerick', 'Longford', 'Louth',
  'Mayo', 'Meath', 'Monaghan', 'Offaly', 'Roscommon', 'Sligo', 'Tipperary',
  'Waterford', 'Westmeath', 'Wexford', 'Wicklow',
] as const;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address');

// Supabase's OTP length is a server-side setting (currently 6, was 8 on this
// project's defaults) — accept the plausible range so config drift can't
// lock users out of the code input.
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/, 'Enter the code from your email');

/** Irish mobiles: 08x… or +3538x…, spaces/dashes tolerated. */
export const mobileSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(
    z.string().regex(/^(?:\+353|0)8[35679]\d{7}$/, 'Enter a valid Irish mobile number'),
  );

/** Eircode: routing key (letter + 2 chars) + 4-char unique identifier. */
export const eircodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]\d[\dW]\s?[\dA-Z]{4}$/, 'Enter a valid Eircode (e.g. D02 X285)');

export const addressSchema = z.object({
  line1: z.string().trim().min(1, 'Address line 1 is required').max(200),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  town: z.string().trim().min(1, 'Town or city is required').max(100),
  county: z.enum(IRISH_COUNTIES, { errorMap: () => ({ message: 'Choose your county' }) }),
  eircode: eircodeSchema.optional().or(z.literal('')),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  email: emailSchema,
  mobile: mobileSchema,
  address: addressSchema,
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms to create an account' }),
  }),
  marketingOptIn: z.boolean().default(false),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterData = z.output<typeof registerSchema>;
