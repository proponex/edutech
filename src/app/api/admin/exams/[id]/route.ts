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
    const exam = await AdminService.getExamDetail(id);

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    return NextResponse.json(exam);
  } catch (error: any) {
    console.error('[API /api/admin/exams/[id]] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch exam details' },
      { status: 500 }
    );
  }
}
