import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { verifyOtp, createPasswordResetToken } from '@/lib/otp-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, purpose } = body;

    if (!email || !otp || !purpose) {
      return NextResponse.json(
        { error: 'Email, verification code, and purpose are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verify OTP
    const verification = await verifyOtp({
      email: normalizedEmail,
      otp: otp.trim(),
      purpose,
    });

    if (!verification.valid) {
      return NextResponse.json(
        {
          error: verification.error || 'Invalid verification code.',
          remainingAttempts: verification.remainingAttempts,
        },
        { status: 400 }
      );
    }

    const payload = verification.payload || {};
    const serviceClient = createServiceClient();

    // 2. PURPOSE: PASSWORD RESET
    if (purpose === 'password_reset') {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('id, email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
      }

      const resetToken = createPasswordResetToken(profile.id, normalizedEmail);

      return NextResponse.json({
        success: true,
        resetToken,
        message: 'Verification code confirmed. You may now set a new password.',
      });
    }

    // 3. PURPOSE: SIGNUP (CREATE AUTHENTICATED USER & REDIRECT TO ONBOARDING)
    if (purpose === 'signup') {
      const password = (payload.password as string) || '';
      const name = (payload.name as string) || normalizedEmail.split('@')[0];

      if (!password) {
        return NextResponse.json(
          { error: 'Registration session expired. Please start registration again.' },
          { status: 400 }
        );
      }

      // Check if user already exists in auth.users
      let userId: string;
      const { data: authData, error: createAuthError } = await serviceClient.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name,
        },
      });

      if (createAuthError) {
        // If user already exists in auth, try retrieving existing user
        if (createAuthError.message.toLowerCase().includes('already')) {
          return NextResponse.json(
            { error: 'An account with this email already exists. Please sign in.' },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: createAuthError.message || 'Failed to create user account.' },
          { status: 400 }
        );
      }

      userId = authData.user.id;
      const nowIso = new Date().toISOString();

      // Upsert initial profile marked as onboarding_completed: false
      // Remove any premature student record created by database triggers
      try {
        await serviceClient.from('students').delete().eq('id', userId);
      } catch {
        // Non-blocking
      }

      await serviceClient.from('profiles').upsert(
        {
          id: userId,
          name,
          email: normalizedEmail,
          role: 'student', // placeholder to satisfy DB NOT NULL constraint; onboarding_completed: false enforces role selection
          onboarding_completed: false,
          auth_provider: 'email',
          status: 'active',
          updated_at: nowIso,
          created_at: nowIso,
        },
        { onConflict: 'id' }
      );

      // Sign the user in so session cookies are established
      const userClient = await createClient();
      await userClient.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      return NextResponse.json({
        success: true,
        redirectUrl: '/onboarding',
        message: 'Account verified! Redirecting to complete your profile…',
      });
    }

    return NextResponse.json({ success: true, message: 'Verification successful.' });
  } catch (error) {
    console.error('[API Verify OTP Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during verification.' },
      { status: 500 }
    );
  }
}
