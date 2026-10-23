import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { PaymentService } from '@/lib/payment-service';
import { MonetizationService } from '@/lib/monetization-service';

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || undefined;
    const scope = url.searchParams.get('scope') || undefined;
    const status = url.searchParams.get('status') || undefined;

    const [monetizationData, legacyAnalytics] = await Promise.all([
      MonetizationService.getSuperAdminPaymentAnalytics({ search, scope, status }),
      PaymentService.getAdminPaymentAnalytics().catch(() => null),
    ]);

    return NextResponse.json({
      success: true,
      analytics: {
        totalCapturedRevenuePaise: monetizationData.overview.totalCapturedRevenuePaise,
        platformCommissionPaise: monetizationData.overview.platformCommissionPaise,
        teacherEarningsPaise: monetizationData.overview.teacherAllocationsPaise,
        refundsTotalPaise: monetizationData.overview.refundsTotalPaise,
        netPlatformRevenuePaise: monetizationData.overview.netPlatformRevenuePaise,
        successfulPaymentsCount: monetizationData.overview.successfulTransactionsCount,
        failedPaymentsCount: monetizationData.overview.failedTransactionsCount,
        pendingOrdersCount: monetizationData.overview.pendingOrdersCount,
        activeEntitlementsCount: monetizationData.overview.activeEntitlementsCount,
        dailyRevenue: legacyAnalytics?.dailyRevenue || [],
        recentTransactions: legacyAnalytics?.recentTransactions || [],
        transactionsLedger: monetizationData.transactions,
      },
    });
  } catch (err: any) {
    console.error('[API admin payment analytics Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to aggregate payment analytics.' },
      { status: 500 }
    );
  }
}
