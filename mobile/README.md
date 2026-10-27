# Garix mobile app

One Expo (React Native) app for every Garix role. Release 1 covers car owners and fleets;
garage owners and admins see a "use garix.ie for now" screen until their tools arrive.

It talks to the same Supabase project as the website, with the anon key only — RLS is the
authorization layer, exactly as on the web. Account deletion calls the website's
`/api/account/delete` with the session as a bearer token.

## Run it

```bash
cp .env.example .env.local    # then fill in the public Supabase URL + anon key
npm install
npm start                     # scan the QR code with Expo Go, or press a / i
npm run web                   # quick look in a browser (photos and native bits differ)
```

## Checks

```bash
npm run typecheck
npm run lint
npm run doctor
```

## Shared code

Validation rules, VAT maths and database types are copied from the website into
`src/shared/` by `npm run sync-shared`. Edit the web files, never the copies, then re-run it.
After a migration: `npm run db:types` at the repo root, then `npm run sync-shared` here.

## Identifiers

- Bundle ID / package: `ie.garix.app`
- Deep-link scheme: `garix://`

Store builds use EAS (`npx eas-cli@latest build`) once the Apple and Google developer
accounts exist.
