import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/student-auth';
import { StudentService } from '@/lib/student-service';

export async function GET(req: NextRequest) {
  const auth = await requireStudent();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId query parameter is required.' },
        { status: 400 }
      );
    }

    const status = await StudentService.getSubscriptionStatus(auth.user.id, channelId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    console.error('[API subscription-status Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch subscription status.' },
      { status: 500 }
    );
  }
}

