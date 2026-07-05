export const metadata = { title: 'Get quotes' };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="font-display text-4xl font-bold">Get quotes</h1>
      <p className="mt-4 text-paper/60">
        This screen is scaffolded and routed; wire it to Supabase using the
        clients in <code>src/lib/supabase</code>. See docs/ARCHITECTURE.md for
        the data flow this page owns.
      </p>
    </main>
  );
}
