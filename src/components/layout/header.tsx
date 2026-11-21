'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Menu, X, LogOut, LayoutDashboard, User, Bell, HelpCircle, CreditCard, ChevronDown } from 'lucide-react';
import { Profile } from '@/types';
import { StudentNotificationsPopover } from '@/components/layout/student-notifications-popover';
import { performFullLogout } from '@/lib/auth-logout';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teacherMenuOpen, setTeacherMenuOpen] = useState(false);
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const studentMenuRef = useRef<HTMLDivElement>(null);
  const teacherMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (studentMenuRef.current && !studentMenuRef.current.contains(event.target as Node)) {
        setStudentMenuOpen(false);
      }
      if (teacherMenuRef.current && !teacherMenuRef.current.contains(event.target as Node)) {
        setTeacherMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadUser(session: any) {
      if (!session?.user) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (data && mounted) {
          let mergedProfile = { ...data };
          
          if (data.role === 'teacher') {
            const { data: tData } = await supabase.from('teachers').select('*').eq('id', session.user.id).single();
            if (tData) mergedProfile = { ...mergedProfile, ...tData };
          } else if (data.role === 'student') {
            const { data: sData } = await supabase.from('students').select('*').eq('id', session.user.id).single();
            if (sData) mergedProfile = { ...mergedProfile, ...sData };
          }
          
          setProfile(mergedProfile as Profile);
        } else if (mounted) {
          setProfile(null);
        }
      } catch {
        if (mounted) setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // 1. Check initial session
    supabase.auth
      .getSession()
      .then((res: { data: { session: any } }) => {
        if (mounted) loadUser(res?.data?.session);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (mounted) loadUser(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // If on public landing page ('/'), do not render any navbar at all
  if (pathname === '/') {
    return null;
  }

  const handleLogout = async () => {
    setProfile(null);
    setTeacherMenuOpen(false);
    setStudentMenuOpen(false);
    await performFullLogout('/?auth=login#hero-login');
  };

  const getDashboardUrl = () => {
    if (!profile) return '/';
    switch (profile.role) {
      case 'admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      case 'parent':
        return '/parent';
      case 'student':
        return '/student';
      default:
        return '/';
    }
  };

  const handleStudentProfileClick = () => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/student') {
        window.dispatchEvent(new CustomEvent('open-student-profile'));
      } else {
        router.push('/student?openProfile=true');
      }
    }
  };

  const isTeacherRoute = pathname?.startsWith('/teacher');
  const isStudentRoute = pathname?.startsWith('/student');
  const isParentRoute = pathname?.startsWith('/parent');
  const isTeacher = profile?.role === 'teacher' || (loading && isTeacherRoute);
  const isStudent = profile?.role === 'student' || (loading && isStudentRoute);
  const isParent = profile?.role === 'parent' || (loading && isParentRoute);

  // Navigation Links based on user role
  const navLinks = isTeacher
    ? [
        { name: 'Overview', href: '/teacher?tab=overview' },
        { name: 'Students', href: '/teacher?tab=students' },
        { name: 'Analysis', href: '/teacher?tab=analysis' },
        { name: 'Monetization', href: '/teacher?tab=monetization' },
      ]
    : isStudent
    ? [
        { name: 'Home', href: '/student' },
        { name: 'Channels', href: '/student?tab=channels' },
        { name: 'Analysis', href: '/student?tab=analysis' },
        { name: 'Subscription', href: '/student/payments' },
      ]
    : isParent
    ? [
        { name: 'Overview', href: '/parent?tab=overview' },
        { name: 'My Children', href: '/parent?tab=children' },
        { name: 'Child Analysis', href: '/parent?tab=analysis' },
      ]
    : [
        { name: 'How It Works', href: '/#how-it-works' },
        { name: 'Features', href: '/#features' },
      ];

  const brandLink = isTeacher ? '/teacher' : isStudent ? '/student' : isParent ? '/parent' : '/';

  // Fetch unread notifications count for student
  useEffect(() => {
    let ignore = false;
    async function checkUnread() {
      try {
        const res = await fetch('/api/student/notifications?page=1&limit=1', {
          cache: 'no-store',
        });
        if (res.ok && !ignore) {
          const data = await res.json();
          if (data?.unreadCount !== undefined) {
            setNotificationsUnreadCount(data.unreadCount);
          }
        }
      } catch {
        // fail silently
      }
    }
    if (isStudent) {
      checkUnread();
    }
    return () => {
      ignore = true;
    };
  }, [isStudent]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all relative border-b shadow-xs text-[#1E1035] ${
        isStudent
          ? 'backdrop-blur-2xl border-white/50 bg-[#FAF9FF]/70 shadow-[0_4px_30px_rgba(98,68,166,0.05)]'
          : 'backdrop-blur-xl border-[#DCCFFF] bg-[#EEE8FF]/95 shadow-sm'
      }`}
    >
      {/* Animated Fast-Moving Particles Across All Dashboards */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 select-none">
        {/* Ambient Glowing Orbs */}
        <div className="absolute -top-10 left-1/4 w-80 h-32 bg-[#BBA5F0]/25 rounded-full blur-2xl animate-glow-pulse" />
        <div className="absolute -top-10 right-1/4 w-80 h-32 bg-[#DCCFFF]/35 rounded-full blur-2xl animate-glow-pulse" style={{ animationDelay: '2s' }} />

        {/* Fast-Streaming Flying Particles Across The Navbar */}
        <div className="absolute top-3 left-[4%] w-2 h-2 rounded-full bg-[#6244A6] opacity-80 animate-particle-fast-stream shadow-[0_0_12px_#6244A6]" />
        <div className="absolute top-10 left-[22%] w-2.5 h-2.5 rounded-full bg-[#8060CE] opacity-75 animate-particle-fast-stream shadow-[0_0_10px_#8060CE]" style={{ animationDelay: '0.9s' }} />
        <div className="absolute top-4 left-[42%] w-2 h-2 rounded-full bg-[#4C268F] opacity-75 animate-particle-fast-stream shadow-[0_0_12px_#4C268F]" style={{ animationDelay: '1.6s' }} />

        {/* Fast Reverse-Streaming Flying Particles */}
        <div className="absolute top-5 right-[8%] w-2 h-2 rounded-full bg-[#4C268F] opacity-75 animate-particle-fast-stream-rev shadow-[0_0_10px_#4C268F]" style={{ animationDelay: '0.3s' }} />
        <div className="absolute top-11 right-[28%] w-2.5 h-2.5 rounded-full bg-[#6244A6] opacity-70 animate-particle-fast-stream-rev shadow-[0_0_12px_#6244A6]" style={{ animationDelay: '1.4s' }} />
        <div className="absolute top-3 right-[48%] w-2 h-2 rounded-full bg-[#8060CE] opacity-75 animate-particle-fast-stream-rev shadow-[0_0_10px_#8060CE]" style={{ animationDelay: '2.1s' }} />

        {/* Drifting & Shimmering Nodes */}
        <div className="absolute top-2 left-[12%] w-2 h-2 rounded-full bg-[#8060CE] opacity-65 animate-particle-drift-right shadow-[0_0_8px_#8060CE]" />
        <div className="absolute top-11 left-[32%] w-2.5 h-2.5 rounded-full bg-[#6244A6] opacity-60 animate-particle-drift-left shadow-[0_0_10px_#6244A6]" style={{ animationDelay: '0.6s' }} />
        <div className="absolute top-4 left-[58%] w-1.5 h-1.5 rounded-full bg-[#4C268F] opacity-80 animate-particle-shimmer shadow-[0_0_8px_#4C268F]" style={{ animationDelay: '0.4s' }} />
        <div className="absolute top-12 left-[72%] w-2 h-2 rounded-full bg-[#8060CE] opacity-65 animate-particle-drift-right shadow-[0_0_10px_#8060CE]" style={{ animationDelay: '1.3s' }} />
        <div className="absolute top-4 left-[88%] w-1.5 h-1.5 rounded-full bg-[#4C268F] opacity-80 animate-particle-shimmer shadow-[0_0_8px_#4C268F]" style={{ animationDelay: '1.8s' }} />
      </div>

      <div className="h-20 flex items-center justify-between relative z-10 w-[92%] sm:w-[92%] md:w-[90%] max-w-[1440px] mx-auto">
        {/* Brand Logo */}
        <Link href={brandLink} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3D1E6D] via-[#6244A6] to-[#A485E8] flex items-center justify-center text-white border border-[#DCCFFF] shadow-md shadow-violet-900/15 group-hover:scale-105 transition-transform ring-2 ring-[#EEE8FF]">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-xl tracking-tight text-[#1E1035] group-hover:text-[#130924] transition-colors">
              EDUTECH
            </span>
            <span className="text-[10px] font-bold text-[#6244A6] tracking-widest uppercase">
              {isStudent
                ? 'Student Portal'
                : isTeacher
                ? 'Teacher Portal'
                : isParent
                ? 'Parent Portal'
                : profile?.role === 'admin'
                ? 'Admin Portal'
                : 'Digital Classroom'}
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <NavLinksWrapper navLinks={navLinks} isTeacher={isTeacher} isStudent={isStudent} />

        {/* Right Section: For Teachers: Only Profile Photo. For Students: Bell + Profile Dropdown. For Others: Auth */}
        <div className="hidden sm:flex items-center gap-3">

          {!loading && profile ? (
            isTeacher ? (
              /* Requirement 1: Teacher profile photo only in header */
              <div className="relative" ref={teacherMenuRef}>
                <button
                  type="button"
                  onClick={() => setTeacherMenuOpen(!teacherMenuOpen)}
                  className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#6244A6] hover:border-[#4C268F] focus:outline-none focus:ring-2 focus:ring-[#6244A6] transition-all hover:scale-105 shadow-sm shrink-0 flex items-center justify-center bg-white cursor-pointer"
                  title="Teacher Profile & Account"
                  aria-label="Open teacher profile menu"
                >
                  {profile.photo_url ? (
                    <Image
                      src={profile.photo_url}
                      alt={profile.name || 'Teacher'}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User className="w-5 h-5 text-[#6244A6]" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {teacherMenuOpen && (
                  <div className="absolute right-0 mt-3 w-60 rounded-2xl bg-white border border-[#DCCFFF] shadow-2xl shadow-[#1E1035]/15 py-2 z-[100] animate-in fade-in zoom-in-95 backdrop-blur-xl text-[#1E1035]">
                    <div className="px-4 py-2.5 border-b border-[#EEE8FF]">
                      <p className="text-sm font-bold text-[#1E1035] truncate">
                        {profile.name || 'Educator'}
                      </p>
                      <p className="text-xs text-[#5F5875] truncate font-mono">
                        {profile.email}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EEE8FF] text-[#6244A6] border border-[#DCCFFF] uppercase tracking-wide">
                        Teacher Portal
                      </span>
                    </div>
                    <div className="py-1 text-xs font-semibold">
                      <Link
                        href="/teacher?tab=overview"
                        onClick={() => setTeacherMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-[#EEE8FF] text-[#1E1035] hover:text-[#130924] transition-colors text-left cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#6244A6]" />
                        Teacher Dashboard
                      </Link>
                      <Link
                        href="/teacher/earnings"
                        onClick={() => setTeacherMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-[#EEE8FF] text-[#1E1035] hover:text-[#130924] transition-colors text-left cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4 text-[#6244A6]" />
                        Earnings &amp; Payouts
                      </Link>
                    </div>
                    <div className="pt-1 border-t border-[#EEE8FF]">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : isStudent ? (
              /* Prepnx Student Header: Bell + Dropdown Avatar in Glassmorphism Theme */
              <div className="flex items-center gap-2.5">
                {/* Notifications Dropdown with Paginated View All Updates */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      setStudentMenuOpen(false);
                    }}
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer backdrop-blur-xl shadow-xs ${
                      notificationsOpen
                        ? 'bg-neutral-900/15 text-[#130924] border-2 border-neutral-900/25 font-bold shadow-sm'
                        : 'bg-white/40 text-[#1E1035] hover:bg-black/[0.04] hover:text-[#130924] border border-white/70'
                    }`}
                    title="Notifications"
                    aria-label="View notifications"
                  >
                    <Bell className="w-4.5 h-4.5 text-[#1E1035]" />
                    {notificationsUnreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#6244A6] text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-xs animate-pulse">
                        {notificationsUnreadCount > 9 ? '9+' : notificationsUnreadCount}
                      </span>
                    )}
                  </button>

                  <StudentNotificationsPopover
                    isOpen={notificationsOpen}
                    onClose={() => setNotificationsOpen(false)}
                    onUnreadCountChange={(count) => setNotificationsUnreadCount(count)}
                  />
                </div>

                {/* Profile Menu Dropdown */}
                <div className="relative" ref={studentMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentMenuOpen(!studentMenuOpen);
                      setNotificationsOpen(false);
                    }}
                    className={`flex items-center gap-2 p-1 pr-2.5 rounded-full transition-all duration-300 cursor-pointer group shadow-xs backdrop-blur-xl ${
                      studentMenuOpen
                        ? 'bg-neutral-900/15 text-[#130924] border-2 border-neutral-900/25'
                        : 'border border-white/70 hover:border-black/15 bg-white/40 text-[#1E1035] hover:bg-black/[0.04] hover:text-[#130924]'
                    }`}
                    title="Student Profile & Menu"
                    aria-label="Open student menu"
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/80 flex items-center justify-center bg-[#EEE8FF] shrink-0 shadow-2xs">
                      {profile.photo_url ? (
                        <Image
                          src={profile.photo_url}
                          alt={profile.name || 'Student'}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <User className="w-4 h-4 text-[#6244A6]" />
                      )}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#1E1035] group-hover:text-[#130924] transition-colors" />
                  </button>

                  {studentMenuOpen && (
                    <div className="absolute right-0 mt-3 w-60 rounded-2xl bg-white border border-[#DCCFFF] shadow-2xl shadow-[#1E1035]/15 py-2 z-[100] animate-in fade-in zoom-in-95 backdrop-blur-xl text-[#1E1035]">
                      <div className="px-4 py-2.5 border-b border-[#EEE8FF]">
                        <p className="text-sm font-bold text-[#1E1035] truncate">
                          {profile.name || 'Prepnx Student'}
                        </p>
                        <p className="text-xs text-[#5F5875] truncate font-mono">
                          {profile.email}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EEE8FF] text-[#6244A6] border border-[#DCCFFF] uppercase tracking-wide">
                          Student Portal
                        </span>
                      </div>

                      <div className="py-1 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            setStudentMenuOpen(false);
                            handleStudentProfileClick();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-[#EEE8FF] text-[#1E1035] hover:text-[#130924] transition-colors text-left cursor-pointer"
                        >
                          <User className="w-4 h-4 text-[#6244A6]" />
                          My Profile
                        </button>
                        <Link
                          href="/student/payments"
                          onClick={() => setStudentMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-[#EEE8FF] text-[#1E1035] hover:text-[#130924] transition-colors text-left cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-[#6244A6]" />
                          My Subscriptions
                        </Link>
                        <Link
                          href="/#help-center"
                          onClick={() => setStudentMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-[#EEE8FF] text-[#1E1035] hover:text-[#130924] transition-colors text-left cursor-pointer"
                        >
                          <HelpCircle className="w-4 h-4 text-[#6244A6]" />
                          Help &amp; Support
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-[#EEE8FF]">
                        <button
                          type="button"
                          onClick={() => {
                            setStudentMenuOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#1E1035] border border-[#DCCFFF] capitalize shadow-xs">
                  {profile.role}
                </span>
                <Link href={getDashboardUrl()}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-[#1E1035] hover:bg-[#DCCFFF] hover:text-[#130924] border border-[#DCCFFF] transition-all cursor-pointer shadow-xs hover:border-[#6244A6]"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#6244A6]" />
                    Dashboard
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            )
          ) : !loading ? (
            <div className="flex items-center gap-3">
              <Link
                href="/?auth=login#hero-login"
                className="inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 px-4 py-2.5 text-sm text-[#3D1E6D] hover:text-[#1E1035] hover:bg-[#EEE8FF]/80"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 bg-gradient-to-r from-[#3D1E6D] via-[#6244A6] to-[#7A54CF] hover:from-[#4C268F] hover:to-[#6244A6] text-white shadow-md shadow-violet-900/20 px-5 py-2.5 text-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                Create Account
              </Link>
            </div>
          ) : (
            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-full" />
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-lg focus:outline-none transition-colors ${
              isStudent
                ? 'text-[#1E1035] hover:bg-[#EEE8FF] hover:text-[#130924]'
                : 'text-neutral-700 hover:bg-violet-50'
            }`}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-[#1E1035]" />
            ) : (
              <Menu className="w-6 h-6 text-[#1E1035]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-b px-4 py-4 space-y-3 ${
            isStudent
              ? 'bg-white border-[#DCCFFF] text-[#1E1035]'
              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950'
          }`}
        >
          <NavLinksWrapper
            navLinks={navLinks}
            isTeacher={isTeacher}
            isStudent={isStudent}
            mobile
            onNavigate={() => setMobileMenuOpen(false)}
          />
          <div className="pt-3 border-t border-[#EEE8FF] flex flex-col gap-2">
            {profile ? (
              <>
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-sm font-medium text-[#5F5875]">
                    Logged in as <strong className="text-[#1E1035]">{profile.name}</strong>
                  </span>
                  <Badge variant="primary" className="capitalize text-[#1E1035]">
                    {profile.role}
                  </Badge>
                </div>
                {isStudent ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleStudentProfileClick();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-sm font-black bg-[#EEE8FF] hover:bg-[#DCCFFF] text-[#1E1035] hover:text-[#130924] border border-[#BBA5F0] transition-colors"
                    >
                      View Student Profile
                    </button>
                    <Link
                      href="/student/payments"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full"
                    >
                      <button
                        type="button"
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-white hover:bg-[#F8F6FF] text-[#1E1035] hover:text-[#130924] border border-[#DCCFFF] transition-colors"
                      >
                        My Subscriptions
                      </button>
                    </Link>
                  </>
                ) : (
                  <Link href={getDashboardUrl()} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="md" className="w-full">
                      Go to Dashboard
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-red-600 dark:text-red-400"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link href="/" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="md" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function NavLinksWrapper({
  navLinks,
  isTeacher,
  isStudent = false,
  mobile = false,
  onNavigate,
}: {
  navLinks: { name: string; href: string }[];
  isTeacher: boolean;
  isStudent?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Suspense
      fallback={
        <nav
          className={
            mobile
              ? isStudent
                ? 'flex flex-col gap-1.5 p-1.5 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60'
                : 'flex flex-col gap-2'
              : isStudent
              ? 'hidden md:flex items-center gap-1.5 p-1.5 rounded-full bg-white/35 dark:bg-black/20 backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[0_8px_32px_0_rgba(110,89,165,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8)]'
              : 'hidden md:flex items-center gap-2 p-1.5 rounded-full bg-white/80 border border-[#DCCFFF]'
          }
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={onNavigate}
              className={
                mobile
                  ? isStudent
                    ? 'px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/40 text-[#3D2C59] border border-white/60'
                    : 'px-4 py-2 rounded-xl text-sm font-bold bg-white text-[#1E1035] border border-[#DCCFFF]'
                  : isStudent
                  ? 'px-4.5 py-1.5 rounded-full text-sm font-semibold text-[#3D2C59] border border-transparent'
                  : 'px-4 py-1.5 rounded-full text-sm font-bold bg-white text-[#1E1035] border border-[#DCCFFF]'
              }
            >
              {link.name}
            </Link>
          ))}
        </nav>
      }
    >
      <NavLinksContent
        navLinks={navLinks}
        isTeacher={isTeacher}
        isStudent={isStudent}
        mobile={mobile}
        onNavigate={onNavigate}
      />
    </Suspense>
  );
}

function NavLinksContent({
  navLinks,
  isTeacher,
  isStudent = false,
  mobile = false,
  onNavigate,
}: {
  navLinks: { name: string; href: string }[];
  isTeacher: boolean;
  isStudent?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get('tab') || 'overview';

  const checkIsActive = (link: { name: string; href: string }) => {
    const linkTab = link.href.includes('tab=') ? link.href.split('tab=')[1] : null;
    if (isTeacher) {
      return currentTab === (linkTab || 'overview');
    }
    if (isStudent) {
      if (link.name === 'Home') {
        return pathname === '/student' && (!searchParams?.get('tab') || currentTab === 'home');
      }
      if (linkTab) {
        return currentTab === linkTab;
      }
      if (link.href.includes('payments')) {
        return pathname === '/student/payments' || currentTab === 'payments' || currentTab === 'subscription';
      }
    }
    if (linkTab) {
      return currentTab === linkTab;
    }
    return pathname === link.href;
  };

  if (mobile) {
    if (isStudent) {
      return (
        <nav className="flex flex-col gap-1.5 p-1.5 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60">
          {navLinks.map((link) => {
            const isActive = checkIsActive(link);
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={onNavigate}
                className={`px-4 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                  isActive
                    ? 'font-extrabold bg-neutral-900/15 text-[#130924] border border-neutral-900/20 shadow-xs backdrop-blur-md'
                    : 'font-semibold text-[#493963] hover:text-[#130924] hover:bg-black/[0.04] border border-transparent'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      );
    }

    return (
      <nav className="flex flex-col gap-1.5">
        {navLinks.map((link) => {
          const isActive = checkIsActive(link);
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={onNavigate}
              className={`px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'font-black bg-[#DCCFFF] text-[#130924] border-2 border-[#6244A6] shadow-sm'
                  : 'font-bold bg-white text-[#1E1035] border border-[#DCCFFF] hover:bg-[#DCCFFF] hover:text-[#130924]'
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>
    );
  }

  if (isStudent) {
    return (
      <nav className="hidden md:flex items-center gap-1.5 p-1.5 rounded-full bg-white/35 dark:bg-black/20 border border-white/70 dark:border-white/10 shadow-[0_8px_32px_0_rgba(110,89,165,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl ring-1 ring-black/[0.03]">
        {navLinks.map((link) => {
          const isActive = checkIsActive(link);
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`px-4.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ease-out cursor-pointer ${
                isActive
                  ? 'bg-neutral-900/15 dark:bg-white/20 text-[#130924] dark:text-white font-extrabold border border-neutral-900/20 dark:border-white/25 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.7),0_2px_8px_0_rgba(0,0,0,0.08)] backdrop-blur-md scale-[1.02]'
                  : 'text-[#493963] dark:text-neutral-300 hover:text-[#130924] dark:hover:text-white hover:bg-neutral-900/5 dark:hover:bg-white/10 border border-transparent hover:border-black/5 hover:scale-[1.01]'
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden md:flex items-center gap-2 p-1.5 rounded-full bg-white/80 border border-[#DCCFFF] shadow-inner backdrop-blur-md">
      {navLinks.map((link) => {
        const isActive = checkIsActive(link);
        return (
          <Link
            key={link.name}
            href={link.href}
            className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-[#DCCFFF] text-[#130924] border-2 border-[#6244A6] font-black shadow-xs scale-[1.02] hover:text-[#130924]'
                : 'bg-white text-[#1E1035] border border-[#DCCFFF] font-bold hover:bg-[#DCCFFF] hover:text-[#130924] hover:border-[#6244A6] hover:shadow-xs hover:-translate-y-0.5 hover:scale-[1.03]'
            }`}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}
