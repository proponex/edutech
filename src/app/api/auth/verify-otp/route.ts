import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { verifyOtp, createPasswordResetToken } from '@/lib/otp-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, purpose } = body;

    if (!email || !otp || !purpose) {
      return NextResponse.json({ error: 'Email, verification code, and purpose are required.' }, { status: 400 });
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

    // 3. PURPOSE: SIGNUP (CREATE AUTHENTICATED USER & PROFILE)
    if (purpose === 'signup') {
      const password = (payload.password as string) || '';
      const name = (payload.name as string) || 'Student';
      const role = (payload.role as string) || 'student';

      if (!password) {
        return NextResponse.json({ error: 'Registration session expired. Please start registration again.' }, { status: 400 });
      }

      // 3a. Create user with Admin client (auto-confirm email since OTP verified via SMTP)
      const { data: authData, error: createAuthError } = await serviceClient.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
        },
      });

      if (createAuthError || !authData.user) {
        const msg = createAuthError?.message || 'Failed to create user account.';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      const userId = authData.user.id;
      const nowIso = new Date().toISOString();

      // 3b. Insert Profile
      const studentPhone = payload.phone || null;
      const studentParentPhone = payload.parentPhone || payload.parent_phone || null;
      const studentClassId = payload.classId || payload.class_id || null;
      const studentBoardId = payload.boardId || payload.board_id || null;
      const studentLanguage = payload.preferredLanguage || payload.preferred_language || null;
      const studentSubjects = payload.subjects || null;

      await serviceClient.from('profiles').upsert(
        {
          id: userId,
          name,
          email: normalizedEmail,
          role,
          phone: studentPhone,
          parent_phone: studentParentPhone,
          class_id: studentClassId,
          board_id: studentBoardId,
          preferred_language: studentLanguage,
          subjects: studentSubjects,
          status: 'active',
          onboarding_completed: true,
          auth_provider: 'email',
          updated_at: nowIso,
          created_at: nowIso,
        },
        { onConflict: 'id' }
      );

      // 3c. Insert into role-specific table
      if (role === 'student') {
        // Generate permanent student ID code (ED-YYYY-NNNNNN)
        const year = new Date().getFullYear();
        const randPart = Math.floor(100000 + Math.random() * 900000);
        const studentIdCode = `ED-${year}-${randPart}`;

        await serviceClient.from('students').upsert(
          {
            id: userId,
            name,
            email: normalizedEmail,
            student_id_code: studentIdCode,
            phone: studentPhone,
            parent_phone: studentParentPhone,
            class_id: studentClassId,
            board_id: studentBoardId,
            preferred_language: studentLanguage,
            updated_at: nowIso,
          },
          { onConflict: 'id' }
        );

        // Update profile with student_id_code
        try {
          await serviceClient.from('profiles').update({ student_id_code: studentIdCode }).eq('id', userId);
        } catch {
          // ignore
        }
      } else if (role === 'teacher') {
        await serviceClient.from('teachers').upsert(
          {
            id: userId,
            name,
            email: normalizedEmail,
            updated_at: nowIso,
          },
          { onConflict: 'id' }
        );
      } else if (role === 'parent') {
        await serviceClient.from('parents').upsert(
          {
            id: userId,
            name,
            email: normalizedEmail,
            phone: payload.phone || null,
            updated_at: nowIso,
          },
          { onConflict: 'id' }
        );
      }

      // 3d. Automatically sign the user in so session cookies are established
      const userClient = await createClient();
      await userClient.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      const redirectUrl =
        role === 'admin'
          ? '/admin'
          : role === 'teacher'
          ? '/teacher'
          : role === 'parent'
          ? '/parent'
          : '/student';

      return NextResponse.json({
        success: true,
        role,
        redirectUrl,
        message: 'Account successfully registered and verified!',
      });
    }

    return NextResponse.json({ success: true, message: 'Verification successful.' });
  } catch (error) {
    console.error('[API Verify OTP Error]:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during verification.' }, { status: 500 });
  }
}
