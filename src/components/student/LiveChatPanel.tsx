'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { LiveChatMessage, LiveSession } from '@/types';

interface LiveChatPanelProps {
  session: LiveSession;
  currentUserId: string;
  currentUserName: string;
}

export function LiveChatPanel({ session, currentUserId, currentUserName }: LiveChatPanelProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatEnabled =
    session.chat_enabled &&
    (session.status === 'live' || session.status === 'idle');

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Load initial messages
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/chat/${session.id}`);
      if (res.ok) {
        const d = await res.json();
        setMessages(d.messages || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [session.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Scroll to bottom after initial load
  useEffect(() => {
    if (!loading) scrollToBottom('instant');
  }, [loading, scrollToBottom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`student_chat_${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `session_id=eq.${session.id}`,
        },
        async (payload) => {
          const msg = payload.new as LiveChatMessage;
          if (msg.is_deleted) return;

          // Fetch sender profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, photo_url')
            .eq('id', msg.sender_id)
            .single();

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, { ...msg, sender: profile || undefined }];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const updated = payload.new as LiveChatMessage;
          if (updated.is_deleted) {
            setMessages((prev) => prev.filter((m) => m.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session.id, supabase]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || sending || !chatEnabled) return;

    setSending(true);
    setSendError('');

    // Optimistic update
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: LiveChatMessage = {
      id: optimisticId,
      session_id: session.id,
      sender_id: currentUserId,
      sender_role: 'student',
      message: text,
      is_deleted: false,
      created_at: new Date().toISOString(),
      sender: { id: currentUserId, name: currentUserName, photo_url: null },
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText('');

    try {
      const res = await fetch(`/api/live/chat/${session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Rollback optimistic update
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setMessageText(text);
        setSendError(data.error || 'Failed to send message.');
        return;
      }

      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...data.message } : m))
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setMessageText(text);
      setSendError('Network error. Please try again.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  if (session.status === 'ended' || session.status === 'errored') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Live Chat</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_id === currentUserId} formatTime={formatTime} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/30">
          Session has ended. Chat is now read-only.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Live Chat</span>
          <span className="text-xs text-neutral-400 font-normal">({messages.length})</span>
        </div>
        {!chatEnabled && (
          <span className="text-xs text-neutral-400 font-medium">Disabled</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <MessageSquare className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-xs text-neutral-400">
              {chatEnabled ? 'Be the first to say something!' : 'Chat is waiting for the session to go live.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.sender_id === currentUserId}
              formatTime={formatTime}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {sendError && (
        <div className="mx-3 mb-1 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {sendError}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
        <Input
          ref={inputRef}
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            setSendError('');
          }}
          placeholder={chatEnabled ? 'Type a message…' : 'Chat will open when session starts'}
          disabled={!chatEnabled || sending}
          maxLength={500}
          className="h-9 text-sm rounded-xl flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!chatEnabled || sending || !messageText.trim()}
          className="h-9 w-9 p-0 rounded-xl shrink-0"
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({
  msg,
  isOwn,
  formatTime,
}: {
  msg: LiveChatMessage;
  isOwn: boolean;
  formatTime: (s: string) => string;
}) {
  const isTeacher = msg.sender_role === 'teacher';
  const senderName = (msg.sender as { name?: string })?.name || (isTeacher ? 'Teacher' : 'Student');
  const initials = senderName.charAt(0).toUpperCase();

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
          isTeacher
            ? 'bg-primary-500 text-white ring-2 ring-primary-300 dark:ring-primary-700'
            : isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
        }`}
      >
        {initials}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <span
            className={`text-[10px] font-semibold mb-0.5 ${
              isTeacher ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {senderName}
            {isTeacher && <span className="ml-1 px-1 py-0 rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 text-[9px]">Teacher</span>}
          </span>
        )}
        <div
          className={`rounded-2xl px-3 py-1.5 text-sm leading-relaxed break-words ${
            isOwn
              ? 'bg-blue-500 text-white rounded-tr-none'
              : isTeacher
              ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-900 dark:text-primary-100 border border-primary-200 dark:border-primary-800 rounded-tl-none'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-none'
          }`}
        >
          {msg.message}
        </div>
        <span className="text-[10px] text-neutral-400 mt-0.5 px-1">{formatTime(msg.created_at)}</span>
      </div>
    </div>
  );
}
