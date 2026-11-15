'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import { BannerItem, Profile } from '@/types';

// Exact 3D High-Res Assets with Verified 100% Transparent Backgrounds
const ASSETS = {
  heroBooksTopLeft: '/images/hero_books_transparent.png',
  heroLaptopCenterpiece: '/images/hero_laptop_transparent.png',
  centerpieceNarrative: '/images/centerpiece_narrative_transparent.png',
};

export function HeroSplitSection() {
  const router = useRouter();
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  // Banner states
  const [banner, setBanner] = useState<BannerItem | null>(null);
  const [bannerLoading, setBannerLoading] = useState(true);

  // Role selector state in login card
  const [selectedRole, setSelectedRole] = useState<'student' | 'parent' | 'teacher'>('student');

  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [existingUser, setExistingUser] = useState<Profile | null>(null);

  // Fetch dynamic admin-published banner & existing session
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const { data: bannerData } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (isMounted && bannerData) {
          setBanner(bannerData as BannerItem);
        }
      } catch {
        // Fall back gracefully to reference 3D composition
      } finally {
        if (isMounted) setBannerLoading(false);
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profileData && isMounted) {
            setExistingUser(profileData as Profile);
          }
        }
      } catch {
        // Non-blocking
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!isConfigured) {
      setAuthError('Supabase connection pending. Please configure credentials in .env.local.');
      return;
    }

    if (!email || !password) {
      setAuthError('Please enter both your email address and password.');
      return;
    }

    setAuthLoading(true);

    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) throw new Error(signInErr.message);
      if (!data.user) throw new Error('Authentication failed. No user was returned.');

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileErr || !profile) {
        router.push('/');
        return;
      }

      switch (profile.role) {
        case 'admin':   router.push('/admin');   break;
        case 'teacher': router.push('/teacher'); break;
        case 'parent':  router.push('/parent');  break;
        case 'student': router.push('/student'); break;
        default:        router.push('/');        break;
      }
      router.refresh();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const getDashboardPath = (role?: string) => {
    switch (role) {
      case 'admin':   return '/admin';
      case 'teacher': return '/teacher';
      case 'parent':  return '/parent';
      case 'student': return '/student';
      default:        return '/';
    }
  };

  return (
    <>
      {/* =================================================================== */}
      {/* 1. HERO SECTION                                                     */}
      {/* =================================================================== */}
      <section className="relative pt-6 pb-24 sm:pt-10 sm:pb-32 lg:pt-12 lg:pb-36 overflow-hidden bg-gradient-to-b from-[#F8F6FF] via-[#FAF8FF] to-white">
        {/* Atmospheric Glowing Orbs */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-[#DCCFFF]/80 rounded-full blur-3xl opacity-75 pointer-events-none -z-10 animate-glow-pulse" />
        <div className="absolute bottom-10 right-10 w-[520px] h-[520px] bg-[#EEE8FF] rounded-full blur-3xl opacity-70 pointer-events-none -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-[#EEE8FF]/50 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Floating 3D Accent Books (Real Rendered 3D Objects from DataStore) */}
        <div className="absolute top-14 left-6 lg:left-14 w-20 sm:w-28 opacity-90 hover:opacity-100 transition-opacity pointer-events-none animate-float-slow select-none hidden sm:block z-20">
          <Image
            src={ASSETS.heroBooksTopLeft}
            alt="3D Stacked Books"
            width={120}
            height={120}
            className="w-full drop-shadow-2xl filter"
            unoptimized
          />
        </div>
        <div className="absolute bottom-24 right-8 lg:right-16 w-16 sm:w-24 opacity-80 hover:opacity-100 transition-opacity pointer-events-none animate-float-medium select-none hidden md:block z-20">
          <Image
            src={ASSETS.heroBooksTopLeft}
            alt="3D Mini Stack"
            width={100}
            height={100}
            className="w-full drop-shadow-2xl filter rotate-12"
            unoptimized
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[11fr_9fr] gap-8 lg:gap-10 xl:gap-12 items-stretch">

            {/* =============================================================== */}
            {/* LEFT COLUMN: Promotional Visual Banner with 3D Composition      */}
            {/* =============================================================== */}
            <div className="relative min-h-[540px] sm:min-h-[600px] lg:min-h-[660px] rounded-3xl overflow-hidden shadow-2xl shadow-[#1E1035]/15 border border-[#DCCFFF] bg-gradient-to-br from-white via-[#F8F6FF] to-[#EEE8FF] flex flex-col justify-between group">
              {/* Top Floating Badge Header */}
              <div className="relative z-20 p-5 sm:p-7 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md text-[#3D1E6D] text-xs sm:text-sm font-extrabold border border-[#DCCFFF] shadow-md shadow-violet-900/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6244A6] animate-ping" />
                  <span>CBSE • ICSE • State Boards</span>
                </div>
                <div className="hidden sm:inline-flex items-center gap-1.5 backdrop-blur-md bg-white/95 border border-[#DCCFFF] px-3.5 py-1.5 rounded-full text-xs font-bold text-[#1E1035] shadow-sm">
                  <span className="text-amber-500">★</span>
                  <span>4.9 / 5 Rating</span>
                </div>
              </div>

              {/* Central Visual Composition */}
              {banner?.image_url ? (
                /* Admin published banner image */
                <div className="relative flex-1 w-full min-h-[340px]">
                  <Image
                    src={banner.image_url}
                    alt={banner.title || 'EduTech Promotional Banner'}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1E1035]/70 via-transparent to-transparent pointer-events-none" />
                </div>
              ) : (
                /* Default 3D Educational Centerpiece Illustration with 100% Transparent Background */
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 sm:px-8">
                  <div className="relative w-full max-w-[460px] sm:max-w-[500px] group-hover:scale-[1.02] transition-transform duration-500 ease-out">
                    <Image
                      src={ASSETS.heroLaptopCenterpiece}
                      alt="Realistic 3D Education Laptop with Colorful Study Books & Alarm Clock"
                      width={500}
                      height={400}
                      priority
                      className="w-full h-auto object-contain drop-shadow-2xl animate-float-gentle filter contrast-[1.02]"
                      unoptimized
                    />
                  </div>

                  {/* Overlay Class 12 Comprehensive Prep Card */}
                  <div className="w-full max-w-md glass-card p-5 sm:p-6 rounded-2xl border border-white/90 shadow-2xl shadow-violet-950/15 space-y-3.5 -mt-6 sm:-mt-10 relative z-20 ring-1 ring-[#DCCFFF]/60">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#3D1E6D] to-[#6244A6] text-white flex items-center justify-center font-display font-black text-xl shadow-md shadow-violet-900/30">
                        12
                      </div>
                      <div>
                        <h4 className="font-display font-black text-base sm:text-lg text-[#1E1035] tracking-tight">
                          Class 12 Comprehensive Prep
                        </h4>
                        <p className="text-xs text-[#5F5875] font-medium">
                          Board Examinations &amp; Competitive Focus
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-bold text-[#1E1035]">
                        <span>Physics, Chemistry &amp; Math Modules</span>
                        <span className="text-[#4C268F] font-extrabold">94% syllabus complete</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[#EEE8FF] overflow-hidden p-0.5">
                        <div className="w-[94%] h-full bg-gradient-to-r from-[#3D1E6D] via-[#6244A6] to-[#8060CE] rounded-full" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                      <div className="bg-[#F8F6FF]/95 p-2 rounded-xl border border-[#DCCFFF]/80 shadow-xs">
                        <span className="block font-black text-sm text-[#3D1E6D]">320+</span>
                        <span className="text-[11px] text-[#5F5875] font-semibold">HD Lessons</span>
                      </div>
                      <div className="bg-[#F8F6FF]/95 p-2 rounded-xl border border-[#DCCFFF]/80 shadow-xs">
                        <span className="block font-black text-sm text-[#3D1E6D]">1,400+</span>
                        <span className="text-[11px] text-[#5F5875] font-semibold">Practices</span>
                      </div>
                      <div className="bg-[#F8F6FF]/95 p-2 rounded-xl border border-[#DCCFFF]/80 shadow-xs">
                        <span className="block font-black text-sm text-[#3D1E6D]">4.9★</span>
                        <span className="text-[11px] text-[#5F5875] font-semibold">Faculty Rating</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Overlay Chips */}
              <div className="relative z-20 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-white/95 to-transparent">
                <div className="inline-flex items-center gap-2 backdrop-blur-md bg-[#1E1035]/90 text-white border border-[#DCCFFF]/30 px-4 py-2 rounded-xl text-xs font-bold shadow-md">
                  <BookOpen className="w-3.5 h-3.5 text-[#BBA5F0]" />
                  <span>Comprehensive K–12 Digital Learning</span>
                </div>
                {banner?.button_text && banner?.button_link ? (
                  <Link
                    href={banner.button_link}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#3D1E6D] to-[#6244A6] text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
                  >
                    <span>{banner.button_text}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <div className="sm:hidden inline-flex items-center gap-1.5 backdrop-blur-md bg-white border border-[#DCCFFF] px-3 py-1.5 rounded-xl text-xs font-bold text-[#1E1035] shadow-xs">
                    <span className="text-amber-500">★</span>
                    <span>4.9 / 5 Rating</span>
                  </div>
                )}
              </div>
            </div>

            {/* =============================================================== */}
            {/* RIGHT COLUMN: Premium Sign-in Card with Dark Violet Accents      */}
            {/* =============================================================== */}
            <div className="flex flex-col justify-center">
              <div
                className="w-full bg-white rounded-3xl p-7 sm:p-9 lg:p-10 shadow-2xl shadow-violet-950/15 border border-[#DCCFFF] relative overflow-hidden"
                id="hero-login"
              >
                {/* Top Accent Stripe in Rich Violet Gradient */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#2A174E] via-[#4C268F] to-[#8060CE]" />

                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#3D1E6D] flex items-center justify-center shadow-xs">
                    <GraduationCap className="w-6 h-6 text-[#3D1E6D]" />
                  </div>

                  {/* Role Switcher Pills */}
                  <div className="inline-flex p-1 rounded-xl bg-[#F8F6FF] border border-[#DCCFFF]/80 text-[11px] font-bold text-[#5F5875]">
                    {(['student', 'parent', 'teacher'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRole(r)}
                        className={`capitalize px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          selectedRole === r
                            ? 'bg-[#3D1E6D] text-white shadow-xs'
                            : 'hover:text-[#1E1035]'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 mb-6">
                  <h2 className="font-display text-2xl sm:text-3xl font-black text-[#1E1035] tracking-tight">
                    Welcome Back
                  </h2>
                  <p className="text-sm text-[#5F5875] leading-relaxed">
                    Sign in to your Student, Parent, or Teacher account.
                  </p>
                </div>

                {/* If session exists, show active user panel */}
                {existingUser ? (
                  <div className="space-y-5 py-2">
                    <div className="p-4 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF] space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#6244A6] uppercase tracking-wider">
                        <UserCheck className="w-4 h-4 text-[#8060CE]" />
                        <span>Active Session Detected</span>
                      </div>
                      <p className="text-sm font-semibold text-[#1E1035]">
                        Logged in as {existingUser.name || existingUser.email}
                      </p>
                      <p className="text-xs text-[#5F5875]">
                        Role: <span className="capitalize font-semibold text-[#6244A6]">{existingUser.role}</span>
                      </p>
                    </div>

                    <Link
                      href={getDashboardPath(existingUser.role)}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#2A174E] via-[#3D1E6D] to-[#6244A6] hover:from-[#3D1E6D] hover:to-[#7A54CF] text-white font-extrabold text-sm shadow-xl shadow-violet-950/25 transition-all hover:scale-[1.01] active:scale-[0.98]"
                    >
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await supabase.auth.signOut();
                          setExistingUser(null);
                          router.refresh();
                        }}
                        className="text-xs text-[#5F5875] hover:text-red-600 font-semibold transition-colors underline cursor-pointer"
                      >
                        Sign in with a different account
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {!isConfigured && (
                      <div className="mb-5 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>Please configure Supabase credentials in .env.local to activate authentication.</div>
                      </div>
                    )}

                    {authError && (
                      <div className="mb-5 p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex gap-2.5 animate-in fade-in duration-200">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="flex-1 font-medium">{authError}</div>
                      </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                      {/* Email */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="hero-email"
                          className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]"
                        >
                          Email Address
                        </label>
                        <div className="relative">
                          <input
                            id="hero-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            autoComplete="email"
                            className="w-full px-4 py-3.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/70 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/50 focus:border-[#4C268F] transition-all"
                          />
                          <Mail className="absolute right-4 top-4 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="hero-password"
                            className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]"
                          >
                            Password
                          </label>
                          <Link
                            href="/login"
                            className="text-xs font-bold text-[#4C268F] hover:text-[#3D1E6D] hover:underline"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <div className="relative">
                          <input
                            id="hero-password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="w-full px-4 py-3.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/70 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/50 focus:border-[#4C268F] transition-all pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3.5 p-1 text-[#5F5875] hover:text-[#1E1035] focus:outline-none transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={authLoading}
                          className="w-full py-4 px-5 rounded-xl bg-gradient-to-r from-[#2A174E] via-[#3D1E6D] to-[#6244A6] hover:from-[#3D1E6D] hover:to-[#7A54CF] text-white font-extrabold text-sm shadow-xl shadow-violet-950/25 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {authLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Signing In…</span>
                            </>
                          ) : (
                            <>
                              <span>Sign In</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    <div className="pt-6 border-t border-[#DCCFFF]/60 text-center text-xs text-[#5F5875] mt-6">
                      Don&apos;t have an account yet?{' '}
                      <Link
                        href="/signup"
                        className="text-[#3D1E6D] hover:text-[#4C268F] font-black hover:underline ml-1"
                      >
                        Create Account
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Section Bottom Layered Wave Divider with Fluid Wave Animation */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none select-none overflow-hidden">
          <svg
            className="w-[105%] -ml-[2.5%] h-16 sm:h-24 lg:h-28"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 1440 120"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,40 C320,95 640,-15 960,60 C1200,98 1360,25 1440,40 L1440,120 L0,120 Z"
              fill="#EEE8FF"
              fillOpacity="0.75"
              className="animate-wave-flow"
            />
            <path
              d="M0,60 C240,25 520,95 800,50 C1080,15 1280,75 1440,60 L1440,120 L0,120 Z"
              fill="#DCCFFF"
              fillOpacity="0.55"
              className="animate-wave-flow-reverse"
            />
            <path
              d="M0,78 C360,30 720,100 1080,52 C1260,30 1380,65 1440,70 L1440,120 L0,120 Z"
              fill="#FFFFFF"
              className="animate-wave-flow-slow"
            />
          </svg>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 2. CENTERPIECE 3D VISUAL NARRATIVE BANNER (IMAGE_7)                 */}
      {/* =================================================================== */}
      <section className="py-12 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#EEE8FF] via-[#F8F6FF] to-[#EEE8FF] border border-[#DCCFFF] p-8 lg:p-12 shadow-xl shadow-violet-950/5 relative overflow-hidden ring-1 ring-violet-200/50">
            {/* Ambient background grid and subtle overlay */}
            <div className="absolute inset-0 pattern-grid pointer-events-none opacity-40" />
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#DCCFFF] rounded-full blur-3xl opacity-60 pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-[#3D1E6D] text-xs font-black border border-[#DCCFFF] shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#6244A6] animate-pulse" />
                  <span>INTERACTIVE CLASSROOM 2026</span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-[#1E1035] tracking-tight leading-tight">
                  Designed from the Ground Up for Real Academic Mastery
                </h3>
                <p className="text-sm sm:text-base text-[#5F5875] leading-relaxed">
                  Combining photorealistic digital lessons, comprehensive subject notebooks, verified educators, and automated progress analytics into one unified sanctuary for learning.
                </p>
                <div className="pt-2 flex flex-wrap gap-4 text-xs font-bold text-[#3D1E6D]">
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-[#DCCFFF] shadow-xs">
                    <span className="text-[#6244A6] font-black">✓</span>
                    <span>Complete CBSE &amp; ICSE Textbooks</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-[#DCCFFF] shadow-xs">
                    <span className="text-[#6244A6] font-black">✓</span>
                    <span>Personalized Revision Schedules</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex justify-center">
                <div className="relative max-w-sm sm:max-w-md w-full">
                  <Image
                    src={ASSETS.centerpieceNarrative}
                    alt="3D Floating Laptop with Alphabet Book, Magnifier & Study Equipment"
                    width={460}
                    height={380}
                    className="w-full h-auto object-contain drop-shadow-2xl animate-float-medium filter contrast-[1.02]"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
