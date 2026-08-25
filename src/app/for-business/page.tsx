import Link from 'next/link';

export const metadata = {
  title: 'Garix for Business — Fleet management',
  description:
    'Manage unlimited vehicles, service history and reminders for your whole fleet. €5 per vehicle per month.',
};

const FEATURES = [
  { title: 'Unlimited vehicles', body: 'Add every vehicle in your fleet — no 3-vehicle cap. You pay €5 per vehicle per month.' },
  { title: 'Digital service history', body: 'Keep engine, gearbox, parts, mileage, warranty and interval records for every vehicle.' },
  { title: 'Maintenance reminders', body: 'NCT, tax, insurance, oil and service reminders per vehicle, so nothing slips through.' },
  { title: 'One place for quotes', body: 'Post repair requests and compare VAT-itemised quotes from verified garages — same as individual accounts.' },
];

export default function ForBusinessPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-20">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold-ink">
        Garix for Business
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">Fleet management, made simple</h1>
      <p className="mt-4 max-w-2xl text-lg text-paper/70">
        Businesses managing more than three vehicles can open a Fleet account: unlimited vehicles, full
        service history and reminders, billed at just <span className="font-semibold">€5 per vehicle per
        month</span>. Add or remove vehicles any time — your bill adjusts automatically.
      </p>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/auth/register?type=fleet" className="btn-primary">
          Create a fleet account
        </Link>
        <Link href="/auth/login" className="btn-ghost">
          Log in
        </Link>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-hex border border-ink-line bg-ink-soft p-6">
            <h2 className="font-display text-lg font-semibold text-volt-bright">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-paper/70">{f.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-14 rounded-hex border border-ink-line bg-ink-soft p-8">
        <h2 className="font-display text-2xl font-bold">Simple, per-vehicle pricing</h2>
        <p className="mt-3 text-paper/70">
          <span className="font-display text-4xl font-extrabold">€5</span>
          <span className="text-paper/60"> per vehicle, per month.</span>
        </p>
        <ul className="mt-4 space-y-2 text-sm text-paper/70">
          <li>• Only pay for the vehicles you manage — changes are prorated.</li>
          <li>• Secure card payment and billing management via Stripe.</li>
          <li>• Individual accounts stay free for up to 3 vehicles.</li>
        </ul>
        <Link href="/auth/register?type=fleet" className="btn-primary mt-6 inline-flex">
          Get started
        </Link>
      </section>
    </main>
  );
}
