import Image from 'next/image';
import Link from 'next/link';

// Brand landing (Brand Guidelines v1.0): white ground, navy #0B1F4D system,
// gold #D4AF37 as sparing accent (<15%). Poppins throughout.

const customerSteps = [
  { title: 'Tell us what’s wrong', body: 'Add your vehicle by reg number, describe the fault, attach photos or a video. Two minutes, no phone calls.' },
  { title: 'Garages come to you', body: 'Verified garages within range are notified and bid for your job with itemised quotes.' },
  { title: 'Compare like-for-like', body: 'Every quote shows labour, parts, and the full Irish VAT breakdown — 13.5% on labour, 23% on parts. No surprises at the counter.' },
  { title: 'Book, chat, review', body: 'Accept the quote that suits you, message the garage directly, and leave a verified review when the job’s done.' },
];

const garageSteps = [
  { title: 'Register free', body: 'Set up your profile with services, photos, opening hours, and service radius. Verification keeps the marketplace trusted.' },
  { title: 'Quote the jobs you want', body: 'Get notified when matching requests land in your radius. Submit a quote for 2 credits — 1 credit is €1, no subscriptions required.' },
  { title: 'Win work, build reputation', body: 'Verified reviews from completed jobs only. Your rating, response time, and completed-job count do the marketing.' },
];

export default function LandingPage() {
  return (
    <main className="bg-white text-charcoal">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Main">
          <Link href="/" aria-label="Garix home" className="flex items-center">
            <Image src="/logo-horizontal.png" alt="Garix" width={150} height={37} priority className="h-9 w-auto" />
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-charcoal/70 md:flex">
            <Link href="/search" className="transition hover:text-navy">Find a garage</Link>
            <Link href="/requests/new" className="transition hover:text-navy">Get quotes</Link>
            <Link href="/garages/register" className="transition hover:text-navy">For garages</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-navy transition hover:text-navy-soft">
              Log in
            </Link>
            <Link href="/auth/register" className="btn-primary !px-5 !py-2.5 text-sm">Sign up</Link>
          </div>
        </nav>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] hex-clip bg-navy/[0.04]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-navy/15 bg-navy/[0.03] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-navy">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold" />
              Ireland&rsquo;s garage marketplace
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-navy md:text-6xl">
              Find the right garage.
              <br />
              <span className="relative inline-block">
                Get the right service.
                <span aria-hidden className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-gold" />
              </span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-charcoal/70">
              Post your repair once. Trusted garages near you bid for the job with
              itemised, VAT-transparent quotes. You compare, you choose.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="/requests/new" className="btn-primary">Get free quotes</Link>
              <Link href="/garages/register" className="btn-ghost">Register your garage</Link>
            </div>
            <p className="mt-6 text-sm text-charcoal/50">
              Free for vehicle owners &middot; Free garage registration &middot; Pay-as-you-quote credits
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <Image
              src="/logo-primary.png"
              alt="Garix — orange car inside a blue hexagon"
              width={520}
              height={330}
              className="w-full"
              priority
            />
          </div>
        </div>
      </section>

      {/* ---------- For drivers ---------- */}
      <section className="border-t border-line bg-ink-soft">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold-ink">For drivers</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy md:text-4xl">How it works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {customerSteps.map((s, i) => (
              <div
                key={s.title}
                className="rounded-hex border border-line bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center hex-clip bg-navy font-display text-lg font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="font-display text-lg font-semibold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- VAT transparency ---------- */}
      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2">
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold-ink">Transparent pricing</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy md:text-4xl">
              Every quote, fully itemised
            </h2>
            <p className="mt-4 leading-relaxed text-charcoal/70">
              Irish VAT is complicated on purpose &mdash; 23% on parts, 13.5% on labour.
              Garix calculates it automatically on every quote so the price you compare
              is the price you pay.
            </p>
          </div>
          <div
            className="rounded-hex border border-line bg-white p-8 text-sm shadow-md"
            role="img"
            aria-label="Example quote breakdown"
          >
            <div className="flex justify-between border-b border-line pb-2 font-medium text-charcoal/70">
              <span>Front brake pads &amp; discs — 2019 Golf</span>
            </div>
            {[
              ['Labour (2.0 hrs)', '€160.00'],
              ['Labour VAT @ 13.5%', '€21.60'],
              ['Parts', '€210.00'],
              ['Parts VAT @ 23%', '€48.30'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 text-charcoal/70">
                <span>{k}</span><span className="tabular-nums">{v}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-line pt-3 font-display text-lg font-bold text-navy">
              <span>Grand total</span><span className="tabular-nums">&euro;439.90</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- For garages ---------- */}
      <section className="border-t border-line bg-ink-soft">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold-ink">For garages</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy md:text-4xl">
            Built for independent garages
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {garageSteps.map((s) => (
              <div
                key={s.title}
                className="rounded-hex border border-line bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <h3 className="font-display text-lg font-semibold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link href="/garages/register" className="btn-primary">Register your garage — free</Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <Image src="/logo-horizontal.png" alt="Garix" width={130} height={32} className="h-8 w-auto" />
          <nav className="flex flex-wrap gap-6 text-sm text-charcoal/60" aria-label="Footer">
            <Link href="/search" className="transition hover:text-navy">Find a garage</Link>
            <Link href="/garages/register" className="transition hover:text-navy">For garages</Link>
            <Link href="/legal/privacy" className="transition hover:text-navy">Privacy (GDPR)</Link>
            <Link href="/legal/terms" className="transition hover:text-navy">Terms</Link>
          </nav>
          <p className="text-xs text-charcoal/40">&copy; {new Date().getFullYear()} Garix. Made in Ireland.</p>
        </div>
      </footer>
    </main>
  );
}
