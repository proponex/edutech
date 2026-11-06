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
  ChevronLeft,
  ChevronRight,
  Atom,
  Calculator,
  Pencil,
  Book,
  Sprout,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { Profile, ChannelItem, ClassItem, BannerItem } from '@/types';
import { PrepnxFooter } from '@/components/student/PrepnxFooter';

interface PrepnxStudentHomeProps {
  profile: Profile | null;
  studentId: string;
  allClasses: ClassItem[];
  onOpenProfile: () => void;
  onLogout: () => void;
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

const FILTER_PILLS = [
  'Class 12',
  'Class 11',
  'Class 10',
  'Class 9',
  'Class 8',
  'Class 7',
  'Class 6',
  'Class 1 – 5',
  'LKG – UKG',
];

const STATIC_COURSE_CARDS = [
  {
    gradeName: 'Class 12',
    subtitle: 'Grade 12',
    icon: 'books',
    color: 'purple',
    bgLight: 'bg-[#F3E8FF] text-[#9333EA]',
  },
  {
    gradeName: 'Class 11',
    subtitle: 'Grade 11',
    icon: 'book',
    color: 'blue',
    bgLight: 'bg-[#E5F0FF] text-[#2563EB]',
  },
  {
    gradeName: 'Class 10',
    subtitle: 'Grade 10',
    icon: 'pencil',
    color: 'pink',
    bgLight: 'bg-[#FCE7F3] text-[#DB2777]',
  },
  {
    gradeName: 'Class 9',
    subtitle: 'Grade 9',
    icon: 'calc',
    color: 'purple',
    bgLight: 'bg-[#F3E8FF] text-[#9333EA]',
  },
  {
    gradeName: 'Class 8',
    subtitle: 'Grade 8',
    icon: 'atom',
    color: 'blue',
    bgLight: 'bg-[#E5F0FF] text-[#2563EB]',
  },
  {
    gradeName: 'Class 7',
    subtitle: 'Grade 7',
    icon: 'plant',
    color: 'pink',
    bgLight: 'bg-[#FCE7F3] text-[#DB2777]',
  },
  {
    gradeName: 'Class 6',
    subtitle: 'Grade 6',
    icon: 'books',
    color: 'purple',
    bgLight: 'bg-[#F3E8FF] text-[#9333EA]',
  },
  {
    gradeName: 'Class 1 – 5',
    subtitle: 'Primary Grades',
    icon: 'pencil',
    color: 'blue',
    bgLight: 'bg-[#E5F0FF] text-[#2563EB]',
  },
  {
    gradeName: 'LKG – UKG',
    subtitle: 'Kindergarten',
    icon: 'plant',
    color: 'pink',
    bgLight: 'bg-[#FCE7F3] text-[#DB2777]',
  },
];

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Aanya Sharma',
    className: 'Class 12',
    stars: 5,
    quote:
      'The classes are very clear and easy to understand. It really helped me improve my marks and understand tough concepts with confidence!',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 2,
    name: 'Rohan Mehta',
    className: 'Class 11',
    stars: 5,
    quote:
      'Great explanations and practice tests. The platform is simple and very student-friendly with top quality chapter notes.',
    avatar:
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 3,
    name: 'Diya Nair',
    className: 'Class 10',
    stars: 5,
    quote:
      'All subjects in one place with quality content. Highly recommended for every student preparing for board exams!',
    avatar:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80',
  },
];

