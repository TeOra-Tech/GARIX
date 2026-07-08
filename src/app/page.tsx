import Image from 'next/image';
import Link from 'next/link';

// Light-theme landing experiment: white canvas, volt blue + signal orange
// accents, ink text. Scoped to this page — the app shell stays dark.

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

const lightGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-ink/15 px-6 py-3 ' +
  'font-display font-semibold text-ink transition hover:border-volt hover:text-volt';

export default function LandingPage() {
  return (
    <main className="bg-white text-ink">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Main">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-ink">
            <Image src="/logo.png" alt="Garix" width={40} height={40} className="rounded" priority />
            GARIX
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-ink/70 md:flex">
            <Link href="/search" className="transition hover:text-volt">Find a garage</Link>
            <Link href="/requests/new" className="transition hover:text-volt">Get quotes</Link>
            <Link href="/garages/register" className="transition hover:text-volt">For garages</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-ink/70 transition hover:text-volt">
              Log in
            </Link>
            <Link href="/auth/register" className="btn-primary !px-4 !py-2 text-sm shadow-lg shadow-volt/25">
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-44 -top-44 h-[36rem] w-[36rem] hex-clip bg-gradient-to-br from-volt/10 to-volt/[0.03]" />
        <div aria-hidden className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 hex-clip bg-signal/[0.06]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-volt/20 bg-volt/5 px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.18em] text-volt">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-signal" />
              Ireland&rsquo;s garage marketplace
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Find the right garage.
              <br />
              <span className="bg-gradient-to-r from-volt to-volt-deep bg-clip-text text-transparent">
                Get the right service.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/60">
              Post your repair once. Trusted garages near you bid for the job with
              itemised, VAT-transparent quotes. You compare, you choose.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/requests/new" className="btn-primary shadow-lg shadow-volt/25">
                Get free quotes
              </Link>
              <Link href="/garages/register" className={lightGhost}>
                Register your garage
              </Link>
            </div>
            <p className="mt-6 text-sm text-ink/45">
              Free for vehicle owners &middot; Free garage registration &middot; Pay-as-you-quote credits
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div aria-hidden className="absolute -inset-6 -z-10 hex-clip bg-gradient-to-br from-volt/15 via-transparent to-signal/15 blur-2xl" />
            <div className="overflow-hidden rounded-3xl bg-ink p-8 shadow-2xl shadow-ink/25 ring-1 ring-ink/10">
              <Image
                src="/logo.png"
                alt="Garix — orange car inside a blue hexagon"
                width={520}
                height={520}
                className="w-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- For drivers ---------- */}
      <section className="border-t border-ink/10 bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-signal">For drivers</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {customerSteps.map((s, i) => (
              <div
                key={s.title}
                className="group rounded-hex border border-ink/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-volt/40 hover:shadow-lg hover:shadow-volt/10"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center hex-clip bg-volt font-display text-lg font-bold text-white transition group-hover:bg-signal">
                  {i + 1}
                </div>
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- VAT transparency ---------- */}
      <section className="border-t border-ink/10 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2">
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-volt">Transparent pricing</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Every quote, fully itemised
            </h2>
            <p className="mt-4 leading-relaxed text-ink/60">
              Irish VAT is complicated on purpose &mdash; 23% on parts, 13.5% on labour.
              Garix calculates it automatically on every quote so the price you compare
              is the price you pay.
            </p>
          </div>
          <div
            className="rounded-hex border border-ink/10 bg-white p-8 font-mono text-sm shadow-xl shadow-ink/5 ring-1 ring-volt/10"
            role="img"
            aria-label="Example quote breakdown"
          >
            <div className="flex justify-between border-b border-ink/10 pb-2 font-medium text-ink/70">
              <span>Front brake pads &amp; discs — 2019 Golf</span>
            </div>
            {[
              ['Labour (2.0 hrs)', '€160.00'],
              ['Labour VAT @ 13.5%', '€21.60'],
              ['Parts', '€210.00'],
              ['Parts VAT @ 23%', '€48.30'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 text-ink/70">
                <span>{k}</span><span>{v}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-ink/10 pt-3 font-display text-lg font-bold text-signal">
              <span>Grand total</span><span>&euro;439.90</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- For garages ---------- */}
      <section className="border-t border-ink/10 bg-gradient-to-b from-paper to-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-signal">For garages</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Built for independent garages
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {garageSteps.map((s) => (
              <div
                key={s.title}
                className="rounded-hex border border-ink/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-signal/40 hover:shadow-lg hover:shadow-signal/10"
              >
                <h3 className="font-display text-lg font-semibold text-volt">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link href="/garages/register" className="btn-primary shadow-lg shadow-volt/25">
              Register your garage — free
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-ink">
            <Image src="/logo.png" alt="" width={28} height={28} className="rounded" />
            GARIX
          </div>
          <nav className="flex flex-wrap gap-6 text-sm text-ink/50" aria-label="Footer">
            <Link href="/search" className="transition hover:text-volt">Find a garage</Link>
            <Link href="/garages/register" className="transition hover:text-volt">For garages</Link>
            <Link href="/legal/privacy" className="transition hover:text-volt">Privacy (GDPR)</Link>
            <Link href="/legal/terms" className="transition hover:text-volt">Terms</Link>
          </nav>
          <p className="text-xs text-ink/40">&copy; {new Date().getFullYear()} Garix. Made in Ireland.</p>
        </div>
      </footer>
    </main>
  );
}
