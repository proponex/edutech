'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Radio,
  Users,
  Clock,
  ArrowRight,
  Loader2,
  PlayCircle,
  CheckCircle2,
  WifiOff,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { LiveSession } from '@/types';

function LiveBadge({ status }: { status: string }) {
  const cfg = {
    live: { label: 'LIVE', cls: 'bg-red-500 text-white', dot: true },
    starting: { label: 'Starting', cls: 'bg-amber-400 text-white', dot: true },
    idle: { label: 'Reconnecting', cls: 'bg-orange-400 text-white', dot: false },
    scheduled: { label: 'Scheduled', cls: 'bg-blue-500 text-white', dot: false },
    ended: { label: 'Ended', cls: 'bg-neutral-400 text-white', dot: false },
  }[status] || { label: status, cls: 'bg-neutral-400 text-white', dot: false };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.dot && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      {cfg.label}
    </span>
  );
}

function SessionCard({ session }: { session: LiveSession }) {
  const teacher = session.teacher as { name?: string; photo_url?: string | null } | undefined;
  const channel = session.channel as { name?: string } | undefined;
  const isLive = session.status === 'live' || session.status === 'starting' || session.status === 'idle';
  const isEnded = session.status === 'ended';
  const hasRecording = isEnded && session.mux_recording_playback_id;

  return (
    <Card className="rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 transition-all group overflow-hidden">
      <CardContent className="p-0">
        {/* Thumbnail / Status Banner */}
        <div className={`relative w-full h-32 flex items-center justify-center ${
          session.status === 'live'
            ? 'bg-gradient-to-br from-red-950 to-red-900'
            : session.status === 'scheduled'
            ? 'bg-gradient-to-br from-blue-950 to-blue-900'
            : 'bg-neutral-900 dark:bg-neutral-950'
        }`}>
          {session.status === 'live' && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <Radio className="w-10 h-10 text-red-500/30" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </>
          )}
          {isEnded && (
            <div className="absolute inset-0 flex items-center justify-center">
              {hasRecording ? (
                <PlayCircle className="w-10 h-10 text-primary-400/40" />
              ) : (
                <CheckCircle2 className="w-10 h-10 text-neutral-600" />
              )}
            </div>
          )}
          {session.status === 'scheduled' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-blue-500/30" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <LiveBadge status={session.status} />
            {hasRecording && (
              <span className="inline-flex items-center gap-1 bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                <PlayCircle className="w-2.5 h-2.5" />
                REC
              </span>
            )}
          </div>

          {/* Viewer count for live sessions */}
          {isLive && (
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                <Users className="w-3 h-3" />
                {session.viewer_count}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          {/* Teacher & Channel */}
          <div className="flex items-center gap-2">
            {teacher?.photo_url ? (
              <img src={teacher.photo_url} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-primary-500/20" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[10px] font-bold text-primary-700 dark:text-primary-400">
                {teacher?.name?.charAt(0) || 'T'}
              </div>
            )}
            <span className="text-xs text-neutral-500 truncate">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">{teacher?.name || 'Teacher'}</span>
              {channel?.name && <> · {channel.name}</>}
            </span>
          </div>

          <h3 className="text-sm font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2">
            {session.title}
          </h3>

          <div className="flex items-center gap-2 flex-wrap">
            {session.subject_name && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center gap-0.5">
                <BookOpen className="w-2.5 h-2.5" />
                {session.subject_name}
              </span>
            )}
            {session.status === 'scheduled' && session.scheduled_start_at && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {new Date(session.scheduled_start_at).toLocaleString(undefined, {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
            {session.status === 'ended' && session.ended_at && (
              <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {new Date(session.ended_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          <Link href={`/live/${session.id}`} className="block">
            <Button
              size="sm"
              className={`w-full rounded-xl text-xs font-bold h-8 gap-1 ${
                session.status === 'live'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : session.status === 'scheduled'
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : hasRecording
                  ? 'bg-primary-500 hover:bg-primary-600 text-white'
                  : ''
              }`}
              disabled={session.status === 'ended' && !hasRecording}
            >
              {session.status === 'live' ? (
                <><Radio className="w-3 h-3" />Join Live</>
              ) : session.status === 'scheduled' ? (
                <><Clock className="w-3 h-3" />View Session</>
              ) : session.status === 'starting' || session.status === 'idle' ? (
                <><Loader2 className="w-3 h-3 animate-spin" />Connecting…</>
              ) : hasRecording ? (
                <><PlayCircle className="w-3 h-3" />Watch Recording</>
              ) : session.recording_status === 'processing' ? (
                <><Loader2 className="w-3 h-3 animate-spin" />Processing…</>
              ) : (
                <>Session Ended</>
              )}
              {(session.status === 'live' || hasRecording) && <ArrowRight className="w-3 h-3 ml-auto" />}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentLiveSection() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [endedSessions, setEndedSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/live/student/sessions');
      if (res.ok) {
        const d = await res.json();
        setSessions(d.sessions || []);
        setEndedSessions((d.ended_sessions || []).filter((s: LiveSession) => s.mux_recording_playback_id));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Poll every 15s for live status updates (supplement to realtime)
  useEffect(() => {
    const interval = setInterval(loadSessions, 15_000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  const liveSessions = sessions.filter((s) => s.status === 'live' || s.status === 'idle' || s.status === 'starting');
  const scheduledSessions = sessions.filter((s) => s.status === 'scheduled');

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (liveSessions.length === 0 && scheduledSessions.length === 0 && endedSessions.length === 0) {
    return null; // Hide section entirely if nothing to show
  }

  return (
    <div className="space-y-5">
      {/* Live Now */}
      {liveSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live Now
            <span className="text-xs font-normal text-neutral-500">({liveSessions.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {liveSessions.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </div>
      )}

      {/* Scheduled */}
      {scheduledSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Upcoming Sessions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {scheduledSessions.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </div>
      )}

      {/* Past with Recordings */}
      {endedSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-primary-500" />
            Recent Recordings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {endedSessions.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}
