# CLAUDE.md — Garix

Garix is a marketplace connecting vehicle owners with mechanic garages across Ireland.
Customers post repair requests; verified garages bid with VAT-itemised quotes; customers
compare, accept, message, and review. Garages pay per quote using a credit wallet
(1 credit = €1). Full product spec lives in `docs/` — read `docs/ARCHITECTURE.md`
before touching data flows.

## Commands

```bash
npm run dev          # local dev server (http://localhost:3000)
npm run build        # production build — must pass before any commit
npm run lint         # eslint
npm run typecheck    # tsc --noEmit — must pass before any commit
npm run test         # vitest unit tests
npm run db:reset     # local supabase: reapply all migrations + seed.sql
npm run db:types     # regenerate src/types/database.ts from linked project
```

Run `npm run typecheck && npm run test` before every commit. Run `npm run build`
before every push to main.

## Stack (fixed — do not substitute)

Next.js 15 App Router · React 19 · TypeScript strict · TailwindCSS · React Query
(server state) · Zustand (UI state only) · Supabase (Postgres+PostGIS, Auth, Storage,
Realtime, Edge Functions) · Stripe · Netlify. No separate backend server.
No new dependencies without stating why in the commit message.

## Architecture rules (non-negotiable)

1. **RLS is the authorization layer.** Never bypass it from the client. The anon key
   + RLS must be sufficient for every client read/write. If a write can't be expressed
   safely under RLS, it belongs in an Edge Function or a `security definer` RPC.
2. **Money moves only server-side.** Credit spend/add, payments, quote creation, and
   quote acceptance go through `supabase/functions/*` or the RPCs `spend_credits`,
   `add_credits`, `accept_quote`, `complete_job`. Never insert into `quotes`,
   `credit_transactions`, `credit_wallets`, or `payments` from the browser.
3. **The database owns VAT truth.** `quotes` has generated columns for VAT and totals.
   `src/lib/vat.ts` is for UI preview only — never persist its output as authoritative.
   Parts VAT 23%, Labour VAT 13.5% (Ireland); rates come from `vat_rates`, not literals.
4. **Schema changes = new migration file.** Never edit existing files in
   `supabase/migrations/`. Add `NNNNN_description.sql` with the next number, then
   `npm run db:reset` locally to prove it applies cleanly, then `npm run db:types`.
5. **Credit pricing lives in `system_settings`** (keys: `credits.submit_quote`,
   `credits.priority_quote`, `credits.featured_listing`). Read it; don't hardcode.
6. **Realtime**: subscribe via Supabase channels on `messages`, `notifications`,
   `quotes`, `service_requests`. RLS filters what subscribers receive — rely on that.
7. **Storage paths**: private buckets are keyed `{user_id}/...`; `garage-photos` and
   `invoices`/`certifications` are keyed `{garage_id}/...`. Policies depend on this —
   never change the path convention.

## Conventions

- Path alias `@/*` → `src/*`. Server components by default; add `'use client'` only
  when the component needs state, effects, or browser APIs.
- Supabase access: `src/lib/supabase/server.ts` in server components/route handlers,
  `client.ts` in client components. Never import the service-role key outside
  Edge Functions.
- Validate every form and route-handler input with zod before it touches Supabase.
- Data fetching in client components goes through React Query with a
  `[entity, ...params]` query key; invalidate on mutation.
- Styling: Tailwind with the brand tokens in `tailwind.config.ts`
  (`ink`, `volt`, `signal`, `paper`; fonts `font-display`/`font-body`). The hexagon
  motif (`.hex-clip`) is the brand signature — use sparingly. Dark UI is the default.
- Currency display: always `formatEur()` from `src/lib/vat.ts` (en-IE locale).
- Accessibility: every interactive element keyboard-reachable, labelled, with visible
  focus (already themed). Check new pages against WCAG AA.
- Copy style: sentence case, plain verbs, Irish English (tyres, colour, garage).

## Environment

Secrets live in `.env.local` (gitignored) — see `.env.example` for the full list.
`SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server-only: never expose
them with a `NEXT_PUBLIC_` prefix, never log them, never commit them. If a key is
missing, stop and ask the user to add it rather than stubbing around it.

## Build roadmap (work top to bottom; one feature per branch/PR)

Each item is done when: typecheck + tests pass, the flow works end-to-end against
local Supabase (`npm run db:reset` state), and RLS blocks the negative case.

1. **Auth** — email OTP + Google/Apple via Supabase Auth; registration collects
   full name, address, mobile, email; middleware-protected `/dashboard` + `/admin`;
   role-aware redirect (customer vs garage_owner vs admin).
2. **Vehicle management** — CRUD at `/dashboard/vehicles`; reg-number entry with the
   lookup adapter stub (`lookupByReg()` returning manual entry for now); make/model
   selects fed from `vehicle_makes`/`vehicle_models`; engine sizes from
   `vehicle_engines` incl. custom.
3. **Service request creation** — `/requests/new` wizard: vehicle → category (from
   `repair_categories` taxonomy) → description + photo/video upload to
   `service-requests` bucket → urgency → location (Maps autocomplete, OSM fallback)
   → collection/date/budget → review & post.
4. **Garage registration & profile** — `/garages/register` (free; collects required +
   optional fields per spec, status `pending_verification`); public profile at
   `/garages/[slug]` (services, hours, gallery, certifications, reviews, rating);
   owner edit screen.
5. **Garage search** — `/search` calling the `search_garages` RPC; filters: location,
   distance, service type, rating, reviews, open-now, collection, EV specialist;
   sorts: best rated / nearest / most reviews / recommended; map view (Google Maps,
   markers) + list view toggle.
6. **Quote flow** — garage-side request feed + quote form (line items via
   `quote_items`, live VAT preview from `src/lib/vat.ts`) submitting through the
   `submit-quote` Edge Function; customer-side comparison table (sortable, full VAT
   breakdown) with accept → `accept_quote` RPC.
7. **Credit wallet** — `/dashboard/wallet`: balance, transaction ledger, low-balance
   banner; buy flow → Stripe Checkout with metadata `{garage_id, credits,
   credit_pack_id}`; webhook already handles fulfilment.
8. **Messaging** — `/dashboard/messages`: conversation list + thread, Realtime
   subscription, image/document attachments, read receipts (`read_at`).
9. **Notifications** — in-app bell fed by Realtime on `notifications`; preferences
   screen writing `notification_preferences`; `notify-fanout` Edge Function for
   email (Resend) / SMS (Twilio).
10. **Reviews** — post-completion prompt; 5 rating categories + text + photos;
    garage response UI; RLS already gates to completed jobs.
11. **Admin dashboard** — `/admin`: garage approval queue (approve → status `active`
    + notification), user management, review moderation, disputes, credit adjustments
    (`add_credits` with `admin_adjustment`), settings editor for `system_settings`,
    audit log viewer, basic analytics.
12. **Polish pass** — PWA offline caching, GA4 events (request_created,
    quote_submitted, quote_accepted, credits_purchased), Playwright E2E for flows
    1–7, legal pages (privacy/terms), Lighthouse ≥ 90 across the board.

## Definition of done for the project

A new customer can register, add a car, post a request, receive a quote from a
registered+approved garage that paid credits via Stripe test mode, accept it,
exchange messages, mark complete, and leave a review — all on the deployed Netlify
site with zero RLS violations in the Supabase logs.
