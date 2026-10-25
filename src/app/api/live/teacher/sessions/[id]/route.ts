import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/teacher-auth';
import { createServiceClient } from '@/lib/supabase/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

// GET /api/live/teacher/sessions/[id] — get single session (teacher view, includes stream key)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTeacher();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const serviceClient = createServiceClient();

    const { data: session, error } = await serviceClient
      .from('live_sessions')
      .select(`
        *,
        channels(id, name, photo_url)
      `)
      .eq('id', id)
      .eq('teacher_id', auth.user.id)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (err: unknown) {
    console.error('[Live Session GET/:id] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH /api/live/teacher/sessions/[id] — update session metadata or status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTeacher();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Only allow safe fields to be patched
    const allowed = ['title', 'description', 'subject_name', 'unit_id', 'scheduled_start_at', 'chat_enabled'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Verify ownership first
    const { data: existing } = await serviceClient
      .from('live_sessions')
      .select('id, teacher_id, status')
      .eq('id', id)
      .single();

    if (!existing || existing.teacher_id !== auth.user.id) {
      return NextResponse.json({ error: 'Session not found or access denied.' }, { status: 404 });
    }

    const { data: session, error } = await serviceClient
      .from('live_sessions')
      .update(updates)
      .eq('id', id)
      .eq('teacher_id', auth.user.id)
      .select('id, title, description, subject_name, status, chat_enabled, scheduled_start_at')
      .single();

    if (error) {
      console.error('[Live Session PATCH] DB error:', error);
      return NextResponse.json({ error: 'Failed to update session.' }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (err: unknown) {
    console.error('[Live Session PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE /api/live/teacher/sessions/[id] — delete a session (only if scheduled/ended)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTeacher();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const serviceClient = createServiceClient();

    const { data: existing } = await serviceClient
      .from('live_sessions')
      .select('id, teacher_id, status, mux_live_stream_id')
      .eq('id', id)
      .single();

    if (!existing || existing.teacher_id !== auth.user.id) {
      return NextResponse.json({ error: 'Session not found or access denied.' }, { status: 404 });
    }

    if (existing.status === 'live' || existing.status === 'starting') {
      return NextResponse.json(
        { error: 'Cannot delete an active live session. End the session first.' },
        { status: 409 }
      );
    }

    // If Mux stream exists, clean it up
    if (existing.mux_live_stream_id) {
      try {
        await mux.video.liveStreams.delete(existing.mux_live_stream_id);
      } catch (muxErr) {
        console.warn('[Live Session DELETE] Mux stream cleanup error (non-fatal):', muxErr);
      }
    }

    const { error: deleteErr } = await serviceClient
      .from('live_sessions')
      .delete()
      .eq('id', id)
      .eq('teacher_id', auth.user.id);

    if (deleteErr) {
      console.error('[Live Session DELETE] DB error:', deleteErr);
      return NextResponse.json({ error: 'Failed to delete session.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Live Session DELETE] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
