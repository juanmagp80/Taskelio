import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res = NextResponse.next({
              request: {
                headers: req.headers,
              },
            });
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANTE: Refresh session antes de verificar
  const { data: { session }, error } = await supabase.auth.getSession();

  // Refresh session if expired
  if (session?.expires_at) {
    const timeNow = Math.floor(Date.now() / 1000);
    if (session.expires_at <= timeNow) {
      await supabase.auth.refreshSession();
    }
  }

  // Verificar confirmación de email para usuarios logueados
  if (session?.user) {
    const pathname = req.nextUrl.pathname;

    // Rutas que no requieren verificación de email
    const publicRoutes = [
      '/login',
      '/register',
      '/auth/confirm',
      '/auth/callback',
      '/api',
      '/_next',
      '/favicon.ico',
      '/email-pending'
    ];

    // Verificar si la ruta actual es pública
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    if (!isPublicRoute) {
      try {
        // Verificar si el usuario ha confirmado su email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email_confirmed_at')
          .eq('id', session.user.id)
          .single();

        // Si no hay confirmación de email, redirigir a página de confirmación pendiente
        if (!profile?.email_confirmed_at && !profileError) {
          const url = req.nextUrl.clone();
          url.pathname = '/email-pending';
          url.searchParams.set('redirect', pathname);
          return NextResponse.redirect(url);
        }
      } catch (emailCheckError) {
        console.error('❌ Error checking email confirmation:', emailCheckError);
        // En caso de error, permitir el acceso pero registrar el error
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
