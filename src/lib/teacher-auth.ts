import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface TeacherAuthSuccess {
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

export interface TeacherAuthFailure {
  authorized: false;
  response: NextResponse;
}

export type TeacherAuthResult = TeacherAuthSuccess | TeacherAuthFailure;

/**
 * Validates that the incoming request has a valid Supabase user session
 * and that the user possesses the 'teacher' role.
 */
export async function requireTeacher(): Promise<TeacherAuthResult> {
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
          { error: 'Unauthorized: Please sign in to your teacher account.' },
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
          { error: 'Teacher profile not found.' },
          { status: 403 }
        ),
      };
    }

    if (profile.role !== 'teacher') {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Forbidden: Access restricted to teacher accounts.' },
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
        name: profile.name || 'Teacher',
        email: profile.email || user.email || '',
        role: profile.role || 'teacher',
      },
    };
  } catch (err: unknown) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Authentication verification failed: ' + ((err as Error)?.message || 'Server error') },
        { status: 500 }
      ),
    };
  }
}
