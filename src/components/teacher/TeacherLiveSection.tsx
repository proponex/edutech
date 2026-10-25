'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Radio,
  Plus,
  Loader2,
  Users,
  MessageSquare,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  Video,
  X,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Monitor,
} from 'lucide-react';
import { LiveSession, LiveSessionTeacherView, LiveChatMessage, ChannelItem } from '@/types';

interface TeacherLiveSectionProps {
  teacherId: string;
  channels: ChannelItem[];
}

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300', dot: 'bg-blue-500' },
  starting: { label: 'Starting…', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', dot: 'bg-amber-500 animate-pulse' },
  live: { label: 'LIVE', color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300', dot: 'bg-red-500 animate-pulse' },
  idle: { label: 'Reconnecting…', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300', dot: 'bg-orange-500 animate-pulse' },
  ended: { label: 'Ended', color: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400', dot: 'bg-neutral-400' },
  errored: { label: 'Error', color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400', dot: 'bg-red-500' },
};

function LiveStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.scheduled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : `Copy ${label}`}
    </button>
  );
}

// ============ CHAT PANEL ============
function TeacherChatPanel({ session, teacherName }: { session: LiveSessionTeacherView; teacherName: string }) {
  const supabase = createClient();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatEnabled = session.chat_enabled && (session.status === 'live' || session.status === 'idle');

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/live/chat/${session.id}`);
    if (res.ok) {
      const d = await res.json();
      setMessages(d.messages || []);
    }
    setLoadingMsgs(false);
  }, [session.id]);

  useEffect(() => {
    loadMessages();
    // Real-time subscription
    const channel = supabase
      .channel(`live_chat_${session.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `session_id=eq.${session.id}` },
        (payload) => {
          const msg = payload.new as LiveChatMessage;
          if (!msg.is_deleted) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_chat_messages', filter: `session_id=eq.${session.id}` },
        (payload) => {
          const updated = payload.new as LiveChatMessage;
          setMessages((prev) => prev.filter((m) => m.id !== updated.id || !updated.is_deleted));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.id, loadMessages, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/live/chat/${session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText.trim() }),
      });
      if (res.ok) setMessageText('');
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    await fetch(`/api/live/teacher/chat/${messageId}/delete`, { method: 'POST' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Live Chat
          <span className="text-neutral-400 font-normal">({messages.length})</span>
        </span>
        {!chatEnabled && (
          <span className="text-[10px] text-neutral-400 font-medium">Chat disabled</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {loadingMsgs ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6 text-xs text-neutral-400">
            No messages yet. Students will appear here once the session is live.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`group flex gap-2 ${msg.sender_role === 'teacher' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  msg.sender_role === 'teacher'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                }`}
              >
                {(msg.sender as { name?: string })?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className={`max-w-[75%] ${msg.sender_role === 'teacher' ? 'items-end' : 'items-start'} flex flex-col`}>
                <span className={`text-[10px] font-semibold mb-0.5 ${msg.sender_role === 'teacher' ? 'text-right text-primary-600 dark:text-primary-400' : 'text-neutral-500'}`}>
                  {msg.sender_role === 'teacher' ? 'You' : (msg.sender as { name?: string })?.name || 'Student'}
                </span>
                <div className={`relative rounded-xl px-2.5 py-1.5 text-xs leading-relaxed ${
                  msg.sender_role === 'teacher'
                    ? 'bg-primary-500 text-white rounded-tr-none'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-none'
                }`}>
                  {msg.message}
                  {msg.sender_role !== 'teacher' && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex"
                      title="Remove message"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send message */}
      <form onSubmit={handleSend} className="border-t border-neutral-200 dark:border-neutral-800 p-2 flex gap-2">
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder={chatEnabled ? 'Say something to students…' : 'Chat disabled'}
          disabled={!chatEnabled || sending}
          maxLength={500}
          className="h-8 text-xs rounded-xl"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }}}
        />
        <Button type="submit" size="sm" disabled={!chatEnabled || sending || !messageText.trim()} className="h-8 w-8 p-0 rounded-xl">
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </form>
    </div>
  );
}

// ============ CREATE SESSION FORM ============
function CreateSessionForm({
  channels,
  onCreated,
  onCancel,
}: {
  channels: ChannelItem[];
  onCreated: (session: LiveSession) => void;
  onCancel: () => void;
}) {
  const [channelId, setChannelId] = useState(channels[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId || !title.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/live/teacher/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId,
          title: title.trim(),
          description: description.trim() || undefined,
          subject_name: subjectName.trim() || undefined,
          scheduled_start_at: scheduleMode === 'later' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create session');
      onCreated(data.session);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Create Live Session</h3>
        <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleCreate} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">Channel *</label>
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="w-full text-xs h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-neutral-900 dark:text-white"
            required
          >
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">Session Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 5 — Motion & Laws of Physics"
            maxLength={200}
            required
            className="h-9 text-xs rounded-xl"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will you cover in this session?"
            rows={2}
            maxLength={500}
            className="text-xs rounded-xl resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">Subject</label>
          <Input
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="e.g. Physics"
            className="h-9 text-xs rounded-xl"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">Start Time</label>
          <div className="flex gap-2">
            {(['now', 'later'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setScheduleMode(m)}
                className={`flex-1 text-xs h-8 rounded-xl border font-semibold transition-all ${
                  scheduleMode === m
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-primary-300'
                }`}
              >
                {m === 'now' ? 'Start Immediately' : 'Schedule for Later'}
              </button>
            ))}
          </div>
          {scheduleMode === 'later' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="mt-2 w-full text-xs h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-neutral-900 dark:text-white"
            />
          )}
        </div>
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl text-xs h-9">
            Cancel
          </Button>
          <Button type="submit" disabled={creating} className="flex-1 rounded-xl text-xs h-9">
            {creating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Creating…</> : 'Create Session'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ============ BROADCAST PANEL ============
function BroadcastPanel({ session }: { session: LiveSessionTeacherView }) {
  const [showKey, setShowKey] = useState(false);
  const streamKey = session.mux_stream_key;
  const rtmpUrl = 'rtmps://global-live.mux.com:443/app';

  if (!streamKey) {
    return (
      <div className="p-4 text-center text-xs text-neutral-500">
        Stream key will appear here after you go live.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
        <div className="flex items-start gap-2">
          <Monitor className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p className="font-bold mb-1">How to broadcast</p>
            <p>Open <strong>OBS Studio</strong>, go to Settings → Stream, and set:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-700 dark:text-amber-400">
              <li>Service: <strong>Custom</strong></li>
              <li>Server: the RTMP URL below</li>
              <li>Stream Key: the key below</li>
            </ul>
            <p className="mt-1">Then click <strong>Start Streaming</strong> in OBS.</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">RTMP Server URL</span>
            <CopyButton value={rtmpUrl} label="URL" />
          </div>
          <div className="font-mono text-xs bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-700 dark:text-neutral-300 select-all break-all">
            {rtmpUrl}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Stream Key</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
              <CopyButton value={streamKey} label="Key" />
            </div>
          </div>
          <div className="font-mono text-xs bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-700 dark:text-neutral-300 select-all break-all">
            {showKey ? streamKey : '•'.repeat(Math.min(streamKey.length, 40))}
          </div>
          <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">
            ⚠ Keep this key private. Never share it with students.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ ACTIVE SESSION CARD ============
function ActiveSessionCard({
  session: initialSession,
  teacherName,
  onEnded,
  onUpdated,
}: {
  session: LiveSessionTeacherView;
  teacherName: string;
  onEnded: () => void;
  onUpdated: (s: LiveSessionTeacherView) => void;
}) {
  const supabase = createClient();
  const [session, setSession] = useState(initialSession);
  const [goingLive, setGoingLive] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(true);
  const [endConfirm, setEndConfirm] = useState(false);

  // Real-time session status subscription
  useEffect(() => {
    const channel = supabase
      .channel(`live_session_${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `id=eq.${session.id}` },
        (payload) => {
          const updated = payload.new as LiveSessionTeacherView;
          setSession((prev) => ({ ...prev, ...updated }));
          onUpdated({ ...session, ...updated });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.id, onUpdated, supabase]);

  const handleGoLive = async () => {
    setGoingLive(true);
    setError('');
    try {
      const res = await fetch(`/api/live/teacher/sessions/${session.id}/go-live`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to go live');
      setSession((prev) => ({
        ...prev,
        ...data.session,
        mux_stream_key: data.session.mux_stream_key,
      }));
      setShowBroadcast(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to start stream');
    } finally {
      setGoingLive(false);
    }
  };

  const handleEnd = async () => {
    if (!endConfirm) { setEndConfirm(true); return; }
    setEnding(true);
    setError('');
    try {
      const res = await fetch(`/api/live/teacher/sessions/${session.id}/end`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to end session');
      onEnded();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to end session');
      setEnding(false);
      setEndConfirm(false);
    }
  };

  const isActive = session.status === 'live' || session.status === 'idle' || session.status === 'starting';

  return (
    <Card className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        session.status === 'live' ? 'bg-red-500/10 dark:bg-red-950/30 border-b border-red-200/50 dark:border-red-900/50'
        : session.status === 'starting' ? 'bg-amber-500/10 border-b border-amber-200/50 dark:border-amber-900/50'
        : 'bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <LiveStatusBadge status={session.status} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{session.title}</p>
            {session.subject_name && (
              <p className="text-xs text-neutral-500">{session.subject_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <Users className="w-3.5 h-3.5" />
            <span>{session.viewer_count}</span>
          </div>
          {session.started_at && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(session.started_at)}</span>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Left: Controls */}
          <div className="flex-1 p-4 space-y-3 lg:border-r border-neutral-200 dark:border-neutral-800">
            {/* Status info */}
            {session.status === 'scheduled' && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300">
                <p className="font-semibold">Session ready to go live</p>
                <p className="mt-0.5 text-blue-600 dark:text-blue-400">Click <strong>Go Live</strong> to create your Mux stream and get your OBS stream key.</p>
                {session.scheduled_start_at && (
                  <p className="mt-1 text-blue-500">Scheduled: {new Date(session.scheduled_start_at).toLocaleString()}</p>
                )}
              </div>
            )}

            {session.status === 'starting' && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-xs text-amber-700 dark:text-amber-300">
                <p className="font-semibold flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for your broadcast…</p>
                <p className="mt-0.5">Enter your stream key in OBS and start streaming. The session will go LIVE automatically once Mux detects your stream.</p>
              </div>
            )}

            {session.status === 'live' && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-xs text-emerald-700 dark:text-emerald-300">
                <p className="font-semibold flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" /> You are live!</p>
                <p className="mt-0.5">{session.viewer_count} student{session.viewer_count !== 1 ? 's' : ''} watching. Mux has confirmed your stream is active.</p>
              </div>
            )}

            {session.status === 'idle' && (
              <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 text-xs text-orange-700 dark:text-orange-300">
                <p className="font-semibold flex items-center gap-1.5"><WifiOff className="w-3.5 h-3.5" /> Stream disconnected</p>
                <p className="mt-0.5">Your broadcast stopped. Re-connect in OBS to resume — you have 60 seconds before the session auto-ends.</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {session.status === 'scheduled' && (
                <Button onClick={handleGoLive} disabled={goingLive} className="rounded-xl text-sm flex-1 sm:flex-none">
                  {goingLive ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Creating Stream…</> : <><Radio className="w-4 h-4 mr-1.5" />Go Live</>}
                </Button>
              )}

              {(session.status === 'starting' || session.status === 'live' || session.status === 'idle') && (
                <Button
                  variant="outline"
                  onClick={() => setShowBroadcast(!showBroadcast)}
                  className="rounded-xl text-xs"
                >
                  <Monitor className="w-3.5 h-3.5 mr-1.5" />
                  {showBroadcast ? 'Hide' : 'Show'} OBS Setup
                  {showBroadcast ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                </Button>
              )}

              {isActive && (
                <Button
                  onClick={handleEnd}
                  disabled={ending}
                  className={`rounded-xl text-xs ${endConfirm ? 'bg-red-600 hover:bg-red-700 border-red-600' : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-200'}`}
                >
                  {ending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Ending…</>
                  ) : endConfirm ? (
                    <><AlertCircle className="w-3.5 h-3.5 mr-1" />Confirm End Session</>
                  ) : (
                    'End Session'
                  )}
                </Button>
              )}
              {endConfirm && !ending && (
                <Button variant="outline" onClick={() => setEndConfirm(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
              )}
            </div>

            {/* OBS Broadcast Setup */}
            {showBroadcast && (session.status !== 'scheduled') && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <BroadcastPanel session={session} />
              </div>
            )}
          </div>

          {/* Right: Chat */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 border-neutral-200 dark:border-neutral-800">
            <div
              className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between cursor-pointer lg:cursor-default"
              onClick={() => setChatExpanded(!chatExpanded)}
            >
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Live Chat
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 lg:hidden transition-transform ${chatExpanded ? 'rotate-180' : ''}`} />
            </div>
            {chatExpanded && (
              <div className="h-64 lg:h-80 flex flex-col">
                <TeacherChatPanel session={session} teacherName={teacherName} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ MAIN COMPONENT ============
export function TeacherLiveSection({ teacherId, channels }: TeacherLiveSectionProps) {
  const [sessions, setSessions] = useState<LiveSessionTeacherView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/live/teacher/sessions');
      if (res.ok) {
        const d = await res.json();
        setSessions(d.sessions || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleSessionCreated = (session: LiveSession) => {
    setSessions((prev) => [session as LiveSessionTeacherView, ...prev]);
    setShowCreate(false);
  };

  const handleSessionEnded = (sessionId: string) => {
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, status: 'ended' as const } : s));
  };

  const handleSessionUpdated = (updated: LiveSessionTeacherView) => {
    setSessions((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
  };

  const activeSessions = sessions.filter((s) => ['scheduled', 'starting', 'live', 'idle'].includes(s.status));
  const endedSessions = sessions.filter((s) => s.status === 'ended').slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />
            Live Classes
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Broadcast live lessons to your subscribed students
          </p>
        </div>
        {!showCreate && channels.length > 0 && (
          <Button onClick={() => setShowCreate(true)} size="sm" className="rounded-xl text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            New Live Session
          </Button>
        )}
      </div>

      {/* No channels warning */}
      {channels.length === 0 && (
        <Card className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-6 text-center">
            <Video className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No Channels Yet</p>
            <p className="text-xs text-neutral-500 mt-1">Create a channel first before starting a live session.</p>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showCreate && (
        <Card className="rounded-2xl border border-primary-200 dark:border-primary-900/50 shadow-lg">
          <CardContent className="p-0">
            <CreateSessionForm
              channels={channels}
              onCreated={handleSessionCreated}
              onCancel={() => setShowCreate(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      )}

      {/* Active Sessions */}
      {!loading && activeSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Active & Scheduled</h3>
          {activeSessions.map((session) => (
            <ActiveSessionCard
              key={session.id}
              session={session}
              teacherName="Teacher"
              onEnded={() => handleSessionEnded(session.id)}
              onUpdated={handleSessionUpdated}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && activeSessions.length === 0 && !showCreate && channels.length > 0 && (
        <Card className="rounded-2xl border border-neutral-200 dark:border-neutral-800 border-dashed">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 flex items-center justify-center mx-auto mb-3">
              <Radio className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No Active Live Sessions</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Start a live class session to broadcast to your students in real time. They&apos;ll be notified immediately.
            </p>
            <Button onClick={() => setShowCreate(true)} size="sm" className="mt-4 rounded-xl gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Create Your First Live Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Past Sessions */}
      {!loading && endedSessions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Recent Sessions</h3>
          {endedSessions.map((session) => (
            <div
              key={session.id}
              className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 truncate">{session.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <LiveStatusBadge status={session.status} />
                  {session.ended_at && (
                    <span className="text-[10px] text-neutral-400">{new Date(session.ended_at).toLocaleDateString()}</span>
                  )}
                  {session.recording_status === 'ready' && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Recording Ready
                    </span>
                  )}
                  {session.recording_status === 'processing' && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Processing
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
