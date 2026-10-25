import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/parent-auth';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/live/student/sessions/[id] — get a single session for viewing (no stream key)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStudent();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const supabase = await createClient();

    // RLS enforces subscription check — we explicitly never select mux_stream_key
    const { data: session, error } = await supabase
      .from('live_sessions')
      .select(`
        id, channel_id, teacher_id, title, description, subject_name,
        status, scheduled_start_at, started_at, ended_at,
        mux_playback_id,
        mux_recording_playback_id, recording_status,
        viewer_count, chat_enabled, created_at, updated_at,
        channels(id, name, photo_url),
        profiles!live_sessions_teacher_id_fkey(id, name, photo_url)
      `)
      .eq('id', id)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Live session not found or you are not authorized to view it.' },
        { status: 404 }
      );
    }

    // Record viewer presence (for viewer count)
    try {
      const serviceClient = createServiceClient();
      await serviceClient
        .from('live_session_viewers')
        .upsert(
          { session_id: id, student_id: auth.user.id, last_seen: new Date().toISOString() },
          { onConflict: 'session_id,student_id', ignoreDuplicates: false }
        );

      // Update viewer count from active viewers (last_seen within 90s)
      const cutoff = new Date(Date.now() - 90_000).toISOString();
      const { count } = await serviceClient
        .from('live_session_viewers')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', id)
        .gte('last_seen', cutoff);

      if (count !== null) {
        await serviceClient
          .from('live_sessions')
          .update({ viewer_count: count, updated_at: new Date().toISOString() })
          .eq('id', id);
      }
    } catch {
      // Non-fatal — viewer tracking failure doesn't block playback
    }

    return NextResponse.json({ session });
  } catch (err: unknown) {
    console.error('[Student Live Session GET/:id] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
