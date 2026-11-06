import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WithdrawalService } from '@/lib/withdrawal-service';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required.' }, { status: 403 });
    }

    const summary = await WithdrawalService.getTeacherWithdrawalSummary(user.id);
    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (err: any) {
    console.error('[API teacher/withdrawals GET Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve withdrawal summary.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { amountPaise, paymentMethod, upiId, gpayNumber, qrImageUrl, notes } = body;

    const request = await WithdrawalService.createWithdrawalRequest({
      teacherId: user.id,
      amountPaise: Number(amountPaise || 0),
      paymentMethod: paymentMethod || 'upi',
      upiId,
      gpayNumber,
      qrImageUrl,
      notes,
    });

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted successfully.',
      request,
    });
  } catch (err: any) {
    console.error('[API teacher/withdrawals POST Error]:', err);
    const message = err?.message || 'Failed to submit withdrawal request.';
    const status = message.includes('exceeds') || message.includes('Minimum') || message.includes('destination') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

