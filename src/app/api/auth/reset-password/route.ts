import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyPasswordResetToken } from '@/lib/otp-service';
import { sendPasswordResetSuccessEmail } from '@/lib/email-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, resetToken, newPassword } = body;

    if (!email || !resetToken || !newPassword) {
      return NextResponse.json({ error: 'Email, reset token, and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verify token
    const tokenResult = await verifyPasswordResetToken(normalizedEmail, resetToken);
    if (!tokenResult.valid || !tokenResult.userId) {
      return NextResponse.json({ error: tokenResult.error || 'Invalid or expired password reset session.' }, { status: 400 });
    }

    // 2. Update password in Supabase Auth
    const serviceClient = createServiceClient();
    const { error: updateError } = await serviceClient.auth.admin.updateUserById(tokenResult.userId, {
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to update password.' }, { status: 400 });
    }

    // 3. Send confirmation email
    sendPasswordResetSuccessEmail({ to: normalizedEmail }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('[API Reset Password Error]:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while resetting your password.' }, { status: 500 });
  }
}
