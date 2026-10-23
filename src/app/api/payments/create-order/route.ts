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
    const {
      item_type,
      item_id,
      package_type,
      class_id,
      subject_name,
      scope,
      duration,
      unit_id,
    } = body;

    if (!item_type || !item_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: item_type and item_id are mandatory.' },
        { status: 400 }
      );
    }

    if (item_type !== 'course' && item_type !== 'exam' && item_type !== 'chapter') {
      return NextResponse.json(
        { error: 'Invalid item_type. Must be "course", "exam", or "chapter".' },
        { status: 400 }
      );
    }

    const orderResult = await PaymentService.createPaymentOrder({
      studentId: auth.user.id,
      itemType: item_type as any,
      itemId: item_id,
      packageType: package_type,
      classId: class_id,
      subjectName: subject_name,
      scope: scope || (item_type === 'chapter' ? 'chapter' : 'channel'),
      duration: duration || '1_month',
      unitId: unit_id || null,
    });

    return NextResponse.json({
      success: true,
      ...orderResult,
    });
  } catch (err: any) {
    console.error('[API create-order Error]:', err);
    const message = err?.message || 'Failed to create payment order.';
    const status = message.includes('already enrolled') ? 409 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
