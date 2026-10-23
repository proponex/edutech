import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { AdminService } from '@/lib/admin-service';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const plans = await AdminService.getPricingPlans();
    return NextResponse.json({ plans });
  } catch (error: any) {
    console.error('[API /api/admin/pricing GET] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch pricing plans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { item_type, item_id, title, amount_paise, currency, is_free, is_active, effective_from, reason } = body;

    if (!item_type || !item_id || !title || typeof is_free !== 'boolean') {
      return NextResponse.json(
        { error: 'item_type, item_id, title, and is_free are required fields' },
        { status: 400 }
      );
    }

    const plan = await AdminService.upsertPricingPlan(
      {
        item_type,
        item_id,
        title,
        amount_paise: is_free ? 0 : Math.round(Number(amount_paise) || 0),
        currency: currency || 'INR',
        is_free,
        is_active: is_active ?? true,
        effective_from,
        reason,
      },
      auth.user.id
    );

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error('[API /api/admin/pricing POST] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save pricing plan' },
      { status: 500 }
    );
  }
}
