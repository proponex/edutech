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
    // If Supabase credentials are not yet populated, don't crash middleware
    return supabaseResponse;
  }

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

  // IMPORTANT: Avoid writing logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isStudentRoute = pathname.startsWith('/student');
  const isParentRoute = pathname.startsWith('/parent');
  const isTeacherRoute = pathname.startsWith('/teacher');
  const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/admin/login';

  // Protected Routes
  if (isAdminRoute || isStudentRoute || isParentRoute || isTeacherRoute) {
    if (!user) {
      const loginUrl = new URL(isAdminRoute ? '/admin/login' : '/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based protection
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
  }

  // If already logged in and visiting login/signup, redirect to dashboard
  if (isAuthRoute && user) {
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
  }

  return supabaseResponse;
}
