export const metadata = {
  title: 'Terms of service',
  description: 'The terms that govern using the Garix marketplace.',
};

const S = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-10">
    <h2 className="font-display text-2xl font-bold">{title}</h2>
    <div className="mt-3 space-y-3 text-paper/80">{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="font-display text-4xl font-bold">Terms of service</h1>
      <p className="mt-3 text-sm text-paper/50">Last updated: July 2026 · Applies to garix.ie</p>

      <p className="mt-6 text-paper/80">
        Garix is a marketplace that connects vehicle owners (&ldquo;customers&rdquo;) with
        independent mechanic garages (&ldquo;garages&rdquo;) across Ireland. By creating an
        account you agree to these terms.
      </p>

      <S title="What Garix is — and is not">
        <p>
          Garix provides the platform: posting repair requests, receiving and comparing quotes,
          messaging, payments for platform credits, and verified reviews. The repair contract is
          always between the customer and the garage. Garix is not a party to it, does not perform
          repairs, and does not guarantee the outcome of any job.
        </p>
      </S>

      <S title="Accounts">
        <p>
          You must provide accurate information and keep your sign-in method secure. One account
          per person; a garage account must be operated by someone authorised to act for the
          business. We may suspend accounts that break these terms, abuse other users, or attempt
          to manipulate reviews or the quoting system.
        </p>
      </S>

      <S title="Quotes and jobs">
        <p>
          Quotes show parts, labour, and Irish VAT (23% on parts, 13.5% on labour) so they can be
          compared like for like. A quote is the garage&rsquo;s offer; accepting it signals your
          intent to proceed. Final invoicing is between you and the garage — agree any changes to
          scope or price directly with them before work proceeds.
        </p>
      </S>

      <S title="Credits (garages)">
        <p>
          Garages pay per quote using platform credits (1 credit = &euro;1), purchased via Stripe.
          Credits are non-transferable and non-refundable except where required by law or where a
          quote submission fails and is automatically refunded. Credit pricing per action is shown
          before you submit and may change with notice.
        </p>
      </S>

      <S title="Reviews">
        <p>
          Reviews can only be left for completed Garix jobs — that is what makes them credible.
          Keep them honest and civil. Garages may respond publicly once per review. We may hide
          content that is unlawful, abusive, or fraudulent.
        </p>
      </S>

      <S title="Liability">
        <p>
          To the extent permitted by law, Garix is not liable for the quality, safety, timing, or
          price of repairs, or for disputes between customers and garages. We provide a dispute
          process and will assist in good faith. Nothing in these terms limits liability that
          cannot be limited under Irish law.
        </p>
      </S>

      <S title="Ending your account">
        <p>
          You can request account deletion at any time (see the privacy policy for how data is
          handled). We may terminate accounts for material breach. Sections that by their nature
          should survive (payments owed, liability, disputes) survive termination.
        </p>
      </S>

      <S title="Governing law">
        <p>These terms are governed by the laws of Ireland, and Irish courts have jurisdiction.</p>
      </S>

      <p className="mt-10 text-sm text-paper/50">
        Questions? Contact <a href="mailto:support@garix.ie" className="text-volt-bright hover:underline">support@garix.ie</a>.
      </p>
    </main>
  );
}
