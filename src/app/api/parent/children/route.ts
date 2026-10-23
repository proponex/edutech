import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/parent-auth';
import { ParentService } from '@/lib/parent-service';

export async function GET() {
  const auth = await requireParent();
  if (!auth.authorized) return auth.response;

  try {
    const children = await ParentService.getLinkedChildren(auth.user.id);
    return NextResponse.json({ success: true, children });
  } catch (err: any) {
    console.error('[GET /api/parent/children Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve linked children.' },
      { status: 500 }
    );
  }
}
