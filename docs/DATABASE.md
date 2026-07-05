# Garix — Database Guide

## Migration order
1. `00001_core_schema.sql` — extensions (uuid, PostGIS, pg_trgm), enums, all Phase-1 tables.
2. `00002_phase2_schema.sql` — subscriptions, featured ads, bookings, reminders, service history, insurance, breakdown, fleets, AI training, parts, EV directory. Created now so Phase 2 ships without destructive migrations.
3. `00003_functions_triggers.sql` — profile/wallet bootstrap, rating aggregation, `spend_credits`/`add_credits`, `accept_quote`, `complete_job`, `search_garages`, request matching.
4. `00004_rls_policies.sql` — RLS on every table + storage-adjacent helpers.
5. `00005_storage.sql` — the six buckets + object policies.
6. `seed.sql` — VAT rates, credit packs, admin-tunable settings, 14 engine sizes, 20 vehicle makes, 16 repair categories with 70+ repair types, subscription plans, charger types.

## Entity map (Phase 1)

```
auth.users ─1:1─ user_profiles ─1:N─ user_addresses
                     │ ├──1:N── vehicles ──1:N── vehicle_history
                     │ ├──1:N── service_requests ──1:N── request_attachments
                     │ │              │ 1:N                │ accepted_quote_id
                     │ │              └────── quotes ──────┘──1:N── quote_items
                     │ └──1:N── notifications
                     └──1:N── garages ──1:N── garage_locations / services / photos / certifications
                                  ├──1:1── credit_wallets ──1:N── credit_transactions
                                  ├──1:N── payments
                                  └──1:N── reviews ──1:N── review_photos
conversations (customer ↔ garage, per request) ──1:N── messages
repair_categories (self-referencing taxonomy)
vat_rates · credit_packs · system_settings · audit_logs · disputes · reports
```

## Notable design choices
- **Generated columns on `quotes`** compute labour VAT, parts VAT, total VAT, and grand total in the database. The TypeScript engine (`src/lib/vat.ts`) mirrors the formula for UI previews; the DB is authoritative.
- **`unique (request_id, garage_id)`** — one quote per garage per request; re-quoting is an update while `status='submitted'`.
- **Ledger integrity** — `credit_transactions.balance_after` snapshots the wallet after every movement; `spend_credits` can't drive a balance negative (`WHERE balance >= amount` + `CHECK (balance >= 0)`).
- **Review gate in RLS, not app code** — the insert policy itself requires the customer to own a `completed` request. Fraudulent reviews are structurally impossible, not merely discouraged; `fraud_score` adds a second, softer layer.
- **PostGIS `geography` everywhere** a location matters (addresses, garages, requests, breakdowns, chargers) — metres-accurate `st_dwithin` radius search with GiST indexes.
- **Vehicle reference data is soft** — FK to `vehicle_makes/models` when known, `make_text/model_text` fallback so the future reg-lookup API can populate free-form first and reconcile later.

## Regenerating types
```bash
npm run db:types   # supabase gen types typescript --linked > src/types/database.ts
```
