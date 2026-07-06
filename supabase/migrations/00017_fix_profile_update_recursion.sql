-- "update own profile" enforced role immutability with a subquery on
-- user_profiles inside a user_profiles policy — self-referential RLS, the
-- same recursion class 00007 fixed for service_requests/quotes. It detonated
-- ("infinite recursion detected") on admin cross-row updates once 00011 added
-- another SELECT policy to the table. Replace the subquery with a
-- security-definer helper, keeping the exact same rule: users may update
-- their own row but never their role.

create or replace function current_user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from user_profiles where id = auth.uid();
$$;

drop policy "update own profile" on user_profiles;
create policy "update own profile" on user_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = current_user_role());
