import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to complete onboarding.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, role, phone, parentPhone, classId, boardId, subjects, preferredLanguage } = body;

    if (!role || !['student', 'teacher', 'parent'].includes(role)) {
      return NextResponse.json(
        { error: 'Please select a valid account type (Student, Teacher, or Parent).' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please provide your full name.' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    const nowIso = new Date().toISOString();

    // Security check: Check existing profile to prevent unauthorized role switching
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id, role, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile && existingProfile.onboarding_completed && existingProfile.role) {
      // User is already fully onboarded; preserve existing role
      const redirectUrl =
        existingProfile.role === 'admin'
          ? '/admin'
          : existingProfile.role === 'teacher'
          ? '/teacher'
          : existingProfile.role === 'parent'
          ? '/parent'
          : '/student';

      return NextResponse.json({
        success: true,
        role: existingProfile.role,
        redirectUrl,
        message: 'Onboarding already completed.',
      });
    }

    // 1. Update Profile with completed status and selected role
    const photoUrl =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null;

    await serviceClient.from('profiles').upsert(
      {
        id: user.id,
        name: name.trim(),
        email: user.email,
        role,
        phone: phone || null,
        parent_phone: parentPhone || null,
        class_id: classId || null,
        board_id: boardId || null,
        preferred_language: preferredLanguage || null,
        status: 'active',
        onboarding_completed: true,
        auth_provider: user.app_metadata?.provider || 'email',
        photo_url: photoUrl,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );

    // 2. Role-specific table updates & cross-table cleanup
    if (role === 'student') {
      try {
        await Promise.all([
          serviceClient.from('teachers').delete().eq('id', user.id),
          serviceClient.from('parents').delete().eq('id', user.id),
        ]);
      } catch {
        // Non-blocking
      }

      await serviceClient.from('students').upsert(
        {
          id: user.id,
          name: name.trim(),
          email: user.email,
          phone: phone || null,
          parent_phone: parentPhone || null,
          class_id: classId || null,
          board_id: boardId || null,
          preferred_language: preferredLanguage || null,
          photo_url: photoUrl,
          status: 'active',
          updated_at: nowIso,
          created_at: nowIso,
        },
        { onConflict: 'id' }
      );
    } else if (role === 'teacher') {
      try {
        await Promise.all([
          serviceClient.from('students').delete().eq('id', user.id),
          serviceClient.from('parents').delete().eq('id', user.id),
        ]);
      } catch {
        // Non-blocking
      }

      await serviceClient.from('teachers').upsert(
        {
          id: user.id,
          name: name.trim(),
          email: user.email,
          phone: phone || null,
          photo_url: photoUrl,
          status: 'active',
          updated_at: nowIso,
          created_at: nowIso,
        },
        { onConflict: 'id' }
      );
    } else if (role === 'parent') {
      try {
        await Promise.all([
          serviceClient.from('students').delete().eq('id', user.id),
          serviceClient.from('teachers').delete().eq('id', user.id),
        ]);
      } catch {
        // Non-blocking
      }

      await serviceClient.from('parents').upsert(
        {
          id: user.id,
          name: name.trim(),
          email: user.email,
          phone: phone || null,
          photo_url: photoUrl,
          status: 'active',
          updated_at: nowIso,
          created_at: nowIso,
        },
        { onConflict: 'id' }
      );
    }

    // 3. Update Supabase Auth user metadata so session reflects the role
    try {
      await serviceClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          name: name.trim(),
          role,
        },
      });
    } catch {
      // Non-blocking
    }

    const redirectUrl =
      role === 'teacher'
        ? '/teacher'
        : role === 'parent'
        ? '/parent'
        : '/student';

    return NextResponse.json({
      success: true,
      role,
      redirectUrl,
      message: 'Onboarding completed successfully!',
    });
  } catch (error) {
    console.error('[Complete Onboarding Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while completing onboarding.' },
      { status: 500 }
    );
  }
}
