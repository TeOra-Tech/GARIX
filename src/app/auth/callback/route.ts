import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { roleHome, safeNext } from '@/lib/auth/roles';

/** OAuth (Google/Apple) PKCE callback: exchange the code, then land role-aware. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      if (next) return NextResponse.redirect(`${origin}${next}`);
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      return NextResponse.redirect(`${origin}${roleHome(profile?.role)}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback`);
}
