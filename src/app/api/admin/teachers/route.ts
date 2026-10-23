import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { AdminService } from '@/lib/admin-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const result = await AdminService.getTeachers({ search, status, page, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/admin/teachers] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch teachers' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { teacherId, status } = body;

    if (!teacherId || !['active', 'suspended'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid teacherId and status (active|suspended) required' },
        { status: 400 }
      );
    }

    const success = await AdminService.updateTeacherStatus(
      teacherId,
      status as 'active' | 'suspended',
      auth.user.id
    );

    if (!success) {
      return NextResponse.json({ error: 'Failed to update teacher status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, teacherId, status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
