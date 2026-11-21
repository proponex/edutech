import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createAndSendOtp } from '@/lib/otp-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, role, password, phone, parentPhone, classId, boardId, subjects, preferredLanguage } = body;
    const purpose = body.purpose || body.type;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email format.' }, { status: 400 });
    }

    if (!purpose || !['signup', 'password_reset', 'email_verification'].includes(purpose)) {
      return NextResponse.json({ error: 'Invalid verification purpose.' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. SIGNUP VALIDATION & DUPLICATE CHECK
    if (purpose === 'signup') {
      if (!password || password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
      }

      // Check if an account with this email already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingProfile) {
        return NextResponse.json(
          {
            error: 'An account with this email address already exists. Please sign in or use Google.',
            accountExists: true,
          },
          { status: 409 }
        );
      }
    }

    // 2. PASSWORD RESET VALIDATION
    if (purpose === 'password_reset') {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!existingProfile) {
        // Return generic message to prevent email enumeration, but with a slight delay
        return NextResponse.json({
          success: true,
          resendAvailableIn: 60,
          message: 'If an account exists with this email, a verification code has been sent.',
        });
      }
    }

    // 3. GENERATE AND DISPATCH OTP
    const otpResult = await createAndSendOtp({
      email: normalizedEmail,
      purpose,
      payload: {
        name: name || undefined,
        role: role || 'student',
        password: password || undefined,
        phone: phone || undefined,
        parentPhone: parentPhone || undefined,
        classId: classId || undefined,
        boardId: boardId || undefined,
        subjects: Array.isArray(subjects) ? subjects : undefined,
        preferredLanguage: preferredLanguage || undefined,
      },
    });

    if (!otpResult.success) {
      return NextResponse.json(
        { error: otpResult.error || 'Failed to send verification code.', resendAvailableIn: otpResult.resendAvailableIn },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      resendAvailableIn: otpResult.resendAvailableIn,
      message: otpResult.message,
      simulated: otpResult.simulated,
    });
  } catch (error) {
    console.error('[API Send OTP Error]:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while processing your request.' }, { status: 500 });
  }
}
