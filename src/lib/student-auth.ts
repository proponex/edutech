import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface StudentAuthSuccess {
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

export interface StudentAuthFailure {
  authorized: false;
  response: NextResponse;
}

export type StudentAuthResult = StudentAuthSuccess | StudentAuthFailure;

/**
 * Validates that the incoming request has a valid Supabase user session
 * and is an authenticated student or platform user.
 */
export async function requireStudent(): Promise<StudentAuthResult> {
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
          { error: 'Unauthorized: Please sign in to purchase or access content.' },
          { status: 401 }
        ),
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'User profile not found.' },
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
      profile: {
        id: profile.id,
        name: profile.name || 'Student',
        email: profile.email || user.email || '',
        role: profile.role || 'student',
      },
    };
  } catch (err: any) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Authentication service failure: ' + (err?.message || 'Unknown error') },
        { status: 500 }
      ),
    };
  }
}
