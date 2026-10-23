import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment-service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.warn('[Razorpay Webhook] Missing x-razorpay-signature header.');
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header.' },
        { status: 400 }
      );
    }

    const result = await PaymentService.processWebhook({
      rawBody,
      signature,
    });

    return NextResponse.json({
      status: 'ok',
      ...result,
    });
  } catch (err: any) {
    console.error('[Razorpay Webhook Processing Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Webhook processing failed.' },
      { status: 400 }
    );
  }
}
