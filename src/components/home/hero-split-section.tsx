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
  User,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { BannerItem, Profile } from '@/types';
import { GoogleButton } from '@/components/auth/google-button';
import { OtpInput } from '@/components/auth/otp-input';
import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal';

// Exact 3D High-Res Assets with Verified 100% Transparent Backgrounds
const ASSETS = {
  heroBooksTopLeft: '/images/hero_books_transparent.png',
  heroLaptopCenterpiece: '/images/hero_laptop_transparent.png',
  centerpieceNarrative: '/images/centerpiece_narrative_transparent.png',
  fluidWaveFooter:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDuUU5e1L-9DuaDwYBVAOd-qc-LUq0LAe14pE8tT7UNqvZFh-s3Zc-RWmzBqw2JHhj7RLIO-v4_Mv1XXigu9rHCnOVFr8xm9-dPyvhO7AgzzDIe4ybRzhasY0V5UTNmQdIlZr-QTxVPHLFRgv1JR0pXG599D8tEGiBhgWqa6Dk4gmz3V2AHkyOU6T7M3pwx02xq5xEVLPJX3TWKGkQEr96bgD-_0DjRRxVsnJ4NGEE',
};

export function HeroSplitSection() {
  const router = useRouter();
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  // Banner states
  const [banner, setBanner] = useState<BannerItem | null>(null);
  const [bannerLoading, setBannerLoading] = useState(true);

  // Auth states
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep] = useState<'form' | 'otp'>('form');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<'student' | 'parent' | 'teacher'>('student');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(60);

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
        case 'admin': router.push('/admin'); break;
        case 'teacher': router.push('/teacher'); break;
        case 'parent': router.push('/parent'); break;
        case 'student': router.push('/student'); break;
        default: router.push('/'); break;
      }
      router.refresh();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!signupName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }

    if (!email || !password) {
      setAuthError('Please provide both your email address and password.');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    setAuthLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          purpose: 'signup',
          name: signupName.trim(),
          role: signupRole,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setOtpResendCooldown(data.resendAvailableIn || 60);
      setSignupStep('otp');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Registration request failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOtpVerify = async (otpCode: string) => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otpCode,
          purpose: 'signup',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error, remainingAttempts: data.remainingAttempts };
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
        router.refresh();
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Verification failed.' };
    }
  };

  const handleOtpResend = async () => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          purpose: 'signup',
          name: signupName.trim(),
          role: signupRole,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error };
      }
      return { success: true, resendAvailableIn: data.resendAvailableIn || 60 };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to resend code.' };
    }
  };

  const getDashboardPath = (role?: string) => {
    switch (role) {
      case 'admin': return '/admin';
      case 'teacher': return '/teacher';
      case 'parent': return '/parent';
      case 'student': return '/student';
      default: return '/';
    }
  };

  return (
    <>
      {/* =================================================================== */}
      {/* 1. HERO SECTION WITH LUXURY FLUID WATER WAVES & NEAT WAVE PATTERNS   */}
      {/* =================================================================== */}
      <section className="relative pt-8 pb-24 sm:pt-12 sm:pb-32 lg:pt-14 lg:pb-36 overflow-hidden bg-gradient-to-b from-[#F8F6FF] via-[#FAF8FF] to-white">
        {/* Ambient Background Grid Pattern & Topographic Texture (Already Existing Pattern) */}
        <div className="absolute inset-0 pattern-grid pointer-events-none opacity-40 z-0" />
        <div className="absolute inset-0 pattern-topographic pointer-events-none opacity-25 z-0" />

        {/* Atmospheric Glowing Orbs */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-[#DCCFFF]/80 rounded-full blur-3xl opacity-75 pointer-events-none z-0 animate-glow-pulse" />
        <div className="absolute bottom-10 right-10 w-[520px] h-[520px] bg-[#EEE8FF] rounded-full blur-3xl opacity-70 pointer-events-none z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-[#EEE8FF]/50 to-transparent rounded-full blur-3xl pointer-events-none z-0" />

        {/* =============================================================== */}
        {/* TOP DARK VIOLET WAVES & PATTERNS (FULLY VISIBLE AT TOP OF PAGE) */}
        {/* =============================================================== */}
        <div className="absolute top-0 left-0 right-0 h-64 sm:h-80 lg:h-96 pointer-events-none select-none overflow-hidden z-10">
          <svg
            className="w-full h-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 1440 380"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="heroDarkWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E1035" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#2A174E" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#1E1035" stopOpacity="0.88" />
              </linearGradient>
              <linearGradient id="heroDarkWaveGrad2" x1="0%" y1="0%" x2="100%" y2="80%">
                <stop offset="0%" stopColor="#2A174E" stopOpacity="0.92" />
                <stop offset="50%" stopColor="#3D1E6D" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#2A174E" stopOpacity="0.84" />
              </linearGradient>
              <linearGradient id="heroDarkWaveGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3D1E6D" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#4C268F" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#6244A6" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="heroDarkWaveGrad4" x1="0%" y1="0%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#6244A6" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#8060CE" stopOpacity="0.9" />
              </linearGradient>
              <filter id="paintDropGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1E1035" floodOpacity="0.55" />
              </filter>
            </defs>

            {/* Layer 1: Deep Dark Violet Base Wave (Starts top-left, curves across to right) */}
            <path
              d="M-40,0 L1480,0 L1480,210 C1240,320 980,160 740,270 C500,370 240,190 -40,290 Z"
              fill="url(#heroDarkWaveGrad1)"
              className="animate-wave-flow"
            />

            {/* Layer 2: Rich Violet Flow Wave */}
            <path
              d="M-40,0 L1480,0 L1480,165 C1200,275 940,120 680,225 C420,325 180,150 -40,240 Z"
              fill="url(#heroDarkWaveGrad2)"
              className="animate-wave-flow-slow"
            />

            {/* Layer 3: Accent Purple Crest Wave */}
            <path
              d="M-40,0 L1480,0 L1480,120 C1140,220 880,80 620,175 C360,265 120,100 -40,185 Z"
              fill="url(#heroDarkWaveGrad3)"
              className="animate-wave-flow-reverse"
            />

            {/* Layer 4: Bright Violet Highlight Ribbon */}
            <path
              d="M-40,0 L1480,0 L1480,75 C1080,160 820,45 560,130 C300,205 80,60 -40,125 Z"
              fill="url(#heroDarkWaveGrad4)"
            />

            {/* Layer 5: Decorative Wave Contour Pattern Lines */}
            <path
              d="M-40,290 C240,190 500,370 740,270 C980,160 1240,320 1480,210"
              fill="none"
              stroke="#A485E8"
              strokeWidth="2.5"
              strokeOpacity="0.6"
            />
            <path
              d="M-40,270 C240,170 500,350 740,250 C980,140 1240,300 1480,190"
              fill="none"
              stroke="#BBA5F0"
              strokeWidth="2"
              strokeDasharray="8 8"
              strokeOpacity="0.55"
              className="animate-dash-flow"
            />
            <path
              d="M-40,245 C240,145 500,325 740,225 C980,115 1240,275 1480,165"
              fill="none"
              stroke="#DCCFFF"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              strokeOpacity="0.45"
            />

            {/* Layer 6: Hanging Paint Drops Pattern Along Bottom of Waves */}
            {/* Paint Droplet 1 (Left Area) */}
            <g filter="url(#paintDropGlowFilter)">
              <path
                d="M 280,230 C 272,242 268,252 268,260 C 268,272 277,282 289,282 C 301,282 310,272 310,260 C 310,252 306,242 298,230 Z"
                fill="#2A174E"
                stroke="#6244A6"
                strokeWidth="1.5"
              />
              <circle cx="286" cy="256" r="3" fill="#DCCFFF" fillOpacity="0.7" />
            </g>

            {/* Paint Droplet 2 (Center Dip) */}
            <g filter="url(#paintDropGlowFilter)">
              <path
                d="M 540,340 C 530,356 525,370 525,380 C 525,395 536,406 552,406 C 568,406 579,395 579,380 C 579,370 574,356 564,340 Z"
                fill="#1E1035"
                stroke="#8060CE"
                strokeWidth="1.5"
              />
              <circle cx="548" cy="374" r="3.5" fill="#EEE8FF" fillOpacity="0.8" />
            </g>

            {/* Paint Droplet 3 (Right Center Area) */}
            <g filter="url(#paintDropGlowFilter)">
              <path
                d="M 920,200 C 912,212 908,222 908,230 C 908,242 917,251 928,251 C 939,251 948,242 948,230 C 948,222 944,212 936,200 Z"
                fill="#2A174E"
                stroke="#6244A6"
                strokeWidth="1.5"
              />
              <circle cx="925" cy="226" r="2.5" fill="#DCCFFF" fillOpacity="0.7" />
            </g>

            {/* Paint Droplet 4 (Far Right Area) */}
            <g filter="url(#paintDropGlowFilter)">
              <path
                d="M 1260,280 C 1252,294 1247,305 1247,314 C 1247,327 1257,337 1270,337 C 1283,337 1293,327 1293,314 C 1293,305 1288,294 1280,280 Z"
                fill="#1E1035"
                stroke="#6244A6"
                strokeWidth="1.5"
              />
              <circle cx="1267" cy="310" r="3" fill="#DCCFFF" fillOpacity="0.7" />
            </g>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-[11fr_9fr] gap-8 lg:gap-10 xl:gap-12 items-stretch">

            {/* =============================================================== */}
            {/* LEFT COLUMN: Promotional Visual Banner                          */}
            {/* =============================================================== */}
            <div className="relative min-h-[540px] sm:min-h-[600px] lg:min-h-[660px] rounded-3xl overflow-hidden shadow-2xl shadow-[#1E1035]/15 border border-[#DCCFFF] bg-gradient-to-br from-white via-[#F8F6FF] to-[#EEE8FF] flex flex-col justify-between group pt-6 z-20">
              {/* Central Visual Composition */}
              {bannerLoading ? (
                <div className="relative flex-1 w-full min-h-[340px] flex items-center justify-center bg-gradient-to-br from-[#F8F6FF] to-[#EEE8FF]">
                  <div className="w-8 h-8 rounded-full border-2 border-[#6244A6] border-t-transparent animate-spin" />
                </div>
              ) : banner?.image_url ? (
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
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#F8F6FF] to-[#EEE8FF]">
                  <h3 className="text-xl font-black text-[#1E1035]">Welcome to EduTech</h3>
                  <p className="text-xs text-[#5F5875] mt-1 max-w-sm">
                    Empowering K–12 learners with comprehensive digital classrooms.
                  </p>
                </div>
              )}

                {banner?.button_text && banner?.button_link ? (
                  <div className="relative z-20 p-5 sm:p-6 flex justify-end bg-gradient-to-t from-white/95 to-transparent">
                    <Link
                      href={banner.button_link}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#3D1E6D] to-[#6244A6] text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
                    >
                      <span>{banner.button_text}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="pb-4" />
                )}
              </div>

            {/* =============================================================== */}
            {/* RIGHT COLUMN: Premium Sign-in Card with Dark Violet Accents      */}
            {/* =============================================================== */}
            <div className="flex flex-col justify-center relative z-20">
              <div
                className="w-full bg-white rounded-3xl p-7 sm:p-9 lg:p-10 shadow-2xl shadow-violet-950/15 border border-[#DCCFFF] relative overflow-hidden"
                id="hero-login"
              >
                {/* Top Accent Stripe in Rich Violet Gradient */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#2A174E] via-[#4C268F] to-[#8060CE]" />

                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#3D1E6D] flex items-center justify-center shadow-xs">
                    <GraduationCap className="w-6 h-6 text-[#3D1E6D]" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8FF] border border-[#DCCFFF] text-[11px] font-bold text-[#6244A6]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#6244A6]" />
                    <span>Verified Portal</span>
                  </div>
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
                ) : signupStep === 'otp' ? (
                  /* OTP VERIFICATION VIEW */
                  <div className="py-2 animate-in fade-in zoom-in-95 duration-200">
                    <OtpInput
                      email={email}
                      title="Verify Your Registration"
                      subtitle="We sent a 6-digit verification code to your email. Enter it below to activate your account."
                      initialCooldown={otpResendCooldown}
                      onVerify={handleOtpVerify}
                      onResend={handleOtpResend}
                      onCancel={() => setSignupStep('form')}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1 mb-5">
                      <h2 className="font-display text-2xl sm:text-3xl font-black text-[#1E1035] tracking-tight">
                        {authTab === 'login' ? 'Welcome Back' : 'Create Prepnx Account'}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#5F5875] leading-relaxed">
                        {authTab === 'login'
                          ? 'Sign in to access your digital classroom & lessons.'
                          : 'Join students, teachers, and parents today.'}
                      </p>
                    </div>

                    {/* Google OAuth Button */}
                    <div className="mb-4">
                      <GoogleButton
                        text={authTab === 'login' ? 'Continue with Google' : 'Sign up with Google'}
                        onError={(err) => setAuthError(err)}
                      />
                    </div>

                    {/* Divider */}
                    <div className="relative my-4 text-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#DCCFFF]" />
                      </div>
                      <span className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-[#5F5875]/80">
                        or continue with email
                      </span>
                    </div>

                    {/* Tab Switcher: Sign In vs Create Account */}
                    <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF] mb-5">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('login');
                          setAuthError(null);
                        }}
                        className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          authTab === 'login'
                            ? 'bg-white text-[#1E1035] shadow-sm border border-[#DCCFFF]/60'
                            : 'text-[#5F5875] hover:text-[#1E1035]'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('signup');
                          setAuthError(null);
                        }}
                        className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          authTab === 'signup'
                            ? 'bg-white text-[#1E1035] shadow-sm border border-[#DCCFFF]/60'
                            : 'text-[#5F5875] hover:text-[#1E1035]'
                        }`}
                      >
                        Create Account
                      </button>
                    </div>

                    {authError && (
                      <div className="mb-4 p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex gap-2.5 animate-in fade-in duration-200">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="flex-1 font-medium">{authError}</div>
                      </div>
                    )}

                    {/* TAB: SIGN IN FORM */}
                    {authTab === 'login' ? (
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
                              className="w-full px-4 py-3 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/70 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/50 focus:border-[#4C268F] transition-all"
                            />
                            <Mail className="absolute right-4 top-3.5 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
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
                            <button
                              type="button"
                              onClick={() => setIsForgotModalOpen(true)}
                              className="text-xs font-bold text-[#4C268F] hover:text-[#3D1E6D] hover:underline cursor-pointer"
                            >
                              Forgot password?
                            </button>
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
                              className="w-full px-4 py-3 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/70 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/50 focus:border-[#4C268F] transition-all pr-11"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-3 p-1 text-[#5F5875] hover:text-[#1E1035] focus:outline-none transition-colors"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#2A174E] via-[#3D1E6D] to-[#6244A6] hover:from-[#3D1E6D] hover:to-[#7A54CF] text-white font-extrabold text-sm shadow-xl shadow-violet-950/25 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
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
                    ) : (
                      /* TAB: CREATE ACCOUNT FORM */
                      <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                        {/* Name */}
                        <div className="space-y-1">
                          <label
                            htmlFor="hero-signup-name"
                            className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]"
                          >
                            Full Name
                          </label>
                          <div className="relative">
                            <input
                              id="hero-signup-name"
                              type="text"
                              required
                              value={signupName}
                              onChange={(e) => setSignupName(e.target.value)}
                              placeholder="e.g. Arun Kumar"
                              className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/70 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/50 focus:border-[#4C268F] transition-all"
                            />
                            <User className="absolute right-4 top-3 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
                          </div>
                        </div>

                        {/* Role Selector */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]">
                            I am registering as:
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'student', label: 'Student' },
                              { id: 'parent', label: 'Parent' },
                              { id: 'teacher', label: 'Teacher' },
                            ].map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSignupRole(item.id as 'student' | 'parent' | 'teacher')}
                                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                  signupRole === item.id
                                    ? 'bg-[#6244A6] text-white border-[#6244A6] shadow-xs'
                                    : 'bg-[#F8F6FF] text-[#5F5875] border-[#DCCFFF] hover:border-[#6244A6]/40'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                          <label
                            htmlFor="hero-signup-email"
                            className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]"
                          >
                            Email Address
                          </label>
                          <div className="relative">
                            <input
                              id="hero-signup-email"
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="name@example.com"
                              autoComplete="email"
                              className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/70 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/50 focus:border-[#4C268F] transition-all"
                            />
                            <Mail className="absolute right-4 top-3 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
                          </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1">
                          <label
                            htmlFor="hero-signup-password"
                            className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]"
                          >
                            Password
                          </label>
                          <div className="relative">
                            <input
                              id="hero-signup-password"
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Minimum 6 characters"
                              autoComplete="new-password"
                              className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/70 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/50 focus:border-[#4C268F] transition-all pr-11"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-2.5 p-1 text-[#5F5875] hover:text-[#1E1035] focus:outline-none transition-colors"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#2A174E] via-[#3D1E6D] to-[#6244A6] hover:from-[#3D1E6D] hover:to-[#7A54CF] text-white font-extrabold text-sm shadow-xl shadow-violet-950/25 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            {authLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Sending Code…</span>
                              </>
                            ) : (
                              <>
                                <span>Verify via Email OTP</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="pt-4 border-t border-[#DCCFFF]/60 text-center text-xs text-[#5F5875] mt-4">
                      Need custom curriculum setup?{' '}
                      <Link
                        href="/signup"
                        className="text-[#3D1E6D] hover:text-[#4C268F] font-black hover:underline ml-1"
                      >
                        Full Registration Page &rarr;
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Forgot Password Modal */}
            <ForgotPasswordModal
              isOpen={isForgotModalOpen}
              onClose={() => setIsForgotModalOpen(false)}
              onSuccessLogin={() => {
                setIsForgotModalOpen(false);
                setAuthTab('login');
              }}
            />

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
                <div className="relative max-w-sm sm:max-w-md w-full aspect-[512/307]">
                  <Image
                    src={ASSETS.centerpieceNarrative}
                    alt="3D Floating Laptop with Alphabet Book, Magnifier & Study Equipment"
                    fill
                    sizes="(max-width: 640px) 380px, 460px"
                    className="object-contain drop-shadow-2xl animate-float-medium filter contrast-[1.02]"
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
