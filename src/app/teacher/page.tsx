'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Tv,
  Video,
  FileQuestion,
  FileText,
  Users,
  DollarSign,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Profile, ChannelItem } from '@/types';
import { TeacherService } from '@/lib/teacher-service';
import { TeacherStudentsView } from '@/components/teacher/TeacherStudentsView';
import { TeacherAnalysisView } from '@/components/teacher/TeacherAnalysisView';
import { TeacherSubjectMonetization } from '@/components/teacher/TeacherSubjectMonetization';

type TabKey = 'overview' | 'students' | 'analysis' | 'monetization';

function TeacherDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') || 'overview';
  
  // Normalize legacy tabs to new 4-tab model
  const activeTab: TabKey =
    rawTab === 'students'
      ? 'students'
      : rawTab === 'analysis'
      ? 'analysis'
      : rawTab === 'monetization' || rawTab === 'pricing' || rawTab === 'earnings' || rawTab === 'payout'
      ? 'monetization'
      : 'overview';

  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab 1 Overview Stats
  const [totalContent, setTotalContent] = useState(0);
  const [studentsEnrolled, setStudentsEnrolled] = useState(0);
  const [thisMonthEarningsRupees, setThisMonthEarningsRupees] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadTeacherData() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        // 1. Fetch Profile
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (isMounted && prof) {
          setProfile(prof as Profile);
        }

        // 2. Fetch Channels with live counts
        const channelList = await TeacherService.getTeacherChannels(user.id);
        if (isMounted) {
          setChannels(channelList);

          // Calculate Total Content (Videos + Quizzes + Homework)
          const contentSum = channelList.reduce(
            (sum, ch) =>
              sum +
              (ch.content_counts?.videos || 0) +
              (ch.content_counts?.quizzes || 0) +
              (ch.content_counts?.homework || 0),
            0
          );
          setTotalContent(contentSum);
        }

        // 3. Fetch Active Students Count (authoritative count: unique active students across all channels)
        const activeCount = await TeacherService.getTeacherActiveStudentCount(user.id);
        if (isMounted) {
          setStudentsEnrolled(activeCount);
        }

        // 4. Fetch Payment This Month (Teacher earnings after 20% platform fee)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data: monthEarnings } = await supabase
          .from('teacher_earnings')
          .select('teacher_share_paise')
          .eq('teacher_id', user.id)
          .gte('created_at', startOfMonth);

        if (isMounted && monthEarnings) {
          const monthSumPaise = monthEarnings.reduce(
            (sum, row) => sum + (Number(row.teacher_share_paise) || 0),
            0
          );
          setThisMonthEarningsRupees(monthSumPaise / 100);
        }
      } catch (err) {
        console.error('Error loading teacher overview data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTeacherData();

    // Listen for realtime subscription changes (new enrollment, renewal, expiry, cancellation)
    let subsChannel: any = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && isMounted) {
        subsChannel = supabase
          .channel(`teacher-overview-subs-${user.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'channel_subscriptions' },
            async () => {
              if (isMounted) {
                const refreshedCount = await TeacherService.getTeacherActiveStudentCount(user.id);
                setStudentsEnrolled(refreshedCount);
              }
            }
          )
          .subscribe();
      }
    });

    return () => {
      isMounted = false;
      if (subsChannel) {
        supabase.removeChannel(subsChannel);
      }
    };
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="space-y-6 animate-pulse">
            <div className="h-10 w-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
              <div className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
              <div className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="h-56 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
              <div className="h-56 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      <Header />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* ======================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ======================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Header Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
                Teacher Overview
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Real-time curriculum delivery and enrolled subscriber summary.
              </p>
            </div>

            {/* 3 Main Summary Cards ONLY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {/* Card 1: Total Content */}
              <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs rounded-2xl p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Total Content
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
                    {totalContent}
                  </span>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Published videos, tests and homework.
                  </p>
                </div>
              </Card>

              {/* Card 2: Students Enrolled */}
              <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs rounded-2xl p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Students Enrolled
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
                    {studentsEnrolled}
                  </span>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Current active subscribed students.
                  </p>
                </div>
              </Card>

              {/* Card 3: Payment This Month */}
              <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs rounded-2xl p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Payment This Month
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
                    ₹{thisMonthEarningsRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Teacher earnings after 20% platform fee.
                  </p>
                </div>
              </Card>
            </div>

            {/* B. Channel Management Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white font-display">
                    Channel Catalogs
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                    Manage your curriculum channels, upload videos, tests, quizzes and assignments.
                  </p>
                </div>

                {channels.length > 0 && (
                  <Link href="/teacher/channels/create">
                    <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs font-bold shadow-xs">
                      <Plus className="w-3.5 h-3.5" />
                      Create Channel
                    </Button>
                  </Link>
                )}
              </div>

              {channels.length === 0 ? (
                <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-800 py-14 text-center rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-950/80 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <Tv className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                        No channels created yet
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        Create your first channel to choose class grades, curriculum subjects, and start uploading video lessons, quizzes, and homework.
                      </p>
                    </div>
                    <Link href="/teacher/channels/create">
                      <Button variant="primary" size="md" className="flex items-center gap-2 shadow-sm font-bold text-xs">
                        <Plus className="w-4 h-4" />
                        Create Channel
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  {channels.map((channel) => (
                    <Card
                      key={channel.id}
                      className="flex flex-col justify-between border-neutral-200 dark:border-neutral-800 hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-md transition-all rounded-2xl group bg-white dark:bg-neutral-900"
                    >
                      <CardContent className="p-5 sm:p-6 space-y-4">
                        {/* Channel Header */}
                        <div className="flex items-start gap-4">
                          {channel.photo_url ? (
                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200 dark:border-neutral-700">
                              <Image
                                src={channel.photo_url}
                                alt={channel.name}
                                fill
                                sizes="56px"
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 shadow-xs">
                              {channel.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate font-display">
                                {channel.name}
                              </h3>
                              <Badge variant="primary" className="text-[10px] shrink-0">
                                Active
                              </Badge>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                              {channel.description || 'Curriculum classroom channel.'}
                            </p>
                          </div>
                        </div>

                        {/* Channel Tags */}
                        <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                          {channel.classes && channel.classes.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
                                Grades:
                              </span>
                              {channel.classes.map((cls) => (
                                <span
                                  key={cls.id}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                                >
                                  {cls.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {channel.specializations && channel.specializations.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
                                Subjects:
                              </span>
                              {channel.specializations.map((spec, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Real Content Counts */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-center">
                          <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
                            <Video className="w-3.5 h-3.5 mx-auto text-primary-600 mb-1" />
                            <span className="text-xs font-bold block text-neutral-900 dark:text-white">
                              {channel.content_counts?.videos ?? 0}
                            </span>
                            <span className="text-[10px] text-neutral-400">Videos</span>
                          </div>

                          <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
                            <FileQuestion className="w-3.5 h-3.5 mx-auto text-primary-600 mb-1" />
                            <span className="text-xs font-bold block text-neutral-900 dark:text-white">
                              {channel.content_counts?.quizzes ?? 0}
                            </span>
                            <span className="text-[10px] text-neutral-400">Quizzes</span>
                          </div>

                          <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
                            <FileText className="w-3.5 h-3.5 mx-auto text-primary-600 mb-1" />
                            <span className="text-xs font-bold block text-neutral-900 dark:text-white">
                              {channel.content_counts?.homework ?? 0}
                            </span>
                            <span className="text-[10px] text-neutral-400">Homework</span>
                          </div>
                        </div>
                      </CardContent>

                      <div className="p-5 sm:p-6 pt-0">
                        <Link href={`/teacher/channels/${channel.id}`}>
                          <Button
                            variant="primary"
                            size="md"
                            className="w-full flex items-center justify-center gap-2 group-hover:shadow-md group-hover:shadow-primary-600/20 font-bold text-xs"
                          >
                            Open Creator Dashboard
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: STUDENTS */}
        {/* ======================================================================= */}
        {activeTab === 'students' && (
          <TeacherStudentsView teacherId={profile?.id || ''} />
        )}

        {/* ======================================================================= */}
        {/* TAB 3: ANALYSIS */}
        {/* ======================================================================= */}
        {activeTab === 'analysis' && (
          <TeacherAnalysisView teacherId={profile?.id || ''} channels={channels} />
        )}

        {/* ======================================================================= */}
        {/* TAB 4: MONETIZATION & WITHDRAWAL REQUESTS */}
        {/* ======================================================================= */}
        {activeTab === 'monetization' && (
          <TeacherSubjectMonetization channels={channels} />
        )}
      </main>
    </div>
  );
}

export default function TeacherDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
          <div className="w-10 h-10 rounded-full border-3 border-primary-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <TeacherDashboardContent />
    </Suspense>
  );
}
