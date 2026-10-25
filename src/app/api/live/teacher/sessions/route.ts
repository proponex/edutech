import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/teacher-auth';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

// GET /api/live/teacher/sessions — list teacher's live sessions
export async function GET() {
  const auth = await requireTeacher();
  if (!auth.authorized) return auth.response;

  try {
    const supabase = await createClient();

    const { data: sessions, error } = await supabase
      .from('live_sessions')
      .select(`
        id, teacher_id, channel_id, title, description, subject_name,
        status, scheduled_start_at, started_at, ended_at,
        mux_live_stream_id, mux_stream_key, mux_playback_id, mux_stream_key_id,
        mux_recording_asset_id, mux_recording_playback_id, recording_status,
        viewer_count, chat_enabled, created_at, updated_at,
        channels(id, name, photo_url)
      `)
      .eq('teacher_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[Live Sessions GET] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions.' }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (err: unknown) {
    console.error('[Live Sessions GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST /api/live/teacher/sessions — create a new live session
export async function POST(request: NextRequest) {
  const auth = await requireTeacher();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const { channel_id, title, description, subject_name, unit_id, scheduled_start_at } = body;

    if (!channel_id || !title?.trim()) {
      return NextResponse.json(
        { error: 'channel_id and title are required.' },
        { status: 400 }
      );
    }

    if (title.trim().length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or fewer.' },
        { status: 400 }
      );
    }

    // Verify teacher owns the channel
    const serviceClient = createServiceClient();
    const { data: channel, error: channelErr } = await serviceClient
      .from('channels')
      .select('id, teacher_id, name')
      .eq('id', channel_id)
      .single();

    if (channelErr || !channel) {
      return NextResponse.json({ error: 'Channel not found.' }, { status: 404 });
    }

    if (channel.teacher_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this channel.' },
        { status: 403 }
      );
    }

    // Create the live session row (Mux stream created when teacher actually starts)
    const { data: session, error: insertErr } = await serviceClient
      .from('live_sessions')
      .insert({
        teacher_id: auth.user.id,
        channel_id,
        title: title.trim(),
        description: description?.trim() || null,
        subject_name: subject_name?.trim() || null,
        unit_id: unit_id || null,
        status: 'scheduled',
        scheduled_start_at: scheduled_start_at || null,
        chat_enabled: true,
      })
      .select('id, title, status, channel_id, scheduled_start_at, created_at')
      .single();

    if (insertErr || !session) {
      console.error('[Live Sessions POST] Insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to create live session.' }, { status: 500 });
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (err: unknown) {
    console.error('[Live Sessions POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
