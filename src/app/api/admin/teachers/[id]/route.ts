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
    const teacher = await AdminService.getTeacherDetail(id);

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error: any) {
    console.error('[API /api/admin/teachers/[id]] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch teacher details' },
      { status: 500 }
    );
  }
}
