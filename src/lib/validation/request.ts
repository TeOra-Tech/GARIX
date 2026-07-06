import { z } from 'zod';
import { IRISH_COUNTIES } from './auth';

export const URGENCIES = ['emergency', 'within_24h', 'this_week', 'flexible'] as const;

export const URGENCY_LABELS: Record<(typeof URGENCIES)[number], string> = {
  emergency: 'Emergency — need help now',
  within_24h: 'Within 24 hours',
  this_week: 'This week',
  flexible: 'Flexible — whenever suits',
};

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_MB = 10;

const todayIso = () => new Date().toISOString().slice(0, 10);

export const serviceRequestSchema = z.object({
  vehicleId: z.string().uuid('Choose a vehicle'),
  serviceCategoryId: z.string().uuid('Choose a category'),
  problemCategoryId: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal('').transform(() => null)),
  title: z.string().trim().min(5, 'Give your request a short title (at least 5 characters)').max(120),
  description: z
    .string()
    .trim()
    .min(20, 'Describe the problem in at least 20 characters — it helps garages quote accurately')
    .max(2000),
  urgency: z.enum(URGENCIES),
  locationTown: z.string().trim().min(1, 'Town or city is required').max(100),
  locationCounty: z.enum(IRISH_COUNTIES, { errorMap: () => ({ message: 'Choose your county' }) }),
  lat: z.number().min(51).max(56).nullable().default(null),
  lng: z.number().min(-11).max(-5).nullable().default(null),
  collectionRequired: z.boolean().default(false),
  expectedCompletionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => d >= todayIso(), 'The date cannot be in the past')
    .nullable()
    .or(z.literal('').transform(() => null)),
  budgetAmount: z.coerce
    .number()
    .positive('Budget must be more than €0')
    .max(50000, 'Budget looks too high')
    .nullable()
    .or(z.literal('').transform(() => null)),
});

export type ServiceRequestInput = z.input<typeof serviceRequestSchema>;
export type ServiceRequestData = z.output<typeof serviceRequestSchema>;

export function attachmentProblems(files: File[]): string | null {
  if (files.length > MAX_ATTACHMENTS) return `Attach at most ${MAX_ATTACHMENTS} files`;
  for (const f of files) {
    if (!/^(image|video)\//.test(f.type)) return `${f.name}: only photos and videos are supported`;
    if (f.size > MAX_ATTACHMENT_MB * 1024 * 1024) return `${f.name}: files must be under ${MAX_ATTACHMENT_MB} MB`;
  }
  return null;
}
