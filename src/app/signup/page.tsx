'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  ShieldCheck,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
} from 'lucide-react';
import { GoogleButton } from '@/components/auth/google-button';
import { OtpInput } from '@/components/auth/otp-input';
import { Footer } from '@/components/layout/footer';

export default function SignUpPage() {
  const router = useRouter();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [otpResendCooldown, setOtpResendCooldown] = useState(60);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError('Please provide your full name.');
      return;
    }

    if (!trimmedEmail) {
      setError('Please provide your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!agreeTerms) {
      setError('Please agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          name: trimmedName,
          password,
          purpose: 'signup',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setOtpResendCooldown(data.resendAvailableIn || 60);
      setSuccess(`A 6-digit verification code has been dispatched to ${trimmedEmail}`);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpCode: string) => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otpCode,
          purpose: 'signup',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Invalid verification code.',
          remainingAttempts: data.remainingAttempts,
        };
      }

      setSuccess('Account verified! Redirecting to select your account type…');
      setTimeout(() => {
        window.location.href = data.redirectUrl || '/onboarding';
      }, 700);

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Verification failed.',
      };
    }
  };

  const handleResendOtp = async () => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          password,
          purpose: 'signup',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error };
      }

      setSuccess(`A new code was dispatched to ${email.trim().toLowerCase()}.`);
      return { success: true, resendAvailableIn: data.resendAvailableIn || 60 };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to resend code.',
      };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F6FF] via-[#FAF8FF] to-white flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#DCCFFF]/60 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3D1E6D] via-[#6244A6] to-[#A485E8] flex items-center justify-center text-white border border-[#DCCFFF] shadow-md shadow-violet-900/15 group-hover:scale-105 transition-transform ring-2 ring-[#EEE8FF]">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-xl tracking-tight text-[#1E1035]">
              PREPNX
            </span>
            <span className="text-[10px] font-bold text-[#6244A6] tracking-widest uppercase">
              Digital Learning Platform
            </span>
          </div>
        </Link>

        <Link
          href="/?auth=login#hero-login"
          className="text-xs font-bold text-[#4C268F] hover:text-[#3D1E6D] px-3.5 py-1.5 rounded-xl border border-[#DCCFFF] bg-white hover:bg-[#EEE8FF] transition-all shadow-xs"
        >
          Sign In &rarr;
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#DCCFFF]/40 rounded-full blur-3xl pointer-events-none -z-10 animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#EEE8FF]/60 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-9 shadow-2xl shadow-violet-950/10 border border-[#DCCFFF] relative z-10 overflow-hidden">
          {/* Top Accent Stripe */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#2A174E] via-[#4C268F] to-[#8060CE]" />

          {/* Header */}
          <div className="text-center mb-6 pt-2">
            <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#3D1E6D] flex items-center justify-center mx-auto mb-3 shadow-xs">
              {step === 'otp' ? (
                <ShieldCheck className="w-6 h-6 text-[#6244A6]" />
              ) : (
                <UserPlus className="w-6 h-6 text-[#6244A6]" />
              )}
            </div>
            <h1 className="font-display text-2xl font-black text-[#1E1035] tracking-tight">
              {step === 'otp' ? 'Verify Your Email' : 'Create Prepnx Account'}
            </h1>
            <p className="text-xs sm:text-sm text-[#5F5875] mt-1">
              {step === 'otp'
                ? `Enter the 6-digit code sent to ${email}`
                : 'Join learners, teachers, and parents today.'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{success}</div>
            </div>
          )}

          {/* STEP 2: OTP Verification */}
          {step === 'otp' ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError(null);
                  setSuccess(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F5875] hover:text-[#1E1035] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change email or details
              </button>

              <OtpInput
                email={email}
                title="Email Verification Code"
                subtitle="Please enter the 6-digit code dispatched to your email address."
                initialCooldown={otpResendCooldown}
                onVerify={handleVerifyOtp}
                onResend={handleResendOtp}
                onCancel={() => {
                  setStep('form');
                  setError(null);
                  setSuccess(null);
                }}
              />
            </div>
          ) : (
            /* STEP 1: Registration Form */
            <div className="space-y-4">
              {/* Google Button */}
              <GoogleButton
                text="Continue with Google"
                onError={(err) => setError(err)}
              />

              {/* Divider */}
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#DCCFFF]" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-[#5F5875]/80">
                  or register with email
                </span>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {/* Full Name */}
                <div className="space-y-1">
                  <label
                    htmlFor="signup-name"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="signup-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Arun Kumar"
                      autoComplete="name"
                      className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/70 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/50 focus:border-[#4C268F] transition-all"
                    />
                    <User className="absolute right-3.5 top-3 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/70 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/50 focus:border-[#4C268F] transition-all"
                    />
                    <Mail className="absolute right-3.5 top-3 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
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

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/70 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/50 focus:border-[#4C268F] transition-all pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-2.5 p-1 text-[#5F5875] hover:text-[#1E1035] focus:outline-none transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms agreement */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    id="signup-terms"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-[#DCCFFF] text-[#6244A6] focus:ring-[#6244A6] cursor-pointer"
                  />
                  <label htmlFor="signup-terms" className="text-xs text-[#5F5875] leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <Link href="/terms" className="text-[#4C268F] font-bold hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-[#4C268F] font-bold hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#2A174E] via-[#3D1E6D] to-[#6244A6] hover:from-[#3D1E6D] hover:to-[#7A54CF] text-white font-extrabold text-sm shadow-xl shadow-violet-950/25 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending Verification Code…</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Link to Sign In */}
              <div className="pt-4 border-t border-[#DCCFFF]/60 text-center text-xs text-[#5F5875]">
                Already have an account?{' '}
                <Link
                  href="/?auth=login#hero-login"
                  className="font-bold text-[#4C268F] hover:text-[#3D1E6D] hover:underline cursor-pointer"
                >
                  Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
