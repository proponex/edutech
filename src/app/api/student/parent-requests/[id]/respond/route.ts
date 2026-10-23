import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/parent-auth';
import { ParentService } from '@/lib/parent-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStudent();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (!action || (action !== 'accept' && action !== 'reject')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "reject".' },
        { status: 400 }
      );
    }

    const result = await ParentService.respondToConnectionRequest(
      auth.user.id,
      id,
      action
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[POST /api/student/parent-requests/[id]/respond Error]:', err);
    const message = err?.message || 'Failed to respond to connection request.';
    const status = message.includes('Unauthorized')
      ? 403
      : message.includes('not found')
      ? 404
      : message.includes('already been')
      ? 409
      : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
