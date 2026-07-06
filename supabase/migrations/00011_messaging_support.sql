-- Messaging (feature 8) support:
--   1. conversations.last_message_at was never maintained — trigger it.
--   2. The documents bucket is strictly owner-read ({user_id}/ prefix), so a
--      message recipient could never open an attachment sent to them. Add a
--      SELECT policy scoped to attachments referenced by messages in the
--      reader's conversations. The {user_id}/... path convention is unchanged.
--   3. user_profiles is own-row-only readable, so a garage owner saw no name
--      for the customer they were chatting with (and vice versa for customers
--      whose counterpart data isn't on the public garage row). Let
--      conversation counterparts read each other's profile rows.

-- ---------- 1. keep last_message_at fresh ----------
create or replace function touch_conversation_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;

create trigger trg_messages_touch_conversation
  after insert on messages
  for each row execute function touch_conversation_last_message();

-- ---------- 2. participants can read message attachments ----------
create policy "conversation participants read message attachments" on storage.objects for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1
        from messages m
        join conversations c on c.id = m.conversation_id
       where m.attachment_path = storage.objects.name
         and (c.customer_id = auth.uid() or owns_garage(c.garage_id))
    )
  );

-- ---------- 3. conversation counterparts can read each other's profile ----------
create policy "conversation counterparts read profile" on user_profiles for select
  using (
    exists (
      select 1 from conversations c
       where (c.customer_id = user_profiles.id and owns_garage(c.garage_id))
          or (c.customer_id = auth.uid() and exists (
                select 1 from garages g where g.id = c.garage_id and g.owner_id = user_profiles.id))
    )
  );
