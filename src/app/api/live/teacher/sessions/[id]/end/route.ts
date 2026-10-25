import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/teacher-auth';
import { createServiceClient } from '@/lib/supabase/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

// POST /api/live/teacher/sessions/[id]/end
// Ends a live session: disables the Mux stream, updates status, disables chat
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
      .select('id, teacher_id, status, mux_live_stream_id')
      .eq('id', id)
      .eq('teacher_id', auth.user.id)
      .single();

    if (fetchErr || !session) {
      return NextResponse.json({ error: 'Live session not found.' }, { status: 404 });
    }

    if (session.status === 'ended') {
      return NextResponse.json({ session: { id, status: 'ended' } });
    }

    // Disable the Mux live stream (prevents further broadcasting)
    if (session.mux_live_stream_id) {
      try {
        await mux.video.liveStreams.disable(session.mux_live_stream_id);
        console.log(`[end-session] Disabled Mux stream: ${session.mux_live_stream_id}`);
      } catch (muxErr) {
        console.warn('[end-session] Mux disable error (non-fatal):', muxErr);
        // Continue — we still mark session as ended in DB
      }
    }

    // Update session to ended + disable chat
    const { data: updatedSession, error: updateErr } = await serviceClient
      .from('live_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        chat_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('teacher_id', auth.user.id)
      .select('id, status, ended_at, chat_enabled')
      .single();

    if (updateErr) {
      console.error('[end-session] DB update failed:', updateErr);
      return NextResponse.json({ error: 'Failed to update session status.' }, { status: 500 });
    }

    console.log(`[end-session] Session ${id} ended at ${updatedSession?.ended_at}`);

    return NextResponse.json({ session: updatedSession });
  } catch (err: unknown) {
    console.error('[end-session] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
