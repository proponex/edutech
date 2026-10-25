import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/parent-auth';
import { createClient } from '@/lib/supabase/server';

// GET /api/live/student/sessions — list live/upcoming sessions for subscribed channels
// SECURITY: mux_stream_key is NEVER selected — students never see stream keys
export async function GET() {
  const auth = await requireStudent();
  if (!auth.authorized) return auth.response;

  try {
    const supabase = await createClient();

    // Fetch sessions for channels this student is actively subscribed to
    // Note: RLS enforces subscription-based access; explicit join is belt-and-suspenders
    const { data: sessions, error } = await supabase
      .from('live_sessions')
      .select(`
        id, channel_id, teacher_id, title, description, subject_name,
        status, scheduled_start_at, started_at, ended_at,
        mux_playback_id,
        mux_recording_playback_id, recording_status,
        viewer_count, chat_enabled, created_at,
        channels!inner(id, name, photo_url, teacher_id),
        profiles!live_sessions_teacher_id_fkey(id, name, photo_url)
      `)
      .in('status', ['scheduled', 'starting', 'live', 'idle'])
      .order('started_at', { ascending: false, nullsFirst: false })
      .order('scheduled_start_at', { ascending: true, nullsFirst: true })
      .limit(30);

    if (error) {
      console.error('[Student Live Sessions GET] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch live sessions.' }, { status: 500 });
    }

    // Additionally fetch recently ended sessions with recordings
    const { data: endedSessions } = await supabase
      .from('live_sessions')
      .select(`
        id, channel_id, teacher_id, title, description, subject_name,
        status, scheduled_start_at, started_at, ended_at,
        mux_playback_id,
        mux_recording_playback_id, recording_status,
        viewer_count, chat_enabled, created_at,
        channels!inner(id, name, photo_url, teacher_id),
        profiles!live_sessions_teacher_id_fkey(id, name, photo_url)
      `)
      .eq('status', 'ended')
      .order('ended_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      sessions: sessions || [],
      ended_sessions: endedSessions || [],
    });
  } catch (err: unknown) {
    console.error('[Student Live Sessions GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
