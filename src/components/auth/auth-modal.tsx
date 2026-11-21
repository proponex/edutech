'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GraduationCap, X, AlertCircle, CheckCircle2, UserPlus, LogIn, ArrowRight, Eye, EyeOff, User, Mail } from 'lucide-react';
import { GoogleButton } from '@/components/auth/google-button';
import { OtpInput } from '@/components/auth/otp-input';
import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal';

export function openAuthModal(mode: 'login' | 'signup' = 'login', message?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('open-auth-modal', {
        detail: { mode, message },
      })
    );
  }
}

export function AuthModal() {
  const router = useRouter();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep] = useState<'form' | 'otp'>('form');
  const [customMessage, setCustomMessage] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'parent' | 'teacher'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(60);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: 'login' | 'signup'; message?: string }>;
      if (customEvent.detail?.mode) {
        setMode(customEvent.detail.mode);
      }
      setCustomMessage(
        customEvent.detail?.message ||
          'Please sign in or create an account to explore classes, teacher channels, and study materials.'
      );
      setError(null);
      setSuccess(null);
      setSignupStep('form');
      setIsOpen(true);
    };

    window.addEventListener('open-auth-modal', handleOpen);
    return () => window.removeEventListener('open-auth-modal', handleOpen);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
    setSignupStep('form');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!data.user) throw new Error('Authentication failed.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', data.user.id)
        .maybeSingle();

      setSuccess('Signed in successfully! Loading portal...');

      setTimeout(() => {
        handleClose();
        if (profile?.onboarding_completed === false) {
          router.push('/onboarding');
        } else {
          const dest =
            profile?.role === 'admin'
              ? '/admin'
              : profile?.role === 'teacher'
              ? '/teacher'
              : profile?.role === 'parent'
              ? '/parent'
              : '/student';
          router.push(dest);
        }
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (!email || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          purpose: 'signup',
          name: name.trim(),
          role,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setOtpCooldown(data.resendAvailableIn || 60);
      setSignupStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration request failed.');
    } finally {
      setLoading(false);
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

      setSuccess('Account created and verified! Entering portal…');
      setTimeout(() => {
        handleClose();
        router.push(data.redirectUrl || '/student');
        router.refresh();
      }, 700);

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
          name: name.trim(),
          role,
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
        <div className="bg-white border border-[#DCCFFF] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 relative">
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 text-center border-b border-[#DCCFFF]/60">
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 p-1.5 rounded-full text-[#5F5875] hover:text-[#1E1035] hover:bg-[#F8F6FF] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3D1E6D] via-[#6244A6] to-[#A485E8] flex items-center justify-center mx-auto shadow-md shadow-violet-900/15 mb-2">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>

            <h3 className="text-xl font-black text-[#1E1035]">
              {mode === 'login' ? 'Sign In to Prepnx' : 'Create Free Account'}
            </h3>
            <p className="text-xs text-[#5F5875] max-w-xs mx-auto mt-1 leading-relaxed">
              {customMessage}
            </p>
          </div>

          <div className="p-6">
            {signupStep === 'otp' ? (
              <OtpInput
                email={email}
                title="Verify Your Email"
                subtitle="Enter the 6-digit verification code sent to your email to activate your account."
                initialCooldown={otpCooldown}
                onVerify={handleOtpVerify}
                onResend={handleOtpResend}
                onCancel={() => setSignupStep('form')}
              />
            ) : (
              <>
                {/* Google OAuth Button */}
                <div className="mb-4">
                  <GoogleButton
                    text={mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
                    onError={(err) => setError(err)}
                  />
                </div>

                {/* Divider */}
                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#DCCFFF]" />
                  </div>
                  <span className="relative bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-[#5F5875]/80">
                    or continue with email
                  </span>
                </div>

                {/* Tab Switcher */}
                <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF] mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setSuccess(null);
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === 'login'
                        ? 'bg-white text-[#1E1035] shadow-xs border border-[#DCCFFF]/60'
                        : 'text-[#5F5875] hover:text-[#1E1035]'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                      setSuccess(null);
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === 'signup'
                        ? 'bg-white text-[#1E1035] shadow-xs border border-[#DCCFFF]/60'
                        : 'text-[#5F5875] hover:text-[#1E1035]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Create Account
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={mode === 'login' ? handleLoginSubmit : handleSignupSubmit} className="space-y-3">
                  {mode === 'signup' && (
                    <>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#1E1035]">Full Name</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Arun Kumar"
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/60 text-[#1E1035] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/30 focus:border-[#6244A6]"
                          />
                          <User className="absolute right-3.5 top-3 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#1E1035]">Account Type</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'student', label: 'Student' },
                            { id: 'parent', label: 'Parent' },
                            { id: 'teacher', label: 'Teacher' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setRole(item.id as 'student' | 'parent' | 'teacher')}
                              className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                role === item.id
                                  ? 'bg-[#6244A6] text-white border-[#6244A6]'
                                  : 'bg-[#F8F6FF] text-[#5F5875] border-[#DCCFFF]'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#1E1035]">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/60 text-[#1E1035] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/30 focus:border-[#6244A6]"
                      />
                      <Mail className="absolute right-3.5 top-3 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-[#1E1035]">Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setIsForgotModalOpen(true)}
                          className="text-xs font-bold text-[#6244A6] hover:underline cursor-pointer"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/60 text-[#1E1035] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6244A6]/30 focus:border-[#6244A6] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 p-1 text-[#5F5875] hover:text-[#1E1035]"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#2A174E] via-[#3D1E6D] to-[#6244A6] hover:from-[#3D1E6D] hover:to-[#7A54CF] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-3"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processing…</span>
                      </>
                    ) : (
                      <>
                        <span>{mode === 'login' ? 'Sign In' : 'Verify via Email OTP'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onSuccessLogin={() => {
          setIsForgotModalOpen(false);
          setMode('login');
        }}
      />
    </>
  );
}
