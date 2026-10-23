import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/student-auth';
import { PaymentService } from '@/lib/payment-service';

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.' },
        { status: 400 }
      );
    }

    const verificationResult = await PaymentService.verifyPayment({
      studentId: auth.user.id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    return NextResponse.json(verificationResult);
  } catch (err: any) {
    console.error('[API payment verify Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Payment verification failed.' },
      { status: 400 }
    );
  }
}
