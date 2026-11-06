'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  X,
  Tv,
  User,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  PlayCircle,
  Award,
  ArrowRight,
  ExternalLink,
  FileText,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChannelItem, ChannelSubscription, Profile } from '@/types';

interface ChannelDetailsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChannelItem | null;
  teacher?: Profile | null;
  subscription?: ChannelSubscription | null;
  progress?: { total: number; completed: number; percentage: number };
  studentId?: string;
}

interface ChapterLesson {
  id: string;
  title: string;
  contentType: 'video' | 'quiz' | 'document';
  duration?: string;
  isCompleted: boolean;
}

export function ChannelDetailsOverlay({
  isOpen,
  onClose,
  channel,
  teacher,
  subscription,
  progress = { total: 0, completed: 0, percentage: 0 },
  studentId,
}: ChannelDetailsOverlayProps) {
  const supabase = createClient();
  const [loadingContent, setLoadingContent] = useState(false);
  const [lessons, setLessons] = useState<ChapterLesson[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [completedVideos, setCompletedVideos] = useState(0);

  useEffect(() => {
    const channelId = channel?.id;
    if (!isOpen || !channelId) return;

    let ignore = false;
    async function loadChannelBreakdown() {
      setLoadingContent(true);
      try {
        // Fetch videos
        const { data: videosData } = await supabase
          .from('videos')
          .select('id, title, duration, created_at')
          .eq('channel_id', channelId)
          .order('created_at', { ascending: true })
          .limit(20);

        // Fetch completed progress if studentId exists
        let completedIds = new Set<string>();
        if (studentId) {
          const { data: progressData } = await supabase
            .from('student_content_progress')
            .select('content_id, completed')
            .eq('student_id', studentId)
            .eq('completed', true);

          if (progressData) {
            completedIds = new Set(progressData.map((p) => p.content_id));
          }
        }

        if (!ignore && videosData) {
          const formattedLessons: ChapterLesson[] = videosData.map((v) => ({
            id: v.id,
            title: v.title,
            contentType: 'video',
            duration: v.duration ? `${Math.round(v.duration / 60)} mins` : '15 mins',
            isCompleted: completedIds.has(v.id),
          }));

          setLessons(formattedLessons);
          setTotalVideos(formattedLessons.length);
          setCompletedVideos(formattedLessons.filter((l) => l.isCompleted).length);
        }
      } catch (err) {
        console.error('Failed to load channel breakdown:', err);
      } finally {
        if (!ignore) setLoadingContent(false);
      }
    }

    loadChannelBreakdown();
    return () => {
      ignore = true;
    };
  }, [isOpen, channel?.id, studentId, supabase]);

  if (!isOpen || !channel) return null;

  const total = progress.total > 0 ? progress.total : totalVideos || 10;
  const completed = progress.completed > 0 ? progress.completed : completedVideos || 0;
  const pending = Math.max(0, total - completed);
  const completionPercentage = progress.percentage > 0 ? progress.percentage : (total > 0 ? Math.round((completed / total) * 100) : 0);

  // SVG Circular progress ring calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  // Donut chart stroke dashes for completed vs pending
  const donutCompletedDash = (completionPercentage / 100) * 100;
  const donutPendingDash = 100 - donutCompletedDash;

  // Days remaining calculation
  let daysRemaining: number | null = null;
  if (subscription?.expires_at) {
    const diff = new Date(subscription.expires_at).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // Next suggested lesson
  const nextLesson = lessons.find((l) => !l.isCompleted) || lessons[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="channel-details-title"
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Backdrop click area */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-2xl h-full bg-[#FAF9FF] border-l border-[#E9DDF8] shadow-2xl flex flex-col z-10 overflow-hidden font-sans">
        {/* Drawer Header */}
        <div className="p-6 bg-white border-b border-[#E9DDF8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-[#F3E8FF] border border-[#E9DDF8] flex items-center justify-center shrink-0">
              {channel.photo_url ? (
                <Image
                  src={channel.photo_url}
                  alt={channel.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <Tv className="w-6 h-6 text-[#9333EA]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#9333EA] border border-[#E9DDF8]">
                  Learning Breakdown
                </span>
                {subscription ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Subscription
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    Available Channel
                  </span>
                )}
              </div>
              <h2 id="channel-details-title" className="text-lg sm:text-xl font-extrabold text-[#17133A] truncate font-display">
                {channel.name}
              </h2>
              <p className="text-xs text-[#68647D] truncate">
                Taught by {teacher?.name || 'Verified Educator'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="w-9 h-9 rounded-xl bg-[#FAF9FF] border border-[#E9DDF8] hover:bg-[#F3E8FF] text-[#68647D] hover:text-[#9333EA] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Performance Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white border border-[#E9DDF8] rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#68647D] block">Completion</span>
              <span className="text-xl font-extrabold text-[#9333EA] mt-1 block">
                {completionPercentage}%
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">Syllabus tracked</span>
            </div>

            <div className="bg-white border border-[#E9DDF8] rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#68647D] block">Total Lessons</span>
              <span className="text-xl font-extrabold text-[#17133A] mt-1 block">
                {total}
              </span>
              <span className="text-[10px] text-[#68647D]">Curriculum units</span>
            </div>

            <div className="bg-white border border-[#E9DDF8] rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#68647D] block">Completed</span>
              <span className="text-xl font-extrabold text-emerald-600 mt-1 block">
                {completed}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">Mastered</span>
            </div>

            <div className="bg-white border border-[#E9DDF8] rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#68647D] block">Pending</span>
              <span className="text-xl font-extrabold text-amber-600 mt-1 block">
                {pending}
              </span>
              <span className="text-[10px] text-amber-700 font-medium">Remaining</span>
            </div>
          </div>

          {/* Visual Analytics Row: Ring & Donut Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SVG Circular Progress Chart */}
            <div className="bg-white border border-[#E9DDF8] rounded-2xl p-5 shadow-2xs flex items-center gap-5">
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-[#F3E8FF]"
                    strokeWidth="9"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-[#9333EA] transition-all duration-700 ease-out"
                    strokeWidth="9"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-extrabold text-[#17133A] leading-none">
                    {completionPercentage}%
                  </span>
                  <span className="text-[9px] text-[#68647D] font-medium mt-0.5">Done</span>
                </div>
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="text-sm font-bold text-[#17133A]">Mastery Level</h4>
                <p className="text-xs text-[#68647D] leading-relaxed">
                  {completionPercentage >= 80
                    ? 'Excellent progress! Ready for full-length mock tests.'
                    : completionPercentage >= 40
                    ? 'Consistent momentum. Keep watching upcoming chapters.'
                    : 'Getting started. Begin the first chapter lectures below.'}
                </p>
              </div>
            </div>

            {/* Donut Ratio Breakdown */}
            <div className="bg-white border border-[#E9DDF8] rounded-2xl p-5 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#68647D]">
                Lesson Status Breakdown
              </h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Completed Lessons
                    </span>
                    <span className="font-bold text-[#17133A]">{completed}</span>
                  </div>
                  <div className="w-full h-2 bg-[#F3E8FF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-amber-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Pending Lessons
                    </span>
                    <span className="font-bold text-[#17133A]">{pending}</span>
                  </div>
                  <div className="w-full h-2 bg-[#F3E8FF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${100 - completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Recommended Activity Card */}
          {nextLesson && (
            <div className="bg-gradient-to-r from-[#F5EDFF] to-[#FAF9FF] border border-[#E9DDF8] rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white text-[#9333EA] border border-[#E9DDF8] flex items-center justify-center shrink-0 shadow-2xs">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[#9333EA] uppercase tracking-wider block">
                    Next Recommended Activity
                  </span>
                  <h4 className="text-sm font-bold text-[#17133A] truncate mt-0.5">
                    {nextLesson.title}
                  </h4>
                  <span className="text-xs text-[#68647D] block">
                    Duration: {nextLesson.duration}
                  </span>
                </div>
              </div>
              <Link href={`/channels/${channel.id}`} className="shrink-0">
                <Button size="sm" className="bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl font-bold shadow-xs">
                  <span>Start</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          )}

          {/* Chapter / Lessons Breakdown List */}
          <div className="bg-white border border-[#E9DDF8] rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 bg-[#F3E8FF]/60 border-b border-[#E9DDF8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#9333EA]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#17133A]">
                  Curriculum Lessons &amp; Chapters
                </h4>
              </div>
              <span className="text-xs font-medium text-[#68647D]">
                {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} listed
              </span>
            </div>

            <div className="divide-y divide-[#E9DDF8]">
              {loadingContent ? (
                <div className="p-8 text-center text-xs text-[#68647D] animate-pulse">
                  Loading channel lesson structure...
                </div>
              ) : lessons.length > 0 ? (
                lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-[#FAF9FF] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#FAF9FF] border border-[#E9DDF8] flex items-center justify-center text-xs font-bold text-[#68647D] shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-[#17133A] truncate">
                          {lesson.title}
                        </p>
                        <span className="text-[11px] text-[#68647D]">
                          {lesson.duration} &bull; Video Lecture
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {lesson.isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#68647D] bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-[#68647D]">
                  No published lessons found for this channel yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-5 bg-white border-t border-[#E9DDF8] flex items-center justify-end gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-[#E9DDF8] text-[#68647D] hover:text-[#17133A] hover:bg-[#F3E8FF] rounded-xl font-medium"
          >
            Close
          </Button>
          <Link href={`/channels/${channel.id}`}>
            <Button
              size="sm"
              className="bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl font-bold shadow-xs"
            >
              <span>Enter Classroom</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

