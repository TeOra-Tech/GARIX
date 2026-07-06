-- Feature 5 needs more from search_garages than the original returned:
--   * lat/lng for map markers
--   * opening_hours + badges so cards can render without N+1 queries
--   * p_min_reviews and p_open_now filters (roadmap: "rating, reviews, open-now")
-- Return type changes require drop + recreate.

drop function if exists search_garages(double precision, double precision, int, uuid, numeric, boolean, boolean);

create function search_garages(
  p_lat double precision,
  p_lng double precision,
  p_radius_km int default 50,
  p_category uuid default null,
  p_min_rating numeric default null,
  p_ev_only boolean default false,
  p_collection boolean default false,
  p_min_reviews int default null,
  p_open_now boolean default false
) returns table (
  garage_id uuid, name text, slug text, avg_rating numeric, review_count int,
  distance_km numeric, town text, county text, logo_url text,
  lat double precision, lng double precision,
  opening_hours jsonb, is_ev_specialist boolean, offers_collection boolean
) language sql stable as $$
  with local_now as (
    select lower(to_char(now() at time zone 'Europe/Dublin', 'dy')) as day_key,
           to_char(now() at time zone 'Europe/Dublin', 'HH24:MI') as hhmm
  )
  select g.id, g.name, g.slug, g.avg_rating, g.review_count,
         round((st_distance(gl.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000)::numeric, 1),
         gl.town, gl.county, g.logo_url,
         st_y(gl.location::geometry), st_x(gl.location::geometry),
         g.opening_hours, g.is_ev_specialist, g.offers_collection
    from garages g
    join garage_locations gl on gl.garage_id = g.id and gl.is_primary
    cross join local_now n
   where g.status = 'active'
     and st_dwithin(gl.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
     and (p_category is null or exists (
           select 1 from garage_services gs
            where gs.garage_id = g.id and gs.repair_category_id = p_category))
     and (p_min_rating is null or g.avg_rating >= p_min_rating)
     and (p_min_reviews is null or g.review_count >= p_min_reviews)
     and (not p_ev_only or g.is_ev_specialist)
     and (not p_collection or g.offers_collection)
     and (not p_open_now or (
           g.opening_hours -> n.day_key is not null
           and (g.opening_hours -> n.day_key ->> 'open') <= n.hhmm
           and n.hhmm < (g.opening_hours -> n.day_key ->> 'close')))
   order by st_distance(gl.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography);
$$;
