# Garix — Deployment Guide

## 1. Supabase (EU region — GDPR)

```bash
supabase login
supabase init                    # if not already
supabase link --project-ref YOUR_REF
supabase db push                 # applies all 5 migrations
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
supabase functions deploy submit-quote
supabase functions deploy stripe-webhook --no-verify-jwt
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...
npm run db:types                 # real TypeScript types
```

Auth providers: enable **Email OTP**, **Phone OTP** (Twilio), **Google**, **Apple** in Dashboard → Authentication → Providers. Set the Site URL to your Netlify domain and add `http://localhost:3000` for dev.

## 2. Stripe

1. Create 4 Products/Prices: €20/20cr, €50/50cr, €100/100cr, €500/500cr.
2. Update `credit_packs.stripe_price_id` with each price ID.
3. Add a webhook endpoint → `https://YOUR_REF.supabase.co/functions/v1/stripe-webhook`, event `checkout.session.completed`; copy the signing secret into Supabase secrets.
4. Checkout sessions must carry metadata: `garage_id`, `credits`, `credit_pack_id`.

## 3. Netlify

1. Push this repo to GitHub.
2. Netlify → **Add new site → Import from GitHub**. `netlify.toml` supplies the build command and the Next.js runtime plugin.
3. Site settings → Environment variables: add everything in `.env.example`. Scope `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` to **server** contexts only; never prefix them with `NEXT_PUBLIC_`.
4. Deploys: pushes to `main` go to production; every PR gets a preview URL automatically.

## 4. CI/CD

`.github/workflows/ci.yml` runs on every push/PR:
- lint → typecheck → unit tests (Vitest)
- boots a local Supabase and verifies all migrations apply cleanly

Add `test:e2e` (Playwright) to the matrix once the first flows are wired.

## 5. Backups & monitoring

- Supabase: enable PITR (Pro plan) or nightly `pg_dump` via GitHub Action to encrypted storage.
- Error reporting: add Sentry (`@sentry/nextjs`) — DSN slot is ready in env handling.
- Uptime: Netlify analytics + a ping monitor on `/` and the Edge Function health.
- Logs: Supabase Logs Explorer for DB/function logs; Netlify function logs for SSR.

## 6. Go-live checklist

- [ ] RLS smoke test: anonymous key cannot read another user's vehicles/requests/messages
- [ ] Stripe test-mode purchase adds credits exactly once (replay webhook to verify idempotency)
- [ ] Quote submission fails cleanly at 1 credit (INSUFFICIENT_CREDITS → 402)
- [ ] OTP + Google + Apple login round-trips on the production domain
- [ ] Lighthouse: PWA installable, a11y ≥ 95 on landing/search
- [ ] GDPR: privacy policy live, deletion request path tested end-to-end
