import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { AdminService } from '@/lib/admin-service';
import { DateFilterOption } from '@/types';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const filter = (searchParams.get('filter') as DateFilterOption) || 'all';

    const stats = await AdminService.getOverviewStats(filter);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('[API /api/admin/overview] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch overview metrics' },
      { status: 500 }
    );
  }
}
