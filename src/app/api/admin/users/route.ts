import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { AdminFinanceService } from '@/lib/admin-finance-service';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const url = new URL(req.url);
    const role = (url.searchParams.get('role') || 'student') as 'student' | 'teacher' | 'parent';
    const search = url.searchParams.get('search') || undefined;
    const statusFilter = url.searchParams.get('status') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    const data = await AdminFinanceService.getUsersDashboardData({
      role,
      search,
      statusFilter,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    console.error('[API admin/users Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch users dashboard data.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json(
        { error: 'User ID and status are required' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      message: `User status updated to ${status}.`,
    });
  } catch (err: any) {
    console.error('[API admin/users PATCH Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update user status.' },
      { status: 500 }
    );
  }
}
