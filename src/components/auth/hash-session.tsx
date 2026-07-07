'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Consumes implicit-flow sessions delivered in the URL hash.
 * Supabase's default (free-tier, non-customisable) auth emails contain a
 * verification LINK; after GoTrue verifies it, the browser lands on the site
 * root with #access_token=…&refresh_token=…. Our PKCE client ignores hashes,
 * so this handler stores the session and forwards to the dashboard.
 */
export function HashSessionHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) {
      if (hash.includes('error_description=')) {
        window.location.replace('/auth/login?error=callback');
      }
      return;
    }
    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return;

    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        history.replaceState(null, '', window.location.pathname);
        window.location.replace(error ? '/auth/login?error=callback' : '/dashboard');
      });
  }, []);
  return null;
}
