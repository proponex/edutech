import { NextRequest, NextResponse } from 'next/server';
import { requireParent } from '@/lib/parent-auth';
import { ParentService } from '@/lib/parent-service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireParent();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Student ID is required.' }, { status: 400 });
    }

    const analytics = await ParentService.getChildLearningAnalytics(auth.user.id, id);
    return NextResponse.json({ success: true, analytics });
  } catch (err: any) {
    console.error('[GET /api/parent/children/[id]/analytics Error]:', err);
    const message = err?.message || 'Failed to retrieve child learning analytics.';
    const status = message.includes('Access denied')
      ? 403
      : message.includes('not found')
      ? 404
      : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
