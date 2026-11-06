import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { AdminFinanceService } from '@/lib/admin-finance-service';

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { teacherId, amountPaise, utrReference, paymentMethod, notes } = body;

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required.' },
        { status: 400 }
      );
    }

    if (!utrReference || !utrReference.trim()) {
      return NextResponse.json(
        { error: 'Payment reference or UTR number is required to confirm external transfer.' },
        { status: 400 }
      );
    }

    const result = await AdminFinanceService.recordTeacherPayout({
      teacherId,
      amountPaise: amountPaise ? Number(amountPaise) : undefined,
      utrReference: utrReference.trim(),
      paymentMethod: paymentMethod || 'bank_transfer',
      adminId: auth.user.id,
      notes: notes || undefined,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('[API admin/income/payout Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to record payout.' },
      { status: 500 }
    );
  }
}

