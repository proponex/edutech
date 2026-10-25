'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import MuxPlayer from '@mux/mux-player-react';
import { Header } from '@/components/layout/header';
import { LiveChatPanel } from '@/components/student/LiveChatPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Users,
  Clock,
  Radio,
  WifiOff,
  CheckCircle2,
  MessageSquare,
  ChevronDown,
  PlayCircle,
} from 'lucide-react';
import { LiveSession } from '@/types';

function LiveBadge({ status }: { status: string }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        LIVE
      </span>
    );
  }
  if (status === 'idle') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-orange-400 text-white text-xs font-bold px-2.5 py-1 rounded-full">
        <WifiOff className="w-3 h-3" />
        Reconnecting…
      </span>
    );
  }
  if (status === 'starting') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-amber-400 text-white text-xs font-bold px-2.5 py-1 rounded-full">
        <Loader2 className="w-3 h-3 animate-spin" />
        Starting…
      </span>
    );
  }
  if (status === 'scheduled') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
        <Clock className="w-3 h-3" />
        Scheduled
      </span>
    );
  }
  if (status === 'ended') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-neutral-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Ended
      </span>
    );
  }
  return null;
}

export default function LiveWatchPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const supabase = createClient();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [chatOpen, setChatOpen] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setIsClient(true); }, []);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setCurrentUserId(user.id);
      supabase.from('profiles').select('name').eq('id', user.id).single()
        .then(({ data }) => setCurrentUserName(data?.name || 'Student'));
    });
  }, [router, supabase]);

  // Load session
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/student/sessions/${sessionId}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Session not found.');
        return;
      }
      const d = await res.json();
      setSession(d.session);
    } catch {
      setError('Failed to load live session.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Real-time session status subscription
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`student_session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession((prev) => prev ? { ...prev, ...payload.new } : prev);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, sessionId, supabase]);

  // Heartbeat — update viewer presence every 30s
  useEffect(() => {
    if (!sessionId || !currentUserId) return;
    if (session?.status !== 'live' && session?.status !== 'idle') return;

    const ping = () => fetch(`/api/live/student/sessions/${sessionId}`, { method: 'GET' });
    heartbeatRef.current = setInterval(ping, 30_000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [sessionId, currentUserId, session?.status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto" />
            <p className="text-sm text-neutral-500">Loading live session…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Session Unavailable</h2>
            <p className="text-sm text-neutral-500">{error || 'This live session could not be found.'}</p>
            <Button onClick={() => router.push('/student')} className="rounded-xl">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isLiveOrIdle = session.status === 'live' || session.status === 'idle';
  const teacher = session.teacher as { name?: string; photo_url?: string | null } | undefined;
  const channel = session.channel as { name?: string; photo_url?: string | null } | undefined;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />

      <main className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <Link
            href="/student"
            className="text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-neutral-300 dark:text-neutral-700">/</span>
          <span className="text-neutral-700 dark:text-neutral-300 font-medium truncate">{session.title}</span>
        </div>

        {/* Layout: player + chat side-by-side on desktop */}
        <div className="flex flex-col lg:flex-row gap-4 min-h-[600px]">
          {/* Left: Player + Info */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Video Player */}
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-neutral-950 relative">
              {/* LIVE state — show Mux player */}
              {isLiveOrIdle && session.mux_playback_id && isClient ? (
                <MuxPlayer
                  playbackId={session.mux_playback_id}
                  streamType="live"
                  metadata={{ video_title: session.title }}
                  style={{ width: '100%', height: '100%' }}
                  accentColor="#00e88a"
                  autoPlay
                />
              ) : session.status === 'ended' && session.mux_recording_playback_id && isClient ? (
                /* Ended + recording ready — show recording */
                <MuxPlayer
                  playbackId={session.mux_recording_playback_id}
                  streamType="on-demand"
                  metadata={{ video_title: `${session.title} (Recording)` }}
                  style={{ width: '100%', height: '100%' }}
                  accentColor="#00e88a"
                />
              ) : (
                /* Overlay state screen */
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  {session.status === 'scheduled' && (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-blue-400" />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-2">Session Starts Soon</h3>
                      {session.scheduled_start_at && (
                        <p className="text-neutral-400 text-sm">
                          Scheduled: {new Date(session.scheduled_start_at).toLocaleString()}
                        </p>
                      )}
                      <p className="text-neutral-500 text-xs mt-2">Stay on this page — the stream will begin automatically.</p>
                    </>
                  )}
                  {session.status === 'starting' && (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-2">Teacher Is Connecting…</h3>
                      <p className="text-neutral-400 text-sm">The live stream will start shortly. Please wait.</p>
                    </>
                  )}
                  {session.status === 'idle' && (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mb-4">
                        <WifiOff className="w-8 h-8 text-orange-400" />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-2">Brief Interruption</h3>
                      <p className="text-neutral-400 text-sm">The stream is reconnecting. Please wait…</p>
                    </>
                  )}
                  {session.status === 'ended' && !session.mux_recording_playback_id && (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-neutral-400" />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-2">Session Has Ended</h3>
                      {session.recording_status === 'processing' ? (
                        <div className="flex items-center gap-2 text-neutral-400 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Recording is being processed…
                        </div>
                      ) : (
                        <p className="text-neutral-500 text-sm">Thank you for attending. Check back for the recording.</p>
                      )}
                    </>
                  )}
                  {session.status === 'errored' && (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-2">Stream Error</h3>
                      <p className="text-neutral-400 text-sm">There was an issue with the live stream. Please contact your teacher.</p>
                    </>
                  )}
                </div>
              )}

              {/* Live overlay badge */}
              {session.status === 'live' && (
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                  <span className="inline-flex items-center gap-1 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                    <Users className="w-3 h-3" />
                    {session.viewer_count}
                  </span>
                </div>
              )}

              {/* Recording badge */}
              {session.status === 'ended' && session.mux_recording_playback_id && (
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                    <PlayCircle className="w-3 h-3" />
                    Recording
                  </span>
                </div>
              )}
            </div>

            {/* Session Info */}
            <Card className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <LiveBadge status={session.status} />
                      {session.subject_name && (
                        <Badge className="text-xs rounded-full">{session.subject_name}</Badge>
                      )}
                    </div>
                    <h1 className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                      {session.title}
                    </h1>
                    {session.description && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">{session.description}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-neutral-500 shrink-0">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{session.viewer_count} watching</span>
                    </div>
                    {session.started_at && (
                      <div className="flex items-center gap-1">
                        <Radio className="w-3.5 h-3.5 text-red-500" />
                        <span>Since {new Date(session.started_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Teacher & Channel Info */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  {teacher?.photo_url ? (
                    <img
                      src={teacher.photo_url}
                      alt={teacher.name || 'Teacher'}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-500/20"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-400">
                      {teacher?.name?.charAt(0) || 'T'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      {teacher?.name || 'Teacher'}
                    </p>
                    <p className="text-xs text-neutral-500">{channel?.name || 'Channel'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile: Chat Toggle */}
            <div className="lg:hidden">
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              >
                <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Live Chat
                </span>
                <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${chatOpen ? 'rotate-180' : ''}`} />
              </button>

              {chatOpen && (
                <div className="mt-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 h-80 flex flex-col overflow-hidden">
                  {currentUserId && (
                    <LiveChatPanel
                      session={session}
                      currentUserId={currentUserId}
                      currentUserName={currentUserName}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Chat Panel (Desktop) */}
          <div className="hidden lg:flex w-80 xl:w-96 flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
            {currentUserId && (
              <LiveChatPanel
                session={session}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
