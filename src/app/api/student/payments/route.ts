import { NextResponse } from 'next/server';
import { requireStudent } from '@/lib/student-auth';
import { PaymentService } from '@/lib/payment-service';
import { StudentService } from '@/lib/student-service';

export async function GET() {
  const auth = await requireStudent();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const [history, activeSubs] = await Promise.all([
      PaymentService.getStudentPaymentHistory(auth.user.id),
      StudentService.getStudentActiveSubscriptions(auth.user.id),
    ]);

    return NextResponse.json({
      success: true,
      payments: history,
      subscriptions: activeSubs || [],
    });
  } catch (err: any) {
    console.error('[API student payments Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve payment history.' },
      { status: 500 }
    );
  }
}
