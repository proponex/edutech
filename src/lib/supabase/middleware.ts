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
    // If Supabase credentials are not configured, don't crash middleware
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isStudentRoute = pathname.startsWith('/student');
  const isParentRoute = pathname.startsWith('/parent');
  const isTeacherRoute = pathname.startsWith('/teacher');
  const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/admin/login';
  const isProtectedRoute = isAdminRoute || isStudentRoute || isParentRoute || isTeacherRoute;

  // Check if any Supabase session cookies exist in the request
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) =>
      (c.name.startsWith('sb-') && c.name.includes('-auth-token')) ||
      c.name.includes('supabase-auth-token')
  );

  // Optimization 1: If it's a protected route and has no auth cookies at all, redirect immediately (0ms)
  if (isProtectedRoute && !hasAuthCookie) {
    const loginUrl = new URL(isAdminRoute ? '/admin/login' : '/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Optimization 2: If it's a public route and has no auth cookies, skip remote network calls completely
  if (!isProtectedRoute && !hasAuthCookie) {
    return supabaseResponse;
  }

  // If auth cookie exists or need to verify session on protected route:
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
    // Timeout promise (2.5 seconds max) to prevent middleware from freezing requests if Supabase is paused
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase auth timeout')), 2500)
    );

    const result = await Promise.race([supabase.auth.getUser(), timeoutPromise]);
    user = result?.data?.user ?? null;
  } catch (err: unknown) {
    // If Supabase project is paused or offline, log warning and fail gracefully without crashing
    const errorMsg = (err as Error)?.message || 'Auth check failed';
    console.warn(`[Middleware] Supabase auth check unavailable (${errorMsg})`);
  }

  // Protected Routes Check
  if (isProtectedRoute) {
    if (!user) {
      const loginUrl = new URL(isAdminRoute ? '/admin/login' : '/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based protection
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role;

      if (isAdminRoute && role !== 'admin') {
        const target =
          role === 'student'
            ? '/student'
            : role === 'parent'
            ? '/parent'
            : role === 'teacher'
            ? '/teacher'
            : '/login';
        return NextResponse.redirect(new URL(target, request.url));
      }

      if (isStudentRoute && role !== 'student' && role !== 'admin') {
        const target =
          role === 'parent'
            ? '/parent'
            : role === 'teacher'
            ? '/teacher'
            : '/login';
        return NextResponse.redirect(new URL(target, request.url));
      }

      if (isParentRoute && role !== 'parent' && role !== 'admin') {
        const target =
          role === 'student'
            ? '/student'
            : role === 'teacher'
            ? '/teacher'
            : '/login';
        return NextResponse.redirect(new URL(target, request.url));
      }

      if (isTeacherRoute && role !== 'teacher' && role !== 'admin') {
        const target =
          role === 'student'
            ? '/student'
            : role === 'parent'
            ? '/parent'
            : '/login';
        return NextResponse.redirect(new URL(target, request.url));
      }
    } catch {
      // Role fetch failed
    }
  }

  // If already logged in and visiting login/signup, redirect to dashboard
  if (isAuthRoute && user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role;
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
