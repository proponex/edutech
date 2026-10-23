import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MonetizationService } from '@/lib/monetization-service';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await context.params;
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required.' }, { status: 400 });
    }

    // Check optional authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const accessResult = await MonetizationService.checkVideoPlaybackAccess(
      user ? user.id : null,
      videoId
    );

    if (accessResult.reason === 'not_found') {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    if (accessResult.locked || !accessResult.access) {
      // 403 Forbidden: Return pricing and lock details WITHOUT video playback credentials
      return NextResponse.json(
        {
          success: false,
          ...accessResult,
        },
        { status: 403 }
      );
    }

    // 200 OK: Return authorized playback credentials
    return NextResponse.json({
      success: true,
      ...accessResult,
    });
  } catch (err: any) {
    console.error('[API Video Playback Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to verify playback access.' },
      { status: 500 }
    );
  }
}
