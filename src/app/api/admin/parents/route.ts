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

    const result = await AdminService.getParents({ search, status, page, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/admin/parents] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch parents' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { parentId, status } = body;

    if (!parentId || !['active', 'suspended'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid parentId and status (active|suspended) required' },
        { status: 400 }
      );
    }

    const success = await AdminService.updateParentStatus(
      parentId,
      status as 'active' | 'suspended',
      auth.user.id
    );

    if (!success) {
      return NextResponse.json({ error: 'Failed to update parent status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, parentId, status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
