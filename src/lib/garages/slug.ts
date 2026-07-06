/** URL slug from a garage name: lowercase, ascii-ish, dash-separated. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'garage';
}

/** Candidate slugs to try in order when the base collides (unique index). */
export function slugCandidates(name: string, attempts = 5): string[] {
  const base = slugify(name);
  return [base, ...Array.from({ length: attempts - 1 }, (_, i) => `${base}-${i + 2}`)];
}