export function PrepnxStudentHome({
  profile,
  studentId,
  allClasses,
  onOpenProfile,
  onLogout,
}: PrepnxStudentHomeProps) {
  const router = useRouter();
  const supabase = createClient();

  // Banners from Supabase database
  const [banners, setBanners] = useState<BannerItem[]>([DEFAULT_BANNER]);
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);

  // Channels loaded from Supabase
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [selectedPill, setSelectedPill] = useState<string>('Class 12');

  // Testimonials Carousel
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [isTestimonialPaused, setIsTestimonialPaused] = useState(false);

  // Horizontal scroll ref for course cards
  const courseCardsRef = useRef<HTMLDivElement>(null);

  // 1. Fetch active banners from Supabase
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

  // 2. Load channels from Supabase
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

  // 3. Hero Carousel auto-rotation (every 4 seconds, pauses on hover, only when slides.length > 1)
  useEffect(() => {
    const slides = banners;
    if (slides.length <= 1 || isHeroPaused) return;

    const interval = setInterval(() => {
      setHeroSlideIdx((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners, isHeroPaused]);

  // 4. Testimonials auto-rotation (every 4 seconds, pauses on hover)
  useEffect(() => {
    if (isTestimonialPaused) return;

    const interval = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isTestimonialPaused]);

  // Scroll course cards carousel left/right
  const scrollCourses = (direction: 'left' | 'right') => {
    if (courseCardsRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      courseCardsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Helper: map pill name to matching channels or class ID
  const getDestinationForClass = (className: string) => {
    const matchedClass = allClasses.find((c) => {
      if (className === 'LKG – UKG') {
        return c.name.toLowerCase().includes('kindergarten') || c.name.toLowerCase().includes('kg');
      }
      if (className === 'Class 1 – 5') {
        return c.name.toLowerCase().includes('class 1') || c.name.toLowerCase().includes('class 5');
      }
      return c.name.toLowerCase() === className.toLowerCase();
    });

    if (matchedClass) {
      const channelForClass = channels.find((ch) => ch.class_id === matchedClass.id);
      if (channelForClass) {
        return `/channels/${channelForClass.id}`;
      }
      return `/student?tab=channels&classId=${matchedClass.id}`;
    }

    return '/student?tab=channels';
  };

  const handleClassSelect = (className: string) => {
    setSelectedPill(className);
    const elem = document.getElementById('explore-courses');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectPopularClass = (className: string) => {
    const matchedClass = allClasses.find((c) => {
      if (className === 'LKG – UKG') {
        return c.name.toLowerCase().includes('kindergarten') || c.name.toLowerCase().includes('kg');
      }
      if (className === 'Class 1 – 5') {
        return c.name.toLowerCase().includes('class 1') || c.name.toLowerCase().includes('class 5');
      }
      return c.name.toLowerCase() === className.toLowerCase();
    });

    if (matchedClass) {
      router.push(`/student?tab=channels&classId=${matchedClass.id}`);
    } else {
      router.push('/student?tab=channels');
    }
  };

  // Icon renderer helper
  const renderCardIcon = (iconName: string) => {
    switch (iconName) {
      case 'books':
        return <BookOpen className="w-8 h-8" />;
      case 'book':
        return <Book className="w-8 h-8" />;
      case 'pencil':
        return <Pencil className="w-8 h-8" />;
      case 'calc':
        return <Calculator className="w-8 h-8" />;
      case 'atom':
        return <Atom className="w-8 h-8" />;
      case 'plant':
        return <Sprout className="w-8 h-8" />;
      default:
        return <GraduationCap className="w-8 h-8" />;
    }
  };

  const currentBanner = banners[heroSlideIdx] || DEFAULT_BANNER;

  return (
    <div className="w-[92%] sm:w-[92%] md:w-[90%] max-w-[1440px] mx-auto py-6 sm:py-8 space-y-12 sm:space-y-16 text-[#17133A] font-sans">
      {/* ========================================================================= */}
      {/* SECTION 2: HERO BANNER CAROUSEL (RESPONSIVE IMAGE CAROUSEL) */}
      {/* ========================================================================= */}
      <section
        aria-label="Hero Promotion Banner"
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
        className="relative rounded-[28px] sm:rounded-[36px] overflow-hidden bg-gradient-to-r from-[#F5EDFF] via-[#EDE3FF] to-[#FAF9FF] border border-[#E9DDF8] shadow-xs pb-16 sm:pb-20 md:pb-24 transition-all duration-300"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-6 p-6 sm:p-10 lg:p-12 relative z-10">
          {/* Left Text & CTA */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#E9DDF8] text-[#9333EA] text-xs font-bold tracking-wide uppercase shadow-xs">
              <span>Board &amp; Competitive Preparation</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[50px] font-extrabold text-[#17133A] leading-[1.16] tracking-tight font-display">
              {currentBanner.title || 'Learn • Practice • Achieve'}
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-[#68647D] max-w-xl leading-relaxed">
              {currentBanner.description ||
                'Live Classes, Recorded Lessons, Tests & More for School and Competitive Exams.'}
            </p>

            <div className="pt-2">
              <Link
                href={currentBanner.button_link || '/student?tab=channels'}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm sm:text-base font-bold text-white bg-[#9333EA] hover:bg-[#7E22CE] shadow-md shadow-purple-600/20 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>{currentBanner.button_text || 'Explore Channels'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>
          </div>

          {/* Right Banner Image with Student Graphic & Floating Badge */}
          <div className="lg:col-span-5 relative flex items-center justify-center lg:justify-end">
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-[360px] aspect-[4/3] sm:aspect-[4/5] rounded-3xl overflow-hidden shadow-xl border-4 border-white/90 bg-white">
              <Image
                src={currentBanner.image_url}
                alt={currentBanner.title || 'Prepnx Learning Banner'}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 360px"
                className="w-full h-full object-cover object-center"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-950/20 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Floating Badge: Ace Your Exams */}
            <div className="absolute -bottom-4 right-2 sm:right-6 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-purple-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl shadow-xs">
                🏆
              </div>
              <div>
                <p className="text-[11px] text-[#68647D] font-medium leading-none">Ace Your</p>
                <p className="text-sm font-bold text-[#17133A] mt-0.5">Exams</p>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Indicator Dots (Visible when > 1 banner) */}
        {banners.length > 1 && (
          <div className="flex items-center justify-center gap-2 pb-4 pt-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setHeroSlideIdx(idx)}
                aria-label={`Banner slide ${idx + 1}`}
                className={`transition-all duration-300 cursor-pointer ${
                  heroSlideIdx === idx
                    ? 'w-7 h-2 rounded-full bg-[#9333EA] shadow-xs'
                    : 'w-2.5 h-2 rounded-full bg-purple-300 hover:bg-purple-400'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: POPULAR CLASSES — OVERLAPS THE HERO BANNER (EXACTLY 2 ROWS)   */}
      {/* ========================================================================= */}
      <section
        aria-label="Popular Classes"
        className="-mt-10 sm:-mt-14 md:-mt-16 relative z-20 max-w-4xl mx-auto w-full bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xl shadow-purple-900/5 border border-[#E9DDF8]"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Row 1: Heading */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-[#17133A] tracking-tight font-display flex items-center gap-2">
              <span>Popular Classes</span>
              <span className="text-sm font-normal text-[#9333EA]">✨</span>
            </h2>
            <Link
              href="/student?tab=channels"
              className="text-xs font-bold text-[#9333EA] hover:text-[#7E22CE] flex items-center gap-1 group"
            >
              <span>View all classes</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Row 2: Exactly 3 Prominent Class Cards (Vedantu Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Class 12: Lavender */}
            <button
              type="button"
              onClick={() => handleSelectPopularClass('Class 12')}
              className="group flex items-center justify-between px-5 py-4 rounded-2xl bg-[#F3E8FF] hover:bg-[#EBD5FF] border border-[#E9DDF8] transition-all duration-200 cursor-pointer text-left hover:-translate-y-0.5 hover:shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/90 text-[#9333EA] flex items-center justify-center shadow-xs shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-base sm:text-lg font-bold text-[#17133A]">Class 12</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9333EA] group-hover:translate-x-1 transition-transform stroke-[2.5]" />
            </button>

            {/* Class 11: Minimal Light Blue */}
            <button
              type="button"
              onClick={() => handleSelectPopularClass('Class 11')}
              className="group flex items-center justify-between px-5 py-4 rounded-2xl bg-[#E5F0FF] hover:bg-[#D5E5FF] border border-[#D0E3FF] transition-all duration-200 cursor-pointer text-left hover:-translate-y-0.5 hover:shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/90 text-[#2563EB] flex items-center justify-center shadow-xs shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-base sm:text-lg font-bold text-[#17133A]">Class 11</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#2563EB] group-hover:translate-x-1 transition-transform stroke-[2.5]" />
            </button>

            {/* Class 10: Soft Rose */}
            <button
              type="button"
              onClick={() => handleSelectPopularClass('Class 10')}
              className="group flex items-center justify-between px-5 py-4 rounded-2xl bg-[#FCE7F3] hover:bg-[#F9D2E8] border border-[#FBCFE8] transition-all duration-200 cursor-pointer text-left hover:-translate-y-0.5 hover:shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/90 text-[#DB2777] flex items-center justify-center shadow-xs shrink-0">
                  <Atom className="w-5 h-5" />
                </div>
                <span className="text-base sm:text-lg font-bold text-[#17133A]">Class 10</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#DB2777] group-hover:translate-x-1 transition-transform stroke-[2.5]" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4 & 5: EXPLORE COURSES (LKG – CLASS 12) + COURSE CAROUSEL */}
      {/* ========================================================================= */}
      <section id="explore-courses" aria-label="Explore Courses by Grade" className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17133A] tracking-tight font-display">
              Explore Courses (LKG – Class 12)
            </h2>
            <p className="text-xs sm:text-sm text-[#68647D] font-medium mt-1">
              Select your academic standard to view syllabus and video channels
            </p>
          </div>

          {/* Carousel Left/Right Controls on Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollCourses('left')}
              className="w-9 h-9 rounded-full bg-white border border-[#E9DDF8] hover:bg-[#FAF9FF] hover:border-[#9333EA]/40 text-[#68647D] hover:text-[#9333EA] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              aria-label="Scroll courses left"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => scrollCourses('right')}
              className="w-9 h-9 rounded-full bg-[#9333EA] hover:bg-[#7E22CE] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
              aria-label="Scroll courses right"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Clean Pill-Shaped Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {FILTER_PILLS.map((pill) => {
            const isSelected = selectedPill === pill;
            return (
              <button
                key={pill}
                type="button"
                onClick={() => setSelectedPill(pill)}
                className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#9333EA] text-white border-[#9333EA] shadow-xs font-bold'
                    : 'bg-white text-[#68647D] hover:border-[#9333EA]/40 hover:bg-[#FAF9FF] border-[#E9DDF8]'
                }`}
              >
                {pill}
              </button>
            );
          })}
        </div>

        {/* Horizontal Course Cards Carousel */}
        <div className="relative">
          <div
            ref={courseCardsRef}
            className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth scrollbar-none"
          >
            {STATIC_COURSE_CARDS.map((card, idx) => {
              const destination = getDestinationForClass(card.gradeName);

              return (
                <div
                  key={idx}
                  className="min-w-[170px] sm:min-w-[190px] max-w-[210px] flex-1 bg-white rounded-3xl p-5 border border-[#E9DDF8] flex flex-col items-center text-center transition-all duration-200 shadow-xs hover:shadow-lg hover:-translate-y-1 group shrink-0"
                >
                  {/* Educational Illustration Avatar */}
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${card.bgLight} flex items-center justify-center mb-4 transition-transform group-hover:scale-105 shadow-2xs`}
                  >
                    {renderCardIcon(card.icon)}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-[#17133A] font-display">
                    {card.gradeName}
                  </h3>
                  <p className="text-xs text-[#68647D] font-medium mb-5">{card.subtitle}</p>

                  <Link
                    href={destination}
                    className="w-full py-2 px-4 rounded-full text-xs font-bold text-white bg-[#9333EA] hover:bg-[#7E22CE] shadow-xs flex items-center justify-center gap-1.5 transition-all mt-auto cursor-pointer"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6: STUDENT TESTIMONIALS CAROUSEL */}
      {/* ========================================================================= */}
      <section
        aria-label="Student Testimonials"
        onMouseEnter={() => setIsTestimonialPaused(true)}
        onMouseLeave={() => setIsTestimonialPaused(false)}
        className="space-y-6 pt-2"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17133A] tracking-tight font-display">
              What Our Students Say
            </h2>
            <p className="text-xs sm:text-sm text-[#68647D] mt-1">
              Real reviews from students excelling with Prepnx
            </p>
          </div>

          {/* Testimonials Left/Right Arrows */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setTestimonialIdx((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
              }
              className="w-9 h-9 rounded-full bg-white border border-[#E9DDF8] hover:bg-[#FAF9FF] hover:border-[#9333EA]/40 text-[#68647D] hover:text-[#9333EA] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => setTestimonialIdx((prev) => (prev + 1) % TESTIMONIALS.length)}
              className="w-9 h-9 rounded-full bg-[#9333EA] hover:bg-[#7E22CE] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* 3 Testimonial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, idx) => {
            const isHighlight = testimonialIdx === idx;

            return (
              <div
                key={t.id}
                className={`bg-white rounded-3xl p-6 border transition-all duration-200 flex flex-col justify-between space-y-4 hover:shadow-lg hover:-translate-y-1 ${
                  isHighlight ? 'border-[#9333EA]/40 shadow-md ring-1 ring-[#9333EA]/20' : 'border-[#E9DDF8] shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  {/* 5 Gold Stars */}
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-sm text-[#68647D] leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-[#E9DDF8]">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#E9DDF8] bg-purple-50 shrink-0">
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#17133A]">{t.name}</h4>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3E8FF] text-[#9333EA] mt-0.5">
                      {t.className}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Indicator dots */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {TESTIMONIALS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setTestimonialIdx(idx)}
              aria-label={`Testimonial slide ${idx + 1}`}
              className={`transition-all duration-300 cursor-pointer ${
                testimonialIdx === idx
                  ? 'w-6 h-2 rounded-full bg-[#9333EA]'
                  : 'w-2 h-2 rounded-full bg-purple-200 hover:bg-purple-300'
              }`}
            />
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 7: LEARNING CTA BANNER */}
      {/* ========================================================================= */}
      <section
        aria-label="Start Learning Call to Action"
        className="rounded-3xl sm:rounded-[32px] bg-gradient-to-r from-[#FAF9FF] via-[#F3E8FF] to-[#FAF5FF] border border-[#E9DDF8] p-7 sm:p-10 lg:p-12 shadow-xs"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            {/* 3D Stacked Books with Graduation Cap Graphic */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-[#E9DDF8] text-[#9333EA] flex items-center justify-center shadow-sm shrink-0">
              <GraduationCap className="w-9 h-9" />
            </div>

            <div className="space-y-1.5 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17133A] tracking-tight font-display">
                Start Your Learning Journey with Prepnx
              </h2>
              <p className="text-xs sm:text-sm text-[#68647D] font-medium">
                Expert teachers &bull; Structured courses &bull; Better results
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Link
              href="/student?tab=channels"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm sm:text-base font-bold text-white bg-[#9333EA] hover:bg-[#7E22CE] shadow-md shadow-purple-600/20 hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Explore Courses</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 8: PREPNX FOOTER */}
      {/* ========================================================================= */}
      <PrepnxFooter />
    </div>
  );
}
