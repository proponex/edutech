import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/teacher-auth';
import { createServiceClient } from '@/lib/supabase/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

// POST /api/live/teacher/sessions/[id]/go-live
// Creates a Mux LiveStream and transitions the session to 'starting'
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTeacher();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const serviceClient = createServiceClient();

    // Fetch session and verify ownership
    const { data: session, error: fetchErr } = await serviceClient
      .from('live_sessions')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', auth.user.id)
      .single();

    if (fetchErr || !session) {
      return NextResponse.json({ error: 'Live session not found.' }, { status: 404 });
    }

    if (session.status === 'live' || session.status === 'starting') {
      // Already started — just return existing data
      return NextResponse.json({
        session: {
          id: session.id,
          status: session.status,
          mux_stream_key: session.mux_stream_key,
          mux_playback_id: session.mux_playback_id,
          mux_live_stream_id: session.mux_live_stream_id,
        },
      });
    }

    if (session.status === 'ended') {
      return NextResponse.json(
        { error: 'This session has already ended. Create a new session to go live again.' },
        { status: 409 }
      );
    }

    // If a Mux stream already exists (re-use), check its state
    if (session.mux_live_stream_id) {
      try {
        const existingStream = await mux.video.liveStreams.retrieve(session.mux_live_stream_id);
        if (existingStream && existingStream.status !== 'disabled') {
          // Stream still valid — mark as starting and return keys
          await serviceClient
            .from('live_sessions')
            .update({ status: 'starting', updated_at: new Date().toISOString() })
            .eq('id', id);

          return NextResponse.json({
            session: {
              id: session.id,
              status: 'starting',
              mux_stream_key: session.mux_stream_key,
              mux_playback_id: session.mux_playback_id,
              mux_live_stream_id: session.mux_live_stream_id,
            },
          });
        }
      } catch {
        // Mux stream no longer exists — create a fresh one below
        console.warn('[go-live] Existing Mux stream not found, creating new one.');
      }
    }

    // Create a new Mux LiveStream with recording enabled
    let muxStream;
    try {
      muxStream = await mux.video.liveStreams.create({
        playback_policy: ['public'],
        passthrough: id, // top-level passthrough — Mux propagates this to all generated assets
        new_asset_settings: {
          playback_policy: ['public'],
        },
        reconnect_window: 60,
      });
    } catch (muxErr: unknown) {
      console.error('[go-live] Mux stream creation failed:', muxErr);
      await serviceClient
        .from('live_sessions')
        .update({ status: 'errored', updated_at: new Date().toISOString() })
        .eq('id', id);
      return NextResponse.json(
        { error: 'Failed to create live stream. Please try again.' },
        { status: 502 }
      );
    }

    const streamKey = muxStream.stream_key;
    const playbackId = muxStream.playback_ids?.[0]?.id || null;
    const streamId = muxStream.id;
    const streamKeyId = ((muxStream as unknown) as Record<string, unknown>).stream_key_id as string | undefined;

    if (!streamKey || !streamId) {
      console.error('[go-live] Mux returned incomplete stream data:', muxStream);
      return NextResponse.json(
        { error: 'Mux returned incomplete stream configuration.' },
        { status: 502 }
      );
    }

    // Persist the Mux stream data in Supabase (stream key is server-side only)
    const { data: updatedSession, error: updateErr } = await serviceClient
      .from('live_sessions')
      .update({
        status: 'starting',
        mux_live_stream_id: streamId,
        mux_stream_key: streamKey,
        mux_playback_id: playbackId,
        mux_stream_key_id: streamKeyId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('teacher_id', auth.user.id)
      .select('id, status, mux_live_stream_id, mux_playback_id')
      .single();

    if (updateErr || !updatedSession) {
      console.error('[go-live] DB update failed:', updateErr);
      // Try to clean up the Mux stream
      try { await mux.video.liveStreams.delete(streamId); } catch { /* ignore */ }
      return NextResponse.json({ error: 'Failed to save stream configuration.' }, { status: 500 });
    }

    console.log(`[go-live] Session ${id} is now STARTING. Mux stream: ${streamId}`);

    // Return the stream key ONLY to the authenticated teacher
    return NextResponse.json({
      session: {
        id,
        status: 'starting',
        mux_stream_key: streamKey,
        mux_playback_id: playbackId,
        mux_live_stream_id: streamId,
      },
    });
  } catch (err: unknown) {
    console.error('[go-live] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
