import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { WithdrawalService } from '@/lib/withdrawal-service';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const requests = await WithdrawalService.getAllWithdrawalRequests();
    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (err: any) {
    console.error('[API admin/withdrawals GET Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch withdrawal requests.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { requestId, action, utrReference, adminNotes, rejectionReason } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'requestId and action are required.' },
        { status: 400 }
      );
    }

    if (action !== 'processing' && action !== 'completed' && action !== 'rejected') {
      return NextResponse.json(
        { error: 'action must be "processing", "completed", or "rejected".' },
        { status: 400 }
      );
    }

    const result = await WithdrawalService.processWithdrawalRequest({
      requestId,
      action,
      adminId: auth.user.id,
      utrReference,
      adminNotes,
      rejectionReason,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API admin/withdrawals PATCH Error]:', err);
    const message = err?.message || 'Failed to process withdrawal request.';
    const status = message.includes('required') || message.includes('already been completed') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
