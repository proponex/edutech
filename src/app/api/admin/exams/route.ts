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

    const result = await AdminService.getExams({ search, status, page, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/admin/exams] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { examId, is_published } = body;

    if (!examId || typeof is_published !== 'boolean') {
      return NextResponse.json(
        { error: 'Valid examId and is_published (boolean) required' },
        { status: 400 }
      );
    }

    const success = await AdminService.updateExamPublication(
      examId,
      is_published,
      auth.user.id
    );

    if (!success) {
      return NextResponse.json({ error: 'Failed to update exam status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, examId, is_published });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
