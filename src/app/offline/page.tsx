export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <div aria-hidden className="flex h-16 w-16 items-center justify-center hex-clip bg-volt/20 font-display text-2xl font-bold text-volt-bright">
        !
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold">You&rsquo;re offline</h1>
      <p className="mt-3 text-paper/60">
        Garix needs a connection to load quotes and messages. Check your signal and try again —
        anything you already opened may still be available.
      </p>
    </main>
  );
}
