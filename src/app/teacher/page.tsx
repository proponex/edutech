'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
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
  TrendingUp,
  LayoutDashboard,
  BarChart2,
  Banknote,
} from 'lucide-react';
import { Profile, ChannelItem } from '@/types';
import { TeacherService } from '@/lib/teacher-service';
import { TeacherStudentsView } from '@/components/teacher/TeacherStudentsView';
import { TeacherAnalysisView } from '@/components/teacher/TeacherAnalysisView';
import { TeacherSubjectMonetization } from '@/components/teacher/TeacherSubjectMonetization';

type TabKey = 'overview' | 'students' | 'analysis' | 'monetization';

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',      label: 'Overview',      icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'students',      label: 'Students',      icon: <Users className="w-4 h-4" /> },
  { key: 'analysis',      label: 'Analysis',      icon: <BarChart2 className="w-4 h-4" /> },
  { key: 'monetization',  label: 'Monetization',  icon: <Banknote className="w-4 h-4" /> },
];

// ─── Greeting helper ─────────────────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Header />
      {/* Skeleton tab bar */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-9 w-28 rounded-xl animate-brand-shimmer"
              />
            ))}
          </div>
        </div>
      </div>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Greeting skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-72 rounded-xl animate-brand-shimmer" />
          <div className="h-4 w-48 rounded-lg animate-brand-shimmer" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl animate-brand-shimmer" />
          ))}
        </div>
        {/* Channel cards skeleton */}
        <div className="h-6 w-40 rounded-lg animate-brand-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-2xl animate-brand-shimmer" />
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
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
          router.push('/');
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
    let subsChannel: ReturnType<typeof supabase.channel> | null = null;
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
    return <DashboardSkeleton />;
  }

  // ── Tab navigation handler ──────────────────────────────────────────────────
  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/teacher?${params.toString()}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      <Header />

      {/* ─── Sticky Tab Navigation Bar ─────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-0.5 py-2 overflow-x-auto scrollbar-none" aria-label="Teacher dashboard tabs">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 select-none',
                    isActive
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white',
                  ].join(' ')}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* ======================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ======================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8">

            {/* ── Welcome Greeting ────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-500 dark:text-primary-400 mb-1">
                  {formatDate()}
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
                  {getGreeting()},{' '}
                  <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                    {profile?.name ?? profile?.full_name ?? profile?.username ?? 'Teacher'}
                  </span>
                  !
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Real-time curriculum delivery and enrolled subscriber summary.
                </p>
              </div>
            </div>

            {/* ── 3 Main Summary Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">

              {/* Card 1: Total Content */}
              <Card className="relative overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-shadow rounded-2xl p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Total Content
                  </span>
                  {/* Icon with gradient container */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6244A6 0%, #8060CE 100%)' }}>
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
                      {totalContent}
                    </span>
                    {/* Micro-trend indicator */}
                    <span className="mb-1 flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Published videos, tests and homework.
                  </p>
                </div>
                {/* Subtle violet glow strip at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-600/0 via-primary-500/60 to-primary-600/0 rounded-b-2xl" />
              </Card>

              {/* Card 2: Students Enrolled */}
              <Card className="relative overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-shadow rounded-2xl p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Students Enrolled
                  </span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #4C268F 0%, #6244A6 100%)' }}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
                      {studentsEnrolled}
                    </span>
                    <span className="mb-1 flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Current active subscribed students.
                  </p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-600/0 via-primary-500/60 to-primary-600/0 rounded-b-2xl" />
              </Card>

              {/* Card 3: Payment This Month */}
              <Card className="relative overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-shadow rounded-2xl p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Payment This Month
                  </span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3D1E6D 0%, #4C268F 100%)' }}>
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white font-display tracking-tight">
                      ₹{thisMonthEarningsRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="mb-1 flex items-center gap-0.5 text-xs font-bold text-primary-500 dark:text-primary-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Net
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Teacher earnings after 20% platform fee.
                  </p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-600/0 via-primary-500/60 to-primary-600/0 rounded-b-2xl" />
              </Card>
            </div>

            {/* ── Channel Management Section ───────────────────────────────────── */}
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
                    <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs font-bold shadow-xs rounded-xl">
                      <Plus className="w-3.5 h-3.5" />
                      Create Channel
                    </Button>
                  </Link>
                )}
              </div>

              {channels.length === 0 ? (
                <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-800 py-14 text-center rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md"
                      style={{ background: 'linear-gradient(135deg, #4C268F 0%, #8060CE 100%)' }}>
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
                      <Button variant="primary" size="md" className="flex items-center gap-2 shadow-sm font-bold text-xs rounded-xl">
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
                      className="flex flex-col justify-between border-neutral-200 dark:border-neutral-800 hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-lg hover:shadow-primary-600/10 transition-all rounded-2xl group bg-white dark:bg-neutral-900 overflow-hidden"
                    >
                      {/* ── Gradient Header Band ─────────────────────────────── */}
                      <div
                        className="relative h-20 flex items-end px-5 pb-0"
                        style={{ background: 'linear-gradient(135deg, #2A174E 0%, #4C268F 50%, #6244A6 100%)' }}
                      >
                        {/* Decorative circles */}
                        <div className="absolute top-2 right-4 w-16 h-16 rounded-full bg-white/5" />
                        <div className="absolute top-4 right-10 w-8 h-8 rounded-full bg-white/5" />

                        {/* Channel avatar — positioned to overlap the band */}
                        <div className="relative z-10 translate-y-6">
                          {channel.photo_url ? (
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border-2 border-white dark:border-neutral-900 shadow-md">
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
                            <div
                              className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 border-2 border-white dark:border-neutral-900 shadow-md text-white"
                              style={{ background: 'linear-gradient(135deg, #6244A6 0%, #8060CE 100%)' }}
                            >
                              {channel.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Active badge in header */}
                        <div className="ml-auto pb-2">
                          <Badge variant="primary" className="text-[10px] shrink-0 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                            Active
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="pt-8 p-5 sm:p-6 space-y-4">
                        {/* Channel name + description */}
                        <div className="space-y-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate font-display">
                            {channel.name}
                          </h3>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                            {channel.description || 'Curriculum classroom channel.'}
                          </p>
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
                            className="w-full flex items-center justify-center gap-2 group-hover:shadow-md group-hover:shadow-primary-600/20 font-bold text-xs rounded-xl"
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

      <Footer />
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
