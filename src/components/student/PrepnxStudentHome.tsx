'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  GraduationCap,
  BookOpen,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Atom,
  Calculator,
  Pencil,
  Book,
  Sprout,
  Play,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  Star,
  Award,
  Compass,
  Smile,
  Sun,
} from 'lucide-react';
import { Profile, ChannelItem, ClassItem, BannerItem } from '@/types';

interface PrepnxStudentHomeProps {
  profile: Profile | null;
  studentId: string;
  allClasses: ClassItem[];
  onOpenProfile: () => void;
  onLogout: () => void;
}

interface WatchHistoryItem {
  id: string; // videoId
  title: string;
  subject_name: string;
  duration_seconds: number | null;
  channel_id: string;
  channel_name: string;
  class_name: string;
  thumbnail_url: string | null;
  progress_percent: number;
  watched_seconds?: number;
  updated_at?: string;
}

const DEFAULT_BANNER: BannerItem = {
  id: '251b8f79-0eed-4edf-bafa-c75893d211df',
  title: 'Learn • Practice • Achieve',
  description: 'Live Classes, Recorded Lessons, Tests & More for School and Competitive Exams.',
  image_url: 'https://dkvmkywtqaahtvwrkahe.supabase.co/storage/v1/object/public/banners/uploads/1788596661874-1iju6n.png',
  storage_path: 'uploads/1788596661874-1iju6n.png',
  display_order: 1,
  is_active: true,
};

export interface ClassCardItem {
  id: string;
  name: string; // "LKG", "UKG", "Class 1", ... "Class 12"
  grade: string;
  stage: string;
  iconName: 'sun' | 'smile' | 'star' | 'book' | 'compass' | 'layers' | 'award' | 'cap';
}

export const SEPARATE_CLASSES: ClassCardItem[] = [
  { id: 'lkg', name: 'LKG', grade: 'Pre-K', stage: 'Early Years', iconName: 'sun' },
  { id: 'ukg', name: 'UKG', grade: 'Kindergarten', stage: 'Early Years', iconName: 'smile' },
  { id: 'class-1', name: 'Class 1', grade: 'Grade 1', stage: 'Primary School', iconName: 'star' },
  { id: 'class-2', name: 'Class 2', grade: 'Grade 2', stage: 'Primary School', iconName: 'star' },
  { id: 'class-3', name: 'Class 3', grade: 'Grade 3', stage: 'Primary School', iconName: 'book' },
  { id: 'class-4', name: 'Class 4', grade: 'Grade 4', stage: 'Primary School', iconName: 'book' },
  { id: 'class-5', name: 'Class 5', grade: 'Grade 5', stage: 'Primary School', iconName: 'book' },
  { id: 'class-6', name: 'Class 6', grade: 'Grade 6', stage: 'Middle School', iconName: 'compass' },
  { id: 'class-7', name: 'Class 7', grade: 'Grade 7', stage: 'Middle School', iconName: 'compass' },
  { id: 'class-8', name: 'Class 8', grade: 'Grade 8', stage: 'Middle School', iconName: 'layers' },
  { id: 'class-9', name: 'Class 9', grade: 'Grade 9', stage: 'High School', iconName: 'award' },
  { id: 'class-10', name: 'Class 10', grade: 'Grade 10', stage: 'Board Exams', iconName: 'award' },
  { id: 'class-11', name: 'Class 11', grade: 'Grade 11', stage: 'Senior Secondary', iconName: 'cap' },
  { id: 'class-12', name: 'Class 12', grade: 'Grade 12', stage: 'Higher Secondary', iconName: 'cap' },
];

function renderClassIcon(iconName: string, isSelected: boolean) {
  const iconClass = isSelected ? 'w-6 h-6 text-white stroke-[2.2]' : 'w-5 h-5 text-[#6244A6] stroke-[2]';
  switch (iconName) {
    case 'sun':
      return <Sun className={iconClass} />;
    case 'smile':
      return <Smile className={iconClass} />;
    case 'star':
      return <Star className={iconClass} />;
    case 'book':
      return <BookOpen className={iconClass} />;
    case 'compass':
      return <Compass className={iconClass} />;
    case 'layers':
      return <Layers className={iconClass} />;
    case 'award':
      return <Award className={iconClass} />;
    case 'cap':
    default:
      return <GraduationCap className={iconClass} />;
  }
}

