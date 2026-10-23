import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PaymentService } from '@/lib/payment-service';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Sign in required.' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Forbidden: Teacher access required.' },
        { status: 403 }
      );
    }

    const summary = await PaymentService.getTeacherEarningsSummary(user.id);
    return NextResponse.json({
      success: true,
      earnings: summary,
    });
  } catch (err: any) {
    console.error('[API teacher earnings Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve earnings summary.' },
      { status: 500 }
    );
  }
}
