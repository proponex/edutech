import { NextRequest, NextResponse } from 'next/server';
import { requireParent } from '@/lib/parent-auth';
import { ParentService } from '@/lib/parent-service';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireParent();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    await ParentService.cancelRequest(auth.user.id, id);
    return NextResponse.json({ success: true, message: 'Request cancelled successfully.' });
  } catch (err: any) {
    console.error('[DELETE /api/parent/requests/[id] Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to cancel connection request.' },
      { status: 400 }
    );
  }
}
