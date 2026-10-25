import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/teacher-auth';
import { createServiceClient } from '@/lib/supabase/server';

// POST /api/live/teacher/chat/[messageId]/delete
// Soft-deletes (moderates) a chat message — teacher only
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await requireTeacher();
  if (!auth.authorized) return auth.response;

  try {
    const { messageId } = await params;
    const serviceClient = createServiceClient();

    // Fetch message to verify it belongs to this teacher's session
    const { data: message, error: fetchErr } = await serviceClient
      .from('live_chat_messages')
      .select(`
        id, session_id, is_deleted,
        live_sessions!inner(teacher_id)
      `)
      .eq('id', messageId)
      .single();

    if (fetchErr || !message) {
      return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    }

    const liveSession = (message.live_sessions as unknown) as { teacher_id: string } | null;
    if (!liveSession || liveSession.teacher_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only moderate messages in your own sessions.' },
        { status: 403 }
      );
    }

    if (message.is_deleted) {
      return NextResponse.json({ success: true, message: 'Already deleted.' });
    }

    const { error: updateErr } = await serviceClient
      .from('live_chat_messages')
      .update({ is_deleted: true })
      .eq('id', messageId);

    if (updateErr) {
      console.error('[chat/delete] DB error:', updateErr);
      return NextResponse.json({ error: 'Failed to delete message.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[chat/delete] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
