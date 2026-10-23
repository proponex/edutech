import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface UserAuthSuccess {
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

export interface UserAuthFailure {
  authorized: false;
  response: NextResponse;
}

export type UserAuthResult = UserAuthSuccess | UserAuthFailure;

/**
 * Validates that the incoming request has a valid Supabase user session
 * and that the user possesses the 'parent' role.
 */
export async function requireParent(): Promise<UserAuthResult> {
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
          { error: 'Unauthorized: Please sign in to the parent portal.' },
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
          { error: 'Parent profile not found.' },
          { status: 403 }
        ),
      };
    }

    if (profile.role !== 'parent') {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Forbidden: Access restricted to parent accounts.' },
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
  } catch (err: any) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Authentication verification failed: ' + (err?.message || 'Server error') },
        { status: 500 }
      ),
    };
  }
}

/**
 * Validates that the incoming request has a valid Supabase user session
 * and that the user possesses the 'student' role.
 */
export async function requireStudent(): Promise<UserAuthResult> {
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
          { error: 'Unauthorized: Please sign in to your student account.' },
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
          { error: 'Student profile not found.' },
          { status: 403 }
        ),
      };
    }

    if (profile.role !== 'student') {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Forbidden: Access restricted to student accounts.' },
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
  } catch (err: any) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Authentication verification failed: ' + (err?.message || 'Server error') },
        { status: 500 }
      ),
    };
  }
}
