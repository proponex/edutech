import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Invalidate session in Supabase Auth
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Logout API] Supabase signOut warning:', err);
    }

    // 2. Prepare response with anti-caching headers
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully.' },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
          'Clear-Site-Data': '"cache", "cookies", "storage"',
        },
      }
    );

    // 3. Explicitly expire every auth cookie on the server
    const allCookies = req.cookies.getAll();
    allCookies.forEach((cookie) => {
      const name = cookie.name;
      // Match Supabase auth tokens, chunks, and sessions
      if (
        name.startsWith('sb-') ||
        name.includes('auth-token') ||
        name.includes('supabase') ||
        name.includes('session')
      ) {
        response.cookies.set({
          name,
          value: '',
          path: '/',
          maxAge: 0,
          expires: new Date(0),
          sameSite: 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });
      }
    });

    return response;
  } catch (err: any) {
    console.error('[Logout API Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to logout.' },
      { status: 500 }
    );
  }
}

