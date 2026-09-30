'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Menu, X, LogOut, LayoutDashboard, User } from 'lucide-react';
import { Profile } from '@/types';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teacherMenuOpen, setTeacherMenuOpen] = useState(false);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) loadUser(session);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
  const isTeacher = profile?.role === 'teacher' || (loading && isTeacherRoute);
  const isStudent = profile?.role === 'student' || (loading && isStudentRoute);

  // Navigation Links based on user role
  const navLinks = isTeacher
    ? [
        { name: 'Dashboard', href: '/teacher?tab=dashboard' },
        { name: 'Students', href: '/teacher?tab=students' },
        { name: 'Analysis', href: '/teacher?tab=analysis' },
        { name: 'Payout', href: '/teacher?tab=payout' },
      ]
    : isStudent
    ? [
        { name: 'Home', href: '/student' },
        { name: 'Search Tutor', href: '/student?tab=search' },
        { name: 'Channels', href: '/student?tab=channels' },
        { name: 'Analysis', href: '/student?tab=analysis' },
      ]
    : [
        { name: 'Courses', href: '/#courses' },
        { name: 'Programs', href: '/#programs' },
        { name: 'Teachers', href: '/#teachers' },
        { name: 'How It Works', href: '/#how-it-works' },
        { name: 'For Parents', href: '/#for-parents' },
      ];

  const brandLink = isTeacher ? '/teacher' : isStudent ? '/student' : '/';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/85 dark:bg-neutral-950/85 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
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

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-neutral-600 hover:text-primary-700 dark:text-neutral-300 dark:hover:text-primary-400 transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right Section: For Teachers: Only Profile Photo. For Others: Theme Toggle + Auth */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Theme toggle hidden for teacher according to Requirement 1 */}
          {!isTeacher && <ThemeToggle />}

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
              /* Requirement 2: Remove Dashboard button, keep only student profile photo */
              <button
                type="button"
                onClick={handleStudentProfileClick}
                className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 hover:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all hover:scale-105 shadow-sm shrink-0 flex items-center justify-center bg-primary-100 dark:bg-primary-950/60 cursor-pointer"
                title="Click to view & edit student profile"
                aria-label="Open student profile"
              >
                {profile.photo_url ? (
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
              </button>
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
        <div className="flex items-center gap-2 sm:hidden">
          {!isTeacher && <ThemeToggle />}
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
        <div className="sm:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-4 space-y-3">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>
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
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleStudentProfileClick();
                    }}
                    className="w-full"
                  >
                    View Student Profile
                  </Button>
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
