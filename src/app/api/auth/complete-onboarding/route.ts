import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to complete onboarding.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, role, phone, parentPhone, classId, boardId, subjects, preferredLanguage } = body;

    if (!role || !['student', 'teacher', 'parent'].includes(role)) {
      return NextResponse.json({ error: 'Please select a valid account type (Student, Teacher, or Parent).' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Please provide your full name.' }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const nowIso = new Date().toISOString();

    // 1. Update Profile
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
        subjects: Array.isArray(subjects) ? subjects : null,
        onboarding_completed: true,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );

    // 2. Role-specific table updates
    if (role === 'student') {
      const year = new Date().getFullYear();
      const randPart = Math.floor(100000 + Math.random() * 900000);
      const studentIdCode = `ED-${year}-${randPart}`;

      await serviceClient.from('students').upsert(
        {
          id: user.id,
          name: name.trim(),
          email: user.email,
          student_id_code: studentIdCode,
          phone: phone || null,
          parent_phone: parentPhone || null,
          class_id: classId || null,
          board_id: boardId || null,
          preferred_language: preferredLanguage || null,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );

      try {
        await serviceClient.from('profiles').update({ student_id_code: studentIdCode }).eq('id', user.id);
      } catch {
        // ignore
      }
    } else if (role === 'teacher') {
      await serviceClient.from('teachers').upsert(
        {
          id: user.id,
          name: name.trim(),
          email: user.email,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    } else if (role === 'parent') {
      await serviceClient.from('parents').upsert(
        {
          id: user.id,
          name: name.trim(),
          email: user.email,
          phone: phone || null,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    }

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
      redirectUrl,
      message: 'Onboarding completed successfully!',
    });
  } catch (error) {
    console.error('[Complete Onboarding Error]:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while completing onboarding.' }, { status: 500 });
  }
}
