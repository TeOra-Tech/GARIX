'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';
import type { CertificationData, GarageData } from '@/lib/validation/garage';
import { slugCandidates } from './slug';

export type GarageRow = Tables<'garages'>;
export type GarageWithRelations = GarageRow & {
  garage_locations: Tables<'garage_locations'>[];
  garage_services: (Tables<'garage_services'> & { repair_categories: { name: string } | null })[];
  garage_photos: Tables<'garage_photos'>[];
  garage_certifications: Tables<'garage_certifications'>[];
};

export const GARAGE_SELECT =
  '*, garage_locations(*), garage_services(*, repair_categories(name)), garage_photos(*), garage_certifications(*)';

function coreColumns(d: GarageData): Omit<TablesInsert<'garages'>, 'name' | 'slug' | 'contact_person' | 'phone' | 'owner_id'> {
  return {
    email: d.email,
    website: d.website,
    description: d.description || null,
    years_in_business: d.yearsInBusiness,
    service_radius_km: d.serviceRadiusKm,
    is_ev_specialist: d.isEvSpecialist,
    offers_collection: d.offersCollection,
    opening_hours: d.openingHours,
  };
}

export function useCreateGarage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: GarageData): Promise<GarageRow> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // slug is globally unique — walk candidates on collision
      let garage: GarageRow | null = null;
      let lastError: unknown = null;
      for (const slug of slugCandidates(d.name)) {
        const { data, error } = await supabase
          .from('garages')
          .insert({
            owner_id: user.id,
            name: d.name,
            slug,
            contact_person: d.contactPerson,
            phone: d.phone,
            ...coreColumns(d),
          })
          .select()
          .single();
        if (!error) {
          garage = data;
          break;
        }
        lastError = error;
        if (error.code !== '23505') break;
      }
      if (!garage) throw lastError ?? new Error('Could not create the garage');

      const loc = await supabase.from('garage_locations').insert({
        garage_id: garage.id,
        line1: d.address.line1,
        line2: d.address.line2 || null,
        town: d.address.town,
        county: d.address.county,
        eircode: d.address.eircode || null,
        location: `SRID=4326;POINT(${d.lng} ${d.lat})` as unknown as string,
        is_primary: true,
      });
      if (loc.error) {
        await supabase.from('garages').delete().eq('id', garage.id); // best-effort rollback
        throw loc.error;
      }

      const services = await supabase.from('garage_services').insert(
        d.serviceCategoryIds.map((id) => ({ garage_id: garage!.id, repair_category_id: id })),
      );
      if (services.error) throw services.error;

      return garage;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garages'] }),
  });
}

export function useUpdateGarage(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: GarageData) => {
      const supabase = createClient();
      const patch: TablesUpdate<'garages'> = {
        name: d.name,
        contact_person: d.contactPerson,
        phone: d.phone,
        ...coreColumns(d),
      };
      const { error } = await supabase.from('garages').update(patch).eq('id', garageId);
      if (error) throw error;

      const locPatch: TablesUpdate<'garage_locations'> = {
        line1: d.address.line1,
        line2: d.address.line2 || null,
        town: d.address.town,
        county: d.address.county,
        eircode: d.address.eircode || null,
      };
      if (d.lat != null && d.lng != null) {
        // only move the pin when the owner re-searched; otherwise keep the stored point
        locPatch.location = `SRID=4326;POINT(${d.lng} ${d.lat})` as unknown as string;
      }
      const loc = await supabase
        .from('garage_locations')
        .update(locPatch)
        .eq('garage_id', garageId)
        .eq('is_primary', true);
      if (loc.error) throw loc.error;

      // replace the service set
      const del = await supabase
        .from('garage_services')
        .delete()
        .eq('garage_id', garageId)
        .not('repair_category_id', 'in', `(${d.serviceCategoryIds.join(',')})`);
      if (del.error) throw del.error;
      const up = await supabase.from('garage_services').upsert(
        d.serviceCategoryIds.map((id) => ({ garage_id: garageId, repair_category_id: id })),
        { onConflict: 'garage_id,repair_category_id', ignoreDuplicates: true },
      );
      if (up.error) throw up.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garages'] }),
  });
}

export function garagePhotoUrl(storagePath: string): string {
  return createClient().storage.from('garage-photos').getPublicUrl(storagePath).data.publicUrl;
}

export function useAddGaragePhoto(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const supabase = createClient();
      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
      const path = `${garageId}/${crypto.randomUUID()}${ext}`;
      const up = await supabase.storage.from('garage-photos').upload(path, file);
      if (up.error) throw up.error;
      const { error } = await supabase
        .from('garage_photos')
        .insert({ garage_id: garageId, storage_path: path });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garages'] }),
  });
}

export function useRemoveGaragePhoto(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photo: Tables<'garage_photos'>) => {
      const supabase = createClient();
      const { error } = await supabase.from('garage_photos').delete().eq('id', photo.id);
      if (error) throw error;
      await supabase.storage.from('garage-photos').remove([photo.storage_path]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garages'] }),
  });
}

export function useAddCertification(garageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, document }: { data: CertificationData; document: File | null }) => {
      const supabase = createClient();
      let documentPath: string | null = null;
      if (document) {
        const ext = document.name.includes('.') ? document.name.slice(document.name.lastIndexOf('.')) : '';
        documentPath = `${garageId}/${crypto.randomUUID()}${ext}`;
        const up = await supabase.storage.from('certifications').upload(documentPath, document);
        if (up.error) throw up.error;
      }
      const { error } = await supabase.from('garage_certifications').insert({
        garage_id: garageId,
        name: data.name,
        issuing_body: data.issuingBody || null,
        expires_at: data.expiresAt,
        document_path: documentPath,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garages'] }),
  });
}

export function useRemoveCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cert: Tables<'garage_certifications'>) => {
      const supabase = createClient();
      const { error } = await supabase.from('garage_certifications').delete().eq('id', cert.id);
      if (error) throw error;
      if (cert.document_path) {
        await supabase.storage.from('certifications').remove([cert.document_path]);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garages'] }),
  });
}
