import { NextResponse } from 'next/server';
import { requireStudent } from '@/lib/parent-auth';
import { StudentIdService } from '@/lib/student-id-service';

export async function GET() {
  const auth = await requireStudent();
  if (!auth.authorized) return auth.response;

  try {
    const studentIdCode = await StudentIdService.getOrAssignStudentId(auth.user.id);
    return NextResponse.json({
      success: true,
      student_id_code: studentIdCode,
    });
  } catch (err: any) {
    console.error('[GET /api/student/my-id Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve Student ID.' },
      { status: 500 }
    );
  }
}
