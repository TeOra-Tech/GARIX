-- ============================================================
-- GARIX — Storage buckets & policies
-- ============================================================

insert into storage.buckets (id, name, public) values
  ('garage-photos',    'garage-photos',    true),
  ('vehicle-images',   'vehicle-images',   false),
  ('service-requests', 'service-requests', false),
  ('documents',        'documents',        false),
  ('invoices',         'invoices',         false),
  ('certifications',   'certifications',   false)
on conflict (id) do nothing;

-- Public read for garage photos; owner write.
create policy "garage photos public read" on storage.objects for select
  using (bucket_id = 'garage-photos');
create policy "garage photos owner write" on storage.objects for insert
  with check (bucket_id = 'garage-photos'
              and owns_garage((storage.foldername(name))[1]::uuid));
create policy "garage photos owner delete" on storage.objects for delete
  using (bucket_id = 'garage-photos'
         and owns_garage((storage.foldername(name))[1]::uuid));

-- Private buckets: path convention {user_id}/... — owner-only access.
create policy "private buckets owner read" on storage.objects for select
  using (bucket_id in ('vehicle-images','service-requests','documents')
         and (storage.foldername(name))[1] = auth.uid()::text);
create policy "private buckets owner write" on storage.objects for insert
  with check (bucket_id in ('vehicle-images','service-requests','documents')
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "private buckets owner delete" on storage.objects for delete
  using (bucket_id in ('vehicle-images','service-requests','documents')
         and (storage.foldername(name))[1] = auth.uid()::text);

-- Invoices: garage folder = garage_id; readable by that garage's owner.
create policy "invoices garage read" on storage.objects for select
  using (bucket_id = 'invoices'
         and owns_garage((storage.foldername(name))[1]::uuid));

-- Certifications: garage owner read/write; admins via service role.
create policy "certifications owner rw" on storage.objects for all
  using (bucket_id = 'certifications'
         and owns_garage((storage.foldername(name))[1]::uuid))
  with check (bucket_id = 'certifications'
              and owns_garage((storage.foldername(name))[1]::uuid));
