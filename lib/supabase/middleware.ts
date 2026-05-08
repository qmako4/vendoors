import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/types';
import { REMEMBER_COOKIE, sessionizeIfNeeded } from '@/lib/remember-me';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== '0';

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(
              name,
              value,
              sessionizeIfNeeded(options, remember),
            );
          }
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser.
  // A subtle bug here can cause logouts. See @supabase/ssr docs.
  await supabase.auth.getUser();

  return supabaseResponse;
}
