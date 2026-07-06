import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { roleHome } from '@/lib/auth/roles';

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/requests'];
const AUTH_PAGES = ['/auth/login', '/auth/register'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (all: { name: string; value: string; options: CookieOptions }[]) => {
          all.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          all.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refreshes the session when needed — must run before any redirect decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.includes(path);

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.search = '';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user && (isAuthPage || path.startsWith('/admin'))) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (isAuthPage) {
      return NextResponse.redirect(new URL(roleHome(profile?.role), request.url));
    }
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  // Everything except static assets — the session refresh must see all app routes.
  matcher: ['/((?!_next/static|_next/image|favicon\\.png|icons/|logo\\.png|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};
