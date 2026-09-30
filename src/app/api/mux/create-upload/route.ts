import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Supabase authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Verify user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Only teachers can upload videos.' },
        { status: 403 }
      );
    }

    // 3. Get the video_id from request body (used as passthrough for webhook)
    const body = await request.json();
    const { video_id } = body;

    if (!video_id) {
      return NextResponse.json(
        { error: 'Missing video_id parameter.' },
        { status: 400 }
      );
    }

    // 4. Create Mux Direct Upload with passthrough metadata
    const upload = await mux.video.uploads.create({
      cors_origin: '*',
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: video_id,
      },
    });

    // 5. Return only the safe upload URL & upload ID to the browser
    return NextResponse.json({
      upload_url: upload.url,
      upload_id: upload.id,
    });
  } catch (err) {
    console.error('[MUX] Error creating direct upload:', err);
    return NextResponse.json(
      { error: 'Failed to create upload session.' },
      { status: 500 }
    );
  }
}
