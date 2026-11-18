// Registering a garage from the app. Mirrors the web's useCreateGarage (src/lib/garages/queries.ts):
// garages row (status pending_verification by default) → primary location → services.
// The handle_new_garage trigger (00019) promotes the owner's profile to garage_owner.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { currentUserId, supabase } from './supabase';
import { slugCandidates } from '@/shared/slug';
import type { GarageData } from '@/shared/validation/garage';

/** Default hours (Mon–Fri 9–6); the owner can change them on garix.ie. */
export const DEFAULT_OPENING_HOURS = {
  mon: { open: '09:00', close: '18:00' },
  tue: { open: '09:00', close: '18:00' },
  wed: { open: '09:00', close: '18:00' },
  thu: { open: '09:00', close: '18:00' },
  fri: { open: '09:00', close: '18:00' },
};

/** Address → map point via OpenStreetMap: full address, then Eircode, then the town. */
export async function geocodeAddress(a: { line1: string; town: string; county: string; eircode?: string }): Promise<{ lat: number; lng: number } | null> {
  const queries = [
    `${a.line1}, ${a.town}, Co. ${a.county}, Ireland`,
    ...(a.eircode ? [`${a.eircode}, Ireland`] : []),
    `${a.town}, Co. ${a.county}, Ireland`,
  ];
  for (const q of queries) {
    try {
      const params = new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'ie', limit: '1' });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'GarixApp/1.0 (support@garix.ie)' },
      });
      if (!res.ok) continue;
      const [hit] = (await res.json()) as { lat: string; lon: string }[];
      if (hit) return { lat: Number(hit.lat), lng: Number(hit.lon) };
    } catch {
      // try the next, less precise query
    }
  }
  return null;
}

export function useRegisterGarage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: GarageData) => {
      if (d.lat == null || d.lng == null) throw new Error('NO_LOCATION');
      const ownerId = await currentUserId();
      let garageId: string | null = null;
      let lastError: unknown = null;
      // slug is globally unique — walk candidates on collision
      for (const slug of slugCandidates(d.name)) {
        const { data, error } = await supabase
          .from('garages')
          .insert({
            owner_id: ownerId,
            name: d.name,
            slug,
            contact_person: d.contactPerson,
            phone: d.phone,
            email: d.email,
            website: d.website,
            description: d.description || null,
            years_in_business: d.yearsInBusiness,
            service_radius_km: d.serviceRadiusKm,
            is_ev_specialist: d.isEvSpecialist,
            offers_collection: d.offersCollection,
            opening_hours: d.openingHours,
          })
          .select('id')
          .single();
        if (!error) {
          garageId = data.id;
          break;
        }
        lastError = error;
        if (error.code !== '23505') break;
      }
      if (!garageId) throw lastError ?? new Error('Could not create the garage');

      const loc = await supabase.from('garage_locations').insert({
        garage_id: garageId,
        line1: d.address.line1,
        line2: d.address.line2 || null,
        town: d.address.town,
        county: d.address.county,
        eircode: d.address.eircode || null,
        location: `SRID=4326;POINT(${d.lng} ${d.lat})` as unknown as string,
        is_primary: true,
      });
      if (loc.error) {
        await supabase.from('garages').delete().eq('id', garageId); // best-effort rollback
        throw loc.error;
      }
      const services = await supabase
        .from('garage_services')
        .insert(d.serviceCategoryIds.map((id) => ({ garage_id: garageId!, repair_category_id: id })));
      if (services.error) throw services.error;

      // Signed up through "Garage": that's done now.
      await supabase.auth.updateUser({ data: { signup_intent: null } });
      return garageId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garages'] }),
  });
}
