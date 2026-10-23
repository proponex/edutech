import { NextResponse } from 'next/server';
import { requireStudent } from '@/lib/parent-auth';
import { ParentService } from '@/lib/parent-service';

export async function GET() {
  const auth = await requireStudent();
  if (!auth.authorized) return auth.response;

  try {
    const [requests, linkedParents] = await Promise.all([
      ParentService.getStudentIncomingRequests(auth.user.id),
      ParentService.getStudentLinkedParents(auth.user.id),
    ]);

    return NextResponse.json({
      success: true,
      requests,
      linked_parents: linkedParents,
    });
  } catch (err: any) {
    console.error('[GET /api/student/parent-requests Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve connection requests.' },
      { status: 500 }
    );
  }
}
