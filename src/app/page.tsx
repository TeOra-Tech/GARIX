import Image from 'next/image';
import Link from 'next/link';

const customerSteps = [
  { title: 'Tell us what\u2019s wrong', body: 'Add your vehicle by reg number, describe the fault, attach photos or a video. Two minutes, no phone calls.' },
  { title: 'Garages come to you', body: 'Verified garages within range are notified and bid for your job with itemised quotes.' },
  { title: 'Compare like-for-like', body: 'Every quote shows labour, parts, and the full Irish VAT breakdown \u2014 13.5% on labour, 23% on parts. No surprises at the counter.' },
  { title: 'Book, chat, review', body: 'Accept the quote that suits you, message the garage directly, and leave a verified review when the job\u2019s done.' },
];

const garageSteps = [
  { title: 'Register free', body: 'Set up your profile with services, photos, opening hours, and service radius. Verification keeps the marketplace trusted.' },
  { title: 'Quote the jobs you want', body: 'Get notified when matching requests land in your radius. Submit a quote for 2 credits \u2014 1 credit is \u20AC1, no subscriptions required.' },
  { title: 'Win work, build reputation', body: 'Verified reviews from completed jobs only. Your rating, response time, and completed-job count do the marketing.' },
];

export default function LandingPage() {
  return (
    <main>
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-40 border-b border-ink-line bg-ink/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Main">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-wide">
            <Image src="/logo.png" alt="Garix" width={40} height={40} className="rounded" priority />
            GARIX
          </Link>
          <div className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/search" className="hover:text-volt-bright">Find a garage</Link>
            <Link href="/requests/new" className="hover:text-volt-bright">Get quotes</Link>
            <Link href="/garages/register" className="hover:text-volt-bright">For garages</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm hover:text-volt-bright">Log in</Link>
            <Link href="/auth/register" className="btn-primary !px-4 !py-2 text-sm">Sign up</Link>
          </div>
        </nav>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] hex-clip bg-volt/10"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.2em] text-signal">
              Ireland&rsquo;s garage marketplace
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl">
              Find the right garage.
              <br />
              <span className="text-volt-bright">Get the right service.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-paper/70">
              Post your repair once. Trusted garages near you bid for the job with
              itemised, VAT-transparent quotes. You compare, you choose.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/requests/new" className="btn-primary">Get free quotes</Link>
              <Link href="/garages/register" className="btn-ghost">Register your garage</Link>
            </div>
            <p className="mt-6 text-sm text-paper/50">
              Free for vehicle owners &middot; Free garage registration &middot; Pay-as-you-quote credits
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md">
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
      </section>

      {/* ---------- For drivers ---------- */}
      <section className="border-t border-ink-line bg-ink-soft">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="font-display text-3xl font-bold md:text-4xl">How it works for drivers</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-4">
            {customerSteps.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center hex-clip bg-volt font-display text-lg font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/60">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- VAT transparency ---------- */}
      <section className="border-t border-ink-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Every quote, fully itemised
            </h2>
            <p className="mt-4 text-paper/70">
              Irish VAT is complicated on purpose &mdash; 23% on parts, 13.5% on labour.
              Garix calculates it automatically on every quote so the price you compare
              is the price you pay.
            </p>
          </div>
          <div className="rounded-hex border border-ink-line bg-ink-soft p-8 font-mono text-sm" role="img" aria-label="Example quote breakdown">
            <div className="flex justify-between border-b border-ink-line pb-2 text-paper/60">
              <span>Front brake pads &amp; discs — 2019 Golf</span>
            </div>
            {[
              ['Labour (2.0 hrs)', '\u20AC160.00'],
              ['Labour VAT @ 13.5%', '\u20AC21.60'],
              ['Parts', '\u20AC210.00'],
              ['Parts VAT @ 23%', '\u20AC48.30'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 text-paper/80">
                <span>{k}</span><span>{v}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-ink-line pt-3 font-display text-lg font-bold text-signal">
              <span>Grand total</span><span>&euro;439.90</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- For garages ---------- */}
      <section className="border-t border-ink-line bg-ink-soft">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Built for independent garages</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {garageSteps.map((s) => (
              <div key={s.title} className="rounded-hex border border-ink-line bg-ink p-6">
                <h3 className="font-display text-lg font-semibold text-volt-bright">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/60">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/garages/register" className="btn-primary">Register your garage — free</Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-ink-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 font-display font-bold">
            <Image src="/logo.png" alt="" width={28} height={28} className="rounded" />
            GARIX
          </div>
          <nav className="flex flex-wrap gap-6 text-sm text-paper/60" aria-label="Footer">
            <Link href="/search" className="hover:text-paper">Find a garage</Link>
            <Link href="/garages/register" className="hover:text-paper">For garages</Link>
            <Link href="/legal/privacy" className="hover:text-paper">Privacy (GDPR)</Link>
            <Link href="/legal/terms" className="hover:text-paper">Terms</Link>
          </nav>
          <p className="text-xs text-paper/40">&copy; {new Date().getFullYear()} Garix. Made in Ireland.</p>
        </div>
      </footer>
    </main>
  );
}
