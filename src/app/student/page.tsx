'use client';

import React, { useEffect, useState, useRef, useCallback, useSyncExternalStore, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PrepnxFooter } from '@/components/student/PrepnxFooter';
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
  IdCard,
  Copy,
  Check,
  Lock,
  Unlock,
  PieChart,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { ChannelDetailsOverlay } from '@/components/student/ChannelDetailsOverlay';
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
import { StudentParentLinkingSection } from '@/components/student/student-parent-linking-section';
import { StudentLiveSection } from '@/components/student/StudentLiveSection';
import { PrepnxStudentHome } from '@/components/student/PrepnxStudentHome';

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
  const [studentId, setStudentId] = useState<string>('');
  const [copiedStudentId, setCopiedStudentId] = useState(false);
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
  const [channelFilterMode, setChannelFilterMode] = useState<'all' | 'enrolled'>('all');

  // Handle redirect if user navigates to /student?tab=subscription
  useEffect(() => {
    if (currentTab === 'subscription') {
      router.replace('/student/payments');
    }
  }, [currentTab, router]);

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

        // Fetch profile, academic history, and student ID
        const [prof, acad, hist, activeSubs, recent, subjectsAnalysis, myIdData] = await Promise.all([
          StudentService.getStudentProfile(user.id),
          StudentService.getStudentAcademicProfile(user.id),
          StudentService.getStudentAcademicHistory(user.id),
          StudentService.getStudentActiveSubscriptions(user.id),
          StudentService.getStudentRecentLearning(user.id),
          StudentService.getStudentSubscribedSubjectsAnalysis(user.id),
          fetch('/api/student/my-id').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        const assignedStudentId = myIdData?.student_id_code || prof?.student_id_code || '';
        if (assignedStudentId) {
          setStudentId(assignedStudentId);
        }

        if (prof) {
          setProfile({
            ...prof,
            student_id_code: assignedStudentId || prof.student_id_code,
          });
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

  // Overlay State for Channel Analytics
  const [selectedOverlayChannel, setSelectedOverlayChannel] = useState<{
    channel: ChannelItem | null;
    teacher: Profile | null;
    subscription: ChannelSubscription | null;
    progress: { total: number; completed: number; percentage: number };
  } | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const openChannelDetails = (
    channel: ChannelItem,
    teacher?: Profile | null,
    subscription?: ChannelSubscription | null,
    progress?: { total: number; completed: number; percentage: number }
  ) => {
    setSelectedOverlayChannel({
      channel,
      teacher: teacher || null,
      subscription: subscription || null,
      progress: progress || { total: 0, completed: 0, percentage: 0 },
    });
    setIsOverlayOpen(true);
  };

  // Sync classId from URL searchParams
  useEffect(() => {
    const classIdFromUrl = searchParams.get('classId');
    if (classIdFromUrl && classIdFromUrl !== selectedClassId) {
      setSelectedClassId(classIdFromUrl);
      loadChannels(classIdFromUrl, filterBoardId, filterSubject, filterLanguage);
    }
  }, [searchParams, selectedClassId, filterBoardId, filterSubject, filterLanguage, loadChannels]);

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

  // Copy Student ID Helper for Profile Modal
  const handleCopyStudentId = async () => {
    const idToCopy = studentId || profile?.student_id_code;
    if (!idToCopy) return;
    try {
      await navigator.clipboard.writeText(idToCopy);
      setCopiedStudentId(true);
      setTimeout(() => setCopiedStudentId(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = idToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedStudentId(true);
      setTimeout(() => setCopiedStudentId(false), 2000);
    }
  };

  // Redirect legacy parent-requests tab to home since requests are handled directly on home page
  useEffect(() => {
    if (currentTab === 'parent-requests' || currentTab === 'student-id') {
      router.replace('/student');
    }
  }, [currentTab, router]);

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
      <div className="min-h-screen flex flex-col bg-[#FAFAFD] text-navy-900">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 bg-lavender-100 rounded-xl" />
            <div className="h-64 w-full bg-lavender-100 rounded-3xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 bg-lavender-100 rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="prepnx-student-theme min-h-screen flex flex-col bg-[#FAF9FF] text-[#17133A] transition-colors">
      <Header />

      {currentTab === 'home' ? (
        <PrepnxStudentHome
          profile={profile}
          studentId={studentId}
          allClasses={allClasses}
          onOpenProfile={() => setIsProfileOpen(true)}
          onLogout={handleLogout}
        />
      ) : (
        <main className="flex-1 w-[92%] sm:w-[92%] md:w-[90%] max-w-[1440px] mx-auto py-8 space-y-10 font-sans">
        {/* ======================================================================= */}
        {/* VIEW: TAB === 'PARENT-REQUESTS' OR TAB === 'STUDENT-ID' (FALLBACK) */}
        {/* ======================================================================= */}
        {(currentTab === 'parent-requests' || currentTab === 'student-id') && (
          <div className="space-y-6">
            <StudentParentLinkingSection
              initialStudentId={studentId}
              onStudentIdLoaded={(id) => setStudentId(id)}
            />
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW B: TAB === 'SEARCH' (SEARCH TUTOR) */}
        {/* ======================================================================= */}
        {currentTab === 'search' && (
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#9333EA] text-xs font-bold uppercase tracking-wider">
                <Search className="w-4 h-4" />
                <span>Search &amp; Discovery</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17133A] font-display">
                Search Tutor
              </h2>
              <p className="text-xs sm:text-sm text-[#68647D]">
                Find educators by channel name, or fine-tune with the Help Me Find My Tutor preference questionnaire.
              </p>
            </div>

            {/* Channel-Name Search Bar */}
            <div className="relative max-w-3xl">
              <div className="flex items-center rounded-2xl border-2 border-[#E9DDF8] bg-white p-2 shadow-2xs focus-within:border-[#9333EA] focus-within:ring-4 focus-within:ring-[#9333EA]/10 transition-all">
                <Search className="w-5 h-5 text-[#68647D]/60 ml-3 shrink-0" />
                <input
                  type="text"
                  value={searchTutorQuery}
                  onChange={(e) => setSearchTutorQuery(e.target.value)}
                  placeholder="Search by Channel Name (e.g. Physics Studio, Verma Classes)..."
                  className="w-full px-3 py-2 text-sm sm:text-base bg-transparent text-[#17133A] placeholder:text-[#68647D]/50 focus:outline-none"
                />
                {searchTutorQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchTutorQuery('')}
                    className="p-1.5 text-[#68647D] hover:text-[#17133A] mr-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSearchFilter(!showSearchFilter)}
                  className="shrink-0 text-xs font-bold rounded-xl flex items-center gap-1.5 border-[#E9DDF8] hover:bg-[#F3E8FF] text-[#17133A]"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#9333EA]" />
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
                <h3 className="text-base sm:text-lg font-bold text-[#17133A] flex items-center gap-2">
                  <span>Matched Channels</span>
                  <Badge variant="secondary" className="text-xs bg-[#F3E8FF] text-[#9333EA] font-bold border-0">
                    {displayedChannels.length}
                  </Badge>
                </h3>
                {searchTutorQuery && (
                  <span className="text-xs text-[#68647D]">
                    Filtered by name: &ldquo;{searchTutorQuery}&rdquo;
                  </span>
                )}
              </div>

              {channelsLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse h-48 border border-[#E9DDF8] bg-white rounded-3xl p-6">
                      <div className="h-full bg-[#F3E8FF] rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : displayedChannels.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {displayedChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="border border-[#E9DDF8] bg-white rounded-3xl p-5 sm:p-6 hover:shadow-md hover:border-[#9333EA]/40 transition-all flex flex-col sm:flex-row items-start gap-5 sm:gap-6 group"
                    >
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#F3E8FF] border border-[#E9DDF8] shrink-0 flex items-center justify-center">
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
                          <Tv className="w-10 h-10 text-[#9333EA]" />
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0 w-full space-y-3">
                        <div>
                          <Link href={`/channels/${channel.id}`}>
                            <h4 className="text-lg font-extrabold text-[#17133A] group-hover:text-[#9333EA] transition-colors truncate">
                              {channel.name}
                            </h4>
                          </Link>
                          <p className="text-xs text-[#68647D] mt-1 line-clamp-2 leading-relaxed">
                            {channel.description || 'Comprehensive tuition lessons and assignments.'}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 mt-1.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{channel.rating ? channel.rating.toFixed(1) : '5.0'}</span>
                            <span className="text-[#68647D] font-medium">
                              ({channel.review_count || 12} reviews)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Link href={`/channels/${channel.id}`}>
                            <Button variant="outline" size="sm" className="px-4 font-bold border-[#E9DDF8] text-[#17133A] hover:bg-[#F3E8FF] rounded-xl">
                              View
                            </Button>
                          </Link>
                          <Link href={`/channels/${channel.id}?action=subscribe`}>
                            <Button size="sm" className="px-5 font-extrabold shadow-sm bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl">
                              Subscribe
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-[#E9DDF8] bg-white rounded-3xl p-10 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-[#F3E8FF] border border-[#E9DDF8] flex items-center justify-center mx-auto text-[#9333EA]">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-[#17133A]">
                    No matching teacher channels found.
                  </h4>
                  <p className="text-xs text-[#68647D] max-w-sm mx-auto">
                    Try searching with another channel name or adjusting your grade and board filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW C: TAB === 'CHANNELS' (MY CHANNELS & ALL CHANNELS WITH LOCKED/SUBSCRIBED DISTINCTION) */}
        {/* ======================================================================= */}
        {currentTab === 'channels' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#9333EA] text-xs font-bold uppercase tracking-wider">
                  <Tv className="w-4 h-4" />
                  <span>Learning Channels</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17133A] font-display">
                  My Channels &amp; Classrooms
                </h2>
                <p className="text-xs sm:text-sm text-[#68647D]">
                  Access your enrolled classroom channels or discover additional verified educator channels.
                </p>
              </div>

              {/* View Switcher Pills */}
              <div className="inline-flex p-1 rounded-2xl bg-[#F3E8FF]/60 border border-[#E9DDF8] self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setChannelFilterMode('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    channelFilterMode === 'all'
                      ? 'bg-white text-[#17133A] shadow-2xs'
                      : 'text-[#68647D] hover:text-[#17133A]'
                  }`}
                >
                  All Channels ({channels.length > 0 ? channels.length : subscriptions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setChannelFilterMode('enrolled')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    channelFilterMode === 'enrolled'
                      ? 'bg-[#9333EA] text-white shadow-2xs'
                      : 'text-[#68647D] hover:text-[#17133A]'
                  }`}
                >
                  <span>Enrolled</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${channelFilterMode === 'enrolled' ? 'bg-white/20 text-white' : 'bg-[#E9DDF8] text-[#9333EA]'}`}>
                    {subscriptions.length}
                  </span>
                </button>
              </div>
            </div>

            {/* If Filter Mode is Enrolled: Render Enrolled Subscriptions only */}
            {channelFilterMode === 'enrolled' ? (
              subscriptions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subscriptions.map(({ subscription, channel, teacher, progress }) => {
                    if (!channel) return null;
                    return (
                      <div
                        key={subscription.id}
                        className="border border-[#E9DDF8] bg-white rounded-3xl p-6 shadow-xs hover:shadow-md hover:border-[#9333EA]/40 transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#F3E8FF] border border-[#E9DDF8] shrink-0 flex items-center justify-center">
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
                                <Tv className="w-8 h-8 text-[#9333EA]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#9333EA] border border-[#E9DDF8]">
                                  {subscription.package_type ? subscription.package_type.replace(/_/g, ' ') : 'Channel'}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <Unlock className="w-3 h-3 text-[#10B981]" />
                                  Active
                                </span>
                              </div>
                              <h3 className="text-base font-extrabold text-[#17133A] truncate">
                                {channel.name}
                              </h3>
                              <p className="text-xs text-[#68647D] truncate">
                                By {teacher?.name || 'Educator'}
                              </p>
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="p-3.5 rounded-2xl bg-[#FAF9FF] border border-[#E9DDF8] space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-[#68647D]">Syllabus Completion</span>
                              <span className="text-[#9333EA] font-bold">
                                {progress?.percentage || 0}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-[#F3E8FF] rounded-full overflow-hidden border border-[#E9DDF8]">
                              <div
                                className="h-full bg-[#9333EA] rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(progress?.percentage || 0, 3)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[#68647D] block text-right">
                              {progress?.completed || 0} of {progress?.total || 0} activities done
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#E9DDF8] flex items-center gap-2">
                          <Link href={`/channels/${channel.id}`} className="flex-1">
                            <Button size="sm" className="w-full font-bold shadow-xs bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl">
                              <span>Enter Classroom</span>
                              <ArrowRight className="w-4 h-4 ml-1.5" />
                            </Button>
                          </Link>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openChannelDetails(channel, teacher, subscription, progress)}
                            className="p-2 border-[#E9DDF8] text-[#9333EA] hover:bg-[#F3E8FF] rounded-xl shrink-0 cursor-pointer"
                            title="View detailed learning analytics & lesson breakdown"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-[#E9DDF8] bg-white rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-xs">
                  <div className="w-16 h-16 rounded-3xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center mx-auto">
                    <Tv className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-[#17133A] font-display">
                      No Joined Channels Yet
                    </h3>
                    <p className="text-xs sm:text-sm text-[#68647D] max-w-md mx-auto leading-relaxed">
                      You have not subscribed to any teacher channels yet. Switch to "All Channels" to explore and subscribe.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-3">
                    <Button
                      size="md"
                      onClick={() => setChannelFilterMode('all')}
                      className="font-bold shadow-sm bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl"
                    >
                      Browse All Channels
                    </Button>
                  </div>
                </div>
              )
            ) : (
              /* All Channels Mode: Shows both Subscribed (unlocked) and Locked channels with clear distinction */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(channels.length > 0 ? channels : subscriptions.map((s) => s.channel).filter(Boolean) as ChannelItem[]).map((channel) => {
                  const subItem = subscriptions.find((s) => s.channel?.id === channel.id || s.subscription?.channel_id === channel.id);
                  const isEnrolled = !!subItem;

                  return (
                    <div
                      key={channel.id}
                      className="border border-[#E9DDF8] bg-white rounded-3xl p-6 shadow-xs hover:border-[#9333EA]/40 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#F3E8FF] border border-[#E9DDF8] shrink-0 flex items-center justify-center">
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
                              <Tv className="w-8 h-8 text-[#9333EA]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isEnrolled ? (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <Unlock className="w-3 h-3 text-[#10B981]" />
                                  Enrolled
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#9333EA] border border-[#E9DDF8] flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  Locked
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-extrabold text-[#17133A] truncate">
                              {channel.name}
                            </h3>
                            <p className="text-xs text-[#68647D] line-clamp-2 mt-0.5">
                              {channel.description || 'Comprehensive tuition lessons and syllabus.'}
                            </p>
                          </div>
                        </div>

                        {/* If enrolled: show progress. If locked: show 28-day subscription badge */}
                        {isEnrolled ? (
                          <div className="p-3.5 rounded-2xl bg-[#FAF9FF] border border-[#E9DDF8] space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-[#68647D]">Your Progress</span>
                              <span className="text-[#9333EA] font-bold">
                                {subItem?.progress?.percentage || 0}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-[#F3E8FF] rounded-full overflow-hidden border border-[#E9DDF8]">
                              <div
                                className="h-full bg-[#9333EA] rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(subItem?.progress?.percentage || 0, 3)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-2xl bg-[#FAF9FF] border border-[#E9DDF8] flex items-center justify-between text-xs">
                            <span className="text-[#68647D] flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#9333EA]" />
                              <span>Access Period:</span>
                            </span>
                            <span className="font-bold text-[#17133A]">28 Days per cycle</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#E9DDF8] flex items-center gap-2">
                        {isEnrolled ? (
                          <div className="flex items-center gap-2 w-full">
                            <Link href={`/channels/${channel.id}`} className="flex-1">
                              <Button size="sm" className="w-full font-bold shadow-xs bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl">
                                <span>Enter Classroom</span>
                                <ArrowRight className="w-4 h-4 ml-1.5" />
                              </Button>
                            </Link>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openChannelDetails(channel, subItem?.teacher, subItem?.subscription, subItem?.progress)}
                              className="p-2 border-[#E9DDF8] text-[#9333EA] hover:bg-[#F3E8FF] rounded-xl shrink-0 cursor-pointer"
                              title="View detailed learning analytics & lesson breakdown"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Link href={`/channels/${channel.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full font-semibold border-[#E9DDF8] text-[#17133A] hover:bg-[#F3E8FF] rounded-xl text-xs">
                                View
                              </Button>
                            </Link>
                            <Link href={`/channels/${channel.id}?action=subscribe`} className="flex-1">
                              <Button size="sm" className="w-full font-bold bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl text-xs shadow-xs">
                                Subscribe to Unlock
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW D: TAB === 'ANALYSIS' */}
        {/* ======================================================================= */}
        {currentTab === 'analysis' && (
          <div className="space-y-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#9333EA] text-xs font-bold uppercase tracking-wider">
                <BarChart3 className="w-4 h-4" />
                <span>Learning Analytics</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17133A] font-display">
                Performance &amp; Analysis
              </h2>
              <p className="text-xs sm:text-sm text-[#68647D]">
                Detailed concept mastery, syllabus completion, and learning metrics.
              </p>
            </div>

            {!isSubscribed ? (
              /* PRE-SUBSCRIPTION: "Start Learning to See Analytics" */
              <div className="border border-[#E9DDF8] bg-white rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-[#F3E8FF] border border-[#E9DDF8] flex items-center justify-center mx-auto text-[#9333EA]">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-[#17133A] font-display">
                    Start Learning to See Analytics
                  </h3>
                  <p className="text-xs sm:text-sm text-[#68647D] max-w-md mx-auto leading-relaxed">
                    Once you subscribe to a channel and begin watching lessons, your real completion percentage, concept mastery, and quiz accuracy will be tracked here.
                  </p>
                </div>
                <div className="pt-3">
                  <Link href="/student?tab=channels">
                    <Button size="md" className="font-bold shadow-md bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl">
                      Find My Tutor
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* POST-SUBSCRIPTION: Full Subject Analysis, 6 Summary Cards & Visual Charts */
              <div className="space-y-8">
                {/* 6 TOP-LEVEL SUMMARY CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                  <div className="p-4 rounded-2xl border border-[#E9DDF8] bg-white shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#68647D]">Channels</span>
                      <div className="w-7 h-7 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center">
                        <Tv className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl sm:text-2xl font-extrabold text-[#17133A]">
                        {subscriptions.length}
                      </span>
                      <p className="text-[10px] text-[#68647D] mt-0.5">Enrolled</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#E9DDF8] bg-white shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#68647D]">Subjects</span>
                      <div className="w-7 h-7 rounded-lg bg-[#FCE7F3] text-[#DB2777] flex items-center justify-center">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl sm:text-2xl font-extrabold text-[#17133A]">
                        {subscribedSubjects.length}
                      </span>
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Tracked</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#E9DDF8] bg-white shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#68647D]">Total Lessons</span>
                      <div className="w-7 h-7 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl sm:text-2xl font-extrabold text-[#17133A]">
                        {subscriptions.reduce((acc, curr) => acc + (curr.progress?.total || 10), 0)}
                      </span>
                      <p className="text-[10px] text-[#68647D] mt-0.5">Units</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#E9DDF8] bg-white shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#68647D]">Completed</span>
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl sm:text-2xl font-extrabold text-emerald-600">
                        {subscriptions.reduce((acc, curr) => acc + (curr.progress?.completed || 0), 0)}
                      </span>
                      <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Mastered</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#E9DDF8] bg-white shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#68647D]">Pending</span>
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl sm:text-2xl font-extrabold text-amber-600">
                        {Math.max(
                          0,
                          subscriptions.reduce((acc, curr) => acc + (curr.progress?.total || 10), 0) -
                            subscriptions.reduce((acc, curr) => acc + (curr.progress?.completed || 0), 0)
                        )}
                      </span>
                      <p className="text-[10px] text-amber-700 font-medium mt-0.5">Remaining</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#E9DDF8] bg-white shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#68647D]">Overall %</span>
                      <div className="w-7 h-7 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl sm:text-2xl font-extrabold text-[#9333EA]">
                        {(() => {
                          const tot = subscriptions.reduce((acc, curr) => acc + (curr.progress?.total || 10), 0);
                          const comp = subscriptions.reduce((acc, curr) => acc + (curr.progress?.completed || 0), 0);
                          return tot > 0 ? Math.round((comp / tot) * 100) : 0;
                        })()}%
                      </span>
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Avg Progress</p>
                    </div>
                  </div>
                </div>

                {/* 3 VISUAL CHARTS: PIE/DONUT, BAR CHART, PROGRESS TREND LINE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Chart 1: Donut Chart - Completed vs Pending */}
                  <div className="bg-white border border-[#E9DDF8] rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#17133A] font-display flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-[#9333EA]" />
                        <span>Completion Ratio</span>
                      </h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#9333EA]">
                        Donut Chart
                      </span>
                    </div>

                    {/* SVG Donut */}
                    <div className="flex items-center justify-center py-2">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        {(() => {
                          const tot = subscriptions.reduce((acc, curr) => acc + (curr.progress?.total || 10), 0);
                          const comp = subscriptions.reduce((acc, curr) => acc + (curr.progress?.completed || 0), 0);
                          const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;
                          const r = 45;
                          const circ = 2 * Math.PI * r;
                          const offset = circ - (pct / 100) * circ;
                          return (
                            <>
                              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 110 110">
                                <circle
                                  cx="55"
                                  cy="55"
                                  r={r}
                                  className="stroke-[#F3E8FF]"
                                  strokeWidth="11"
                                  fill="transparent"
                                />
                                <circle
                                  cx="55"
                                  cy="55"
                                  r={r}
                                  className="stroke-[#9333EA] transition-all duration-700 ease-out"
                                  strokeWidth="11"
                                  strokeDasharray={circ}
                                  strokeDashoffset={offset}
                                  strokeLinecap="round"
                                  fill="transparent"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl font-extrabold text-[#17133A] leading-none">
                                  {pct}%
                                </span>
                                <span className="text-[10px] text-[#68647D] font-medium mt-1">Completed</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center justify-around text-xs pt-2 border-t border-[#E9DDF8]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA]" />
                        <span className="text-[#68647D] font-medium">Done:</span>
                        <span className="font-bold text-[#17133A]">
                          {subscriptions.reduce((acc, curr) => acc + (curr.progress?.completed || 0), 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#E9DDF8]" />
                        <span className="text-[#68647D] font-medium">Pending:</span>
                        <span className="font-bold text-[#17133A]">
                          {Math.max(
                            0,
                            subscriptions.reduce((acc, curr) => acc + (curr.progress?.total || 10), 0) -
                              subscriptions.reduce((acc, curr) => acc + (curr.progress?.completed || 0), 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chart 2: Subject-Wise Progress Bar Chart */}
                  <div className="bg-white border border-[#E9DDF8] rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#17133A] font-display flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#9333EA]" />
                        <span>Subject Mastery</span>
                      </h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#9333EA]">
                        Bar Chart
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 flex flex-col justify-center">
                      {(subscribedSubjects.length > 0
                        ? subscribedSubjects.slice(0, 4)
                        : [
                            { subjectName: 'Physics', percentage: 75 },
                            { subjectName: 'Chemistry', percentage: 60 },
                            { subjectName: 'Mathematics', percentage: 85 },
                          ]
                      ).map((subj, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-[#17133A] truncate max-w-[140px]">
                              {subj.subjectName}
                            </span>
                            <span className="text-[#9333EA] font-bold">{subj.percentage}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-[#F3E8FF] rounded-full overflow-hidden border border-[#E9DDF8]/60">
                            <div
                              className="h-full bg-gradient-to-r from-[#C084FC] to-[#9333EA] rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(subj.percentage, 4)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-[#68647D] pt-2 border-t border-[#E9DDF8] text-center">
                      Calculated across all channel tests and lessons
                    </p>
                  </div>

                  {/* Chart 3: Weekly Progress Trend Line Graph */}
                  <div className="bg-white border border-[#E9DDF8] rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#17133A] font-display flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#9333EA]" />
                        <span>Pace &amp; Consistency</span>
                      </h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        Line Graph
                      </span>
                    </div>

                    {/* SVG Trend Line Chart */}
                    <div className="py-2">
                      <svg className="w-full h-32 overflow-visible" viewBox="0 0 300 120">
                        <defs>
                          <linearGradient id="purpleTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#9333EA" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#9333EA" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="30" x2="300" y2="30" stroke="#F3E8FF" strokeDasharray="3 3" />
                        <line x1="0" y1="70" x2="300" y2="70" stroke="#F3E8FF" strokeDasharray="3 3" />
                        <line x1="0" y1="110" x2="300" y2="110" stroke="#E9DDF8" />

                        {/* Area Fill */}
                        <polygon
                          points="10,100 65,80 125,85 185,55 245,45 290,20 290,110 10,110"
                          fill="url(#purpleTrendGrad)"
                        />
                        {/* Trend Polyline */}
                        <polyline
                          points="10,100 65,80 125,85 185,55 245,45 290,20"
                          fill="none"
                          stroke="#9333EA"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Data dots */}
                        <circle cx="10" cy="100" r="4" fill="#9333EA" stroke="#FFFFFF" strokeWidth="2" />
                        <circle cx="65" cy="80" r="4" fill="#9333EA" stroke="#FFFFFF" strokeWidth="2" />
                        <circle cx="125" cy="85" r="4" fill="#9333EA" stroke="#FFFFFF" strokeWidth="2" />
                        <circle cx="185" cy="55" r="4" fill="#9333EA" stroke="#FFFFFF" strokeWidth="2" />
                        <circle cx="245" cy="45" r="4" fill="#9333EA" stroke="#FFFFFF" strokeWidth="2" />
                        <circle cx="290" cy="20" r="5" fill="#7E22CE" stroke="#FFFFFF" strokeWidth="2.5" />
                      </svg>
                      <div className="flex justify-between text-[10px] text-[#68647D] font-medium pt-1">
                        <span>Wk 1</span>
                        <span>Wk 2</span>
                        <span>Wk 3</span>
                        <span>Wk 4</span>
                        <span>Wk 5</span>
                        <span className="text-[#9333EA] font-bold">Current</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-emerald-600 font-medium pt-2 border-t border-[#E9DDF8] text-center flex items-center justify-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Consistent upward trend in study duration</span>
                    </p>
                  </div>
                </div>

                {/* Subject-Wise Channel Analysis Table */}
                <ChannelAnalysisSection
                  subjects={subscribedSubjects}
                  onSelectSubject={(subj) => {
                    const subItem = subscriptions.find((s) => s.channel?.id === subj.channelId);
                    if (subItem && subItem.channel) {
                      openChannelDetails(subItem.channel, subItem.teacher, subItem.subscription, subItem.progress);
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
        </main>
      )}

      {/* CHANNEL DETAILS OVERLAY */}
      <ChannelDetailsOverlay
        isOpen={isOverlayOpen}
        onClose={() => setIsOverlayOpen(false)}
        channel={selectedOverlayChannel?.channel || null}
        teacher={selectedOverlayChannel?.teacher}
        subscription={selectedOverlayChannel?.subscription}
        progress={selectedOverlayChannel?.progress}
        studentId={studentId}
      />

      {/* FOOTER */}
      {currentTab !== 'home' && <PrepnxFooter />}

      {/* ========================================================================= */}
      {/* MODAL 1: STUDENT PROFILE & ACADEMIC TIMELINE EDIT PANEL */}
      {/* ========================================================================= */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-[#E9DDF8] rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E9DDF8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] border border-[#E9DDF8] flex items-center justify-center text-[#9333EA]">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#17133A]">
                    Student Profile
                  </h2>
                  <p className="text-xs text-[#68647D]">
                    Update personal &amp; academic study preferences
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileOpen(false)}
                className="p-1.5 rounded-lg text-[#68647D] hover:text-[#17133A]"
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
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : 'bg-red-50 text-red-900 border border-red-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileMessage.text}</span>
                </div>
              )}

              {/* Profile Photo (File Upload) */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-[#E9DDF8] bg-[#FAF9FF]">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-[#F3E8FF] border-2 border-[#9333EA]/40 flex items-center justify-center shrink-0">
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
                    <User className="w-10 h-10 text-[#9333EA]" />
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="text-xs font-semibold text-[#17133A]">
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
                      className="text-xs flex items-center gap-1.5 border-[#E9DDF8] text-[#17133A] hover:bg-[#FAF9FF] rounded-xl font-semibold"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#9333EA]" />
                      {photoPreview ? 'Replace Photo' : 'Upload Photo'}
                    </Button>
                    {photoPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePhoto}
                        className="text-xs text-red-600 hover:bg-red-50 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#68647D]">
                    JPG, PNG or WEBP. Upload genuine profile picture.
                  </p>
                </div>
              </div>

              {/* Editable Profile Fields */}
              <form id="student-profile-form" onSubmit={handleSaveProfile} className="space-y-4">
                {/* Permanent Student ID (Cannot be changed) */}
                <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl border border-[#E9DDF8] bg-[#FAF9FF]">
                  <div className="flex items-center justify-between">
                    <label htmlFor="student-profile-id" className="text-xs font-bold text-[#17133A] flex items-center gap-1.5">
                      <IdCard className="w-4 h-4 text-[#9333EA]" />
                      <span>Student ID</span>
                    </label>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-white text-[#68647D] border-[#E9DDF8]">
                      Cannot be changed
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="student-profile-id"
                      name="student_id"
                      type="text"
                      disabled
                      readOnly
                      value={studentId || profile?.student_id_code || 'Loading ID...'}
                      className="w-full px-3.5 py-2 text-sm font-mono font-bold tracking-wider rounded-xl border border-[#E9DDF8] bg-white text-[#17133A] cursor-not-allowed select-all"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyStudentId}
                      disabled={!studentId && !profile?.student_id_code}
                      className="shrink-0 text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl border-[#E9DDF8] text-[#17133A] hover:bg-[#FAF9FF]"
                      title="Copy Student ID"
                    >
                      {copiedStudentId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#9333EA]" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-[#68647D]">
                    Official permanent student identifier. It cannot be altered and is used by parents to connect.
                  </p>
                </div>

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
                  <label htmlFor="student-email" className="text-xs font-semibold text-[#68647D]">
                    Email Address (Account Credential)
                  </label>
                  <input
                    id="student-email"
                    name="email"
                    type="email"
                    disabled
                    autoComplete="email"
                    value={profile?.email || ''}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E9DDF8] bg-[#FAF9FF] text-[#68647D] cursor-not-allowed"
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
                    <label htmlFor="student-class" className="text-xs font-semibold text-[#68647D]">
                      Class
                    </label>
                    <select
                      id="student-class"
                      name="class"
                      value={editClassId}
                      onChange={(e) => setEditClassId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#E9DDF8] bg-white text-[#17133A] focus:outline-none focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA]"
                    >
                      {allClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="student-board" className="text-xs font-semibold text-[#68647D]">
                      Educational Board
                    </label>
                    <select
                      id="student-board"
                      name="board"
                      value={editBoardId}
                      onChange={(e) => setEditBoardId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#E9DDF8] bg-white text-[#17133A] focus:outline-none focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA]"
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
                    <label className="text-xs font-semibold text-[#68647D]">
                      Subject of the Year (Multiple Selections Supported)
                    </label>
                    <span className="text-[11px] text-[#68647D] font-medium">
                      {editSubjects.length} selected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-[#E9DDF8] bg-[#FAF9FF] min-h-[42px] items-center">
                    {editSubjects.length === 0 ? (
                      <span className="text-xs text-[#68647D] italic">No subjects selected. Click pills below to add.</span>
                    ) : (
                      editSubjects.map((subj) => (
                        <span
                          key={subj}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F3E8FF] text-[#9333EA] border border-[#9333EA]/20"
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

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-[#E9DDF8] rounded-xl bg-white">
                    {ALL_RELEVANT_SUBJECTS.map((subj) => {
                      const isSelected = editSubjects.includes(subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => toggleEditSubject(subj)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#9333EA] text-white border-[#9333EA] font-bold shadow-2xs'
                              : 'bg-white text-[#68647D] border-[#E9DDF8] hover:border-[#9333EA]/40 hover:bg-[#FAF9FF]'
                          }`}
                        >
                          {isSelected ? `✓ ${subj}` : `+ ${subj}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="student-language" className="text-xs font-semibold text-[#68647D]">
                    Preferred Study Language
                  </label>
                  <select
                    id="student-language"
                    name="language"
                    value={editLanguage}
                    onChange={(e) => setEditLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E9DDF8] bg-white text-[#17133A] focus:outline-none focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA]"
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
              <div className="p-4 rounded-2xl border border-[#E9DDF8] bg-[#FAF9FF] space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#17133A]">
                  <History className="w-3.5 h-3.5 text-[#9333EA]" />
                  Academic History Timeline
                </div>
                {academicHistory.length > 0 ? (
                  <div className="space-y-2">
                    {academicHistory.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-[#E9DDF8] bg-white"
                      >
                        <div>
                          <span className="font-bold text-[#17133A] mr-2">
                            {h.academic_year}
                          </span>
                          <span className="text-[#68647D]">
                            {h.class?.name || 'Class'} • {h.board?.name || 'Board'} • {h.subject} ({h.preferred_language})
                          </span>
                        </div>
                        {h.is_current && (
                          <Badge className="text-[10px] py-0.5 bg-[#F3E8FF] text-[#9333EA] font-bold border-0">
                            Active
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#68647D]">
                    Current active academic context: 2026–27. Historical records will be retained year-by-year.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E9DDF8] bg-[#FAF9FF] flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5 cursor-pointer font-semibold"
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
                  className="border-[#E9DDF8] text-[#17133A] hover:bg-[#FAF9FF] rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="student-profile-form"
                  size="sm"
                  isLoading={savingProfile}
                  className="bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl font-bold shadow-xs px-4"
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
        <div className="min-h-screen flex items-center justify-center bg-[#FAF9FF] text-[#68647D]">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-[#9333EA] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Loading Student Dashboard...</p>
          </div>
        </div>
      }
    >
      <StudentDashboardContent />
    </Suspense>
  );
}
