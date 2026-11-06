import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { AdminFinanceService } from '@/lib/admin-finance-service';
import { PaymentAnalyticsFilters } from '@/types';
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
    const dateRange = (url.searchParams.get('dateRange') || 'all') as PaymentAnalyticsFilters['dateRange'];
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;
    const teacherId = url.searchParams.get('teacherId') || undefined;
    const studentId = url.searchParams.get('studentId') || undefined;
    const channelId = url.searchParams.get('channelId') || undefined;
    const paymentStatus = (url.searchParams.get('paymentStatus') || 'all') as PaymentAnalyticsFilters['paymentStatus'];
    const payoutStatus = (url.searchParams.get('payoutStatus') || 'all') as PaymentAnalyticsFilters['payoutStatus'];
    const paymentMethod = (url.searchParams.get('paymentMethod') || 'all') as PaymentAnalyticsFilters['paymentMethod'];

    const supabase = getAdminClient();

    const [report, { data: teachers }, { data: channels }] = await Promise.all([
      AdminFinanceService.getPaymentAnalytics({
        dateRange,
        startDate,
        endDate,
        teacherId: teacherId === 'all' ? undefined : teacherId,
        studentId: studentId === 'all' ? undefined : studentId,
        channelId: channelId === 'all' ? undefined : channelId,
        paymentStatus,
        payoutStatus,
        paymentMethod,
      }),
      supabase.from('profiles').select('id, name').eq('role', 'teacher'),
      supabase.from('channels').select('id, name, teacher_id'),
    ]);

    return NextResponse.json({
      success: true,
      report,
      filterOptions: {
        teachers: teachers || [],
        channels: channels || [],
      },
    });
  } catch (err: any) {
    console.error('[API admin/analytics Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to aggregate payment analytics report.' },
      { status: 500 }
    );
  }
}
