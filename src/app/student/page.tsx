'use client';

import React, { useEffect, useState, useRef, useCallback, useSyncExternalStore, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroCarousel } from '@/components/home/hero-carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  User,
  SlidersHorizontal,
  Camera,
  Trash2,
  CheckCircle2,
  X,
  History,
  GraduationCap,
  Sparkles,
  BookOpen,
  Star,
  BarChart3,
  Clock,
  Award,
  CheckSquare,
  TrendingUp,
  LogOut,
  Search,
  Tv,
  ArrowRight,
} from 'lucide-react';
import {
  Profile,
  StudentAcademicProfile,
  ChannelItem,
  ClassItem,
  BoardItem,
  ReferenceSubjectItem,
  StudentRecentLearning,
  SubscribedSubjectProgress,
  ChannelSubscription,
} from '@/types';
import { StudentService } from '@/lib/student-service';
import { TeacherService, DEFAULT_LANGUAGES } from '@/lib/teacher-service';
import { ALL_RELEVANT_SUBJECTS } from '@/app/signup/page';
import { HelpMeFindMyTutor, TutorFinderFilters } from '@/components/student/help-me-find-tutor';
import { RecentLearningSection } from '@/components/student/recent-learning-section';
import { ChannelAnalysisSection } from '@/components/student/channel-analysis-section';
import { StudentTestimonialsSection } from '@/components/student/student-testimonials-section';
import { AboutEdutechSection } from '@/components/student/about-edutech-section';

function StudentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'home';
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile & Auth State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [academicProfile, setAcademicProfile] = useState<StudentAcademicProfile | null>(null);
  const [academicHistory, setAcademicHistory] = useState<StudentAcademicProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscriptions & Learning State (Phase 5.3)
  const [subscriptions, setSubscriptions] = useState<{
    subscription: ChannelSubscription;
    channel: ChannelItem | null;
    teacher: Profile | null;
    progress: { total: number; completed: number; percentage: number };
  }[]>([]);
  const [recentLearning, setRecentLearning] = useState<StudentRecentLearning | null>(null);
  const [subscribedSubjects, setSubscribedSubjects] = useState<SubscribedSubjectProgress[]>([]);
  const isSubscribed = subscriptions.length > 0;

  // Taxonomy References
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [allBoards, setAllBoards] = useState<BoardItem[]>([]);
  const [referenceSubjects, setReferenceSubjects] = useState<ReferenceSubjectItem[]>([]);

  // Active Discovery Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [filterBoardId, setFilterBoardId] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterLanguage, setFilterLanguage] = useState<string>('');

  // Search Tutor Specific State
  const [searchTutorQuery, setSearchTutorQuery] = useState<string>('');
  const [showSearchFilter, setShowSearchFilter] = useState<boolean>(true);

  // Channel Results
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

  // Profile Drawer State
  const isProfileQuery = useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined') return () => {};
      window.addEventListener('popstate', cb);
      return () => window.removeEventListener('popstate', cb);
    },
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('openProfile') === 'true',
    () => false
  );
  const [isProfileManualOpen, setIsProfileManualOpen] = useState(false);
  const isProfileOpen = isProfileManualOpen || isProfileQuery;
  const setIsProfileOpen = useCallback((open: boolean) => {
    setIsProfileManualOpen(open);
    if (!open && typeof window !== 'undefined' && window.location.search.includes('openProfile')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('openProfile');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Profile Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [editBoardId, setEditBoardId] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editSubjects, setEditSubjects] = useState<string[]>(['Physics', 'Chemistry', 'Maths']);
  const [editLanguage, setEditLanguage] = useState('English');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toggleEditSubject = (subj: string) => {
    setEditSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  // Listen for open-student-profile custom event from header
  useEffect(() => {
    const handleOpen = () => setIsProfileOpen(true);
    window.addEventListener('open-student-profile', handleOpen);
    return () => window.removeEventListener('open-student-profile', handleOpen);
  }, [setIsProfileOpen]);

  // Channel Loading Function (Strict 4-Way Matching)
  const loadChannels = useCallback(async (cId: string, bId?: string, sub?: string, lang?: string) => {
    if (!cId) return;
    setChannelsLoading(true);
    try {
      const results = await StudentService.getMatchingChannels({
        classId: cId,
        boardId: bId,
        subject: sub,
        language: lang,
      });
      setChannels(results);
    } catch (err) {
      console.error('Failed to load matching channels', err);
      setChannels([]);
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  // 1. Initial Load
  useEffect(() => {
    async function initDashboard() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch taxonomy
        const [cls, bds, subs] = await Promise.all([
          TeacherService.getClasses(),
          TeacherService.getBoards(),
          TeacherService.getReferenceSubjects(),
        ]);
        setAllClasses(cls);
        setAllBoards(bds);
        setReferenceSubjects(subs);

        // Fetch profile and academic history
        const [prof, acad, hist, activeSubs, recent, subjectsAnalysis] = await Promise.all([
          StudentService.getStudentProfile(user.id),
          StudentService.getStudentAcademicProfile(user.id),
          StudentService.getStudentAcademicHistory(user.id),
          StudentService.getStudentActiveSubscriptions(user.id),
          StudentService.getStudentRecentLearning(user.id),
          StudentService.getStudentSubscribedSubjectsAnalysis(user.id),
        ]);

        if (prof) {
          setProfile(prof);
          setEditName(prof.name || '');
          setEditPhone(prof.phone || '');
          setEditParentPhone(prof.parent_phone || '');
          setEditPhotoUrl(prof.photo_url || null);
          setPhotoPreview(prof.photo_url || null);
        }

        setSubscriptions(activeSubs);
        setRecentLearning(recent);
        setSubscribedSubjects(subjectsAnalysis);

        // Determine initial active class
        let initialClassId = '';
        if (acad?.class_id) {
          initialClassId = acad.class_id;
        } else if (prof?.class_id) {
          initialClassId = prof.class_id;
        } else {
          const c11 = cls.find((c) => c.name.toLowerCase().includes('11'));
          initialClassId = c11 ? c11.id : cls[0]?.id || '';
        }

        // Determine initial board
        let initialBoardId = '';
        if (acad?.board_id) {
          initialBoardId = acad.board_id;
        } else if (prof?.board_id) {
          initialBoardId = prof.board_id;
        } else {
          const cbse = bds.find((b) => b.name.toLowerCase().includes('cbse'));
          initialBoardId = cbse ? cbse.id : bds[0]?.id || '';
        }

        let initialSubjectsList: string[] = ['Physics', 'Chemistry', 'Maths'];
        if (acad?.subjects && acad.subjects.length > 0) {
          initialSubjectsList = acad.subjects;
        } else if (acad?.subject) {
          initialSubjectsList = acad.subject.split(',').map((s) => s.trim()).filter(Boolean);
        } else if (prof?.subjects && prof.subjects.length > 0) {
          initialSubjectsList = prof.subjects;
        }

        const initialSubject = initialSubjectsList[0] || 'Physics';
        const initialLang = acad?.preferred_language || prof?.preferred_language || 'English';

        setAcademicProfile(acad);
        setAcademicHistory(hist);
        setSelectedClassId(initialClassId);
        setFilterBoardId(initialBoardId);
        setFilterSubject(initialSubject);
        setFilterLanguage(initialLang);

        // Populate edit modal fields
        setEditClassId(initialClassId);
        setEditBoardId(initialBoardId);
        setEditSubject(initialSubject);
        setEditSubjects(initialSubjectsList);
        setEditLanguage(initialLang);

        // Load matching channels
        await loadChannels(initialClassId, initialBoardId, initialSubject, initialLang);
      } catch (err) {
        console.error('Error initializing student dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [supabase, router, loadChannels]);

  // Handle Grade Level Change
  const handleSelectClass = async (classId: string) => {
    setSelectedClassId(classId);
    await loadChannels(classId, filterBoardId, filterSubject, filterLanguage);
  };

  // Handle Tutor Finder Callback
  const handleTutorFinderFilterChange = async (filters: TutorFinderFilters) => {
    if (filters.classId) setSelectedClassId(filters.classId);
    if (filters.boardId) setFilterBoardId(filters.boardId);
    if (filters.preferredLanguage) setFilterLanguage(filters.preferredLanguage);

    await loadChannels(
      filters.classId || selectedClassId,
      filters.boardId || filterBoardId,
      filterSubject,
      filters.preferredLanguage || filterLanguage
    );
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/login');
    }
  };

  // Photo Upload Handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    setProfileMessage(null);

    try {
      let finalPhotoUrl = editPhotoUrl;

      if (photoFile) {
        finalPhotoUrl = await StudentService.uploadAvatar(profile.id, photoFile);
        setEditPhotoUrl(finalPhotoUrl);
      }

      const updatedProfile = await StudentService.updateStudentProfile(profile.id, {
        name: editName,
        phone: editPhone,
        parent_phone: editParentPhone,
        photo_url: finalPhotoUrl,
        class_id: editClassId,
        board_id: editBoardId,
        preferred_language: editLanguage,
        subjects: editSubjects,
      });
      setProfile(updatedProfile);

      const primarySubject = editSubjects.length > 0 ? editSubjects.join(', ') : editSubject || 'Physics';
      const updatedAcademic = await StudentService.saveStudentAcademicProfile({
        studentId: profile.id,
        academicYear: '2026–27',
        classId: editClassId,
        boardId: editBoardId,
        subject: primarySubject,
        subjects: editSubjects,
        preferredLanguage: editLanguage,
      });
      setAcademicProfile(updatedAcademic);

      const refreshedHistory = await StudentService.getStudentAcademicHistory(profile.id);
      setAcademicHistory(refreshedHistory);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('student-profile-updated', { detail: updatedProfile }));
      }

      setSelectedClassId(editClassId);
      setFilterBoardId(editBoardId);
      setFilterSubject(editSubject);
      setFilterLanguage(editLanguage);

      await loadChannels(editClassId, editBoardId, editSubject, editLanguage);

      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        setIsProfileOpen(false);
        setProfileMessage(null);
      }, 1200);
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save profile changes.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Filter channels by search tutor query
  const displayedChannels = channels.filter((ch) => {
    if (!searchTutorQuery.trim()) return true;
    const query = searchTutorQuery.toLowerCase().trim();
    const nameMatch = ch.name.toLowerCase().includes(query);
    const descMatch = ch.description?.toLowerCase().includes(query) || false;
    const specMatch = (ch.specializations || []).some((s) => s.toLowerCase().includes(query));
    return nameMatch || descMatch || specMatch;
  });

  const activeClassName = allClasses.find((c) => c.id === selectedClassId)?.name || 'Class';
  const activeBoardName = allBoards.find((b) => b.id === filterBoardId)?.name || 'Board';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            <div className="h-14 w-full bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      <Header />

      {/* ======================================================================= */}
      {/* 1. TOP HERO AREA: SLIDING BANNERS (PRE-SUBSCRIPTION) VS RECENT LEARNING (POST-SUBSCRIPTION) */}
      {/* ======================================================================= */}
      {currentTab === 'home' && (
        <div className="w-full border-b border-neutral-200/60 dark:border-neutral-800/60">
          {!isSubscribed ? (
            /* PRE-SUBSCRIPTION: Sliding Banners */
            <HeroCarousel />
          ) : (
            /* POST-SUBSCRIPTION: Replace banner area with Recent Learning section */
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <RecentLearningSection learning={recentLearning} />
            </div>
          )}
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* TOP GREETING BAR WITH AVATAR & LOGOUT */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="primary" className="text-xs font-semibold uppercase tracking-wider">
                Student Portal
              </Badge>
              {isSubscribed ? (
                <Badge variant="success" className="text-xs font-semibold">
                  Enrolled Learner
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Exploring Tutors
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white font-display">
              Welcome back{profile?.name ? `, ${profile.name}` : ''}!
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {currentTab === 'home' && (isSubscribed ? 'Continue your daily curriculum lessons and track subject progress.' : 'Find certified tuition teachers across CBSE, ICSE & State Boards.')}
              {currentTab === 'search' && 'Search teacher channels by name or refine with the 6-point tutor finder filter.'}
              {currentTab === 'channels' && 'Your active enrolled channels and classroom lessons.'}
              {currentTab === 'analysis' && (isSubscribed ? 'Detailed learning performance and concept mastery reports.' : 'Start learning to unlock real-time academic analysis.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary-400 dark:hover:border-primary-600 shadow-sm transition-all text-left cursor-pointer group"
              title="Click to view and edit student profile"
              aria-label="Student Profile"
            >
              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-primary-100 dark:bg-primary-950/70 border border-primary-300 dark:border-primary-800 flex items-center justify-center shrink-0">
                {profile?.photo_url ? (
                  <Image
                    src={profile.photo_url}
                    alt={profile.name || 'Student'}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <User className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {profile?.name || 'Student Profile'}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  Account &amp; Preferences
                </span>
              </div>
            </button>

            <Button
              variant="outline"
              size="md"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-950/30 px-4 py-2.5 text-sm font-semibold transition-all shadow-sm cursor-pointer"
              title="Log out of student account"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4 text-neutral-500 hover:text-red-600 dark:hover:text-red-400" />
              <span>Logout</span>
            </Button>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* VIEW A: TAB === 'HOME' */}
        {/* ======================================================================= */}
        {currentTab === 'home' && (
          <div className="space-y-12">
            {!isSubscribed ? (
              /* PRE-SUBSCRIPTION FLOW:
                 Sliding Banners (rendered above)
                 ↓
                 Help Me Find My Tutor
                 ↓
                 Class 1 → Class 12 + Results
                 ↓
                 Testimonials
                 ↓
                 About Edutech
                 ↓
                 Footer
              */
              <>
                {/* 1. Help Me Find My Tutor (6 Questions) */}
                <HelpMeFindMyTutor
                  allClasses={allClasses}
                  allBoards={allBoards}
                  currentFilters={{
                    classId: selectedClassId,
                    boardId: filterBoardId,
                    preferredLanguage: filterLanguage,
                  }}
                  onFilterChange={handleTutorFinderFilterChange}
                />

                {/* 2. Class 1 → Class 12 Selector + Results */}
                <section id="results-section" className="space-y-6 pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                        <GraduationCap className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        <span>Select Grade Level (Class 1 → Class 12)</span>
                      </div>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        Currently viewing: <strong className="text-neutral-900 dark:text-white">{activeClassName}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-1.5 w-full">
                      {allClasses
                        .slice()
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((cls) => {
                          const isSelected = cls.id === selectedClassId;
                          return (
                            <button
                              key={cls.id}
                              onClick={() => handleSelectClass(cls.id)}
                              className={`py-2.5 px-1 sm:px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center text-center truncate border ${
                                isSelected
                                  ? 'bg-primary-500 text-neutral-950 border-primary-500 shadow-md shadow-primary-500/20 font-extrabold ring-2 ring-primary-400'
                                  : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700'
                              }`}
                              title={cls.name}
                            >
                              <span className="hidden xl:inline truncate">{cls.name}</span>
                              <span className="xl:hidden truncate">
                                {cls.name === 'Kindergarten' ? 'KG' : cls.name.replace('Class ', '')}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Results Header */}
                  <div className="flex items-center justify-between pt-2">
                    <h2 className="text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2 font-display">
                      <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      Matching Teacher Channels
                    </h2>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {channels.length} {channels.length === 1 ? 'teacher found' : 'teachers found'}
                    </span>
                  </div>

                  {/* Results Grid */}
                  {channelsLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {[1, 2].map((i) => (
                        <Card key={i} className="animate-pulse h-56 border-neutral-200 dark:border-neutral-800">
                          <div className="h-full bg-neutral-200/60 dark:bg-neutral-800/60 rounded-xl" />
                        </Card>
                      ))}
                    </div>
                  ) : channels.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {channels.map((channel) => (
                        <Card
                          key={channel.id}
                          className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 hover:shadow-xl hover:border-primary-400 dark:hover:border-primary-600 transition-all flex flex-col sm:flex-row items-start gap-5 sm:gap-6 group"
                        >
                          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 shrink-0 flex items-center justify-center">
                            {channel.photo_url ? (
                              <Image
                                src={channel.photo_url}
                                alt={channel.name}
                                width={128}
                                height={128}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                unoptimized
                              />
                            ) : (
                              <User className="w-12 h-12 text-primary-700 dark:text-primary-300" />
                            )}
                          </div>

                          <div className="flex-1 flex flex-col justify-between min-w-0 w-full space-y-3">
                            <div>
                              <Link href={`/channels/${channel.id}`}>
                                <h3 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                                  {channel.name}
                                </h3>
                              </Link>
                              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                                {channel.description || 'Comprehensive tuition lessons, practice assignments, and concept breakdowns.'}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 mt-2">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span>{channel.rating ? channel.rating.toFixed(1) : '5.0'}</span>
                                <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                                  ({channel.review_count && channel.review_count > 0 ? `${channel.review_count} ratings` : 'Verified Tutor'})
                                </span>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-950/70 border border-neutral-200/80 dark:border-neutral-800/80 flex flex-wrap items-center gap-1.5">
                              {(channel.specializations && channel.specializations.length > 0
                                ? channel.specializations
                                : ['Tuition Track']
                              ).map((spec, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 shadow-xs"
                                >
                                  {spec}
                                </span>
                              ))}
                              {channel.class?.name && (
                                <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-primary-100/60 dark:bg-primary-950/60 text-primary-900 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                                  {channel.class.name}
                                </span>
                              )}
                            </div>

                            <div className="pt-1 flex items-center gap-2.5 flex-wrap">
                              <Link href={`/channels/${channel.id}`}>
                                <Button variant="outline" size="md" className="px-5 font-bold cursor-pointer">
                                  View
                                </Button>
                              </Link>
                              <Link href={`/channels/${channel.id}?action=subscribe`}>
                                <Button
                                  variant="primary"
                                  size="md"
                                  className="px-6 font-extrabold shadow-md shadow-primary-500/20 hover:scale-[1.02] transition-transform cursor-pointer"
                                >
                                  Subscribe
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl">
                      <CardContent className="p-12 text-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                          <BookOpen className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                          No teachers available yet for this selection.
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                          No channels have published courses matching {activeClassName} ({activeBoardName}) in {filterLanguage || 'selected language'}.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </section>

                {/* 3. Testimonials */}
                <StudentTestimonialsSection />

                {/* 4. About Edutech */}
                <AboutEdutechSection />
              </>
            ) : (
              /* POST-SUBSCRIPTION FLOW:
                 Recent Learning (rendered at top)
                 ↓
                 Channel Analysis (Subject-wise)
                 ↓
                 Testimonials
                 ↓
                 Footer
              */
              <>
                {/* Channel Analysis: Show only the subjects subscribed to */}
                <ChannelAnalysisSection subjects={subscribedSubjects} />

                {/* Testimonials */}
                <StudentTestimonialsSection />
              </>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW B: TAB === 'SEARCH' (SEARCH TUTOR) */}
        {/* ======================================================================= */}
        {currentTab === 'search' && (
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider">
                <Search className="w-4 h-4" />
                <span>Search &amp; Discovery</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 dark:text-white font-display">
                Search Tutor
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Find educators by channel name, or fine-tune with the Help Me Find My Tutor preference questionnaire.
              </p>
            </div>

            {/* Channel-Name Search Bar */}
            <div className="relative max-w-3xl">
              <div className="flex items-center rounded-2xl border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 shadow-sm focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/20 transition-all">
                <Search className="w-5 h-5 text-neutral-400 ml-3 shrink-0" />
                <input
                  type="text"
                  value={searchTutorQuery}
                  onChange={(e) => setSearchTutorQuery(e.target.value)}
                  placeholder="Search by Channel Name (e.g. Physics Studio, Verma Classes)..."
                  className="w-full px-3 py-2 text-sm sm:text-base bg-transparent text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none"
                />
                {searchTutorQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchTutorQuery('')}
                    className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 mr-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSearchFilter(!showSearchFilter)}
                  className="shrink-0 text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {showSearchFilter ? 'Hide Filter' : 'Show Filter'}
                </Button>
              </div>
            </div>

            {/* Same Help Me Find My Tutor Filter */}
            {showSearchFilter && (
              <HelpMeFindMyTutor
                allClasses={allClasses}
                allBoards={allBoards}
                currentFilters={{
                  classId: selectedClassId,
                  boardId: filterBoardId,
                  preferredLanguage: filterLanguage,
                }}
                onFilterChange={handleTutorFinderFilterChange}
              />
            )}

            {/* Filtered Channel Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>Matched Channels</span>
                  <Badge variant="secondary" className="text-xs">
                    {displayedChannels.length}
                  </Badge>
                </h3>
                {searchTutorQuery && (
                  <span className="text-xs text-neutral-500">
                    Filtered by name: &ldquo;{searchTutorQuery}&rdquo;
                  </span>
                )}
              </div>

              {channelsLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse h-48 border-neutral-200 dark:border-neutral-800">
                      <div className="h-full bg-neutral-200/60 dark:bg-neutral-800/60 rounded-xl" />
                    </Card>
                  ))}
                </div>
              ) : displayedChannels.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {displayedChannels.map((channel) => (
                    <Card
                      key={channel.id}
                      className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 hover:shadow-xl hover:border-primary-400 dark:hover:border-primary-600 transition-all flex flex-col sm:flex-row items-start gap-5 sm:gap-6 group"
                    >
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 shrink-0 flex items-center justify-center">
                        {channel.photo_url ? (
                          <Image
                            src={channel.photo_url}
                            alt={channel.name}
                            width={112}
                            height={112}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            unoptimized
                          />
                        ) : (
                          <Tv className="w-10 h-10 text-primary-700 dark:text-primary-300" />
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0 w-full space-y-3">
                        <div>
                          <Link href={`/channels/${channel.id}`}>
                            <h4 className="text-lg font-extrabold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                              {channel.name}
                            </h4>
                          </Link>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                            {channel.description || 'Comprehensive tuition lessons and assignments.'}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 mt-1.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{channel.rating ? channel.rating.toFixed(1) : '5.0'}</span>
                            <span className="text-neutral-500 font-medium">
                              ({channel.review_count || 12} reviews)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Link href={`/channels/${channel.id}`}>
                            <Button variant="outline" size="sm" className="px-4 font-bold">
                              View
                            </Button>
                          </Link>
                          <Link href={`/channels/${channel.id}?action=subscribe`}>
                            <Button variant="primary" size="sm" className="px-5 font-extrabold shadow-sm">
                              Subscribe
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                    No matching teacher channels found.
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    Try searching with another channel name or adjusting your grade and board filters.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW C: TAB === 'CHANNELS' (SHOW SUBSCRIBED/JOINED CHANNELS ONLY) */}
        {/* ======================================================================= */}
        {currentTab === 'channels' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider">
                <Tv className="w-4 h-4" />
                <span>My Classrooms</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 dark:text-white font-display">
                Enrolled Channels
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Displaying joined and subscribed channels only.
              </p>
            </div>

            {subscriptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subscriptions.map(({ subscription, channel, teacher, progress }) => {
                  if (!channel) return null;
                  return (
                    <Card
                      key={subscription.id}
                      className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-600 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary-100 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 shrink-0 flex items-center justify-center">
                            {channel.photo_url ? (
                              <Image
                                src={channel.photo_url}
                                alt={channel.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <Tv className="w-8 h-8 text-primary-700 dark:text-primary-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Badge variant="primary" className="text-[10px] mb-1">
                              {subscription.package_type.replace('_', ' ')}
                            </Badge>
                            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white truncate">
                              {channel.name}
                            </h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              By {teacher?.name || 'Educator'}
                            </p>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-neutral-600 dark:text-neutral-400">Completion</span>
                            <span className="text-primary-600 dark:text-primary-400 font-bold">
                              {progress.percentage}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(progress.percentage, 3)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-neutral-400 block text-right">
                            {progress.completed} of {progress.total} activities done
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                        <Link href={`/channels/${channel.id}`} className="block">
                          <Button variant="primary" size="sm" className="w-full font-bold shadow-xs">
                            View Channel
                            <ArrowRight className="w-4 h-4 ml-1.5" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* EMPTY STATE FOR CHANNELS: Show subscribed/joined channels only */
              <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 flex items-center justify-center mx-auto">
                  <Tv className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
                    No Joined Channels Yet
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                    You have not subscribed to any teacher channels yet. Explore verified tutors on Home or search channels to start learning.
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <Link href="/student?tab=search">
                    <Button variant="primary" size="md" className="font-bold shadow-sm">
                      <Search className="w-4 h-4 mr-2" />
                      Search Tutors
                    </Button>
                  </Link>
                  <Link href="/student">
                    <Button variant="outline" size="md">
                      Browse Home
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW D: TAB === 'ANALYSIS' */}
        {/* ======================================================================= */}
        {currentTab === 'analysis' && (
          <div className="space-y-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider">
                <BarChart3 className="w-4 h-4" />
                <span>Learning Analytics</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 dark:text-white font-display">
                Performance &amp; Analysis
              </h2>
            </div>

            {!isSubscribed ? (
              /* PRE-SUBSCRIPTION: "Start Learning to See Analytics" */
              <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white font-display">
                    Start Learning to See Analytics
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                    Once you subscribe to a channel and begin watching lessons, your real completion percentage, concept mastery, and quiz accuracy will be tracked here.
                  </p>
                </div>
                <div className="pt-3">
                  <Link href="/student">
                    <Button variant="primary" size="md" className="font-bold shadow-md shadow-primary-500/20">
                      Find My Tutor
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              /* POST-SUBSCRIPTION: Full Subject Analysis & Stats */
              <div className="space-y-8">
                <ChannelAnalysisSection subjects={subscribedSubjects} />

                {/* Additional Performance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                  <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Enrolled Channels</span>
                      <BookOpen className="w-4 h-4 text-primary-500" />
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                        {subscriptions.length} Active
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Across {activeClassName}
                      </p>
                    </div>
                  </Card>

                  <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Subscribed Subjects</span>
                      <Award className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                        {subscribedSubjects.length}
                      </span>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                        Active syllabus tracking
                      </p>
                    </div>
                  </Card>

                  <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Recent Completion</span>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                        {recentLearning?.overallPercentage ?? 0}%
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {recentLearning?.channelName || 'Current channel'}
                      </p>
                    </div>
                  </Card>

                  <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Board Alignment</span>
                      <CheckSquare className="w-4 h-4 text-primary-500" />
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                        {activeBoardName}
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Academic Year 2026–27
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <Footer />

      {/* ========================================================================= */}
      {/* MODAL 1: STUDENT PROFILE & ACADEMIC TIMELINE EDIT PANEL */}
      {/* ========================================================================= */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-300">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">
                    Student Profile
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Update personal &amp; academic study preferences
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {profileMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    profileMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileMessage.text}</span>
                </div>
              )}

              {/* Profile Photo (File Upload) */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-primary-100 dark:bg-primary-950/60 border-2 border-primary-400 dark:border-primary-700 flex items-center justify-center shrink-0">
                  {photoPreview ? (
                    <Image
                      src={photoPreview}
                      alt="Student Preview"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User className="w-10 h-10 text-primary-700 dark:text-primary-300" />
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Profile Photo (File Upload)
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <input
                      ref={fileInputRef}
                      id="student-photo-file"
                      name="student-photo-file"
                      aria-label="Upload genuine profile photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {photoPreview ? 'Replace Photo' : 'Upload Photo'}
                    </Button>
                    {photoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePhoto}
                        className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    JPG, PNG or WEBP. Upload genuine profile picture.
                  </p>
                </div>
              </div>

              {/* Editable Profile Fields */}
              <form id="student-profile-form" onSubmit={handleSaveProfile} className="space-y-4">
                <Input
                  label="Full Name"
                  id="student-full-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter full name"
                />

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="student-email" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Email Address (Account Credential)
                  </label>
                  <input
                    id="student-email"
                    name="email"
                    type="email"
                    disabled
                    autoComplete="email"
                    value={profile?.email || ''}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Phone Number"
                    id="student-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 9876543210"
                  />
                  <Input
                    label="Parent Mobile Number"
                    id="student-parent-phone"
                    name="parent_phone"
                    type="tel"
                    autoComplete="tel"
                    value={editParentPhone}
                    onChange={(e) => setEditParentPhone(e.target.value)}
                    placeholder="+91 9123456780"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="student-class" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Class
                    </label>
                    <select
                      id="student-class"
                      name="class"
                      value={editClassId}
                      onChange={(e) => setEditClassId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {allClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="student-board" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Educational Board
                    </label>
                    <select
                      id="student-board"
                      name="board"
                      value={editBoardId}
                      onChange={(e) => setEditBoardId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {allBoards.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Subject of the Year (Multiple Selections Supported)
                    </label>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      {editSubjects.length} selected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 min-h-[42px] items-center">
                    {editSubjects.length === 0 ? (
                      <span className="text-xs text-neutral-400 italic">No subjects selected. Click pills below to add.</span>
                    ) : (
                      editSubjects.map((subj) => (
                        <span
                          key={subj}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-100 dark:bg-primary-950/60 text-primary-900 dark:text-primary-200 border border-primary-300 dark:border-primary-800"
                        >
                          <span>{subj}</span>
                          <button
                            type="button"
                            onClick={() => toggleEditSubject(subj)}
                            className="hover:text-red-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-neutral-100 dark:border-neutral-800 rounded-xl">
                    {ALL_RELEVANT_SUBJECTS.map((subj) => {
                      const isSelected = editSubjects.includes(subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => toggleEditSubject(subj)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-primary-500 text-neutral-950 border-primary-500 font-bold shadow-xs'
                              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                          }`}
                        >
                          {isSelected ? `✓ ${subj}` : `+ ${subj}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="student-language" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Preferred Study Language
                  </label>
                  <select
                    id="student-language"
                    name="language"
                    value={editLanguage}
                    onChange={(e) => setEditLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {DEFAULT_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </form>

              {/* Academic Timeline / History */}
              <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  <History className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  Academic History Timeline
                </div>
                {academicHistory.length > 0 ? (
                  <div className="space-y-2">
                    {academicHistory.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                      >
                        <div>
                          <span className="font-bold text-neutral-900 dark:text-white mr-2">
                            {h.academic_year}
                          </span>
                          <span className="text-neutral-600 dark:text-neutral-400">
                            {h.class?.name || 'Class'} • {h.board?.name || 'Board'} • {h.subject} ({h.preferred_language})
                          </span>
                        </div>
                        {h.is_current && (
                          <Badge variant="success" className="text-[10px] py-0.5">
                            Active
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Current active academic context: 2026–27. Historical records will be retained year-by-year.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5 cursor-pointer"
                title="Log out of your account"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </Button>
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProfileOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="student-profile-form"
                  variant="primary"
                  size="sm"
                  isLoading={savingProfile}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-neutral-500">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Loading Student Dashboard...</p>
          </div>
        </div>
      }
    >
      <StudentDashboardContent />
    </Suspense>
  );
}
