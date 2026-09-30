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
  Radio,
  FileQuestion,
  FileText,
  ArrowRight,
  Users,
  Star,
  DollarSign,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
  CreditCard,
  MessageSquare,
  X,
  Phone,
} from 'lucide-react';
import {
  Profile,
  ChannelItem,
  TeacherDashboardStats,
  ChannelStudentInfo,
} from '@/types';
import { TeacherService } from '@/lib/teacher-service';

function StudentMessageComposer({
  channelId,
  studentId,
  onSent
}: {
  channelId: string;
  studentId: string;
  onSent: () => void;
}) {
  const [type, setType] = useState<'message' | 'task'>('message');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const supabase = createClient();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await TeacherService.sendTeacherMessage({
        teacherId: user.id,
        channelId,
        studentId,
        title: type === 'message' ? 'Direct Message' : 'New Task',
        content: content.trim(),
        actionType: type,
      });

      setContent('');
      setSuccess(type === 'message' ? 'Message sent successfully.' : 'Task sent successfully.');
      onSent();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      console.error(err);
      alert('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pt-4 mt-2 border-t border-neutral-100 dark:border-neutral-800/60">
      <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
        Send Message / Task
      </h5>
      
      {success ? (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {success}
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-3 bg-neutral-50/50 dark:bg-neutral-950/30 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-neutral-700 dark:text-neutral-300">
              <input 
                type="radio" 
                name={`msgType-${studentId}`}
                value="message" 
                checked={type === 'message'} 
                onChange={() => setType('message')} 
                className="text-primary-500 focus:ring-primary-500 w-4 h-4"
              />
              Message (Informational)
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-neutral-700 dark:text-neutral-300">
              <input 
                type="radio" 
                name={`msgType-${studentId}`}
                value="task" 
                checked={type === 'task'} 
                onChange={() => setType('task')} 
                className="text-primary-500 focus:ring-primary-500 w-4 h-4"
              />
              Task (Requires Completion)
            </label>
          </div>
          
          <textarea
            required
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={type === 'message' ? "e.g. Tomorrow's quiz starts at 6 PM." : "e.g. Complete Unit 2 Physics Quiz before tomorrow."}
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={sending || !content.trim()}
              className="flex items-center gap-2 shadow-sm font-bold text-xs px-5"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function TeacherDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [stats, setStats] = useState<TeacherDashboardStats>({
    totalVideos: 0,
    totalStudents: 0,
    averageRating: 0,
    thisMonthPayment: 0,
    totalEnrolled: 0,
    unitsCount: 0,
    videosCount: 0,
    contentPublished: 0,
    monthlyRating: 0,
  });
  const [loading, setLoading] = useState(true);

  // Students Tab State
  const [channelStudents, setChannelStudents] = useState<
    { channel: ChannelItem; students: ChannelStudentInfo[] }[]
  >([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>({});
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
  const [expandedProgress, setExpandedProgress] = useState<Record<string, boolean>>({});

  // Message Modal State
  const [activeMessageTarget, setActiveMessageTarget] = useState<{
    student: ChannelStudentInfo;
    channelId: string;
  } | null>(null);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageActionType, setMessageActionType] = useState('general');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState<string | null>(null);

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

        // 2. Fetch Channels with accurate counts
        const channelList = await TeacherService.getTeacherChannels(user.id);
        if (isMounted) {
          setChannels(channelList);
        }

        // 3. Fetch Dashboard Live Stats (Requirement 2)
        const liveStats = await TeacherService.getTeacherDashboardStats(user.id);
        if (isMounted) {
          setStats(liveStats);
        }
      } catch {
        // Handled silently
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTeacherData();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  // Load students data when students tab is selected
  useEffect(() => {
    if (currentTab === 'students' && profile) {
      let isMounted = true;
      TeacherService.getTeacherStudents(profile.id)
        .then((data) => {
          if (isMounted) {
            setChannelStudents(data);
            if (data.length > 0) {
              setExpandedChannels((prev) => ({
                ...prev,
                [data[0].channel.id]: true,
              }));
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setLoadingStudents(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [currentTab, profile]);

  const refreshStudents = async () => {
    if (profile) {
      try {
        const data = await TeacherService.getTeacherStudents(profile.id);
        setChannelStudents(data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleChannel = (channelId: string) => {
    setExpandedChannels((prev) => ({
      ...prev,
      [channelId]: !prev[channelId],
    }));
  };

  const toggleStudent = (studentId: string) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const toggleProgress = (studentId: string) => {
    setExpandedProgress((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleSendMessage = async () => {
    if (!profile || !activeMessageTarget || !messageTitle.trim() || !messageContent.trim()) {
      return;
    }

    setSendingMessage(true);
    setMessageSuccess(null);
    try {
      const newMsg = await TeacherService.sendTeacherMessage({
        teacherId: profile.id,
        channelId: activeMessageTarget.channelId,
        studentId: activeMessageTarget.student.studentId,
        title: messageTitle,
        content: messageContent,
        actionType: messageActionType,
      });

      // Update student's messages locally
      setChannelStudents((prev) =>
        prev.map((c) => {
          if (c.channel.id !== activeMessageTarget.channelId) return c;
          return {
            ...c,
            students: c.students.map((s) => {
              if (s.studentId !== activeMessageTarget.student.studentId) return s;
              return {
                ...s,
                messages: [newMsg, ...(s.messages || [])],
              };
            }),
          };
        })
      );

      setMessageSuccess('Instruction sent successfully to student!');
      setTimeout(() => {
        setActiveMessageTarget(null);
        setMessageTitle('');
        setMessageContent('');
        setMessageSuccess(null);
      }, 1500);
    } catch {
      // Ignore
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="space-y-6 animate-pulse">
            <div className="h-10 w-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            <div className="h-36 bg-neutral-200 dark:bg-neutral-800 rounded-3xl" />
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

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* ======================================================================= */}
        {/* PHASE 5.3: TEACHER LIVE-STAT CARDS (NO "WELCOME BACK") */}
        {/* ======================================================================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
                Teacher Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Metrics across all your active curriculum channels.
              </p>
            </div>

            <Link href="/teacher/channels/create">
              <Button variant="primary" size="sm" className="flex items-center gap-2 shadow-md shadow-primary-500/20 font-bold">
                <Plus className="w-4 h-4" />
                New Channel
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Total Enrolled */}
            <Card className="border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Total Enrolled
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white font-display">
                  {stats.totalEnrolled ?? stats.totalStudents ?? 0}
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Across all active classrooms.
                </p>
              </div>
            </Card>

            {/* Card 2: Content Published */}
            <Card className="border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Content Published
                </span>
                <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white font-display">
                  {stats.contentPublished > 0 ? stats.contentPublished : stats.totalVideos}
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Curriculum units and video lessons.
                </p>
              </div>
            </Card>

            {/* Card 3: Teacher Rating */}
            <Card className="border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Teacher Rating
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white font-display">
                  {stats.monthlyRating > 0 ? `${stats.monthlyRating} ★` : stats.averageRating > 0 ? `${stats.averageRating} ★` : '5.0 ★'}
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  For this month.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* TAB NAVIGATION ROW */}
        {/* ======================================================================= */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-6">
          <Link
            href="/teacher?tab=dashboard"
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
              currentTab === 'dashboard'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Channels ({channels.length})
          </Link>

          <Link
            href="/teacher?tab=students"
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              currentTab === 'students'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Students
            {stats.totalStudents > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-extrabold">
                {stats.totalStudents}
              </span>
            )}
          </Link>

          <Link
            href="/teacher?tab=analysis"
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
              currentTab === 'analysis'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Analysis
          </Link>

          <Link
            href="/teacher?tab=payout"
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
              currentTab === 'payout'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Payout
          </Link>
        </div>

        {/* ======================================================================= */}
        {/* TAB 1: MAIN DASHBOARD — MY CHANNELS LIST */}
        {/* ======================================================================= */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white font-display">
                  Channel Catalogs
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  Your independent classrooms with real-time video, quiz, and homework counts.
                </p>
              </div>

              {channels.length > 0 && (
                <Link href="/teacher/channels/create">
                  <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    New Channel
                  </Button>
                </Link>
              )}
            </div>

            {channels.length === 0 ? (
              <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-800 py-16 text-center">
                <CardContent className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-primary-50 dark:bg-primary-950/80 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-400">
                    <Tv className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      No channels created yet
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Set up your first creator channel to select your grades, specializations, and start publishing structured video lessons, quizzes, and homework.
                    </p>
                  </div>
                  <Link href="/teacher/channels/create">
                    <Button variant="primary" size="lg" className="flex items-center gap-2 shadow-md shadow-primary-500/20">
                      <Plus className="w-4 h-4" />
                      Create Your First Channel
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {channels.map((channel) => (
                  <Card
                    key={channel.id}
                    className="flex flex-col justify-between border-neutral-200 dark:border-neutral-800 hover:border-primary-400 dark:hover:border-primary-500/60 hover:shadow-md transition-all group"
                  >
                    <CardContent className="p-6 space-y-5">
                      {/* Channel Header */}
                      <div className="flex items-start gap-4">
                        {channel.photo_url ? (
                          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200 dark:border-neutral-700">
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
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-neutral-950 font-bold text-xl shrink-0 shadow-md shadow-primary-500/20">
                            {channel.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white truncate font-display">
                              {channel.name}
                            </h3>
                            <Badge variant="primary" className="text-[10px] shrink-0">
                              Active
                            </Badge>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                            {channel.description}
                          </p>
                        </div>
                      </div>

                      {/* Channel Tags */}
                      <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                        {channel.classes && channel.classes.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mr-1">
                              Grades:
                            </span>
                            {channel.classes.map((cls) => (
                              <span
                                key={cls.id}
                                className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                              >
                                {cls.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {channel.specializations && channel.specializations.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mr-1">
                              Subjects:
                            </span>
                            {channel.specializations.map((spec, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* REQUIREMENT 3: Real Database Counts (No hardcoded 0) */}
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-center">
                        <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
                          <Video className="w-3.5 h-3.5 mx-auto text-primary-500 mb-1" />
                          <span className="text-xs font-bold block text-neutral-900 dark:text-white">
                            {channel.content_counts?.videos ?? 0}
                          </span>
                          <span className="text-[10px] text-neutral-400">Videos</span>
                        </div>

                        <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
                          <FileQuestion className="w-3.5 h-3.5 mx-auto text-amber-500 mb-1" />
                          <span className="text-xs font-bold block text-neutral-900 dark:text-white">
                            {channel.content_counts?.quizzes ?? 0}
                          </span>
                          <span className="text-[10px] text-neutral-400">Quizzes</span>
                        </div>
                        <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
                          <FileText className="w-3.5 h-3.5 mx-auto text-blue-500 mb-1" />
                          <span className="text-xs font-bold block text-neutral-900 dark:text-white">
                            {channel.content_counts?.homework ?? 0}
                          </span>
                          <span className="text-[10px] text-neutral-400">Homework</span>
                        </div>
                      </div>
                    </CardContent>

                    <div className="p-6 pt-0">
                      <Link href={`/teacher/channels/${channel.id}`}>
                        <Button
                          variant="primary"
                          size="md"
                          className="w-full flex items-center justify-center gap-2 group-hover:shadow-md group-hover:shadow-primary-500/20"
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
        )}

        {/* ======================================================================= */}
        {/* REQUIREMENT 5: TEACHER → STUDENTS TAB */}
        {/* ======================================================================= */}
        {currentTab === 'students' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white font-display">
                Channel Students &amp; Learning Progress
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Track learning progress per student, inspect completed syllabus items, and dispatch direct activity instructions.
              </p>
            </div>

            {loadingStudents ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-28 bg-neutral-100 dark:bg-neutral-800/60 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : channelStudents.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-neutral-300 dark:border-neutral-800">
                <Users className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">No channels configured</h3>
                <p className="text-xs text-neutral-500 mt-1">Create a channel first to enroll students.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {channelStudents.map(({ channel, students }) => {
                  const isChannelOpen = Boolean(expandedChannels[channel.id]);

                  return (
                    <Card
                      key={channel.id}
                      className="border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-xs"
                    >
                      {/* Channel Row Header */}
                      <button
                        type="button"
                        onClick={() => toggleChannel(channel.id)}
                        className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-neutral-50/50 dark:hover:bg-neutral-950/40 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold shrink-0">
                            <Tv className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white font-display">
                              {channel.name} — {students.length} {students.length === 1 ? 'Student' : 'Students'}
                            </h3>
                            <span className="text-xs text-neutral-400">
                              {channel.class?.name || 'Class Curriculum'} • {channel.specializations?.join(', ') || 'Subjects'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {students.length} Enrolled
                          </Badge>
                          {isChannelOpen ? (
                            <ChevronUp className="w-5 h-5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Student List */}
                      {isChannelOpen && (
                        <div className="border-t border-neutral-100 dark:border-neutral-800 p-5 sm:p-6 space-y-4 bg-neutral-50/30 dark:bg-neutral-950/20">
                          {students.length === 0 ? (
                            <div className="text-center py-8 text-neutral-400 text-xs">
                              No students have subscribed to this channel yet.
                            </div>
                          ) : (
                            students.map((student) => {
                              const isStudentOpen = Boolean(expandedStudents[student.studentId]);
                              const isProgressOpen = Boolean(expandedProgress[student.studentId]);

                              return (
                                <div
                                  key={student.studentId}
                                  className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs space-y-4"
                                >
                                  {/* Student Basic Info Row */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                      <div className="w-12 h-12 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold shrink-0 border border-primary-300 dark:border-primary-800">
                                        {student.photoUrl ? (
                                          <Image
                                            src={student.photoUrl}
                                            alt={student.name}
                                            width={48}
                                            height={48}
                                            className="w-full h-full object-cover"
                                            unoptimized
                                          />
                                        ) : (
                                          <Users className="w-6 h-6" />
                                        )}
                                      </div>

                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                                            {student.name}
                                          </h4>
                                          <Badge variant="secondary" className="text-[10px] capitalize">
                                            {student.packageType.replace('_', ' ')}
                                          </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mt-2">
                                          {student.email && (
                                            <span className="flex items-center gap-1">
                                              <strong>Email:</strong> {student.email}
                                            </span>
                                          )}
                                          <span className="flex items-center gap-1">
                                            <Phone className="w-3 h-3 text-neutral-400" />
                                            <strong>Student:</strong> {student.phone || 'N/A'}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Phone className="w-3 h-3 text-neutral-400" />
                                            <strong>Parent:</strong> {student.parentPhone || 'N/A'}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 mt-1 uppercase tracking-wider font-semibold">
                                          {student.className && (
                                            <span>CLASS: {student.className}</span>
                                          )}
                                          {student.boardName && (
                                            <>
                                              <span>•</span>
                                              <span>BOARD: {student.boardName}</span>
                                            </>
                                          )}
                                          {student.subjects && student.subjects.length > 0 && (
                                            <>
                                              <span>•</span>
                                              <span>SUBJECTS: {student.subjects.join(', ')}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions & Learning Progress Summary */}
                                    <div className="flex items-center gap-3 self-end sm:self-center">
                                      <div className="text-right hidden sm:block">
                                        <span className="text-xs font-bold text-neutral-900 dark:text-white">
                                          {student.progress.percentage}% Completed
                                        </span>
                                        <div className="w-24 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-1">
                                          <div
                                            className="h-full bg-primary-500 rounded-full"
                                            style={{ width: `${student.progress.percentage}%` }}
                                          />
                                        </div>
                                      </div>

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleStudent(student.studentId)}
                                        className="flex items-center gap-1.5 text-xs shadow-xs"
                                      >
                                        Details
                                        {isStudentOpen ? (
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Expanded Student Details & Progress */}
                                  {isStudentOpen && (
                                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 space-y-4 animate-in fade-in">
                                      {/* Track Progress Accordion Button */}
                                      <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
                                        <div className="space-y-0.5">
                                          <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                                            Learning Progress ({student.progress.completedCount} / {student.progress.totalItems} Items)
                                          </span>
                                          <p className="text-[11px] text-neutral-400">
                                            Completed: {student.progress.completedCount} • In Progress: {student.progress.inProgressCount} • Remaining: {student.progress.remainingCount}
                                          </p>
                                        </div>

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleProgress(student.studentId)}
                                          className="text-xs font-semibold text-primary-600 dark:text-primary-400"
                                        >
                                          {isProgressOpen ? 'Hide Track Progress' : 'Track Progress'}
                                          {isProgressOpen ? (
                                            <ChevronUp className="w-3.5 h-3.5 ml-1" />
                                          ) : (
                                            <ChevronDown className="w-3.5 h-3.5 ml-1" />
                                          )}
                                        </Button>
                                      </div>

                                      {/* Track Progress Detail View: Completed, In Progress, Remaining */}
                                      {isProgressOpen && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                                          {/* Completed Column */}
                                          <div className="rounded-xl p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Completed ({student.progress.completedCount})
                                              </span>
                                            </div>
                                            {student.progress.completedItems.length === 0 ? (
                                              <p className="text-[11px] text-neutral-400 italic">No completed items yet</p>
                                            ) : (
                                              <ul className="space-y-1.5">
                                                {student.progress.completedItems.map((item) => (
                                                  <li key={item.id} className="text-xs text-neutral-700 dark:text-neutral-300 truncate flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                    <span className="font-semibold text-[10px] uppercase text-emerald-600">[{item.type}]</span>
                                                    <span className="truncate">{item.title}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>

                                          {/* In Progress Column */}
                                          <div className="rounded-xl p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                In Progress ({student.progress.inProgressCount})
                                              </span>
                                            </div>
                                            {student.progress.inProgressItems.length === 0 ? (
                                              <p className="text-[11px] text-neutral-400 italic">No active in-progress items</p>
                                            ) : (
                                              <ul className="space-y-1.5">
                                                {student.progress.inProgressItems.map((item) => (
                                                  <li key={item.id} className="text-xs text-neutral-700 dark:text-neutral-300 truncate flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                    <span className="font-semibold text-[10px] uppercase text-amber-600">[{item.type}]</span>
                                                    <span className="truncate">{item.title}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>

                                          {/* Remaining Column */}
                                          <div className="rounded-xl p-3 bg-neutral-100/60 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                                                <FileText className="w-3.5 h-3.5" />
                                                Remaining ({student.progress.remainingCount})
                                              </span>
                                            </div>
                                            {student.progress.remainingItems.length === 0 ? (
                                              <p className="text-[11px] text-neutral-400 italic">Entire syllabus completed!</p>
                                            ) : (
                                              <ul className="space-y-1.5">
                                                {student.progress.remainingItems.slice(0, 5).map((item) => (
                                                  <li key={item.id} className="text-xs text-neutral-500 truncate flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                                                    <span className="font-semibold text-[10px] uppercase text-neutral-400">[{item.type}]</span>
                                                    <span className="truncate">{item.title}</span>
                                                  </li>
                                                ))}
                                                {student.progress.remainingItems.length > 5 && (
                                                  <li className="text-[11px] text-neutral-400 italic">
                                                    + {student.progress.remainingItems.length - 5} more items
                                                  </li>
                                                )}
                                              </ul>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Message History with Student */}
                                      <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
                                        <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                                          Sent Messages &amp; Action Status
                                        </h5>
                                        {student.messages && student.messages.length > 0 ? (
                                          <div className="space-y-2">
                                            {student.messages.map((msg) => (
                                              <div
                                                key={msg.id}
                                                className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between gap-3 text-xs"
                                              >
                                                <div className="min-w-0">
                                                  <span className="font-bold text-neutral-900 dark:text-white block truncate">
                                                    {msg.title}
                                                  </span>
                                                  <p className="text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                                    {msg.content}
                                                  </p>
                                                </div>

                                                <div className="shrink-0">
                                                  {msg.action_type === 'message' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                                      <MessageSquare className="w-3.5 h-3.5" />
                                                      Message
                                                    </span>
                                                  ) : msg.status === 'completed' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                      ✓ Completed
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                      Task Pending
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-neutral-400 italic">No messages or tasks sent yet to this student.</p>
                                        )}
                                      </div>
                                      
                                      {/* Inline Composer */}
                                      <StudentMessageComposer
                                        channelId={channel.id}
                                        studentId={student.studentId}
                                        onSent={() => {
                                          refreshStudents();
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: ANALYSIS TAB */}
        {/* ======================================================================= */}
        {currentTab === 'analysis' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white font-display">
                Channel Analytics &amp; Performance
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Detailed engagement breakdown and curriculum delivery metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-neutral-400">Total Enrolled</span>
                  <BarChart3 className="w-5 h-5 text-primary-500" />
                </div>
                <span className="text-3xl font-extrabold text-neutral-900 dark:text-white font-display">
                  {stats.totalStudents}
                </span>
                <p className="text-xs text-neutral-500">Across all active classrooms</p>
              </Card>

              <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-neutral-400">Content Published</span>
                  <Video className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-3xl font-extrabold text-neutral-900 dark:text-white font-display">
                  {stats.totalVideos} Videos
                </span>
                <p className="text-xs text-neutral-500">Curriculum units and video lessons</p>
              </Card>

              <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-neutral-400">Teacher Rating</span>
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <span className="text-3xl font-extrabold text-neutral-900 dark:text-white font-display">
                  {stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)} ★` : '0 ★'}
                </span>
                <p className="text-xs text-neutral-500">Based on student feedback</p>
              </Card>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 4: PAYOUT TAB */}
        {/* ======================================================================= */}
        {currentTab === 'payout' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white font-display">
                Teacher Payouts &amp; Revenue
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Monthly revenue generated through active student subscriptions and packages.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Calculated Monthly Payout
                  </span>
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-display">
                  ₹{stats.thisMonthPayment.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Payouts are settled on the 1st of every calendar month directly to your verified educator bank account.
                </p>
                <div className="pt-2">
                  <Badge variant="success" className="text-xs">
                    Direct Deposit Active
                  </Badge>
                </div>
              </Card>

              <Card className="p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl space-y-4">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white font-display">
                  Package Pricing Reference
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800">
                    <span className="font-semibold">Entire Channel Package</span>
                    <strong className="text-neutral-900 dark:text-white">₹999 / mo</strong>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800">
                    <span className="font-semibold">Particular Class Package</span>
                    <strong className="text-neutral-900 dark:text-white">₹699 / mo</strong>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800">
                    <span className="font-semibold">Class + Subject Package</span>
                    <strong className="text-neutral-900 dark:text-white">₹499 / mo</strong>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
      </div>
    }>
      <TeacherDashboardContent />
    </Suspense>
  );
}
