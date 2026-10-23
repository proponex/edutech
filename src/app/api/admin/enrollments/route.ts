import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { AdminService } from '@/lib/admin-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const result = await AdminService.getEnrollments({ courseId, status, page, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/admin/enrollments] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}
