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
    const {
      teacher_id,
      account_holder_name,
      bank_name,
      account_number,
      ifsc_code,
      upi_id,
      account_type,
    } = body;

    if (!teacher_id) {
      return NextResponse.json(
        { error: 'Teacher ID is required.' },
        { status: 400 }
      );
    }

    const result = await AdminFinanceService.saveTeacherPayoutSettings({
      teacher_id,
      account_holder_name,
      bank_name,
      account_number,
      ifsc_code,
      upi_id,
      account_type,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('[API admin/income/payout-settings Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to save payout settings.' },
      { status: 500 }
    );
  }
}

