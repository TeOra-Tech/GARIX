# Garix — App Store and Google Play listing (draft for approval)

Prepared 5 November 2026 for the first release (car owners and fleets). Everything here describes the
app as built; check it again if features change before submission.

## Identity

| Field | Value |
|---|---|
| App name | Garix |
| Bundle ID / package | ie.garix.app |
| Developer / seller | TeOra Technologies Limited |
| Category | Primary: Lifestyle (Apple) / Auto & Vehicles (Google). Secondary (Apple): Utilities |
| Price | Free |
| Countries | Ireland at launch (add others later) |
| Languages | English (UK) |
| Support URL | https://garix.ie (support@garix.ie) |
| Marketing URL | https://garix.ie |
| Privacy policy URL | https://garix.ie/legal/privacy — publish the solicitor-approved version before release |
| Account deletion URL (Google) | https://garix.ie/legal/delete-account |

## Text

**Subtitle (Apple, 30 characters max):** Compare garage quotes fast

**Short description (Google, 80 max):** Post your car repair once and compare itemised quotes from verified Irish garages.

**Promotional text (Apple, 170 max):** Post a repair in two minutes. Verified garages near you send itemised quotes with full Irish VAT breakdowns, so you can compare like for like.

**Description (both):**

Garix connects you with trusted, verified garages across Ireland. Describe what’s wrong with your car,
and garages near you send you quotes. No phone calls, no chasing.

How it works
• Add your car by registration number.
• Post a repair request with photos. It takes about two minutes.
• Verified garages near you see it and send itemised quotes.
• Compare quotes side by side, with labour, parts and Irish VAT (13.5% on labour, 23% on parts) shown separately.
• Message garages to ask questions, then accept the quote that suits you.

Why Garix
• Every garage is verified before it can quote.
• Reviews come only from customers who completed a job through Garix.
• Quotes are labelled Cheapest, Fastest and Best value to help you choose.
• Free for car owners. You pay the garage directly, never Garix.

For businesses
Garix for Business lets companies manage a whole fleet of vehicles in one account.

You can delete your account at any time from Account details in the app.

**Keywords (Apple, 100 characters):** garage,mechanic,car repair,quotes,service,NCT,Ireland,tyres,brakes,clutch,vehicle,auto,fleet

**What’s new (version 1.0):** The first release of Garix for iPhone and Android.

## Review access

App Review cannot receive our emailed sign-in codes, so we provide a review account that signs in
with a password. Set `EXPO_PUBLIC_REVIEW_EMAIL` in the EAS environment to its email before building
the release.

- Review account email: appreview@garix.ie (to be created)
- Password: entered in App Store Connect / Play Console only — never stored in the repo
- Notes for the reviewer: “Enter the review email on the Log in screen and tap Send code — the app
  asks for a password for this account only. The account has a sample vehicle and a request with a
  quote so you can try comparing, messaging and accepting.”

## Apple — App Privacy answers

Tracking: **No** (no data used to track users across other companies’ apps or sites; no advertising
SDKs, no IDFA).

| Data type | Collected | Linked to user | Purpose |
|---|---|---|---|
| Name | Yes | Yes | App functionality |
| Email address | Yes | Yes | App functionality |
| Phone number | Yes | Yes | App functionality |
| Physical address | Yes | Yes | App functionality |
| Photos | Yes (only those the user attaches) | Yes | App functionality |
| Customer support / other user content (requests, messages, reviews) | Yes | Yes | App functionality |
| Coarse location (town and county the user types) | Yes | Yes | App functionality |
| Purchase history | No (no purchases in the iOS app) | — | — |
| Identifiers, usage data, diagnostics | No | — | — |

## Google Play — Data safety answers

- Data collected: name, email, phone, address; photos; messages and other user-generated content;
  approximate location (from the town and county the user enters).
- Data shared with third parties: **No** (service providers acting for us, such as hosting and email,
  are not "sharing" under Google's definition).
- Encrypted in transit: **Yes**.
- Users can request deletion: **Yes** — in the app (Account details) and at
  https://garix.ie/legal/delete-account.
- Collection is required for the app to work; photos are optional.

## Ratings and compliance

- Age rating: 4+ (Apple) / Everyone (Google). No user-to-user content that is unmoderated: messages
  are one-to-one between a customer and a garage they chose, and there is a report route
  (notice@garix.ie).
- Export compliance: uses only standard HTTPS encryption — `usesNonExemptEncryption: false` is set
  in the app config, so no export documentation is needed.
- Sign in with Apple: not required — the app offers only email sign-in, no third-party sign-in.
- In-app purchases: none. On iOS the app does not link to or mention web payment.

## Screenshots needed

- Apple: 6.9-inch iPhone (1320 × 2868), 3–10 screenshots. iPad not needed (iPhone-only app).
- Google: phone screenshots (2–8, at least 1080 px on the short side) and a 1024 × 500 feature graphic.
- Suggested screens: Home, posting a request, quotes comparison, a conversation, vehicle detail.
