# Garix

**Find the right garage. Get the right service.**

A marketplace connecting vehicle owners with mechanic garages across Ireland: competitive quote bidding, itemised Irish VAT breakdowns, secure messaging, verified reviews, and a pay-as-you-quote credit system for garages.

![Garix logo](public/logo.png)

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS · shadcn/ui-compatible tokens · React Query · Zustand |
| Backend | Supabase — PostgreSQL (+PostGIS), Auth, Storage, Realtime, Edge Functions, RLS |
| Payments | Stripe Checkout + webhooks |
| Hosting | Netlify (GitHub integration, preview deploys, CI/CD) |
| Maps | Google Maps API, OpenStreetMap fallback |

## What's in this repository

```
garix/
├── supabase/
│   ├── migrations/          # 00001 core schema · 00002 phase-2 schema
│   │                        # 00003 functions/triggers · 00004 RLS · 00005 storage
│   ├── seed.sql             # repair taxonomy, engine sizes, VAT rates, credit packs
│   └── functions/
│       ├── submit-quote/    # atomic credit spend + quote creation
│       └── stripe-webhook/  # idempotent credit top-up
├── src/
│   ├── app/                 # landing page + routed screens (auth, search, requests…)
│   ├── lib/
│   │   ├── vat.ts           # Irish VAT engine (23% parts / 13.5% labour)
│   │   ├── credits.ts       # credit pricing defaults
│   │   └── supabase/        # browser + server (SSR) clients
│   └── types/database.ts    # regenerate after linking: npm run db:types
├── tests/vat.test.ts        # unit tests for the VAT engine
├── docs/                    # architecture, database, deployment guides
├── netlify.toml             # Netlify + @netlify/plugin-nextjs config
└── .github/workflows/ci.yml # lint, typecheck, tests, migration verification
```

## Quick start (local)

```bash
npm install
npx supabase init && npx supabase start     # local Postgres + Auth + Storage
npx supabase db reset                        # applies migrations + seed.sql
cp .env.example .env.local                   # fill in local keys from `supabase status`
npm run dev
```

## Deploy

1. **Supabase** — create a project, `supabase link`, `supabase db push`, then `supabase functions deploy submit-quote stripe-webhook`. Run `npm run db:types` to generate real TypeScript types.
2. **Stripe** — create products for the four credit packs, paste price IDs into `credit_packs.stripe_price_id`, point a webhook at the `stripe-webhook` function, set `STRIPE_WEBHOOK_SECRET`.
3. **Netlify** — connect the GitHub repo. `netlify.toml` handles the build; add the environment variables from `.env.example` in Site settings. Preview deploys are automatic per PR.

Full walkthrough: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Design decisions worth knowing

- **Quote inserts are blocked by RLS by design.** Submitting a quote spends credits, so it goes through the `submit-quote` Edge Function, which spends and inserts atomically (with automatic refund on failure).
- **VAT is computed in two places on purpose**: `src/lib/vat.ts` for instant UI feedback, and generated columns on `quotes` as the source of truth — the DB always wins.
- **AI-readiness starts day one**: `complete_job()` writes a `repair_training_data` row (vehicle snapshot, labour hours, costs, outcome) on every completed job, so Phase 2 cost-estimation models have real training data waiting.
- **Credit pricing lives in `system_settings`**, so admins retune quote/priority/featured costs without a deploy.
- **Geo search** uses PostGIS (`search_garages()` RPC) — distance, radius, category, rating, EV-specialist, and collection filters all resolve in one indexed query.
