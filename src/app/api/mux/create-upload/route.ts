import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
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

    // 3. Get the video_id from request body
    const body = await request.json().catch(() => ({}));
    const { video_id } = body;

    if (!video_id) {
      return NextResponse.json(
        { error: 'Missing video_id parameter.' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // 4. Verify the video exists and belongs to a channel owned by this teacher
    const { data: video, error: videoError } = await serviceClient
      .from('videos')
      .select('id, channel_id, mux_status, mux_upload_id')
      .eq('id', video_id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video record not found.' },
        { status: 404 }
      );
    }

    const { data: channel, error: channelError } = await serviceClient
      .from('channels')
      .select('teacher_id')
      .eq('id', video.channel_id)
      .single();

    if (channelError || !channel || channel.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden. You do not own the channel for this video.' },
        { status: 403 }
      );
    }

    // 5. Create Mux Direct Upload with passthrough metadata linking back to our DB video_id
    const upload = await mux.video.uploads.create({
      cors_origin: '*',
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: video_id,
      },
    });

    if (!upload?.url || !upload?.id) {
      throw new Error('Mux did not return an upload URL.');
    }

    // 6. Atomically update the video record with mux_upload_id and 'waiting' status
    const { error: updateError } = await serviceClient
      .from('videos')
      .update({
        mux_upload_id: upload.id,
        mux_status: 'waiting',
        updated_at: new Date().toISOString(),
      })
      .eq('id', video_id);

    if (updateError) {
      console.error('[MUX] Failed to link mux_upload_id to video record:', updateError);
      return NextResponse.json(
        { error: 'Failed to update video record with upload session.' },
        { status: 500 }
      );
    }

    // 7. Return only the safe upload URL & upload ID to the browser
    return NextResponse.json({
      upload_url: upload.url,
      upload_id: upload.id,
      video_id: video_id,
    });
  } catch (err: unknown) {
    console.error('[MUX] Error creating direct upload:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to create upload session.' },
      { status: 500 }
    );
  }
}
