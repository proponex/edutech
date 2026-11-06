'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Menu, X, LogOut, LayoutDashboard, User, Bell, Settings, HelpCircle, CreditCard, ChevronDown } from 'lucide-react';
import { Profile } from '@/types';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teacherMenuOpen, setTeacherMenuOpen] = useState(false);
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const studentMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (studentMenuRef.current && !studentMenuRef.current.contains(event.target as Node)) {
        setStudentMenuOpen(false);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setTeacherMenuOpen(false);
    router.push('/login');
    router.refresh();
  };

  const getDashboardUrl = () => {
    if (!profile) return '/login';
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
        { name: 'Courses', href: '/#courses' },
        { name: 'Programs', href: '/#programs' },
        { name: 'Teachers', href: '/#teachers' },
        { name: 'How It Works', href: '/#how-it-works' },
        { name: 'For Parents', href: '/#for-parents' },
      ];

  const brandLink = isTeacher ? '/teacher' : isStudent ? '/student' : isParent ? '/parent' : '/';

  return (
    <header
      className={`sticky top-0 z-40 w-full backdrop-blur-md transition-colors ${
        isStudent
          ? 'border-b border-lavender-border bg-white/95'
          : 'border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/85 dark:bg-neutral-950/85'
      }`}
    >
      <div className={`h-16 flex items-center justify-between ${isStudent ? 'w-[92%] sm:w-[92%] md:w-[90%] max-w-[1440px] mx-auto' : 'max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto'}`}>
        {/* Brand Logo */}
        {isStudent ? (
          <Link href="/student" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100 shadow-xs group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-brand-600" />
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tight text-navy-900">
              Prepnx
            </span>
          </Link>
        ) : (
          <Link href={brandLink} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-neutral-950" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xl tracking-tight text-neutral-950 dark:text-white">
                EDUTECH
              </span>
            </div>
          </Link>
        )}

        {/* Center Nav Links */}
        <NavLinksWrapper navLinks={navLinks} isTeacher={isTeacher} isStudent={isStudent} />

        {/* Right Section: For Teachers: Only Profile Photo. For Students: Bell + Profile Dropdown. For Others: Theme Toggle + Auth */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Theme toggle hidden for teacher and student */}
          {!isTeacher && !isStudent && <ThemeToggle />}

          {!loading && profile ? (
            isTeacher ? (
              /* Requirement 1: Teacher profile photo only in header */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTeacherMenuOpen(!teacherMenuOpen)}
                  className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 hover:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all hover:scale-105 shadow-sm shrink-0 flex items-center justify-center bg-primary-100 dark:bg-primary-950/60 cursor-pointer"
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
                    <User className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {teacherMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {profile.name || 'Educator'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate font-mono">
                        {profile.email}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 uppercase">
                        Teacher Account
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : isStudent ? (
              /* Prepnx Student Header: Bell + Dropdown Avatar */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {}}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center text-navy-800 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                  title="Notifications"
                  aria-label="View notifications"
                >
                  <Bell className="w-5 h-5 text-navy-800" />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white" />
                </button>

                <div className="relative" ref={studentMenuRef}>
                  <button
                    type="button"
                    onClick={() => setStudentMenuOpen(!studentMenuOpen)}
                    className="flex items-center gap-1.5 p-1 pr-2.5 rounded-full border border-lavender-border hover:border-brand-400 bg-white transition-all cursor-pointer group shadow-2xs"
                    title="Student Profile & Menu"
                    aria-label="Open student menu"
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-brand-200 flex items-center justify-center bg-brand-50 shrink-0">
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
                        <User className="w-4 h-4 text-brand-600" />
                      )}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 group-hover:text-brand-600 transition-colors" />
                  </button>

                  {studentMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-lavender-border shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-4 py-2.5 border-b border-gray-100">
                        <p className="text-sm font-bold text-navy-900 truncate">
                          {profile.name || 'Prepnx Student'}
                        </p>
                        <p className="text-xs text-gray-500 truncate font-mono">
                          {profile.email}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-800 uppercase tracking-wide">
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
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-brand-50 text-gray-700 hover:text-brand-700 transition-colors text-left cursor-pointer"
                        >
                          <User className="w-4 h-4 text-brand-600" />
                          My Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStudentMenuOpen(false);
                            handleStudentProfileClick();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-brand-50 text-gray-700 hover:text-brand-700 transition-colors text-left cursor-pointer"
                        >
                          <Settings className="w-4 h-4 text-brand-600" />
                          Account Settings
                        </button>
                        <Link
                          href="/student/payments"
                          onClick={() => setStudentMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-brand-50 text-gray-700 hover:text-brand-700 transition-colors text-left cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-brand-600" />
                          My Subscriptions
                        </Link>
                        <Link
                          href="/#help-center"
                          onClick={() => setStudentMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-brand-50 text-gray-700 hover:text-brand-700 transition-colors text-left cursor-pointer"
                        >
                          <HelpCircle className="w-4 h-4 text-brand-600" />
                          Help &amp; Support
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => {
                            setStudentMenuOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
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
              <div className="flex items-center gap-3">
                <Badge variant="primary" className="capitalize text-xs">
                  {profile.role}
                </Badge>
                <Link href={getDashboardUrl()}>
                  <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Logout
                </Button>
              </div>
            )
          ) : !loading ? (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          ) : (
            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-full" />
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          {!isTeacher && !isStudent && <ThemeToggle />}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-4 space-y-3">
          <NavLinksWrapper
            navLinks={navLinks}
            isTeacher={isTeacher}
            isStudent={isStudent}
            mobile
            onNavigate={() => setMobileMenuOpen(false)}
          />
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-2">
            {profile ? (
              <>
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Logged in as <strong className="text-neutral-900 dark:text-white">{profile.name}</strong>
                  </span>
                  <Badge variant="primary" className="capitalize">
                    {profile.role}
                  </Badge>
                </div>
                {isStudent ? (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleStudentProfileClick();
                      }}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white"
                    >
                      View Student Profile
                    </Button>
                    <Link
                      href="/student/payments"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full"
                    >
                      <Button variant="outline" size="md" className="w-full">
                        My Subscriptions
                      </Button>
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
                <Link href="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
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
        <nav className={mobile ? 'flex flex-col gap-2' : 'hidden md:flex items-center gap-6'}>
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={onNavigate}
              className={
                mobile
                  ? 'px-3 py-2 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-200'
                  : 'text-sm font-medium text-neutral-600 hover:text-primary-700 dark:text-neutral-300 dark:hover:text-primary-400 transition-colors'
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

  if (mobile) {
    return (
      <nav className="flex flex-col gap-1.5">
        {navLinks.map((link) => {
          const linkTab = link.href.includes('tab=') ? link.href.split('tab=')[1] : 'overview';
          let isActive = false;
          if (isTeacher) {
            isActive = currentTab === linkTab;
          } else if (isStudent) {
            if (link.name === 'Home') {
              isActive = pathname === '/student' && (!searchParams?.get('tab') || currentTab === 'home');
            } else if (linkTab) {
              isActive = currentTab === linkTab;
            } else if (link.href.includes('payments')) {
              isActive = pathname === '/student/payments' || currentTab === 'payments' || currentTab === 'subscription';
            }
          }

          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={onNavigate}
              className={`px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? isStudent
                    ? 'font-bold bg-[#F3E8FF] text-[#7E22CE] border border-[#E9DDF8]'
                    : 'font-bold bg-primary-50 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 border border-primary-200/80 dark:border-primary-800/80'
                  : 'font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
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
      <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-lavender-50 border border-[#E9DDF8]">
        {navLinks.map((link) => {
          const linkTab = link.href.includes('tab=') ? link.href.split('tab=')[1] : null;
          let isActive = false;
          if (link.name === 'Home') {
            isActive = pathname === '/student' && (!searchParams?.get('tab') || currentTab === 'home');
          } else if (linkTab) {
            isActive = currentTab === linkTab;
          } else if (link.href.includes('payments')) {
            isActive = pathname === '/student/payments' || currentTab === 'payments' || currentTab === 'subscription';
          }

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                isActive
                  ? 'bg-[#F3E8FF] text-[#7E22CE] border border-[#E9DDF8] font-bold shadow-2xs'
                  : 'text-[#68647D] hover:text-[#17133A] font-medium hover:bg-white/80'
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
    <nav className="hidden md:flex items-center gap-6">
      {navLinks.map((link) => {
        const linkTab = link.href.includes('tab=') ? link.href.split('tab=')[1] : 'overview';
        const isActive = isTeacher ? currentTab === linkTab : false;

        return (
          <Link
            key={link.name}
            href={link.href}
            className={`text-sm transition-all py-1 relative ${
              isActive
                ? 'font-bold text-primary-600 dark:text-primary-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-600 dark:after:bg-primary-400 after:rounded-full'
                : 'font-medium text-neutral-600 hover:text-primary-700 dark:text-neutral-300 dark:hover:text-primary-400'
            }`}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}
