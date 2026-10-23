import { NextRequest, NextResponse } from 'next/server';
import { requireParent } from '@/lib/parent-auth';
import { ParentService } from '@/lib/parent-service';

export async function GET() {
  const auth = await requireParent();
  if (!auth.authorized) return auth.response;

  try {
    const requests = await ParentService.getParentRequests(auth.user.id);
    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    console.error('[GET /api/parent/requests Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve connection requests.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireParent();
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const { student_id_code, relationship_type } = body;

    if (!student_id_code || typeof student_id_code !== 'string') {
      return NextResponse.json(
        { error: 'Student ID is required (e.g. ED-2026-000001).' },
        { status: 400 }
      );
    }

    const result = await ParentService.submitConnectionRequest(
      auth.user.id,
      student_id_code,
      relationship_type
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/parent/requests Error]:', err);
    const message = err?.message || 'Failed to submit connection request.';
    const status = message.includes('already connected')
      ? 409
      : message.includes('already awaiting')
      ? 409
      : message.includes('not found')
      ? 404
      : message.includes('Invalid Student ID')
      ? 400
      : message.includes('cannot link')
      ? 400
      : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
