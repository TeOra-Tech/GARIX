import type { MetadataRoute } from 'next';

/**
 * Static routes now; when Supabase is linked, extend with dynamic
 * garage profile URLs (select slug from garages where status='active').
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://garix.ie';
  return ['', '/search', '/requests/new', '/garages/register'].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: 'daily',
    priority: p === '' ? 1 : 0.8,
  }));
}
