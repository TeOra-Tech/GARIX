import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Account deleted', robots: { index: false } };

export default function AccountDeletedPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">Your account has been deleted</h1>
      <p className="mt-4 text-paper/70">
        We&rsquo;ve removed your Garix account and the personal data linked to it. Records we&rsquo;re legally
        required to keep are held only for as long as the law requires. Questions? Email{' '}
        <a href="mailto:privacy@garix.ie" className="font-medium text-navy underline underline-offset-2">
          privacy@garix.ie
        </a>
        .
      </p>
      <Link href="/" className="btn-primary mt-8 inline-flex">
        Back to Garix
      </Link>
    </main>
  );
}
