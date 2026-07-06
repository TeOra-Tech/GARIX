import Link from 'next/link';

export const metadata = {
  title: 'Privacy policy',
  description: 'How Garix collects, uses, and protects your personal data under GDPR.',
};

const S = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-10">
    <h2 className="font-display text-2xl font-bold">{title}</h2>
    <div className="mt-3 space-y-3 text-paper/80">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="font-display text-4xl font-bold">Privacy policy</h1>
      <p className="mt-3 text-sm text-paper/50">Last updated: July 2026 · Applies to garix.ie</p>

      <p className="mt-6 text-paper/80">
        Garix connects vehicle owners with mechanic garages across Ireland. This policy explains
        what personal data we collect, why, and the rights you have under the General Data
        Protection Regulation (GDPR). Our data is hosted in the EU (Ireland region).
      </p>

      <S title="What we collect">
        <p>
          <span className="font-medium text-paper">Account data</span> — your name, email address,
          mobile number, and address, collected when you register.
        </p>
        <p>
          <span className="font-medium text-paper">Vehicle and job data</span> — vehicles you add,
          repair requests you post (including photos and location), quotes, messages with garages,
          and reviews.
        </p>
        <p>
          <span className="font-medium text-paper">Garage business data</span> — for garage owners:
          business name, premises address, services, certifications, and credit transactions.
        </p>
        <p>
          <span className="font-medium text-paper">Payments</span> — credit purchases are processed
          by Stripe. We never see or store your card number; we keep a record of the transaction.
        </p>
      </S>

      <S title="Why we process it">
        <p>
          To run the marketplace (contract performance): matching your requests with nearby garages,
          delivering quotes and messages, processing credit purchases, and publishing verified reviews.
        </p>
        <p>
          With your consent: marketing emails (only if you opted in at registration — you can
          withdraw at any time) and optional SMS notifications you control in your{' '}
          <Link href="/dashboard/notifications" className="text-volt-bright hover:underline">
            notification preferences
          </Link>.
        </p>
        <p>
          Legitimate interest: fraud prevention (reviews come only from completed jobs), platform
          security, and audit logging of administrative actions.
        </p>
      </S>

      <S title="Who sees your data">
        <p>
          Garages see the repair requests you post (title, description, vehicle summary, town, and
          attachments) so they can quote. Your contact details are shared only through the
          in-platform messaging you initiate.
        </p>
        <p>
          Service providers acting for us: Supabase (EU hosting), Stripe (payments), Resend (email),
          Twilio (SMS), Google Maps / OpenStreetMap (location search). We do not sell personal data.
        </p>
      </S>

      <S title="How long we keep it">
        <p>
          For as long as your account is active. Financial records (credit transactions, payments)
          are retained as required by Irish tax law. When you request deletion, your account and
          personal data are erased; anonymised records required by law are kept.
        </p>
      </S>

      <S title="Your rights">
        <p>
          You may access, correct, export, or erase your personal data, restrict or object to
          processing, and withdraw consent at any time. Email{' '}
          <a href="mailto:privacy@garix.ie" className="text-volt-bright hover:underline">
            privacy@garix.ie
          </a>{' '}
          and we will respond within one month. You may also lodge a complaint with the Data
          Protection Commission (dataprotection.ie).
        </p>
      </S>

      <S title="Cookies">
        <p>
          We use strictly necessary cookies for sign-in sessions. Analytics (Google Analytics) runs
          only where configured and is used in aggregate to improve the product.
        </p>
      </S>

      <p className="mt-10 text-sm text-paper/50">
        Questions? Contact{' '}
        <a href="mailto:privacy@garix.ie" className="text-volt-bright hover:underline">privacy@garix.ie</a>.
      </p>
    </main>
  );
}
