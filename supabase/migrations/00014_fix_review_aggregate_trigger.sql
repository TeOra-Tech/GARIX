-- refresh_garage_rating() ran with the reviewing customer's privileges, and
-- customers cannot UPDATE garages under RLS — so avg_rating/review_count were
-- silently never maintained (0 rows updated, no error). Same class of bug as
-- handle_new_garage (fixed in 00008): trigger functions that write across RLS
-- boundaries must be security definer.

create or replace function refresh_garage_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  g := coalesce(new.garage_id, old.garage_id);
  update garages set
    avg_rating = coalesce((
      select round(avg(rating_overall)::numeric, 2)
      from reviews where garage_id = g and not is_hidden), 0),
    review_count = (
      select count(*) from reviews where garage_id = g and not is_hidden)
  where id = g;
  return coalesce(new, old);
end $$;
