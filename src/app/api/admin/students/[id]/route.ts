import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { AdminService } from '@/lib/admin-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const student = await AdminService.getStudentDetail(id);

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error: any) {
    console.error('[API /api/admin/students/[id]] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch student details' },
      { status: 500 }
    );
  }
}
