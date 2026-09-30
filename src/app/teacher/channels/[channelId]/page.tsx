'use client';

import React, { useState, useEffect, useMemo, use, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Tv,
  Video,
  FileQuestion,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  BookOpen,
  MoreVertical,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  ChannelItem,
  UnitItem,
  VideoContentItem,
  QuizItem,
  HomeworkItem,
} from '@/types';
import { TeacherService } from '@/lib/teacher-service';
import { VideoCreationModal } from '@/components/teacher/VideoCreationModal';
import { QuizCreationModal } from '@/components/teacher/QuizCreationModal';
import { HomeworkCreationModal } from '@/components/teacher/HomeworkCreationModal';

export default function ChannelStudioPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const unwrappedParams = use(params);
  const channelId = unwrappedParams.channelId;
  const router = useRouter();
  const supabase = createClient();

  // Channel & Teacher State
  const [channel, setChannel] = useState<ChannelItem | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected Subject Tab
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // Units created by THIS teacher for THIS channel and THIS subject
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Channel Content Items
  const [videos, setVideos] = useState<VideoContentItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);

  // Expanded Units in the accordion
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  // Active Dropdown Menus (controlled by unit ID or content ID)
  const [activePlusMenuUnitId, setActivePlusMenuUnitId] = useState<string | null>(null);
  const [activeDotsMenuUnitId, setActiveDotsMenuUnitId] = useState<string | null>(null);
  const [activeDotsMenuContentId, setActiveDotsMenuContentId] = useState<string | null>(null);

  // Content Creation Modals State
  const [selectedUnitForContent, setSelectedUnitForContent] = useState<UnitItem | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);

  // Create Unit Modal State
  const [createUnitModalOpen, setCreateUnitModalOpen] = useState(false);
  const [unitTitleInput, setUnitTitleInput] = useState('');
  const [unitDescInput, setUnitDescInput] = useState('');
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [unitCreateError, setUnitCreateError] = useState<string | null>(null);

  // Content Delete Modal State (Typed Confirmation)
  const [contentToDelete, setContentToDelete] = useState<{
    id: string;
    title: string;
    type: 'video' | 'quiz' | 'homework';
  } | null>(null);
  const [contentDeleteInput, setContentDeleteInput] = useState('');
  const [deletingContent, setDeletingContent] = useState(false);

  // Unit Delete Modal State (Two-Stage Confirmation)
  const [unitToDelete, setUnitToDelete] = useState<UnitItem | null>(null);
  const [unitDeleteStage, setUnitDeleteStage] = useState<1 | 2>(1);
  const [unitDeleteInput, setUnitDeleteInput] = useState('');
  const [deletingUnit, setDeletingUnit] = useState(false);

  // Load Channel and Content
  const refreshChannelAndContent = useCallback(async () => {
    try {
      const ch = await TeacherService.getChannelById(channelId);
      if (ch) setChannel(ch);

      const [vids, qzs, hws] = await Promise.all([
        TeacherService.getChannelVideos(channelId),
        TeacherService.getChannelQuizzes(channelId),
        TeacherService.getChannelHomework(channelId),
      ]);

      setVideos(vids);
      setQuizzes(qzs);
      setHomework(hws);
    } catch (err) {
      console.error('Failed to refresh channel data', err);
    }
  }, [channelId]);

  // Polling for processing videos
  useEffect(() => {
    const hasPendingVideos = videos.some(
      v => v.mux_status === 'waiting' || v.mux_status === 'uploading' || v.mux_status === 'processing'
    );

    if (hasPendingVideos) {
      const interval = setInterval(() => {
        refreshChannelAndContent();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [videos, refreshChannelAndContent]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    async function loadInit() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        if (!isMounted) return;
        setTeacherId(user.id);

        const ch = await TeacherService.getChannelById(channelId);
        if (!isMounted || !ch) {
          if (isMounted) setLoading(false);
          return;
        }
        setChannel(ch);

        if (ch.specializations && ch.specializations.length > 0) {
          setSelectedSubject(ch.specializations[0]);
        } else {
          setSelectedSubject('General');
        }

        const [vids, qzs, hws] = await Promise.all([
          TeacherService.getChannelVideos(channelId),
          TeacherService.getChannelQuizzes(channelId),
          TeacherService.getChannelHomework(channelId),
        ]);

        if (isMounted) {
          setVideos(vids);
          setQuizzes(qzs);
          setHomework(hws);
        }
      } catch (err) {
        console.error('Failed to load channel data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadInit();
    return () => {
      isMounted = false;
    };
  }, [channelId, router, supabase]);

  // Load Units for the currently selected subject (Teacher + Channel + Subject owned)
  const refreshUnitsForSubject = useCallback(async () => {
    if (!channelId || !selectedSubject) return;
    try {
      setLoadingUnits(true);
      const subjectUnits = await TeacherService.getUnits(channelId, selectedSubject);
      setUnits(subjectUnits);

      const initialExpanded: Record<string, boolean> = {};
      subjectUnits.forEach(u => {
        initialExpanded[u.id] = true;
      });
      setExpandedUnits(prev => ({ ...initialExpanded, ...prev }));
    } catch (err) {
      console.error('Failed to load units for subject', err);
    } finally {
      setLoadingUnits(false);
    }
  }, [channelId, selectedSubject]);

  useEffect(() => {
    let isMounted = true;
    if (!channelId || !selectedSubject) return;

    async function loadUnits() {
      try {
        setLoadingUnits(true);
        const subjectUnits = await TeacherService.getUnits(channelId, selectedSubject);
        if (!isMounted) return;
        setUnits(subjectUnits);

        const initialExpanded: Record<string, boolean> = {};
        subjectUnits.forEach(u => {
          initialExpanded[u.id] = true;
        });
        setExpandedUnits(prev => ({ ...initialExpanded, ...prev }));
      } catch (err) {
        console.error('Failed to load units for subject', err);
      } finally {
        if (isMounted) setLoadingUnits(false);
      }
    }

    loadUnits();
    return () => {
      isMounted = false;
    };
  }, [channelId, selectedSubject]);

  // Close open dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActivePlusMenuUnitId(null);
      setActiveDotsMenuUnitId(null);
      setActiveDotsMenuContentId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Primary Class Name of this Channel (ONE CHANNEL = ONE CLASS)
  const channelClassName = useMemo(() => {
    if (channel?.class?.name) return channel.class.name;
    if (channel?.classes && channel.classes.length > 0) return channel.classes[0].name;
    return 'Assigned Class';
  }, [channel]);

  const channelClassId = useMemo(() => {
    if (channel?.class_id) return channel.class_id;
    if (channel?.classes && channel.classes.length > 0) return channel.classes[0].id;
    return '';
  }, [channel]);

  // Handle Unit Toggle Accordion
  const toggleUnitAccordion = (unitId: string) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  // Content triggering from Unit [+] Menu
  const handleOpenContentModal = (
    unit: UnitItem,
    type: 'video' | 'quiz' | 'homework'
  ) => {
    setSelectedUnitForContent(unit);
    setActivePlusMenuUnitId(null);

    if (type === 'video') setVideoModalOpen(true);
    else if (type === 'quiz') setQuizModalOpen(true);
    else if (type === 'homework') setHomeworkModalOpen(true);
  };

  // Create Unit Submission
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitTitleInput.trim()) {
      setUnitCreateError('Unit name is required.');
      return;
    }
    if (!teacherId || !channel) {
      setUnitCreateError('Session expired. Please log in again.');
      return;
    }

    setCreatingUnit(true);
    setUnitCreateError(null);

    try {
      await TeacherService.createUnit({
        channelId: channel.id,
        teacherId,
        classId: channelClassId,
        boardId: channel.boards?.[0]?.id,
        subjectName: selectedSubject,
        title: unitTitleInput.trim(),
        description: unitDescInput.trim() || null,
        unitNumber: units.length + 1,
      });

      setUnitTitleInput('');
      setUnitDescInput('');
      setCreateUnitModalOpen(false);
      await refreshUnitsForSubject();
    } catch (err: unknown) {
      console.error('Error creating unit', err);
      setUnitCreateError((err as Error).message || 'Failed to create unit.');
    } finally {
      setCreatingUnit(false);
    }
  };

  // Content Delete Execution (Requirement 20: Typed content name confirmation)
  const handleExecuteContentDelete = async () => {
    if (!contentToDelete) return;
    if (contentDeleteInput.trim() !== contentToDelete.title.trim()) return;

    setDeletingContent(true);
    try {
      await TeacherService.deleteContent(contentToDelete.type, contentToDelete.id);
      setContentToDelete(null);
      setContentDeleteInput('');
      await refreshChannelAndContent();
    } catch (err) {
      console.error('Failed to delete content', err);
    } finally {
      setDeletingContent(false);
    }
  };

  // Unit Delete Execution (Requirements 21 & 22: Two-stage typed confirmation + safe cascade)
  const handleExecuteUnitDelete = async () => {
    if (!unitToDelete) return;
    if (unitDeleteInput.trim() !== unitToDelete.title.trim()) return;

    setDeletingUnit(true);
    try {
      await TeacherService.deleteUnit(unitToDelete.id);
      setUnitToDelete(null);
      setUnitDeleteStage(1);
      setUnitDeleteInput('');
      await refreshUnitsForSubject();
      await refreshChannelAndContent();
    } catch (err) {
      console.error('Failed to delete unit', err);
    } finally {
      setDeletingUnit(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-xs font-semibold text-neutral-500">Loading channel studio...</p>
        </main>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-20 text-center">
          <Tv className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold font-heading mb-2">Channel Not Found</h1>
          <p className="text-sm text-neutral-500 mb-6">
            The requested teaching channel does not exist or you do not have permission to manage it.
          </p>
          <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/teacher">Back to Teacher Studio</Link>
          </Button>
        </main>
      </div>
    );
  }

  // Available subjects for this channel
  const channelSubjects = channel.specializations && channel.specializations.length > 0
    ? channel.specializations
    : ['General'];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/teacher"
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Channels
          </Link>
        </div>

        {/* CHANNEL HEADER CARD */}
        <Card className="border-neutral-200 dark:border-neutral-800 shadow-md rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 mb-8">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 shrink-0 flex items-center justify-center">
                {channel.photo_url ? (
                  <Image
                    src={channel.photo_url}
                    alt={channel.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <Tv className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h1 className="text-2xl sm:text-3xl font-bold font-heading text-neutral-900 dark:text-white truncate">
                    {channel.name}
                  </h1>
                  {/* ONE CHANNEL = ONE CLASS BADGE */}
                  <Badge className="bg-emerald-600 text-white rounded-lg text-xs font-bold px-3 py-0.5">
                    <GraduationCap className="w-3.5 h-3.5 mr-1" />
                    {channelClassName}
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 max-w-3xl leading-relaxed mb-3">
                  {channel.description}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-500">
                  {channel.boards && channel.boards.length > 0 && (
                    <Badge variant="outline" className="rounded-lg text-[11px]">
                      {channel.boards.map(b => b.name).join(', ')}
                    </Badge>
                  )}
                  {channel.languages && channel.languages.length > 0 && (
                    <Badge variant="secondary" className="rounded-lg text-[11px]">
                      {channel.languages.join(' • ')}
                    </Badge>
                  )}
                  <span className="text-neutral-300 dark:text-neutral-700">|</span>
                  <span>{videos.length} Videos</span>
                  <span>•</span>
                  <span>{quizzes.length} Quizzes</span>
                  <span>•</span>
                  <span>{homework.length} Homework</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SUBJECT-BY-SUBJECT STUDIO BAR (Requirement 6) */}
        <div className="space-y-6">
          <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Subjects in this Channel
              </span>
              <span className="text-xs text-neutral-500">
                Class: <strong className="text-neutral-900 dark:text-white">{channelClassName}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {channelSubjects.map(sub => {
                const isSelected = selectedSubject.toLowerCase() === sub.toLowerCase();
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold font-heading transition-all whitespace-nowrap flex items-center gap-2 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-600/30'
                        : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>

          {/* UNIT LIST FOR THE SELECTED SUBJECT */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>{selectedSubject} Units</span>
                  <Badge variant="secondary" className="rounded-lg text-xs font-semibold">
                    {units.length}
                  </Badge>
                </h2>
                <p className="text-xs text-neutral-500">
                  Manage your lesson units and educational materials for {selectedSubject}
                </p>
              </div>

              <Button
                type="button"
                onClick={() => setCreateUnitModalOpen(true)}
                className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 h-9"
              >
                <Plus className="w-4 h-4" />
                Create Unit
              </Button>
            </div>

            {loadingUnits ? (
              <div className="p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                <p className="text-xs text-neutral-500">Loading units...</p>
              </div>
            ) : units.length === 0 ? (
              /* EMPTY STATE: No pre-created units! (Requirement 5) */
              <Card className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl p-10 text-center bg-white/50 dark:bg-neutral-900/50">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold font-heading text-neutral-900 dark:text-white mb-1">
                  No units created yet for {selectedSubject}
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto mb-6">
                  You have not created any units for this subject yet. Create your first unit to start adding videos, quizzes, and homework.
                </p>
                <Button
                  type="button"
                  onClick={() => setCreateUnitModalOpen(true)}
                  className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Create First Unit
                </Button>
              </Card>
            ) : (
              /* TEACHER-CREATED UNITS LIST (Requirements 7, 10, 11) */
              <div className="space-y-4">
                {units.map((unit, uIdx) => {
                  const unitVideos = videos.filter(v => v.unit_id === unit.id);
                  const unitQuizzes = quizzes.filter(q => q.unit_id === unit.id);
                  const unitHomework = homework.filter(h => h.unit_id === unit.id);
                  const totalItems = unitVideos.length + unitQuizzes.length + unitHomework.length;
                  const isExpanded = !!expandedUnits[unit.id];

                  return (
                    <Card
                      key={unit.id}
                      className="border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow rounded-3xl overflow-hidden bg-white dark:bg-neutral-900"
                    >
                      <CardContent className="p-0">
                        {/* Unit Title Bar */}
                        <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/60">
                          <button
                            type="button"
                            onClick={() => toggleUnitAccordion(unit.id)}
                            className="flex items-center gap-3 text-left flex-1 min-w-0 group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                              {unit.unit_number || uIdx + 1}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm sm:text-base font-bold font-heading text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                                {unit.title}
                              </h3>
                              {unit.description && (
                                <p className="text-xs text-neutral-500 truncate max-w-xl">
                                  {unit.description}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-neutral-400 ml-2 shrink-0">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                          </button>

                          {/* Unit Actions: [+] Menu and [⋮] Options */}
                          <div className="flex items-center gap-2 relative shrink-0">
                            <Badge variant="secondary" className="text-[11px] font-semibold rounded-lg hidden sm:inline-flex">
                              {totalItems} Items
                            </Badge>

                            {/* [+] ACTION BUTTON (Requirement 10: Opens small dropdown) */}
                            <div className="relative">
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePlusMenuUnitId(activePlusMenuUnitId === unit.id ? null : unit.id);
                                  setActiveDotsMenuUnitId(null);
                                }}
                                className="w-8 h-8 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                title="Add Content to this Unit"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>

                              {/* Small [+] Dropdown */}
                              {activePlusMenuUnitId === unit.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-10 w-48 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleOpenContentModal(unit, 'video')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 transition-colors"
                                  >
                                    <Video className="w-3.5 h-3.5 text-blue-500" />
                                    Add Video
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenContentModal(unit, 'quiz')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 transition-colors"
                                  >
                                    <FileQuestion className="w-3.5 h-3.5 text-purple-500" />
                                    Create Quiz
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenContentModal(unit, 'homework')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                                    Assign HW
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* [⋮] UNIT MENU (Delete Unit with 2-stage confirmation) */}
                            <div className="relative">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDotsMenuUnitId(activeDotsMenuUnitId === unit.id ? null : unit.id);
                                  setActivePlusMenuUnitId(null);
                                }}
                                className="w-8 h-8 p-0 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>

                              {activeDotsMenuUnitId === unit.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-10 w-44 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-1.5 z-30"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUnitToDelete(unit);
                                      setUnitDeleteStage(1);
                                      setUnitDeleteInput('');
                                      setActiveDotsMenuUnitId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Unit
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Accordion Body: Content items inside this Unit */}
                        {isExpanded && (
                          <div className="p-4 sm:p-5 space-y-3">
                            {totalItems === 0 ? (
                              <div className="py-6 text-center text-xs text-neutral-400">
                                No educational content added to this unit yet.
                                <br />
                                Click <strong className="text-emerald-600">[ + ]</strong> above to add a video, quiz, or homework.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {/* Videos */}
                                {unitVideos.map(vid => (
                                  <div
                                    key={vid.id}
                                    className="flex items-center justify-between p-3 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Video className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                                          {vid.title}
                                        </p>
                                        <p className="text-[11px] text-neutral-400">
                                          Video Lesson {vid.is_demo ? '• Free Demo' : ''} 
                                          {vid.mux_status && vid.mux_status !== 'ready' && (
                                            <span className="text-amber-500 font-semibold ml-1">
                                              • {vid.mux_status === 'uploading' ? 'Uploading...' : 
                                                 vid.mux_status === 'processing' ? 'Processing...' : 
                                                 vid.mux_status === 'waiting' ? 'Waiting...' : 
                                                 vid.mux_status === 'errored' ? 'Failed' : vid.mux_status}
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {vid.mux_status === 'processing' || vid.mux_status === 'uploading' || vid.mux_status === 'waiting' ? (
                                        <Badge variant="outline" className="text-[10px] rounded-md text-amber-600 border-amber-300 flex items-center gap-1">
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                          Processing
                                        </Badge>
                                      ) : vid.mux_status === 'errored' ? (
                                        <Badge variant="outline" className="text-[10px] rounded-md text-red-600 border-red-300">
                                          Error
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] rounded-md ${
                                            vid.is_published
                                              ? 'text-emerald-600 border-emerald-300 dark:border-emerald-800'
                                              : 'text-neutral-400'
                                          }`}
                                        >
                                          {vid.is_published ? 'Published' : 'Draft'}
                                        </Badge>
                                      )}

                                      <div className="relative">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDotsMenuContentId(activeDotsMenuContentId === vid.id ? null : vid.id);
                                          }}
                                          className="w-7 h-7 p-0 rounded-lg text-neutral-400"
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </Button>

                                        {activeDotsMenuContentId === vid.id && (
                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute right-0 top-8 w-36 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl p-1 z-30"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setContentToDelete({ id: vid.id, title: vid.title, type: 'video' });
                                                setContentDeleteInput('');
                                                setActiveDotsMenuContentId(null);
                                              }}
                                              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* Quizzes */}
                                {unitQuizzes.map(quiz => (
                                  <div
                                    key={quiz.id}
                                    className="flex items-center justify-between p-3 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                        <FileQuestion className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                                          {quiz.title}
                                        </p>
                                        <p className="text-[11px] text-neutral-400">
                                          Quiz • {quiz.total_marks} Marks
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] rounded-md ${
                                          quiz.is_published
                                            ? 'text-purple-600 border-purple-300'
                                            : 'text-neutral-400'
                                        }`}
                                      >
                                        {quiz.is_published ? 'Published' : 'Draft'}
                                      </Badge>

                                      <div className="relative">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDotsMenuContentId(activeDotsMenuContentId === quiz.id ? null : quiz.id);
                                          }}
                                          className="w-7 h-7 p-0 rounded-lg text-neutral-400"
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </Button>

                                        {activeDotsMenuContentId === quiz.id && (
                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute right-0 top-8 w-36 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl p-1 z-30"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setContentToDelete({ id: quiz.id, title: quiz.title, type: 'quiz' });
                                                setContentDeleteInput('');
                                                setActiveDotsMenuContentId(null);
                                              }}
                                              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* Homework */}
                                {unitHomework.map(hw => (
                                  <div
                                    key={hw.id}
                                    className="flex items-center justify-between p-3 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                        <FileText className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                                          {hw.title}
                                        </p>
                                        <p className="text-[11px] text-neutral-400">
                                          Homework {hw.due_date ? `• Due ${hw.due_date}` : ''}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] rounded-md ${
                                          hw.is_published
                                            ? 'text-amber-600 border-amber-300'
                                            : 'text-neutral-400'
                                        }`}
                                      >
                                        {hw.is_published ? 'Assigned' : 'Draft'}
                                      </Badge>

                                      <div className="relative">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDotsMenuContentId(activeDotsMenuContentId === hw.id ? null : hw.id);
                                          }}
                                          className="w-7 h-7 p-0 rounded-lg text-neutral-400"
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </Button>

                                        {activeDotsMenuContentId === hw.id && (
                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute right-0 top-8 w-36 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl p-1 z-30"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setContentToDelete({ id: hw.id, title: hw.title, type: 'homework' });
                                                setContentDeleteInput('');
                                                setActiveDotsMenuContentId(null);
                                              }}
                                              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* BOTTOM [+ CREATE UNIT] BUTTON (Requirement 7) */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateUnitModalOpen(true)}
                    className="w-full py-6 rounded-3xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-neutral-600 dark:text-neutral-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-sm transition-all"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    + Create Unit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CREATE UNIT MODAL (Requirement 7: Asks only for Unit Name and optional Description) */}
      <Dialog open={createUnitModalOpen} onOpenChange={setCreateUnitModalOpen}>
        <DialogContent className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Create Unit in {selectedSubject}
            </DialogTitle>
            <p className="text-xs text-neutral-500">
              Channel: {channel.name} • {channelClassName}
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateUnit} className="space-y-4 pt-2">
            {unitCreateError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs">
                {unitCreateError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="unitName" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Unit Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="unitName"
                placeholder="e.g. Unit 1 — Electrostatics"
                value={unitTitleInput}
                onChange={e => setUnitTitleInput(e.target.value)}
                className="rounded-xl h-11 text-sm border-neutral-200 dark:border-neutral-800"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unitDesc" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Unit Description (Optional)
              </Label>
              <Textarea
                id="unitDesc"
                rows={3}
                placeholder="Core topics, learning outcomes, or syllabus references covered in this unit..."
                value={unitDescInput}
                onChange={e => setUnitDescInput(e.target.value)}
                className="rounded-xl text-xs border-neutral-200 dark:border-neutral-800"
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateUnitModalOpen(false)}
                disabled={creatingUnit}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingUnit || !unitTitleInput.trim()}
                className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                {creatingUnit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : (
                  'Create Unit'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONTENT DELETE MODAL (Requirement 20: Type exact content name to confirm) */}
      <Dialog
        open={!!contentToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setContentToDelete(null);
            setContentDeleteInput('');
          }
        }}
      >
        <DialogContent className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold font-heading text-neutral-900 dark:text-white">
              Delete Content?
            </DialogTitle>
            <p className="text-xs text-neutral-500">
              This action cannot be undone. To prevent accidental deletion, please confirm.
            </p>
          </DialogHeader>

          {contentToDelete && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-xs">
                <span className="text-neutral-400 block mb-0.5">Content item to delete:</span>
                <strong className="text-neutral-900 dark:text-white font-mono break-all">
                  {contentToDelete.title}
                </strong>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmContentName" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Type the exact content name to confirm:
                </Label>
                <Input
                  id="confirmContentName"
                  placeholder={contentToDelete.title}
                  value={contentDeleteInput}
                  onChange={e => setContentDeleteInput(e.target.value)}
                  className="rounded-xl h-11 text-xs border-neutral-200 dark:border-neutral-800 font-mono"
                  autoFocus
                />
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setContentToDelete(null);
                    setContentDeleteInput('');
                  }}
                  disabled={deletingContent}
                  className="rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteContentDelete}
                  disabled={
                    deletingContent ||
                    contentDeleteInput.trim() !== contentToDelete.title.trim()
                  }
                  className="rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 disabled:opacity-40"
                >
                  {deletingContent ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Content'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* UNIT DELETE MODAL (Requirement 21: Two-Stage Confirmation + Safe Cascading Cleanup) */}
      <Dialog
        open={!!unitToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setUnitToDelete(null);
            setUnitDeleteStage(1);
            setUnitDeleteInput('');
          }
        }}
      >
        <DialogContent className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl">
          {unitToDelete && unitDeleteStage === 1 && (
            /* STAGE 1: SHOW WHAT EXISTS INSIDE & WARNING */
            <div>
              <DialogHeader>
                <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mb-2">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <DialogTitle className="text-base font-bold font-heading text-neutral-900 dark:text-white">
                  Delete Unit: {unitToDelete.title}?
                </DialogTitle>
                <p className="text-xs text-neutral-500">
                  Deleting this unit will permanently destroy all educational materials associated with it.
                </p>
              </DialogHeader>

              <div className="py-4 space-y-3">
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-1.5 text-xs text-red-800 dark:text-red-300">
                  <p className="font-bold">Content inside this unit:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-neutral-600 dark:text-neutral-400">
                    <li>{videos.filter(v => v.unit_id === unitToDelete.id).length} Video Lessons</li>
                    <li>{quizzes.filter(q => q.unit_id === unitToDelete.id).length} Quizzes & Questions</li>
                    <li>{homework.filter(h => h.unit_id === unitToDelete.id).length} Homework Assignments</li>
                  </ul>
                </div>
                <p className="text-xs text-neutral-500">
                  This destructive operation cannot be reversed. Are you sure you want to continue?
                </p>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setUnitToDelete(null);
                    setUnitDeleteStage(1);
                  }}
                  className="rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => setUnitDeleteStage(2)}
                  className="rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20"
                >
                  Continue
                </Button>
              </DialogFooter>
            </div>
          )}

          {unitToDelete && unitDeleteStage === 2 && (
            /* STAGE 2: TYPE EXACT UNIT NAME TO CONFIRM */
            <div>
              <DialogHeader>
                <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mb-2">
                  <Trash2 className="w-5 h-5" />
                </div>
                <DialogTitle className="text-base font-bold font-heading text-neutral-900 dark:text-white">
                  Final Confirmation: Delete Unit
                </DialogTitle>
                <p className="text-xs text-neutral-500">
                  Please type the exact unit name to confirm permanent removal.
                </p>
              </DialogHeader>

              <div className="py-4 space-y-3">
                <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-xs">
                  <span className="text-neutral-400 block mb-0.5">Unit name:</span>
                  <strong className="text-neutral-900 dark:text-white font-mono break-all">
                    {unitToDelete.title}
                  </strong>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmUnitName" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Type the name to confirm:
                  </Label>
                  <Input
                    id="confirmUnitName"
                    placeholder={unitToDelete.title}
                    value={unitDeleteInput}
                    onChange={e => setUnitDeleteInput(e.target.value)}
                    className="rounded-xl h-11 text-xs border-neutral-200 dark:border-neutral-800 font-mono"
                    autoFocus
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setUnitToDelete(null);
                    setUnitDeleteStage(1);
                    setUnitDeleteInput('');
                  }}
                  disabled={deletingUnit}
                  className="rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteUnitDelete}
                  disabled={
                    deletingUnit ||
                    unitDeleteInput.trim() !== unitToDelete.title.trim()
                  }
                  className="rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 disabled:opacity-40"
                >
                  {deletingUnit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Deleting Unit...
                    </>
                  ) : (
                    'Delete Unit'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CONTEXT-AWARE CONTENT CREATION MODALS (Requirement 11) */}
      {selectedUnitForContent && (
        <>
          <VideoCreationModal
            open={videoModalOpen}
            onOpenChange={setVideoModalOpen}
            channelId={channel.id}
            classId={channelClassId}
            className={channelClassName}
            boardId={channel.boards?.[0]?.id}
            subjectName={selectedSubject}
            unitId={selectedUnitForContent.id}
            unitTitle={selectedUnitForContent.title}
            onSuccess={async () => {
              await refreshChannelAndContent();
            }}
          />

          <QuizCreationModal
            open={quizModalOpen}
            onOpenChange={setQuizModalOpen}
            channelId={channel.id}
            classId={channelClassId}
            className={channelClassName}
            boardId={channel.boards?.[0]?.id}
            subjectName={selectedSubject}
            unitId={selectedUnitForContent.id}
            unitTitle={selectedUnitForContent.title}
            onSuccess={async () => {
              await refreshChannelAndContent();
            }}
          />

          <HomeworkCreationModal
            open={homeworkModalOpen}
            onOpenChange={setHomeworkModalOpen}
            channelId={channel.id}
            classId={channelClassId}
            className={channelClassName}
            boardId={channel.boards?.[0]?.id}
            subjectName={selectedSubject}
            unitId={selectedUnitForContent.id}
            unitTitle={selectedUnitForContent.title}
            onSuccess={async () => {
              await refreshChannelAndContent();
            }}
          />
        </>
      )}
    </div>
  );
}
