'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  UserCheck,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { BannerItem, Profile } from '@/types';

// Curated high-resolution student photography for default editorial banner
const DEFAULT_STUDENT_IMAGE =
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85';

export function HeroSplitSection() {
  const router = useRouter();
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  // Banner states
  const [banner, setBanner] = useState<BannerItem | null>(null);
  const [bannerLoading, setBannerLoading] = useState(true);

  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [existingUser, setExistingUser] = useState<Profile | null>(null);

  // 1. Fetch dynamic admin-published banner & existing session on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        // Fetch active published banner from Supabase
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
        // Fall back gracefully to high-craft default promotional content
      } finally {
        if (isMounted) setBannerLoading(false);
      }

      // Check if user is already authenticated
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
        // Non-blocking session check
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Handle Login submission
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

      if (signInErr) {
        throw new Error(signInErr.message);
      }

      if (!data.user) {
        throw new Error('Authentication failed. No user was returned.');
      }

      // Fetch profile role for correct redirect
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileErr || !profile) {
        router.push('/');
        return;
      }

      // Role-based redirection preserving all existing functionality
      switch (profile.role) {
        case 'admin':
          router.push('/admin');
          break;
        case 'teacher':
          router.push('/teacher');
          break;
        case 'parent':
          router.push('/parent');
          break;
        case 'student':
          router.push('/student');
          break;
        default:
          router.push('/');
          break;
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

  // Content for left side (Dynamic from admin or default editorial)
  const promoTitle = banner?.title || 'World-Class Digital Tuition for K–12 Students';
  const promoDescription =
    banner?.description ||
    'Interactive digital classrooms, chapter-wise mastery, and real-time parent progress monitoring tailored for academic excellence.';
  const promoImage = banner?.image_url || DEFAULT_STUDENT_IMAGE;
  const promoButtonText = banner?.button_text || 'Explore Platform';
  const promoButtonLink = banner?.button_link || '#features';
  const hasCta = Boolean(banner?.button_text?.trim() || !banner);

  return (
    <section className="relative pt-6 pb-16 sm:pt-10 sm:pb-24 lg:pt-12 lg:pb-28 overflow-hidden bg-[#F8F6FF]">
      {/* Subtle ambient decorative gradient glows */}
      <div
        className="absolute top-10 left-1/4 -translate-x-1/2 w-96 h-96 bg-[#EEE8FF] rounded-full blur-3xl pointer-events-none opacity-70 -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 right-10 w-80 h-80 bg-[#DCCFFF]/60 rounded-full blur-3xl pointer-events-none opacity-60 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-stretch">
          {/* =================================================================== */}
          {/* LEFT SIDE: EDUCATIONAL PROMOTIONAL BANNER                           */}
          {/* =================================================================== */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl bg-gradient-to-br from-[#FFFFFF] via-[#F8F6FF] to-[#EEE8FF] border border-[#DCCFFF]/80 p-6 sm:p-8 lg:p-10 shadow-xl shadow-violet-950/5 relative overflow-hidden group">
            {/* Top Badge & Live Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-[#6244A6] text-xs font-bold border border-[#DCCFFF] shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#8060CE]" />
                <span>Academic Year 2026–27 • Admissions Open</span>
              </div>
              <div className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F5875]">
                <ShieldCheck className="w-4 h-4 text-[#8060CE]" />
                <span>Verified Curriculum</span>
              </div>
            </div>

            {/* Banner Copy */}
            <div className="space-y-4 max-w-2xl">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#282238] tracking-tight leading-[1.18]">
                {promoTitle}
              </h1>
              <p className="text-base sm:text-lg text-[#5F5875] leading-relaxed">
                {promoDescription}
              </p>

              {/* Optional CTA */}
              {hasCta && (
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    href={promoButtonLink}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6244A6] hover:bg-[#8060CE] text-white text-sm font-bold shadow-md shadow-violet-700/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>{promoButtonText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <a
                    href="#how-it-works"
                    className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-[#6244A6] hover:text-[#8060CE] transition-colors"
                  >
                    <span>See How It Works</span>
                  </a>
                </div>
              )}
            </div>

            {/* High-Quality Student Imagery Frame */}
            <div className="relative mt-8 sm:mt-10 pt-4">
              <div className="relative h-64 sm:h-72 lg:h-80 w-full rounded-2xl overflow-hidden border border-[#DCCFFF]/80 shadow-md shadow-violet-900/10 bg-[#EEE8FF]">
                <Image
                  src={promoImage}
                  alt={promoTitle}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 700px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  unoptimized={promoImage.includes('supabase') || promoImage.includes('unsplash')}
                />
                {/* Visual Gradient Shading */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#282238]/60 via-transparent to-transparent" />

                {/* Micro Floating Highlights */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2 backdrop-blur-md bg-white/20 border border-white/30 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs">
                    <BookOpen className="w-3.5 h-3.5 text-white" />
                    <span>CBSE • ICSE • State Boards</span>
                  </div>
                  <div className="flex items-center gap-1.5 backdrop-blur-md bg-white/20 border border-white/30 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs">
                    <span className="text-amber-300">★</span>
                    <span>4.9 / 5 Rating</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* RIGHT SIDE: PREMIUM WHITE LOGIN CARD                                */}
          {/* =================================================================== */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div
              id="hero-login"
              className="w-full bg-white rounded-3xl p-7 sm:p-9 lg:p-10 shadow-2xl shadow-violet-950/8 border border-[#DCCFFF]/90 relative"
            >
              {/* Subtle top brand pill */}
              <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#6244A6] flex items-center justify-center mb-5 shadow-xs">
                <GraduationCap className="w-6 h-6 text-[#6244A6]" />
              </div>

              {/* Card Heading */}
              <div className="space-y-1.5 mb-6">
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#282238] tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-sm text-[#5F5875] leading-relaxed">
                  Sign in to your Student, Parent, or Teacher account.
                </p>
              </div>

              {/* If user is already logged in, show authenticated state */}
              {existingUser ? (
                <div className="space-y-5 py-2">
                  <div className="p-4 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#6244A6] uppercase tracking-wider">
                      <UserCheck className="w-4 h-4 text-[#8060CE]" />
                      <span>Active Session Detected</span>
                    </div>
                    <p className="text-sm font-semibold text-[#282238]">
                      Logged in as {existingUser.name || existingUser.email}
                    </p>
                    <p className="text-xs text-[#5F5875]">
                      Role: <span className="capitalize font-semibold text-[#6244A6]">{existingUser.role}</span>
                    </p>
                  </div>

                  <Link
                    href={getDashboardPath(existingUser.role)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#6244A6] hover:bg-[#8060CE] text-white font-bold text-sm shadow-md shadow-violet-600/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
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
                      Sign In with a different account
                    </button>
                  </div>
                </div>
              ) : (
                /* Interactive Login Form */
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
                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="hero-email"
                        className="block text-xs font-bold uppercase tracking-wider text-[#282238]"
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
                          className="w-full px-4 py-3 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/60 text-[#282238] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6] transition-all"
                        />
                        <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
                      </div>
                    </div>

                    {/* Password Input with Visibility Toggle */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="hero-password"
                          className="block text-xs font-bold uppercase tracking-wider text-[#282238]"
                        >
                          Password
                        </label>
                        <Link
                          href="/login"
                          className="text-xs font-semibold text-[#6244A6] hover:text-[#8060CE] hover:underline"
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
                          className="w-full px-4 py-3 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/60 text-[#282238] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6] transition-all pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 p-1 text-[#5F5875] hover:text-[#282238] focus:outline-none transition-colors"
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
                        className="w-full py-3.5 px-4 rounded-xl bg-[#6244A6] hover:bg-[#8060CE] text-white font-bold text-sm shadow-md shadow-violet-600/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
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

                  {/* Signup Link */}
                  <div className="pt-6 border-t border-[#DCCFFF]/50 text-center text-xs text-[#5F5875] mt-6">
                    Don&apos;t have an account yet?{' '}
                    <Link
                      href="/signup"
                      className="text-[#6244A6] hover:text-[#8060CE] font-bold hover:underline ml-1"
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
    </section>
  );
}

