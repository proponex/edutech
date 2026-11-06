import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { AdminFinanceService } from '@/lib/admin-finance-service';

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const data = await AdminFinanceService.getIncomeDashboardData({
      search,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('[API admin/income Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch income dashboard data.' },
      { status: 500 }
    );
  }
}

