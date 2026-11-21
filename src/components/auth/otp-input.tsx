'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface OtpInputProps {
  email: string;
  onVerify: (otp: string) => Promise<{ success: boolean; error?: string; remainingAttempts?: number }>;
  onResend: () => Promise<{ success: boolean; resendAvailableIn?: number; error?: string }>;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  initialCooldown?: number;
}

export function OtpInput({
  email,
  onVerify,
  onResend,
  onCancel,
  title = 'Verify Your Email',
  subtitle,
  initialCooldown = 60,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(initialCooldown);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    setError(null);
    // Extract only digits
    const cleanVal = value.replace(/\D/g, '');

    if (!cleanVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // Single digit input
    const newDigits = [...digits];
    newDigits[index] = cleanVal.slice(-1);
    setDigits(newDigits);

    // Focus next input if available
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits are filled, auto-submit
    const completeCode = newDigits.join('');
    if (completeCode.length === 6 && !newDigits.includes('')) {
      handleCompleteVerify(completeCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous and clear it
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);

    // Focus either the last pasted digit position or index 5
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pastedData.length === 6) {
      handleCompleteVerify(pastedData);
    }
  };

  const handleCompleteVerify = async (otpCode: string) => {
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await onVerify(otpCode);
      if (!result.success) {
        setError(result.error || 'Verification failed. Please check the code.');
        // Re-focus current or last input
        inputRefs.current[0]?.focus();
      } else {
        setSuccess('Verification confirmed!');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendClick = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await onResend();
      if (result.success) {
        setCooldown(result.resendAvailableIn || 60);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setSuccess('A new 6-digit verification code has been sent to your email.');
      } else {
        setError(result.error || 'Failed to resend code.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error resending code.');
    } finally {
      setResending(false);
    }
  };

  const formatCooldown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[#EEE8FF] border border-[#DCCFFF] text-[#6244A6] flex items-center justify-center mx-auto shadow-xs">
          <ShieldCheck className="w-6 h-6 text-[#6244A6]" />
        </div>
        <h3 className="font-display text-xl sm:text-2xl font-black text-[#1E1035]">{title}</h3>
        <p className="text-xs sm:text-sm text-[#5F5875] max-w-sm mx-auto leading-relaxed">
          {subtitle || (
            <>
              We sent a 6-digit verification code to <span className="font-bold text-[#1E1035]">{email}</span>.
              Enter the code below to continue.
            </>
          )}
        </p>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* 6 Digit Inputs */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            disabled={loading}
            className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-black font-mono rounded-2xl border-2 transition-all shadow-xs focus:outline-none ${
              digit
                ? 'border-[#6244A6] bg-white text-[#1E1035]'
                : 'border-[#DCCFFF] bg-[#F8F6FF]/60 text-[#1E1035] focus:bg-white focus:border-[#6244A6] focus:ring-4 focus:ring-[#8060CE]/15'
            }`}
          />
        ))}
      </div>

      {/* Verify Button */}
      <button
        type="button"
        onClick={() => handleCompleteVerify(digits.join(''))}
        disabled={loading || digits.join('').length !== 6}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2A174E] via-[#3D1E6D] to-[#6244A6] hover:from-[#3D1E6D] hover:to-[#7A54CF] text-white font-extrabold text-sm shadow-md shadow-violet-950/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Verifying Code…</span>
          </>
        ) : (
          <span>Verify &amp; Continue</span>
        )}
      </button>

      {/* Resend & Cooldown Footer */}
      <div className="pt-2 flex flex-col items-center justify-center gap-2 text-xs">
        {cooldown > 0 ? (
          <div className="text-[#5F5875]">
            Resend available in <span className="font-mono font-bold text-[#6244A6]">{formatCooldown(cooldown)}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleResendClick}
            disabled={resending}
            className="inline-flex items-center gap-1.5 font-bold text-[#6244A6] hover:text-[#3D1E6D] hover:underline cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>Didn&apos;t receive the code? Resend OTP</span>
          </button>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[#5F5875] hover:text-[#1E1035] text-xs transition-colors mt-2 underline"
          >
            Back to Sign In
          </button>
        )}
      </div>
    </div>
  );
}
