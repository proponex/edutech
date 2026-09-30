'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { openAuthModal } from '@/components/auth/auth-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Play,
  Lock,
  CheckCircle2,
  Users,
  Star,
  Sparkles,
  Video,
  HelpCircle,
  FileText,
  User,
  ShieldCheck,
  X,
  MessageSquare,
  Clock,
  Check,
} from 'lucide-react';
import {
  Profile,
  ChannelItem,
  UnitItem,
  VideoContentItem,
  QuizItem,
  HomeworkItem,
  ChannelSubscription,
  SubscriptionPackageType,
  ChannelReview,
  TeacherMessage,
  ContentProgressStatus,
} from '@/types';
import { StudentService } from '@/lib/student-service';
import { MuxVideoPlayer } from '@/components/shared/MuxVideoPlayer';

function ChannelDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = params?.channelId as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  // Channel & Teacher Data
  const [channel, setChannel] = useState<ChannelItem | null>(null);
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [demoVideo, setDemoVideo] = useState<VideoContentItem | null>(null);
  const [videos, setVideos] = useState<VideoContentItem[]>([]);

  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [reviews, setReviews] = useState<ChannelReview[]>([]);
  const [rating, setRating] = useState<number | null>(null);

  // Subscription State
  const [subscription, setSubscription] = useState<ChannelSubscription | null>(null);

  // Video Playing States
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [activePlayableVideo, setActivePlayableVideo] = useState<VideoContentItem | null>(null);

  // Package Modal & Locked Alert Modal
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackageType>('entire_channel');
  const [processingSubscribe, setProcessingSubscribe] = useState(false);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<string | null>(null);

  // Phase 5.1: Subject Filter & 1.5 Unit Expansion
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // Phase 5.1: Progress Tracking State
  const [studentProgress, setStudentProgress] = useState<{
    overall: { total: number; completed: number; percentage: number };
    bySubject: Record<string, { total: number; completed: number; percentage: number }>;
    progressMap: Record<string, ContentProgressStatus>;
  }>({
    overall: { total: 0, completed: 0, percentage: 0 },
    bySubject: {},
    progressMap: {},
  });

  // Phase 5.1: Teacher Messages State
  const [teacherMessages, setTeacherMessages] = useState<TeacherMessage[]>([]);

  // 1. Fetch channel data & current user state
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let studentProfile: Profile | null = null;
        if (user) {
          studentProfile = await StudentService.getStudentProfile(user.id);
          setCurrentUser(studentProfile);
        }

        const details = await StudentService.getChannelDetails(channelId);
        if (details) {
          setChannel(details.channel);
          setTeacher(details.teacher);
          setUnits(details.units);
          setDemoVideo(details.demoVideo);
          setVideos(details.videos);

          setQuizzes(details.quizzes);
          setHomework(details.homework);
          setSubscriberCount(details.subscriberCount);
          setReviews(details.reviews);
          setRating(details.rating);
        }

        if (user) {
          const sub = await StudentService.getSubscription(user.id, channelId);
          setSubscription(sub);

          // Load progress & messages
          const prog = await StudentService.getStudentProgress(user.id, channelId);
          setStudentProgress(prog);

          const msgs = await StudentService.getMessagesFromTeacher(user.id, channelId);
          setTeacherMessages(msgs);
        }

        // Auto-open subscribe modal if URL has ?action=subscribe
        if (searchParams.get('action') === 'subscribe') {
          setIsPackageModalOpen(true);
        }
      } catch (err) {
        console.error('Error loading channel details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [channelId, searchParams, supabase]);

  // Handle Video Click (Demo vs Subscribed vs Locked)
  const handleContentVideoClick = async (video: VideoContentItem) => {
    if (video.is_demo || subscription) {
      router.push(`/watch/video/${video.id}?channelId=${channelId}`);
    } else {
      // Locked Paid Content -> Show Subscribe / Payment Info popup
      if (!currentUser) {
        openAuthModal('login', 'Please sign in or create an account to view this lesson.');
        return;
      }
      setIsPackageModalOpen(true);
    }
  };

  // Handle Quiz / Homework / Live Click
  const handleInteractiveContentClick = async (
    type: 'quiz' | 'homework',
    contentId: string
  ) => {
    if (subscription && currentUser) {
      // If quiz, redirect to the actual quiz UI player
      if (type === 'quiz') {
        router.push(`/student/quiz/${contentId}`);
        return;
      }

      // Otherwise for homework, simply toggle / mark as completed
      const currentStatus = studentProgress.progressMap[contentId];
      const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
      await StudentService.updateContentProgress({
        studentId: currentUser.id,
        channelId,
        contentType: type,
        contentId,
        status: newStatus,
      });
      const updatedProg = await StudentService.getStudentProgress(currentUser.id, channelId);
      setStudentProgress(updatedProg);
    } else {
      // Locked Paid Content -> Show Subscribe / Payment Info popup
      if (!currentUser) {
        openAuthModal('login', 'Please sign in or create an account to view this content.');
        return;
      }
      setIsPackageModalOpen(true);
    }
  };

  // Handle Subscription Package Submission
  const handleConfirmPackageSelection = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setProcessingSubscribe(true);
    setSubscriptionSuccess(null);

    try {
      const primarySpecialization = channel?.specializations?.[0] || 'Subject';
      const sub = await StudentService.subscribeToPackage({
        studentId: currentUser.id,
        channelId,
        packageType: selectedPackage,
        classId: channel?.class_id || channel?.class?.id,
        subjectName: primarySpecialization,
      });

      setSubscription(sub);
      setSubscriberCount((prev) => prev + 1);
      setSubscriptionSuccess('Package selected successfully! Content unlocked.');

      // Reload progress & messages
      const prog = await StudentService.getStudentProgress(currentUser.id, channelId);
      setStudentProgress(prog);

      setTimeout(() => {
        setIsPackageModalOpen(false);
        setSubscriptionSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Error subscribing:', err);
    } finally {
      setProcessingSubscribe(false);
    }
  };

  // Handle Teacher Message Completion
  const handleMarkProcessComplete = async (messageId: string) => {
    if (!currentUser) return;
    await StudentService.markMessageCompleted(messageId);
    const updatedMsgs = await StudentService.getMessagesFromTeacher(currentUser.id, channelId);
    setTeacherMessages(updatedMsgs);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded-3xl" />
            <div className="h-80 bg-neutral-200 dark:bg-neutral-800 rounded-3xl" />
            <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold">Channel Not Found</h1>
          <p className="text-sm text-neutral-500">
            The teacher channel you requested does not exist or is currently inactive.
          </p>
          <Link href="/student">
            <Button variant="outline">Return to Student Dashboard</Button>
          </Link>
        </main>
      </div>
    );
  }

  const isSubscribed = Boolean(subscription);
  const displayedDemo = activePlayableVideo || demoVideo;

  // Multiple subjects check (Requirement 4: Subject filter only if multiple subjects exist)
  const availableSubjects = channel.specializations && channel.specializations.length > 0
    ? channel.specializations
    : [];
  const hasMultipleSubjects = availableSubjects.length > 1;

  // Filter units according to active subject filter
  const filteredUnits = filterSubject === 'all'
    ? units
    : units.filter(
        (u) => u.subject_name.toLowerCase() === filterSubject.toLowerCase()
      );

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href="/student"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Student Discovery
          </Link>
        </div>

        {/* ======================================================================= */}
        {/* 1. CHANNEL INFORMATION AT TOP */}
        {/* ======================================================================= */}
        <div className="relative overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Teacher Image / Profile Photo */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-primary-500/40 p-1 bg-primary-50 dark:bg-primary-950/40 shrink-0">
                {channel.photo_url || teacher?.photo_url ? (
                  <Image
                    src={channel.photo_url || teacher?.photo_url || ''}
                    alt={channel.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover rounded-xl"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-950 rounded-xl">
                    <User className="w-10 h-10 text-primary-700 dark:text-primary-300" />
                  </div>
                )}
              </div>

              {/* Channel Meta & Specialist Tags */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white font-display">
                    {channel.name}
                  </h1>
                </div>

                {/* Specialist Tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {availableSubjects.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-primary-100 dark:bg-primary-950/60 text-primary-900 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                    >
                      {tag}
                    </span>
                  ))}
                  {channel.class && (
                    <Badge variant="outline" className="text-xs">
                      {channel.class.name}
                    </Badge>
                  )}
                  {channel.languages && channel.languages.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {channel.languages.join(', ')}
                    </Badge>
                  )}
                </div>

                {/* Subscribers & Rating Counter */}
                <div className="flex items-center gap-4 text-xs font-medium text-neutral-600 dark:text-neutral-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    <span>
                      <strong className="text-neutral-900 dark:text-neutral-200">{subscriberCount}</strong>{' '}
                      {subscriberCount === 1 ? 'Subscriber' : 'Subscribers'}
                    </span>
                  </div>

                  {rating !== null ? (
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{rating.toFixed(1)} ★</span>
                      <span className="text-neutral-400 font-normal">({reviews.length})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-neutral-400 text-xs">
                      <Star className="w-3.5 h-3.5" />
                      <span>5.0 ★</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Subscribe / Subscribed Status Button */}
            <div className="shrink-0">
              {isSubscribed ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-bold shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Subscribed ({subscription?.package_type?.replace('_', ' ')})</span>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    if (!currentUser) {
                      openAuthModal('login', 'Please sign in or create an account to subscribe to this teacher channel.');
                      return;
                    }
                    setIsPackageModalOpen(true);
                  }}
                  className="w-full sm:w-auto font-extrabold px-6 shadow-md shadow-primary-500/20 cursor-pointer"
                >
                  Subscribe
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* REQUIREMENT 4 — POST-SUBSCRIPTION: PROGRESS TRACKING BARS */}
        {/* ======================================================================= */}
        {isSubscribed && (
          <section className="p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2 font-display">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  Your Curriculum Learning Track
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Syllabus milestone and completion progress.
                </p>
              </div>

              <span className="text-sm font-extrabold text-primary-600 dark:text-primary-400 font-display">
                {studentProgress.overall.percentage}% Completed
              </span>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Overall Syllabus Progress</span>
                <span>{studentProgress.overall.completed} of {studentProgress.overall.total} Activities Done</span>
              </div>
              <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                  style={{ width: `${studentProgress.overall.percentage}%` }}
                />
              </div>
            </div>

            {/* Subject-Wise Progress Bars */}
            {Object.keys(studentProgress.bySubject).length > 0 && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Subject Completion
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(studentProgress.bySubject).map(([subj, data]) => (
                    <div
                      key={subj}
                      className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800 space-y-1.5"
                    >
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-neutral-900 dark:text-white">{subj}</span>
                        <span className="text-primary-600 dark:text-primary-400">{data.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-300"
                          style={{ width: `${data.percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-400 block text-right">
                        {data.completed} / {data.total} completed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ======================================================================= */}
        {/* REQUIREMENT 4 — PRE-SUBSCRIPTION: DEMO VIDEOS (REMOVED AFTER SUBSCRIPTION) */}
        {/* ======================================================================= */}
        {!isSubscribed && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2 font-display">
                <Play className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                Teacher Demo Video
              </h2>
              {displayedDemo?.is_demo && (
                <Badge variant="success" className="text-xs">
                  Free Demo Lecture
                </Badge>
              )}
            </div>

            <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-xl flex items-center justify-center">
              {displayedDemo ? (
                isPlayingDemo && (displayedDemo.mux_playback_id || displayedDemo.video_url) ? (
                  <div className="w-full h-full">
                    {displayedDemo.mux_playback_id && displayedDemo.mux_status === 'ready' ? (
                      <MuxVideoPlayer
                        playbackId={displayedDemo.mux_playback_id}
                        muxStatus={displayedDemo.mux_status}
                        title={displayedDemo.title}
                        thumbnailUrl={displayedDemo.thumbnail_url}
                      />
                    ) : displayedDemo.mux_status && displayedDemo.mux_status !== 'ready' ? (
                      <MuxVideoPlayer
                        playbackId={null}
                        muxStatus={displayedDemo.mux_status}
                        title={displayedDemo.title}
                      />
                    ) : displayedDemo.video_url ? (
                      <video
                        src={displayedDemo.video_url}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <MuxVideoPlayer
                        playbackId={null}
                        muxStatus={null}
                        title={displayedDemo.title}
                      />
                    )}
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {displayedDemo.thumbnail_url ? (
                      <Image
                        src={displayedDemo.thumbnail_url}
                        alt={displayedDemo.title}
                        fill
                        className="object-cover opacity-60"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-neutral-900 to-neutral-950 opacity-90" />
                    )}

                    {/* Play Demo Hero Button */}
                    <div className="relative z-10 text-center space-y-4 px-4">
                      <button
                        type="button"
                        onClick={() => setIsPlayingDemo(true)}
                        className="w-20 h-20 rounded-full bg-primary-500 hover:bg-primary-400 text-neutral-950 flex items-center justify-center mx-auto shadow-2xl shadow-primary-500/50 hover:scale-110 transition-all cursor-pointer group"
                        title="Play Demo Video"
                      >
                        <Play className="w-9 h-9 fill-current translate-x-0.5 group-hover:scale-105 transition-transform" />
                      </button>
                      <div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-white">
                          {displayedDemo.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto mt-1">
                          Watch this lecture to experience {channel.name}&apos;s interactive teaching methodology.
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-8 text-center text-neutral-400 space-y-2">
                  <Video className="w-10 h-10 mx-auto opacity-50" />
                  <p className="text-sm font-semibold">
                    Teacher has not published a free demo video yet.
                  </p>
                  <p className="text-xs text-neutral-500">
                    You can explore the curriculum units and topics below.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ======================================================================= */}
        {/* REQUIREMENT 4: SUBJECT FILTER (ONLY IF MULTIPLE SUBJECTS EXIST) */}
        {/* ======================================================================= */}
        {hasMultipleSubjects && (
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 mr-1">
              Filter Subject:
            </span>
            <button
              type="button"
              onClick={() => setFilterSubject('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterSubject === 'all'
                  ? 'bg-primary-500 text-neutral-950 shadow-xs'
                  : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400'
              }`}
            >
              All Subjects
            </button>
            {availableSubjects.map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setFilterSubject(subj)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterSubject.toLowerCase() === subj.toLowerCase()
                    ? 'bg-primary-500 text-neutral-950 shadow-xs'
                    : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        )}

        {/* ======================================================================= */}
        {/* REQUIREMENT 4: CONTENT LISTING WITH 1.5 UNITS INITIAL EXPANDABLE PREVIEW */}
        {/* ======================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2 font-display">
              <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              {isSubscribed ? 'Curriculum Units & Study Material' : 'Curriculum Units & Syllabus'}
            </h2>
            <span className="text-xs text-neutral-500">
              {filteredUnits.length} {filteredUnits.length === 1 ? 'Unit' : 'Units'}
            </span>
          </div>

          {filteredUnits.length > 0 ? (
            <div className="relative">
              {/* Expandable Container: Initially clips at ~1.5 units if not expanded */}
              <div
                className={`space-y-4 transition-all duration-300 ${
                  !isContentExpanded && filteredUnits.length > 1
                    ? 'max-h-[580px] overflow-hidden'
                    : 'max-h-none'
                }`}
              >
                {filteredUnits.map((unit, uIdx) => {
                  const unitVideos = videos.filter((v) => v.unit_id === unit.id);

                  const unitQuizzes = quizzes.filter((q) => q.unit_id === unit.id);
                  const unitHomework = homework.filter((h) => h.unit_id === unit.id);

                  return (
                    <Card
                      key={unit.id}
                      className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-xs"
                    >
                      {/* Unit Header */}
                      <div className="p-5 sm:p-6 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-950/40">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-400">
                                Unit {unit.unit_number || uIdx + 1}
                              </span>
                              {unit.subject_name && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {unit.subject_name}
                                </Badge>
                              )}
                            </div>
                            <h3 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white font-display">
                              {unit.title}
                            </h3>
                            {unit.description && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {unit.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Topics inside unit */}
                        {unit.topics && unit.topics.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-3">
                            <span className="text-[11px] font-semibold text-neutral-400">Topics:</span>
                            {unit.topics.map((t, tIdx) => (
                              <span
                                key={t.id || tIdx}
                                className="px-2 py-0.5 rounded-md text-[11px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                              >
                                {t.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Unit Content Items */}
                      <CardContent className="p-4 sm:p-6 space-y-2.5">
                        {/* Videos */}
                        {unitVideos.map((video) => {
                          const canPlay = video.is_demo || isSubscribed;
                          const isCompleted = studentProgress.progressMap[video.id] === 'completed';

                          return (
                            <div
                              key={video.id}
                              onClick={() => handleContentVideoClick(video)}
                              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                canPlay
                                  ? 'border-primary-200 dark:border-primary-800/60 bg-primary-50/20 dark:bg-primary-950/10 hover:border-primary-400'
                                  : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/10 hover:border-neutral-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isCompleted
                                      ? 'bg-emerald-500 text-white'
                                      : canPlay
                                      ? 'bg-primary-500 text-neutral-950 shadow-xs'
                                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                                  }`}
                                >
                                  {isCompleted ? <Check className="w-5 h-5" /> : <Video className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                                    {video.title}
                                  </h4>
                                  {video.duration_seconds && (
                                    <span className="text-[11px] text-neutral-400">
                                      {Math.floor(video.duration_seconds / 60)} mins
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Badges: Free Demo vs Unlocked/Completed vs Locked */}
                              <div>
                                {video.is_demo ? (
                                  <Badge variant="success" className="flex items-center gap-1 text-xs">
                                    <Play className="w-3 h-3 fill-current" />
                                    ▶ Free Demo
                                  </Badge>
                                ) : isSubscribed ? (
                                  isCompleted ? (
                                    <Badge variant="success" className="text-xs flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Done
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-primary-600">
                                      Watch Lesson
                                    </Badge>
                                  )
                                ) : (
                                  <Badge variant="outline" className="flex items-center gap-1 text-xs text-neutral-500">
                                    <Lock className="w-3 h-3 text-neutral-400" />
                                    🔒 Locked
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}



                        {/* Quizzes */}
                        {unitQuizzes.map((quiz) => {
                          const isCompleted = studentProgress.progressMap[quiz.id] === 'completed';

                          return (
                            <div
                              key={quiz.id}
                              onClick={() => handleInteractiveContentClick('quiz', quiz.id)}
                              className="flex items-center justify-between p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isCompleted
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-amber-500 text-neutral-950'
                                  }`}
                                >
                                  {isCompleted ? <Check className="w-5 h-5" /> : <HelpCircle className="w-4 h-4" />}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                    🧪 Interactive Quiz — {quiz.title}
                                  </h4>
                                  <span className="text-[11px] text-neutral-500">
                                    Total Marks: {quiz.total_marks} marks
                                  </span>
                                </div>
                              </div>
                              {isSubscribed ? (
                                isCompleted ? (
                                  <Badge variant="success" className="text-xs">
                                    ✓ Submitted
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-amber-600">
                                    Take Quiz
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1 text-xs text-neutral-500">
                                  <Lock className="w-3 h-3" />
                                  🔒 Locked
                                </Badge>
                              )}
                            </div>
                          );
                        })}

                        {/* Homework */}
                        {unitHomework.map((hw) => {
                          const isCompleted = studentProgress.progressMap[hw.id] === 'completed';

                          return (
                            <div
                              key={hw.id}
                              onClick={() => handleInteractiveContentClick('homework', hw.id)}
                              className="flex items-center justify-between p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10 cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isCompleted
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-blue-500 text-white'
                                  }`}
                                >
                                  {isCompleted ? <Check className="w-5 h-5" /> : <FileText className="w-4 h-4" />}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                    📝 Homework Assignment — {hw.title}
                                  </h4>
                                  {hw.due_date && (
                                    <span className="text-[11px] text-neutral-500">
                                      Due by: {hw.due_date}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSubscribed ? (
                                isCompleted ? (
                                  <Badge variant="success" className="text-xs">
                                    ✓ Completed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-blue-600">
                                    Open Task
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1 text-xs text-neutral-500">
                                  <Lock className="w-3 h-3" />
                                  🔒 Locked
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Merge / Fade Bottom Overlay with Expand Button */}
              {!isContentExpanded && filteredUnits.length > 1 ? (
                <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-neutral-50 dark:from-neutral-950 via-neutral-50/90 dark:via-neutral-950/90 to-transparent flex items-end justify-center pb-4 pointer-events-auto">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setIsContentExpanded(true)}
                    className="flex items-center gap-2 font-bold shadow-xl border-neutral-300 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md cursor-pointer hover:scale-105 transition-all"
                  >
                    <span>Expand Full Syllabus ({filteredUnits.length} Units)</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              ) : filteredUnits.length > 1 ? (
                <div className="pt-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsContentExpanded(false)}
                    className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  >
                    <ChevronUp className="w-4 h-4 mr-1.5" />
                    Collapse Units
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-12 text-center rounded-3xl">
              <p className="text-xs text-neutral-500">
                Teacher has not published units for this subject yet.
              </p>
            </Card>
          )}
        </section>

        {/* ======================================================================= */}
        {/* REQUIREMENT 4: “FROM TEACHER” SECTION */}
        {/* ======================================================================= */}
        <section className="p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white font-display">
                  From Teacher
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Direct activities, concept instructions, and tasks assigned to you.
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-xs">
              {teacherMessages.length} {teacherMessages.length === 1 ? 'Notice' : 'Notices'}
            </Badge>
          </div>

          {teacherMessages.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/40 border border-dashed border-neutral-200 dark:border-neutral-800 space-y-1">
              <Clock className="w-6 h-6 text-neutral-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                No active teacher instructions at the moment
              </p>
              <p className="text-[11px] text-neutral-400">
                Activities sent by {channel.name} will appear here for you to review and mark as completed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {teacherMessages.map((msg) => {
                const isDone = msg.status === 'completed';

                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isDone
                        ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-primary-200 dark:border-primary-800/60 bg-primary-50/20 dark:bg-primary-950/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                          {msg.title}
                        </h4>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                          {msg.action_type || 'Instruction'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {msg.content}
                      </p>
                    </div>

                    <div className="shrink-0 self-end sm:self-center">
                      {msg.action_type === 'message' ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium border border-neutral-200 dark:border-neutral-700">
                          <MessageSquare className="w-4 h-4" />
                          Message
                        </div>
                      ) : isDone ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ✓ Task Done
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleMarkProcessComplete(msg.id)}
                          className="flex items-center gap-1.5 text-xs shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark as Done
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ======================================================================= */}
        {/* REVIEWS SECTION */}
        {/* ======================================================================= */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-neutral-950 dark:text-white font-display">
            Student Reviews ({reviews.length})
          </h2>
          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev) => (
                <Card key={rev.id} className="p-5 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">
                      {rev.student_name || 'Enrolled Student'}
                    </span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{rev.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    &ldquo;{rev.review_text}&rdquo;
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 rounded-2xl text-center">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Reviews will appear here once students start learning.
              </p>
            </Card>
          )}
        </section>
      </main>

      {/* ========================================================================= */}
      {/* MODAL: SUBSCRIBE / PAYMENT INFO POPUP */}
      {/* ========================================================================= */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <Badge variant="primary" className="text-[10px] uppercase font-bold tracking-wider mb-1">
                  Subscription / Package Options
                </Badge>
                <h3 className="text-lg font-extrabold text-neutral-900 dark:text-white font-display">
                  Unlock {channel.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: 3 Package Options */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {subscriptionSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  {subscriptionSuccess}
                </div>
              )}

              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Select your preferred learning plan. Choose full channel access, class-specific curriculum, or targeted subject mastery.
              </p>

              <div className="space-y-3">
                {/* 1. Entire Channel */}
                <div
                  onClick={() => setSelectedPackage('entire_channel')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedPackage === 'entire_channel'
                      ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 shadow-md shadow-primary-500/10'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPackage === 'entire_channel'
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-neutral-400'
                        }`}
                      >
                        {selectedPackage === 'entire_channel' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="font-extrabold text-sm text-neutral-900 dark:text-white">
                        Entire Channel Access
                      </span>
                    </div>
                    <span className="font-extrabold text-base text-primary-700 dark:text-primary-400">
                      ₹999 <span className="text-xs font-normal text-neutral-400">/ mo</span>
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 pl-6">
                    Full access to all units, videos, quizzes, and homework across the entire channel.
                  </p>
                </div>

                {/* 2. Particular Class */}
                <div
                  onClick={() => setSelectedPackage('particular_class')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedPackage === 'particular_class'
                      ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 shadow-md shadow-primary-500/10'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPackage === 'particular_class'
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-neutral-400'
                        }`}
                      >
                        {selectedPackage === 'particular_class' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="font-extrabold text-sm text-neutral-900 dark:text-white">
                        Particular Class ({channel.class?.name || 'Enrolled Class'})
                      </span>
                    </div>
                    <span className="font-extrabold text-base text-primary-700 dark:text-primary-400">
                      ₹699 <span className="text-xs font-normal text-neutral-400">/ mo</span>
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 pl-6">
                    Focused curriculum access designed exclusively for {channel.class?.name || 'this class'}.
                  </p>
                </div>

                {/* 3. Particular Class + Subject */}
                <div
                  onClick={() => setSelectedPackage('class_subject')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedPackage === 'class_subject'
                      ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 shadow-md shadow-primary-500/10'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPackage === 'class_subject'
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-neutral-400'
                        }`}
                      >
                        {selectedPackage === 'class_subject' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="font-extrabold text-sm text-neutral-900 dark:text-white">
                        Class + Subject Mastery ({channel.specializations?.[0] || 'Subject'})
                      </span>
                    </div>
                    <span className="font-extrabold text-base text-primary-700 dark:text-primary-400">
                      ₹499 <span className="text-xs font-normal text-neutral-400">/ mo</span>
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 pl-6">
                    Specialized single-subject bundle including all test series, notes, and homework for {channel.specializations?.[0] || 'Subject'}.
                  </p>
                </div>
              </div>

              {/* Ready for future payment note */}
              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-primary-600 mt-0.5" />
                <span>
                  Payment integration gateway will be connected in the Payment Phase. Selecting a package now immediately activates your learning entitlement.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPackageModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirmPackageSelection}
                isLoading={processingSubscribe}
                className="font-bold px-5"
              >
                Select Package
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChannelDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
      </div>
    }>
      <ChannelDetailContent />
    </Suspense>
  );
}
