import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    console.error('[OAuth Callback Error]:', error, errorDescription);
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('auth_error', errorDescription || error);
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.user) {
      console.error('[OAuth Session Exchange Error]:', exchangeError);
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('auth_error', 'Failed to authenticate with Google. Please try again.');
      return NextResponse.redirect(redirectUrl);
    }

    const user = data.user;
    const serviceClient = createServiceClient();

    // Check authoritative existing profile in backend
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('id, role, onboarding_completed, created_at')
      .eq('id', user.id)
      .maybeSingle();

    const metaName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User';
    const avatarUrl =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null;

    // Detect if this is a newly registered user or incomplete onboarding
    // A user created within the last 2 minutes or with incomplete onboarding MUST complete onboarding
    const isRecentlyCreated =
      user.created_at &&
      new Date().getTime() - new Date(user.created_at).getTime() < 120000;

    const needsOnboarding =
      !profile ||
      profile.onboarding_completed !== true ||
      (isRecentlyCreated && !profile.onboarding_completed);

    if (needsOnboarding) {
      const nowIso = new Date().toISOString();

      // Ensure profile is marked as onboarding_completed: false
      // Remove any premature student record created by database triggers
      try {
        await serviceClient.from('students').delete().eq('id', user.id);
      } catch {
        // Non-blocking
      }

      await serviceClient.from('profiles').upsert(
        {
          id: user.id,
          name: metaName,
          email: user.email,
          role: profile?.role || 'student',
          onboarding_completed: false,
          auth_provider: 'google',
          photo_url: avatarUrl,
          status: 'active',
          updated_at: nowIso,
          created_at: profile?.created_at || nowIso,
        },
        { onConflict: 'id' }
      );

      // Redirect new Google user to onboarding to select their role
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    // Existing completed user: redirect directly to their respective portal dashboard
    const role = profile.role || 'student';
    const targetDashboard =
      role === 'admin'
        ? '/admin'
        : role === 'teacher'
        ? '/teacher'
        : role === 'parent'
        ? '/parent'
        : '/student';

    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  return NextResponse.redirect(new URL('/', request.url));
}
