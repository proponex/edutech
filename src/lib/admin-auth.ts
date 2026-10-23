import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AdminAuthSuccess {
  authorized: true;
  user: {
    id: string;
    email?: string;
  };
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface AdminAuthFailure {
  authorized: false;
  response: NextResponse;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

/**
 * Validates that the incoming request has a valid Supabase user session
 * AND has administrative role in the profiles table.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Unauthorized: Valid administrative session required' },
          { status: 401 }
        ),
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Forbidden: Administrator privileges required' },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    };
  } catch (err: unknown) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Internal Auth Check Failure: ' + (err instanceof Error ? err.message : 'Unknown') },
        { status: 500 }
      ),
    };
  }
}
