import { NextRequest, NextResponse } from 'next/server';
import { StudentIdService } from '@/lib/student-id-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const studentIdCode = await StudentIdService.getOrAssignStudentId(userId);
    return NextResponse.json({ success: true, student_id_code: studentIdCode });
  } catch (err: any) {
    console.error('[POST /api/student/register-id Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to assign Student ID.' },
      { status: 500 }
    );
  }
}
