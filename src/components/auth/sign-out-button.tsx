'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await createClient().auth.signOut();
    // Full page load so no signed-in pages linger in the client router cache.
    window.location.assign('/');
  }

  return (
    <button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={signOut} disabled={pending}>
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
