'use client';

/**
 * Minimal Google Maps JS API loader — just the surface /search needs,
 * typed locally to avoid pulling in @types/google.maps for four classes.
 * If the key is absent the map view is hidden (OSM/Leaflet tile fallback
 * can slot in here later per docs/ARCHITECTURE.md).
 */
export type GLatLng = { lat: number; lng: number };
export type GBounds = { extend(c: GLatLng): void };
export type GMap = { setCenter(c: GLatLng): void; setZoom(z: number): void; fitBounds(b: GBounds, padding?: number): void };
export type GMarker = { setMap(m: GMap | null): void; addListener(ev: string, cb: () => void): void };
export type GInfoWindow = { open(opts: { map: GMap; anchor: GMarker }): void; close(): void; setContent(html: string): void };

export type GoogleMapsApi = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GMap;
  Marker: new (opts: Record<string, unknown>) => GMarker;
  InfoWindow: new (opts?: Record<string, unknown>) => GInfoWindow;
  LatLngBounds: new () => GBounds;
};

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi };
    __garixMapsCb?: () => void;
  }
}

export const hasGoogleMapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

let loading: Promise<GoogleMapsApi> | null = null;

export function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window !== 'undefined' && window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  loading ??= new Promise((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      reject(new Error('Google Maps key missing'));
      return;
    }
    window.__garixMapsCb = () => resolve(window.google!.maps);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__garixMapsCb&loading=async`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error('Google Maps failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
