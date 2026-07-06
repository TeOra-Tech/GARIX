-- Review photos render on public garage profiles, but every user-writable
-- bucket is private. New public bucket, same conventions as the rest:
-- keyed {user_id}/..., owner write/delete, public read (like garage-photos).

insert into storage.buckets (id, name, public) values
  ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

create policy "review photos public read" on storage.objects for select
  using (bucket_id = 'review-photos');
create policy "review photos owner write" on storage.objects for insert
  with check (bucket_id = 'review-photos'
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "review photos owner delete" on storage.objects for delete
  using (bucket_id = 'review-photos'
         and (storage.foldername(name))[1] = auth.uid()::text);
