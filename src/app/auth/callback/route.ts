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

    // Check existing profile
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const metaName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';

    // 1. If profile doesn't exist, create initial record with onboarding_completed: false
    if (!profile) {
      const nowIso = new Date().toISOString();
      await serviceClient.from('profiles').insert({
        id: user.id,
        name: metaName,
        email: user.email,
        role: 'student', // default placeholder until onboarding completed
        auth_provider: 'google',
        onboarding_completed: false,
        created_at: nowIso,
        updated_at: nowIso,
      });

      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    // 2. If profile exists but onboarding was not completed
    if (profile.onboarding_completed === false) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    // 3. User is fully onboarded -> Redirect to their specific dashboard
    const role = profile.role;
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
