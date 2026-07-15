import { z } from 'zod';

/** Digital service history record types (vehicle_history.event_type). */
export const SERVICE_RECORD_TYPES = [
  { value: 'engine_service', label: 'Engine service' },
  { value: 'gearbox_service', label: 'Gearbox service' },
  { value: 'oil_service', label: 'Oil service' },
  { value: 'parts_replaced', label: 'Parts replaced' },
  { value: 'tyres', label: 'Tyres' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'timing_belt', label: 'Timing belt' },
  { value: 'nct', label: 'NCT' },
  { value: 'repair', label: 'Repair' },
  { value: 'service', label: 'General service' },
  { value: 'other', label: 'Other' },
] as const;

/** Maintenance reminder types (vehicle_reminders.reminder_type). */
export const REMINDER_TYPES = [
  { value: 'oil_service', label: 'Oil service' },
  { value: 'nct', label: 'NCT' },
  { value: 'tyres', label: 'Tyres' },
  { value: 'timing_belt', label: 'Timing belt' },
  { value: 'brake_fluid', label: 'Brake fluid' },
  { value: 'insurance', label: 'Insurance renewal' },
  { value: 'road_tax', label: 'Road tax' },
  { value: 'service', label: 'Full service' },
  { value: 'other', label: 'Other' },
] as const;

export function recordTypeLabel(value: string): string {
  return (
    SERVICE_RECORD_TYPES.find((t) => t.value === value)?.label ??
    (value === 'ownership_change' ? 'Ownership change' : 'Other')
  );
}

export function reminderTypeLabel(value: string): string {
  return REMINDER_TYPES.find((t) => t.value === value)?.label ?? 'Other';
}

const recordTypeValues = SERVICE_RECORD_TYPES.map((t) => t.value) as [string, ...string[]];
const reminderTypeValues = REMINDER_TYPES.map((t) => t.value) as [string, ...string[]];

// '' must become null before coercion — z.coerce.number() turns '' into 0.
const optionalPositiveInt = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.coerce.number().int().min(0, 'Cannot be negative').nullable(),
);

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker')
  .nullable()
  .or(z.literal('').transform(() => null));

export const serviceRecordSchema = z.object({
  eventType: z.enum(recordTypeValues),
  eventDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Service date is required'),
  title: z.string().trim().max(120).optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  partsReplaced: z.string().trim().max(1000).optional().or(z.literal('')),
  mileageKm: optionalPositiveInt,
  costEur: z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    z.coerce.number().min(0, 'Cost cannot be negative').nullable(),
  ),
  garageName: z.string().trim().max(120).optional().or(z.literal('')),
  warrantyUntil: optionalDate,
  nextDueDate: optionalDate,
  nextDueMileageKm: optionalPositiveInt,
});

export type ServiceRecordInput = z.input<typeof serviceRecordSchema>;
export type ServiceRecordData = z.output<typeof serviceRecordSchema>;

export const reminderSchema = z
  .object({
    reminderType: z.enum(reminderTypeValues),
    title: z.string().trim().max(120).optional().or(z.literal('')),
    dueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'A due date is required'),
    dueMileageKm: optionalPositiveInt,
    intervalMonths: z.coerce
      .number()
      .int()
      .min(1, 'Repeat interval must be at least 1 month')
      .max(120)
      .nullable()
      .or(z.literal('').transform(() => null)),
    notes: z.string().trim().max(1000).optional().or(z.literal('')),
  })
  .superRefine((v, ctx) => {
    if (v.reminderType === 'other' && !v.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: 'Give this reminder a name',
      });
    }
  });

export type ReminderInput = z.input<typeof reminderSchema>;
export type ReminderData = z.output<typeof reminderSchema>;

export const transferSchema = z.object({
  toEmail: z.string().trim().toLowerCase().email('Enter the new owner’s email address'),
});

export type TransferData = z.output<typeof transferSchema>;
