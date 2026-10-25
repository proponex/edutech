import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/parent-auth';
import { createClient } from '@/lib/supabase/server';

// GET /api/live/chat/[sessionId] — load recent chat messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireStudent();
  if (!auth.authorized) return auth.response;

  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Fetch recent messages — RLS ensures only subscribed students can read
    const { data: messages, error } = await supabase
      .from('live_chat_messages')
      .select(`
        id, session_id, sender_id, sender_role, message, is_deleted, created_at,
        profiles!live_chat_messages_sender_id_fkey(id, name, photo_url)
      `)
      .eq('session_id', sessionId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.error('[Chat GET] DB error:', error);
      return NextResponse.json({ error: 'Failed to load messages.' }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (err: unknown) {
    console.error('[Chat GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST /api/live/chat/[sessionId] — send a chat message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireStudent();
  if (!auth.authorized) return auth.response;

  try {
    const { sessionId } = await params;
    const body = await request.json().catch(() => ({}));
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    const trimmed = message.trim();
    if (trimmed.length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 characters).' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify session is still live and chat is enabled (RLS also enforces this)
    const { data: session } = await supabase
      .from('live_sessions')
      .select('id, status, chat_enabled')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found or access denied.' }, { status: 404 });
    }

    if (!session.chat_enabled) {
      return NextResponse.json({ error: 'Chat has been disabled for this session.' }, { status: 403 });
    }

    if (session.status !== 'live' && session.status !== 'idle') {
      return NextResponse.json(
        { error: 'Chat is only available during an active live session.' },
        { status: 403 }
      );
    }

    // Determine sender role — check if they are teacher of this channel
    const { data: sessionFull } = await supabase
      .from('live_sessions')
      .select('teacher_id')
      .eq('id', sessionId)
      .single();

    const senderRole = sessionFull?.teacher_id === auth.user.id ? 'teacher' : 'student';

    // Insert the message — RLS double-checks the session status & subscription
    const { data: newMessage, error: insertErr } = await supabase
      .from('live_chat_messages')
      .insert({
        session_id: sessionId,
        sender_id: auth.user.id,
        sender_role: senderRole,
        message: trimmed,
      })
      .select(`
        id, session_id, sender_id, sender_role, message, is_deleted, created_at,
        profiles!live_chat_messages_sender_id_fkey(id, name, photo_url)
      `)
      .single();

    if (insertErr) {
      console.error('[Chat POST] Insert error:', insertErr);
      // Distinguish RLS denials from other errors
      if (insertErr.code === '42501') {
        return NextResponse.json(
          { error: 'You are not authorized to send messages in this session.' },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
    }

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (err: unknown) {
    console.error('[Chat POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