export function PrepnxStudentHome({
  profile,
  studentId,
  allClasses,
  onOpenProfile,
  onLogout,
}: PrepnxStudentHomeProps) {
  const router = useRouter();
  const supabase = createClient();

  // 1. Banners from Supabase database
  const [banners, setBanners] = useState<BannerItem[]>([DEFAULT_BANNER]);
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const autoResumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Manual dot selection: switches slide, pauses auto-slide for 5 seconds, then resumes automatically
  const handleDotClick = (idx: number) => {
    setHeroSlideIdx(idx);
    setIsHeroPaused(true);
    if (autoResumeTimerRef.current) {
      clearTimeout(autoResumeTimerRef.current);
    }
    autoResumeTimerRef.current = setTimeout(() => {
      setIsHeroPaused(false);
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current);
      }
    };
  }, []);

  // 2. Channels loaded from Supabase
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [selectedPill, setSelectedPill] = useState<string>('Class 12');

  // Semicircle Carousel Track Refs & Transforms State
  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [cardTransforms, setCardTransforms] = useState<Record<string, { y: number; rot: number; scale: number }>>({});

  const updateArcTransforms = useCallback(() => {
    const track = carouselTrackRef.current;
    if (!track) return;
    const trackRect = track.getBoundingClientRect();
    const centerX = trackRect.left + trackRect.width / 2;
    const maxRadius = Math.max(trackRect.width * 0.44, 200);

    const newTransforms: Record<string, { y: number; rot: number; scale: number }> = {};

    SEPARATE_CLASSES.forEach((cls) => {
      const el = cardRefs.current[cls.id];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const offset = (cardCenter - centerX) / maxRadius;
      const clamped = Math.max(-1.4, Math.min(1.4, offset));

      // Semicircle arc formula: cards in the center crest upwards, while side cards curve down along the arc
      const y = Math.min(38, Math.pow(clamped, 2) * 26);
      const rot = clamped * 6.5;
      const scale = Math.max(0.88, 1.05 - Math.abs(clamped) * 0.1);

      newTransforms[cls.id] = { y, rot, scale };
    });

    setCardTransforms(newTransforms);
  }, []);

  useEffect(() => {
    updateArcTransforms();
    const handleResize = () => updateArcTransforms();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateArcTransforms]);

  const handleTrackScroll = () => {
    updateArcTransforms();
  };

  const scrollToCard = useCallback((id: string, smooth = true) => {
    const track = carouselTrackRef.current;
    const el = cardRefs.current[id];
    if (track && el) {
      const targetScroll = el.offsetLeft - track.offsetWidth / 2 + el.offsetWidth / 2;
      track.scrollTo({ left: targetScroll, behavior: smooth ? 'smooth' : 'auto' });
      setTimeout(updateArcTransforms, 180);
    }
  }, [updateArcTransforms]);

  // Center selected card when selectedPill changes
  useEffect(() => {
    const item = SEPARATE_CLASSES.find((c) => c.name === selectedPill);
    if (item) {
      scrollToCard(item.id, true);
    }
  }, [selectedPill, scrollToCard]);

  const handleScrollTrack = (direction: 'left' | 'right') => {
    const track = carouselTrackRef.current;
    if (track) {
      track.scrollBy({ left: direction === 'left' ? -260 : 260, behavior: 'smooth' });
      setTimeout(updateArcTransforms, 200);
    }
  };

  const handleCardClick = (cls: ClassCardItem) => {
    setSelectedPill(cls.name);
    scrollToCard(cls.id, true);
  };

  // 3. Watch History State
  const [lastWatched, setLastWatched] = useState<WatchHistoryItem | null>(null);
  const [loadingWatchHistory, setLoadingWatchHistory] = useState(true);

  // Fetch active banners from Supabase
  useEffect(() => {
    let ignore = false;
    async function loadBanners() {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!ignore && !error && data && data.length > 0) {
          setBanners(data as BannerItem[]);
        }
      } catch {
        // Keep DEFAULT_BANNER
      }
    }
    loadBanners();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  // Load channels from Supabase
  useEffect(() => {
    let ignore = false;
    async function loadChannels() {
      try {
        const { data, error } = await supabase
          .from('channels')
          .select('*, class:classes(id, name, display_order)')
          .order('created_at', { ascending: false });

        if (!ignore && !error && data) {
          setChannels(data as ChannelItem[]);
        }
      } catch {
        // Fail silently
      }
    }
    loadChannels();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  // Banner Carousel auto-rotation (every 4 seconds, pauses on hover, only when slides.length > 1)
  useEffect(() => {
    const slides = banners;
    if (slides.length <= 1 || isHeroPaused) return;

    const interval = setInterval(() => {
      setHeroSlideIdx((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners, isHeroPaused]);

  // Load student watch history strictly for the authenticated student
  useEffect(() => {
    let ignore = false;
    const targetUserId = profile?.id;

    if (!targetUserId) {
      setLastWatched(null);
      setLoadingWatchHistory(false);
      return;
    }

    async function loadWatchHistory() {
      try {
        setLoadingWatchHistory(true);

        // Check student_content_progress strictly for the current authenticated student UUID
        const { data: progressData, error: pErr } = await supabase
          .from('student_content_progress')
          .select('content_id, channel_id, progress_percent, watched_seconds, updated_at')
          .eq('student_id', targetUserId)
          .eq('content_type', 'video')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (!ignore && !pErr && progressData && progressData.length > 0) {
          const rec = progressData[0];
          const { data: vData, error: vErr } = await supabase
            .from('videos')
            .select('id, title, subject_name, duration_seconds, channel_id, thumbnail_url, channel:channels(id, name, photo_url, class_id, class:classes(id, name))')
            .eq('id', rec.content_id)
            .maybeSingle();

          if (!ignore && !vErr && vData) {
            const ch = vData.channel as any;
            setLastWatched({
              id: vData.id,
              title: vData.title,
              subject_name: vData.subject_name || 'General Subject',
              duration_seconds: vData.duration_seconds,
              channel_id: vData.channel_id,
              channel_name: ch?.name || 'Academic Channel',
              class_name: ch?.class?.name || 'Class 12',
              thumbnail_url: vData.thumbnail_url || ch?.photo_url || null,
              progress_percent: rec.progress_percent || 0,
              watched_seconds: rec.watched_seconds,
              updated_at: rec.updated_at,
            });
            setLoadingWatchHistory(false);
            return;
          }
        }

        // STRICT ISOLATION: If student has not watched any videos, watch history is null.
        // NEVER fall back to another student's or platform-wide videos!
        if (!ignore) {
          setLastWatched(null);
        }
      } catch (err) {
        console.error('Error loading watch history:', err);
        if (!ignore) setLastWatched(null);
      } finally {
        if (!ignore) setLoadingWatchHistory(false);
      }
    }

    loadWatchHistory();
    return () => {
      ignore = true;
    };
  }, [profile?.id, supabase]);

  // Popular class click: Selects pill & smoothly scrolls to explore courses section
  const handleSelectPopularClass = (className: string) => {
    setSelectedPill(className);
    const elem = document.getElementById('explore-courses');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter channels strictly for the selected separate class
  const filteredCoursesForPill = channels.filter((ch) => {
    const chClassName = (ch.class?.name || '').toLowerCase().trim();
    const chName = (ch.name || '').toLowerCase().trim();
    const pill = selectedPill.toLowerCase().trim();

    // LKG
    if (pill === 'lkg') {
      return (
        chClassName.includes('lkg') ||
        chName.includes('lkg') ||
        (chClassName.includes('kindergarten') && !chClassName.includes('ukg'))
      );
    }

    // UKG
    if (pill === 'ukg') {
      return (
        chClassName.includes('ukg') ||
        chName.includes('ukg')
      );
    }

    // Specific Class: e.g. "Class 1", "Class 2", ..., "Class 12"
    const pillMatch = pill.match(/class\s*([0-9]+)/i);
    if (pillMatch) {
      const num = pillMatch[1];
      const regex = new RegExp(`\\bclass\\s*${num}\\b|\\b${num}th\\b`, 'i');
      return (
        regex.test(chClassName) ||
        regex.test(chName) ||
        chClassName === `class ${num}`
      );
    }

    return chClassName === pill || chName.includes(pill);
  });

  const currentBanner = banners[heroSlideIdx] || DEFAULT_BANNER;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:43';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-[92%] sm:w-[92%] md:w-[90%] max-w-[1440px] mx-auto py-6 sm:py-8 space-y-10 sm:space-y-12 text-[#1E1035] font-sans">
      {/* ========================================================================= */}
      {/* SECTION 1 & 2: HERO BANNER + OVERLAYING POPULAR CLASSES                   */}
      {/* ========================================================================= */}
      <div className="relative">
        {/* SECTION 1: HERO BANNER */}
        <section
          aria-label="Hero Promotion Banner"
          onMouseEnter={() => setIsHeroPaused(true)}
          onMouseLeave={() => setIsHeroPaused(false)}
          className="relative rounded-2xl sm:rounded-[32px] overflow-hidden bg-gradient-to-r from-[#F5EDFF] via-[#EEE8FF] to-[#FAF9FF] border border-[#DCCFFF]/80 shadow-md transition-all duration-300"
        >
          {/* Full-width Responsive Banner Image */}
          <div className="relative w-full aspect-[21/9] sm:aspect-[24/8] md:aspect-[3.2/1] min-h-[180px] sm:min-h-[220px] md:min-h-[280px] lg:min-h-[320px]">
            {currentBanner.button_link ? (
              <Link
                href={currentBanner.button_link}
                className="block w-full h-full relative cursor-pointer group"
                title={currentBanner.title || 'Educational Banner'}
              >
                <Image
                  src={currentBanner.image_url}
                  alt={currentBanner.title || 'EduTech Learning Banner'}
                  fill
                  priority
                  sizes="100vw"
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.01]"
                  unoptimized
                />
              </Link>
            ) : (
              <Image
                src={currentBanner.image_url}
                alt={currentBanner.title || 'EduTech Learning Banner'}
                fill
                priority
                sizes="100vw"
                className="w-full h-full object-cover object-center"
                unoptimized
              />
            )}
          </div>

          {/* Carousel Indicator Dots Overlay on Poster Bottom Center - Moved up to be visible above Popular Classes */}
          {banners.length >= 1 && (
            <div className="absolute bottom-16 sm:bottom-20 md:bottom-24 left-0 right-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-all">
                {banners.map((_, idx) => {
                  const isCurrent = heroSlideIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDotClick(idx)}
                      disabled={banners.length <= 1}
                      aria-label={`Banner slide ${idx + 1}`}
                      title={`Slide ${idx + 1} of ${banners.length}`}
                      className={`transition-all duration-300 ${
                        banners.length <= 1 ? 'cursor-default' : 'cursor-pointer'
                      } ${
                        isCurrent
                          ? 'w-6 h-2.5 rounded-full bg-white shadow-md'
                          : 'w-2.5 h-2.5 rounded-full bg-white/60 hover:bg-white border border-white/40 shadow-xs hover:scale-110'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: POPULAR CLASSES - 50% OVERLAY ON SLIDE, 50% BELOW SLIDE */}
        <div className="relative z-30 -mt-12 sm:-mt-14 md:-mt-16 px-2 sm:px-6">
          <section
            aria-label="Popular Classes"
            className="max-w-5xl mx-auto w-full bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-xl shadow-purple-950/10 border border-[#E9DDF8] backdrop-blur-sm"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Heading */}
              <div className="flex items-center justify-between lg:justify-start gap-3 shrink-0">
                <h2 className="text-xl sm:text-2xl font-bold text-[#1E1035] tracking-tight font-display flex items-center gap-2">
                  <span>Popular Classes</span>
                  <span className="text-sm font-normal text-[#6244A6]">✨</span>
                </h2>
                <Link
                  href="/student?tab=channels"
                  className="text-xs font-bold text-[#6244A6] hover:text-[#4E338A] flex items-center gap-1 group lg:hidden"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* 3 Prominent Class Cards (Horizontal Grid on Larger Screens) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 lg:max-w-3xl">
                {/* Class 12 */}
                <button
                  type="button"
                  onClick={() => handleSelectPopularClass('Class 12')}
                  className={`group flex items-center justify-between px-4 py-3 sm:py-3.5 rounded-2xl transition-all duration-200 cursor-pointer text-left hover:-translate-y-0.5 ${
                    selectedPill === 'Class 12'
                      ? 'bg-[#EEE8FF] text-[#130924] border-2 border-[#6244A6] shadow-md'
                      : 'bg-[#FAF9FF] text-[#1E1035] border border-[#DCCFFF] hover:bg-[#EEE8FF] hover:text-[#130924] hover:border-[#6244A6] hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform ${
                      selectedPill === 'Class 12' ? 'bg-[#DCCFFF] text-[#130924]' : 'bg-[#EEE8FF] text-[#6244A6]'
                    }`}>
                      <GraduationCap className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-[#1E1035] group-hover:text-[#130924] transition-colors">Class 12</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6244A6] group-hover:text-[#130924] group-hover:translate-x-1 transition-all stroke-[2.5]" />
                </button>

                {/* Class 11 */}
                <button
                  type="button"
                  onClick={() => handleSelectPopularClass('Class 11')}
                  className={`group flex items-center justify-between px-4 py-3 sm:py-3.5 rounded-2xl transition-all duration-200 cursor-pointer text-left hover:-translate-y-0.5 ${
                    selectedPill === 'Class 11'
                      ? 'bg-[#EEE8FF] text-[#130924] border-2 border-[#6244A6] shadow-md'
                      : 'bg-[#FAF9FF] text-[#1E1035] border border-[#DCCFFF] hover:bg-[#EEE8FF] hover:text-[#130924] hover:border-[#6244A6] hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform ${
                      selectedPill === 'Class 11' ? 'bg-[#DCCFFF] text-[#130924]' : 'bg-[#EEE8FF] text-[#6244A6]'
                    }`}>
                      <BookOpen className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-[#1E1035] group-hover:text-[#130924] transition-colors">Class 11</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6244A6] group-hover:text-[#130924] group-hover:translate-x-1 transition-all stroke-[2.5]" />
                </button>

                {/* Class 10 */}
                <button
                  type="button"
                  onClick={() => handleSelectPopularClass('Class 10')}
                  className={`group flex items-center justify-between px-4 py-3 sm:py-3.5 rounded-2xl transition-all duration-200 cursor-pointer text-left hover:-translate-y-0.5 ${
                    selectedPill === 'Class 10'
                      ? 'bg-[#EEE8FF] text-[#130924] border-2 border-[#6244A6] shadow-md'
                      : 'bg-[#FAF9FF] text-[#1E1035] border border-[#DCCFFF] hover:bg-[#EEE8FF] hover:text-[#130924] hover:border-[#6244A6] hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform ${
                      selectedPill === 'Class 10' ? 'bg-[#DCCFFF] text-[#130924]' : 'bg-[#EEE8FF] text-[#6244A6]'
                    }`}>
                      <Atom className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-[#1E1035] group-hover:text-[#130924] transition-colors">Class 10</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6244A6] group-hover:text-[#130924] group-hover:translate-x-1 transition-all stroke-[2.5]" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: WATCH HISTORY / CONTINUE WATCHING                              */}
      {/* (After Popular Classes & Before Explore Courses)                          */}
      {/* ========================================================================= */}
      {lastWatched && (
        <section aria-label="Watch History" className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EEE8FF] text-[#6244A6] flex items-center justify-center shadow-2xs">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E1035] tracking-tight font-display">
                  Continue Watching
                </h2>
                <p className="text-xs text-[#5F5875]">
                  Pick up right where you left off in your learning journey
                </p>
              </div>
            </div>

            <Link
              href={`/channels/${lastWatched.channel_id}`}
              className="text-xs font-bold text-[#6244A6] hover:text-[#4E338A] flex items-center gap-1 group"
            >
              <span>View Channel</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Continue Watching Video Card */}
          <div className="bg-gradient-to-r from-white via-[#F8F6FF] to-white rounded-3xl p-5 sm:p-6 border border-[#DCCFFF] shadow-md hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-6 group">
            {/* Left: Thumbnail & Play Preview */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full md:w-auto">
              <div className="relative w-full sm:w-56 aspect-video rounded-2xl overflow-hidden bg-gradient-to-tr from-[#EEE8FF] via-[#F4F0FF] to-[#DCCFFF] shrink-0 border border-[#DCCFFF] shadow-md flex items-center justify-center group-hover:shadow-lg transition-shadow">
                {lastWatched.thumbnail_url ? (
                  <Image
                    src={lastWatched.thumbnail_url}
                    alt={lastWatched.title}
                    fill
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-3 text-[#1E1035]">
                    <GraduationCap className="w-8 h-8 text-[#6244A6] mb-1" />
                    <span className="text-[11px] font-black tracking-wider uppercase text-[#1E1035]">
                      {lastWatched.subject_name}
                    </span>
                  </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-violet-950/10 flex items-center justify-center backdrop-blur-[1px]">
                  <div className="w-11 h-11 rounded-full bg-white text-[#1E1035] shadow-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-[#EEE8FF] transition-all pl-0.5">
                    <Play className="w-5 h-5 fill-[#1E1035] text-[#1E1035] group-hover:fill-[#130924] group-hover:text-[#130924]" />
                  </div>
                </div>

                {/* Duration Badge (Dark Font Theme) */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-white/95 border border-[#DCCFFF] text-[#1E1035] text-[10px] font-bold font-mono tracking-wide shadow-xs">
                  {formatDuration(lastWatched.duration_seconds)}
                </div>

                {/* Progress bar on bottom edge */}
                {lastWatched.progress_percent > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                    <div
                      className="h-full bg-[#8060CE]"
                      style={{ width: `${Math.min(100, Math.max(5, lastWatched.progress_percent))}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Video Details */}
              <div className="space-y-1.5 text-center sm:text-left w-full sm:w-auto">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEE8FF] text-[#6244A6] border border-[#DCCFFF] uppercase tracking-wide">
                    {lastWatched.subject_name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F0FF] text-[#3D1E6D] border border-[#DCCFFF]">
                    {lastWatched.class_name}
                  </span>
                  {lastWatched.progress_percent > 0 && (
                    <span className="text-[11px] font-semibold text-[#8060CE]">
                      {lastWatched.progress_percent}% completed
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#1E1035] group-hover:text-[#6244A6] transition-colors leading-snug">
                  {lastWatched.title}
                </h3>

                <p className="text-xs text-[#5F5875] font-medium flex items-center justify-center sm:justify-start gap-1.5">
                  <span>Channel:</span>
                  <span className="font-bold text-[#1E1035]">{lastWatched.channel_name}</span>
                </p>
              </div>
            </div>

            {/* Right: Continue Button (Dark Font Theme) */}
            <div className="shrink-0 w-full sm:w-auto flex justify-center sm:justify-end">
              <Link
                href={`/watch/video/${lastWatched.id}?channelId=${lastWatched.channel_id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full text-sm font-black text-[#1E1035] hover:text-[#130924] bg-gradient-to-r from-[#EEE8FF] via-[#E4D8FC] to-[#EEE8FF] hover:from-[#DCCFFF] hover:to-[#EEE8FF] border border-[#BBA5F0] shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer group/btn"
              >
                <Play className="w-4 h-4 fill-[#1E1035] text-[#1E1035] group-hover/btn:fill-[#130924] group-hover/btn:text-[#130924] transition-colors" />
                <span>Continue</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: EXPLORE COURSES (STRICT FILTER BY CLASS + EMPTY MESSAGE)       */}
      {/* ========================================================================= */}
      <section id="explore-courses" aria-label="Explore Courses by Grade" className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E1035] tracking-tight font-display">
              Explore Courses (LKG – Class 12)
            </h2>
            <p className="text-xs sm:text-sm text-[#5F5875] font-medium mt-1">
              Select your academic standard to view syllabus and video channels
            </p>
          </div>

          <Link
            href="/student?tab=channels"
            className="text-xs font-bold text-[#6244A6] hover:text-[#130924] flex items-center gap-1 group self-start sm:self-auto transition-colors"
          >
            <span>Browse All Courses</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Semicircle Class Cards Carousel Section */}
        <div className="relative py-4 select-none">
          {/* Subtle Ambient Dashed Semicircle Arc Line */}
          <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-44 border-t-2 border-dashed border-[#DCCFFF] rounded-[100%] pointer-events-none -z-10 opacity-70" />

          {/* Floating Left Navigation Button */}
          <button
            type="button"
            onClick={() => handleScrollTrack('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/95 backdrop-blur-md border border-[#DCCFFF] shadow-md shadow-[#1E1035]/10 flex items-center justify-center text-[#1E1035] hover:text-[#130924] hover:bg-[#EEE8FF] hover:border-[#6244A6] hover:scale-110 active:scale-95 transition-all cursor-pointer"
            aria-label="Scroll left to previous classes"
            title="Previous classes"
          >
            <ChevronLeft className="w-5 h-5 text-[#1E1035]" />
          </button>

          {/* Floating Right Navigation Button */}
          <button
            type="button"
            onClick={() => handleScrollTrack('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/95 backdrop-blur-md border border-[#DCCFFF] shadow-md shadow-[#1E1035]/10 flex items-center justify-center text-[#1E1035] hover:text-[#130924] hover:bg-[#EEE8FF] hover:border-[#6244A6] hover:scale-110 active:scale-95 transition-all cursor-pointer"
            aria-label="Scroll right to next classes"
            title="Next classes"
          >
            <ChevronRight className="w-5 h-5 text-[#1E1035]" />
          </button>

          {/* Semicircle Curved Scrolling Track */}
          <div
            ref={carouselTrackRef}
            onScroll={handleTrackScroll}
            className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-8 px-12 sm:px-16 scroll-smooth"
            style={{ perspective: '1000px' }}
          >
            {SEPARATE_CLASSES.map((cls) => {
              const isSelected = selectedPill === cls.name;
              const transform = cardTransforms[cls.id] || { y: 0, rot: 0, scale: 1 };

              return (
                <div
                  key={cls.id}
                  ref={(el) => {
                    cardRefs.current[cls.id] = el;
                  }}
                  onClick={() => handleCardClick(cls)}
                  className={`w-36 sm:w-44 h-48 sm:h-52 rounded-3xl p-4 sm:p-5 flex flex-col justify-between items-center text-center shrink-0 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#EEE8FF] to-[#DCCFFF] border-2 border-[#6244A6] shadow-xl shadow-[#6244A6]/20'
                      : 'bg-white border border-[#DCCFFF] hover:border-[#6244A6] hover:bg-[#F8F6FF] shadow-xs hover:shadow-md'
                  }`}
                  style={{
                    transform: `translate3d(0, ${transform.y}px, 0) rotate(${transform.rot}deg) scale(${transform.scale})`,
                    transformOrigin: '50% 120%',
                    transition: 'transform 0.12s ease-out, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  {/* Top Icon Badge */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform ${
                      isSelected
                        ? 'bg-gradient-to-tr from-[#3D1E6D] to-[#6244A6] text-white shadow-md scale-105'
                        : 'bg-[#EEE8FF] border border-[#DCCFFF] text-[#6244A6]'
                    }`}
                  >
                    {renderClassIcon(cls.iconName, isSelected)}
                  </div>

                  {/* Class Title & Stage */}
                  <div className="space-y-1">
                    <h3 className={`font-display font-extrabold text-lg sm:text-xl tracking-tight ${isSelected ? 'text-[#130924]' : 'text-[#1E1035]'}`}>
                      {cls.name}
                    </h3>
                    <p className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-[#6244A6]' : 'text-[#5F5875]'}`}>
                      {cls.stage}
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div className="pt-1">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-[#6244A6] text-white shadow-xs tracking-wide">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        Selected
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#6244A6] bg-[#EEE8FF] border border-[#DCCFFF]">
                        {cls.grade}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Course Cards Container: Shows ONLY That Class's Courses OR Clean Empty Message */}
        {filteredCoursesForPill.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoursesForPill.map((course) => {
              return (
                <div
                  key={course.id}
                  className="group relative bg-white rounded-3xl p-6 sm:p-7 border border-[#DCCFFF] hover:border-[#6244A6] shadow-sm hover:shadow-2xl hover:shadow-[#6244A6]/15 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  {/* Top Animated Accent Border on Hover */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#6244A6] via-[#8060CE] to-[#A485E8] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="space-y-4">
                    {/* Header: Class Badge & Avatar Icon */}
                    <div className="flex items-center justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#EEE8FF] to-[#F8F6FF] border border-[#DCCFFF] text-[#6244A6] flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all">
                        {course.photo_url ? (
                          <div className="relative w-full h-full rounded-2xl overflow-hidden">
                            <Image
                              src={course.photo_url}
                              alt={course.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <BookOpen className="w-7 h-7 text-[#6244A6]" />
                        )}
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EEE8FF] text-[#1E1035] border border-[#DCCFFF]">
                        {selectedPill}
                      </span>
                    </div>

                    {/* Course Title & Description */}
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-[#1E1035] group-hover:text-[#130924] transition-colors font-display line-clamp-1">
                        {course.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#5F5875] font-medium mt-1.5 line-clamp-2 leading-relaxed">
                        {course.description ||
                          'Comprehensive video lectures, chapter notes, and practice tests designed for academic excellence.'}
                      </p>
                    </div>

                    {/* Feature Highlights */}
                    <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-[#5F5875]">
                      <span className="flex items-center gap-1 text-[#6244A6]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Full Syllabus
                      </span>
                      <span>&bull;</span>
                      <span>HD Video Lessons</span>
                    </div>
                  </div>

                  {/* Bottom Action Button (Dark Font Theme) */}
                  <div className="pt-6">
                    <Link
                      href={`/channels/${course.id}`}
                      className="w-full py-3 px-5 rounded-full text-xs sm:text-sm font-black text-[#1E1035] hover:text-[#130924] bg-gradient-to-r from-[#EEE8FF] via-[#E4D8FC] to-[#EEE8FF] hover:from-[#DCCFFF] hover:to-[#EEE8FF] border border-[#BBA5F0] hover:border-[#6244A6] shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer group/btn"
                    >
                      <span>Explore Course</span>
                      <ArrowRight className="w-4 h-4 text-[#1E1035] group-hover/btn:text-[#130924] group-hover/btn:translate-x-1 transition-all stroke-[2.5]" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state when NO courses exist for this class */
          <div className="w-full bg-gradient-to-br from-[#FAF8FF] via-[#F5EEFF] to-[#FAF8FF] rounded-3xl p-10 sm:p-14 border border-dashed border-[#DCCFFF] text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-white border border-[#E9DDF8] text-[#8060CE] flex items-center justify-center mx-auto shadow-sm">
              <BookOpen className="w-8 h-8 text-[#6244A6]" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl sm:text-2xl font-bold text-[#1E1035] font-display">
                No courses currently available for {selectedPill}
              </h3>
              <p className="text-xs sm:text-sm text-[#5F5875] leading-relaxed">
                Our master educators are actively preparing high-definition video lessons and test series for {selectedPill}. Please check back shortly or explore our other active channels.
              </p>
            </div>
            <div className="pt-3">
              <Link
                href="/student?tab=channels"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs sm:text-sm font-black text-[#1E1035] hover:text-[#130924] bg-gradient-to-r from-[#EEE8FF] via-[#E4D8FC] to-[#EEE8FF] hover:from-[#DCCFFF] hover:to-[#EEE8FF] border border-[#BBA5F0] hover:border-[#6244A6] shadow-xs transition-all hover:scale-105 cursor-pointer group/btn"
              >
                <span>Browse All Active Channels</span>
                <ArrowRight className="w-4 h-4 text-[#1E1035] group-hover/btn:text-[#130924] transition-colors" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: LEARNING CTA BANNER                                            */}
      {/* ========================================================================= */}
      <section
        aria-label="Start Learning Call to Action"
        className="rounded-3xl sm:rounded-[32px] bg-gradient-to-r from-[#FAF8FF] via-[#EEE8FF] to-[#FAF8FF] border border-[#DCCFFF] p-7 sm:p-10 lg:p-12 shadow-sm"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-[#DCCFFF] text-[#6244A6] flex items-center justify-center shadow-sm shrink-0">
              <GraduationCap className="w-9 h-9" />
            </div>

            <div className="space-y-1.5 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E1035] tracking-tight font-display">
                Start Your Learning Journey with Prepnx
              </h2>
              <p className="text-xs sm:text-sm text-[#5F5875] font-medium">
                Expert teachers &bull; Structured courses &bull; Better results
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Link
              href="/student?tab=channels"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm sm:text-base font-black text-[#1E1035] hover:text-[#130924] bg-gradient-to-r from-[#EEE8FF] via-[#E4D8FC] to-[#EEE8FF] hover:from-[#DCCFFF] hover:to-[#EEE8FF] border border-[#BBA5F0] hover:border-[#6244A6] shadow-md shadow-violet-700/15 hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer group/btn"
            >
              <span>Explore Courses</span>
              <ArrowRight className="w-4 h-4 text-[#1E1035] group-hover/btn:text-[#130924] transition-colors stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
