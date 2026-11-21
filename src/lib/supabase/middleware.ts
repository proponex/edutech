import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseUrl.includes('your-project-id')
  ) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isStudentRoute = pathname.startsWith('/student');
  const isParentRoute = pathname.startsWith('/parent');
  const isTeacherRoute = pathname.startsWith('/teacher');
  const isOnboardingRoute = pathname === '/onboarding';
  const isAuthRoute = pathname === '/signup' || pathname === '/admin/login' || pathname === '/login';
  const isProtectedRoute = isAdminRoute || isStudentRoute || isParentRoute || isTeacherRoute;

  // Check if any Supabase session cookies exist in the request
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) =>
      (c.name.startsWith('sb-') && c.name.includes('-auth-token')) ||
      c.name.includes('supabase-auth-token')
  );

  // Fast redirect 1: Unauthenticated user accessing protected route or onboarding
  if ((isProtectedRoute || isOnboardingRoute) && !hasAuthCookie) {
    const loginUrl = new URL(isAdminRoute ? '/admin/login' : '/', request.url);
    if (!isAdminRoute) {
      loginUrl.searchParams.set('auth', 'login');
      loginUrl.hash = 'hero-login';
    } else {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Fast redirect 2: /login route accessed without auth cookies -> redirect to landing login
  if (pathname === '/login' && !hasAuthCookie) {
    const landingLogin = new URL('/', request.url);
    landingLogin.searchParams.set('auth', 'login');
    landingLogin.hash = 'hero-login';
    return NextResponse.redirect(landingLogin);
  }

  // Fast bypass 3: Public route without cookies
  if (!isProtectedRoute && !isOnboardingRoute && !isAuthRoute && !hasAuthCookie) {
    return supabaseResponse;
  }

  // Initialize Supabase server client
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;

  try {
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase auth timeout')), 3000)
    );

    const result = await Promise.race([supabase.auth.getUser(), timeoutPromise]);
    user = result?.data?.user ?? null;
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || 'Auth check failed';
    console.warn(`[Middleware] Supabase auth check unavailable (${errorMsg})`);
  }

  // Route /login handler:
  if (pathname === '/login') {
    if (!user) {
      const landingLogin = new URL('/', request.url);
      landingLogin.searchParams.set('auth', 'login');
      landingLogin.hash = 'hero-login';
      return NextResponse.redirect(landingLogin);
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.onboarding_completed !== true) {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }

      const role = profile.role || 'student';
      const target =
        role === 'admin'
          ? '/admin'
          : role === 'teacher'
          ? '/teacher'
          : role === 'parent'
          ? '/parent'
          : '/student';
      return NextResponse.redirect(new URL(target, request.url));
    } catch {
      return NextResponse.redirect(new URL('/student', request.url));
    }
  }

  // Onboarding Route Check
  if (isOnboardingRoute) {
    if (!user) {
      const landingLogin = new URL('/', request.url);
      landingLogin.searchParams.set('auth', 'login');
      landingLogin.hash = 'hero-login';
      return NextResponse.redirect(landingLogin);
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      // If user has already completed onboarding, redirect directly to their dashboard
      if (profile && profile.onboarding_completed === true && profile.role) {
        const target =
          profile.role === 'admin'
            ? '/admin'
            : profile.role === 'teacher'
            ? '/teacher'
            : profile.role === 'parent'
            ? '/parent'
            : '/student';
        return NextResponse.redirect(new URL(target, request.url));
      }
    } catch {
      // Allow proceeding to onboarding on error
    }
    return supabaseResponse;
  }

  // Protected Routes Check (/student, /teacher, /parent, /admin)
  if (isProtectedRoute) {
    if (!user) {
      const loginUrl = new URL(isAdminRoute ? '/admin/login' : '/', request.url);
      if (!isAdminRoute) {
        loginUrl.searchParams.set('auth', 'login');
        loginUrl.hash = 'hero-login';
      } else {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      // Incomplete onboarding enforcement: must complete onboarding first
      if (!profile || profile.onboarding_completed !== true) {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }

      const role = profile.role;

      // Role mismatch redirection
      if (isAdminRoute && role && role !== 'admin') {
        const target =
          role === 'student'
            ? '/student'
            : role === 'parent'
            ? '/parent'
            : role === 'teacher'
            ? '/teacher'
            : '/';
        return NextResponse.redirect(new URL(target, request.url));
      }

      if (isStudentRoute && role && role !== 'student' && role !== 'admin') {
        const target =
          role === 'parent'
            ? '/parent'
            : role === 'teacher'
            ? '/teacher'
            : '/';
        return NextResponse.redirect(new URL(target, request.url));
      }

      if (isParentRoute && role && role !== 'parent' && role !== 'admin') {
        const target =
          role === 'student'
            ? '/student'
            : role === 'teacher'
            ? '/teacher'
            : '/';
        return NextResponse.redirect(new URL(target, request.url));
      }

      if (isTeacherRoute && role && role !== 'teacher' && role !== 'admin') {
        const target =
          role === 'student'
            ? '/student'
            : role === 'parent'
            ? '/parent'
            : '/';
        return NextResponse.redirect(new URL(target, request.url));
      }
    } catch (roleErr) {
      console.warn('[Middleware] Profile role check error:', roleErr);
    }
  }

  // If already logged in and visiting login/signup pages, redirect to appropriate destination
  if (isAuthRoute && user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.onboarding_completed !== true) {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }

      const role = profile.role;
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else if (role === 'student') {
        return NextResponse.redirect(new URL('/student', request.url));
      } else if (role === 'parent') {
        return NextResponse.redirect(new URL('/parent', request.url));
      } else if (role === 'teacher') {
        return NextResponse.redirect(new URL('/teacher', request.url));
      }
    } catch {
      // ignore
    }
  }

  return supabaseResponse;
}
