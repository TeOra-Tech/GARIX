-- 00027_performance_indexes
-- Indexes for foreign keys on hot read paths that had none. garages.owner_id
-- backs owns_garage() and the garage RLS policies, so it is hit on almost
-- every garage-side query. The rest back the joins used by profile pages,
-- quote comparison, review lists, message threads and request detail.

create index if not exists idx_garages_owner on garages (owner_id);
create index if not exists idx_garage_photos_garage on garage_photos (garage_id);
create index if not exists idx_garage_certifications_garage on garage_certifications (garage_id);
create index if not exists idx_quote_items_quote on quote_items (quote_id);
create index if not exists idx_request_attachments_request on request_attachments (request_id);
create index if not exists idx_service_requests_vehicle on service_requests (vehicle_id);
create index if not exists idx_service_requests_category on service_requests (service_category_id);
create index if not exists idx_reviews_customer on reviews (customer_id);
create index if not exists idx_review_photos_review on review_photos (review_id);
create index if not exists idx_messages_sender on messages (sender_id);
create index if not exists idx_vehicles_model on vehicles (model_id);
create index if not exists idx_bookings_quote on bookings (quote_id) where quote_id is not null;
-- Found unindexed on the live database (2026-10-20 read-only health check).
create index if not exists idx_vehicles_make on vehicles (make_id);
create index if not exists idx_vehicles_engine on vehicles (engine_id);
create index if not exists idx_service_requests_accepted_quote on service_requests (accepted_quote_id);
create index if not exists idx_service_requests_problem_category on service_requests (problem_category_id);
create index if not exists idx_garage_services_category on garage_services (repair_category_id);
