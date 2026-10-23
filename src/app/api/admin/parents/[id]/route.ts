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
    const parent = await AdminService.getParentDetail(id);

    if (!parent) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    return NextResponse.json(parent);
  } catch (error: any) {
    console.error('[API /api/admin/parents/[id]] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch parent details' },
      { status: 500 }
    );
  }
}
