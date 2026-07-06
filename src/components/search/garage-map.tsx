'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, type GInfoWindow, type GMap, type GMarker } from '@/lib/geo/google-maps';
import type { GarageSearchResult } from '@/lib/search/sort';

const INK = '#070B14';

export function GarageMap({
  results,
  center,
}: {
  results: GarageSearchResult[];
  center: { lat: number; lng: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GMap | null>(null);
  const markersRef = useRef<GMarker[]>([]);
  const infoRef = useRef<GInfoWindow | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center,
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false,
            backgroundColor: INK,
          });
          infoRef.current = new maps.InfoWindow();
        }

        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        const bounds = new maps.LatLngBounds();
        for (const r of results) {
          if (r.lat == null || r.lng == null) continue;
          const position = { lat: r.lat, lng: r.lng };
          const marker = new maps.Marker({ map: mapRef.current, position, title: r.name });
          marker.addListener('click', () => {
            infoRef.current?.setContent(
              `<div style="color:${INK};font-family:system-ui;max-width:220px">` +
                `<strong>${r.name}</strong><br/>` +
                `${r.town}, Co. ${r.county} · ${r.distance_km} km<br/>` +
                (r.review_count > 0 ? `★ ${Number(r.avg_rating).toFixed(1)} (${r.review_count})<br/>` : '') +
                `<a href="/garages/${r.slug}">View profile</a></div>`,
            );
            infoRef.current?.open({ map: mapRef.current!, anchor: marker });
          });
          markersRef.current.push(marker);
          bounds.extend(position);
        }

        if (results.length > 0) {
          mapRef.current.fitBounds(bounds, 48);
        } else {
          mapRef.current.setCenter(center);
          mapRef.current.setZoom(10);
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [results, center]);

  if (failed) {
    return (
      <div className="flex h-[28rem] items-center justify-center rounded-hex border border-ink-line bg-ink-soft text-sm text-paper/50">
        The map could not load — use the list view.
      </div>
    );
  }
  return <div ref={containerRef} className="h-[28rem] w-full rounded-hex border border-ink-line" />;
}
