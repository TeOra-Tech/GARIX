import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delete your account',
  description: 'How to delete your Garix account and what happens to your data.',
};

/** Public deletion instructions — the URL given to Google Play and the App Store. */
export default function DeleteAccountInfoPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">Delete your Garix account</h1>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">How to delete it</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-paper/80">
          <li>
            <Link href="/auth/login?next=/dashboard/account" className="font-medium text-navy underline underline-offset-2">
              Log in
            </Link>{' '}
            on the website or in the Garix app.
          </li>
          <li>Open <strong>Account details</strong> from your dashboard.</li>
          <li>Under <strong>Delete account</strong>, choose <strong>Delete my account</strong>, type your email to confirm, and select <strong>Permanently delete account</strong>.</li>
        </ol>
        <p className="mt-3 text-paper/80">
          Can&rsquo;t log in? Email{' '}
          <a href="mailto:privacy@garix.ie?subject=Delete%20my%20account" className="font-medium text-navy underline underline-offset-2">
            privacy@garix.ie
          </a>{' '}
          from the address on your account and we&rsquo;ll delete it within one month.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">What we delete</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-paper/80">
          <li>Your profile, addresses and notification settings</li>
          <li>Your vehicles, service history and reminders</li>
          <li>Your repair requests, photos, quotes received, messages and reviews</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">What we keep, and for how long</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-paper/80">
          <li>Payment, invoice and credit records: 6 years, as Irish tax and company law requires.</li>
          <li>Records of disputes, reports and content decisions: as long as the law requires, with your name removed.</li>
          <li>Security audit logs: up to 12 months, identified only by an internal ID.</li>
          <li>Backups: deleted data disappears as backups rotate out.</li>
        </ul>
        <p className="mt-3 text-paper/80">
          Garage owners need to transfer or close their garage first; email privacy@garix.ie and we&rsquo;ll
          help.
        </p>
      </section>
    </main>
  );
}
