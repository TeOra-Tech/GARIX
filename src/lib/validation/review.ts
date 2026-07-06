import { z } from 'zod';

export const RATING_CATEGORIES = [
  { key: 'quality', label: 'Quality of work' },
  { key: 'communication', label: 'Communication' },
  { key: 'price', label: 'Value for money' },
  { key: 'speed', label: 'Speed' },
  { key: 'overall', label: 'Overall experience' },
] as const;

export type RatingKey = (typeof RATING_CATEGORIES)[number]['key'];

const rating = z.coerce.number().int().min(1, 'Pick 1 to 5 stars').max(5);

export const reviewSchema = z.object({
  quality: rating,
  communication: rating,
  price: rating,
  speed: rating,
  overall: rating,
  body: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type ReviewData = z.output<typeof reviewSchema>;

export const responseSchema = z
  .string()
  .trim()
  .min(2, 'Write a short response')
  .max(1000);

export const MAX_REVIEW_PHOTOS = 3;
export const MAX_REVIEW_PHOTO_MB = 5;

export function reviewPhotoProblems(files: File[]): string | null {
  if (files.length > MAX_REVIEW_PHOTOS) return `Attach at most ${MAX_REVIEW_PHOTOS} photos`;
  for (const f of files) {
    if (!f.type.startsWith('image/')) return `${f.name}: only photos are supported`;
    if (f.size > MAX_REVIEW_PHOTO_MB * 1024 * 1024) return `${f.name}: photos must be under ${MAX_REVIEW_PHOTO_MB} MB`;
  }
  return null;
}
