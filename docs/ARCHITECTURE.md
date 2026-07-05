# Garix — System Architecture

## Overview

Garix is a two-sided marketplace. Supabase is the entire backend (per requirement, no separate server): PostgreSQL with RLS is the authorization layer, Edge Functions handle anything that must be atomic or secret-bearing, Realtime pushes live updates, and Next.js on Netlify renders the product.

```
┌─────────────────────────── Netlify ───────────────────────────┐
│  Next.js 15 (App Router, SSR/ISR)                              │
│  React Query (server state) · Zustand (UI state)               │
└──────────────┬─────────────────────────────┬──────────────────┘
               │ supabase-js (anon key, RLS) │ HTTPS
┌──────────────▼──────────────┐   ┌──────────▼──────────────────┐
│         Supabase            │   │  Edge Functions (service)   │
│  Postgres + PostGIS + RLS   │◄──┤  submit-quote               │
│  Auth (OTP, Google, Apple)  │   │  stripe-webhook             │
│  Storage (6 buckets)        │   │  notify-fanout (email/SMS)  │
│  Realtime (msgs, quotes…)   │   └───────┬─────────────────────┘
└─────────────────────────────┘           │
                              Stripe ─────┘   Twilio · Resend · Google Maps
```

## Trust boundaries

1. **Browser → Postgres (anon key).** Every table has RLS. Customers see only their profile, vehicles, requests, and messages; garages see their garage, quotes, wallet, and messages; admins see everything (`is_admin()` helper).
2. **Edge Functions (service role).** Used only where client writes would be unsafe:
   - `submit-quote` — spends credits and creates the quote atomically; refunds on failure.
   - `stripe-webhook` — verifies Stripe signatures, idempotently records payments, adds credits.
   - notification fan-out — reads `notifications` inserts and dispatches email (Resend) / SMS (Twilio) per `notification_preferences`.
3. **Database functions (`security definer`)** — `spend_credits`, `add_credits`, `accept_quote`, `complete_job` centralise money- and state-machine logic so no client can skip a step.

## Key flows

### Service request → quotes → job
1. Customer inserts `service_requests` (RLS: own row).
2. DB webhook / cron calls `garages_matching_request()` → inserts `notifications` for each matching garage (PostGIS radius ∩ service category).
3. Garage calls `submit-quote` Edge Function → credits spent → `quotes` row → Realtime pushes to the customer → request flips to `quoted`.
4. Customer calls `accept_quote(quote_id)` RPC → winning quote `accepted`, siblings `rejected`, request `accepted`.
5. On completion, `complete_job()` marks the request, bumps the garage's `completed_jobs_count`, and writes a `repair_training_data` row for future AI models.
6. Review insert is only allowed (RLS) when the customer owns a `completed` request — the anti-fraud foundation.

### Credits
- Wallet per garage (`credit_wallets`), ledger in `credit_transactions` (`balance_after` on every row = auditable).
- Purchases via Stripe Checkout; the webhook is the only writer.
- `spend_credits` uses a conditional `UPDATE … WHERE balance >= amount` — concurrency-safe without explicit locks.

### Realtime
`supabase_realtime` publication includes `messages`, `notifications`, `quotes`, `service_requests`. RLS applies to Realtime, so subscribers only receive rows they could `SELECT`.

## Vehicle lookup integration layer
`vehicles` carries `lookup_source` + `lookup_payload jsonb`. The adapter interface is one function: `lookupByReg(reg: string) → {make, model, year, engineSize, fuelType, raw}`. Swap in Cartell/MotorCheck later; manual entry is the day-one source.

## Maps
Google Maps JS API for map view + geocoding; if the key is missing or quota fails, the client falls back to OpenStreetMap tiles via Leaflet (flag: `NEXT_PUBLIC_MAPS_FALLBACK=osm`). All geo *queries* run in PostGIS regardless of tile provider.

## Security posture (OWASP-aligned)
- Injection: parameterised queries only (supabase-js/PostgREST); zod validation at every boundary.
- AuthZ: RLS default-deny; policies reviewed in `00004_rls_policies.sql`.
- XSS: React escaping; no `dangerouslySetInnerHTML` except the JSON-LD block (static object).
- CSRF: Supabase cookies are `SameSite=Lax`; state-changing calls require the auth token.
- Rate limiting: Supabase Auth built-in + Edge Function per-IP throttle (add via Upstash if volume demands).
- Headers: HSTS (Netlify), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy (next.config.mjs).
- Audit: `audit_logs` written by security-definer functions and admin actions.
- GDPR: explicit `marketing_opt_in`, `terms_accepted_at`, `data_deletion_requested_at` + erasure job; EU region Supabase project; storage paths keyed by user id for clean deletion.

## Scaling path
Postgres indexes cover the hot paths (geo GiST, trigram garage search, per-user/garage composite indexes). Next steps at scale: read replicas for search, pgBouncer (built into Supabase), ISR for garage profile pages, and moving notification fan-out to a queue (pg_cron → Edge Function batches).
