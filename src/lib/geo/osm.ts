/**
 * OpenStreetMap Nominatim geocoding — the fallback provider
 * (NEXT_PUBLIC_MAPS_FALLBACK=osm) when the Google Maps key is absent.
 * Ireland-scoped. Nominatim usage policy: max 1 req/s, no autocomplete-per-keystroke —
 * callers must debounce and search on explicit action.
 */
export type PlaceResult = {
  label: string;
  town: string | null;
  county: string | null;
  lat: number;
  lng: number;
};

type NominatimItem = {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
};

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: query,
      format: 'jsonv2',
      countrycodes: 'ie',
      addressdetails: '1',
      limit: '5',
    });
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const items: NominatimItem[] = await res.json();
  return items.map((i) => {
    const a = i.address ?? {};
    return {
      label: i.display_name,
      town: a.town ?? a.city ?? a.village ?? a.suburb ?? null,
      county: (a.county ?? '').replace(/^County /, '') || null,
      lat: parseFloat(i.lat),
      lng: parseFloat(i.lon),
    };
  });
}
