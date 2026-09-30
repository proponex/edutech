'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, X, AlertCircle, CheckCircle2, UserPlus, LogIn } from 'lucide-react';
import { UserRole } from '@/types';

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
  const [customMessage, setCustomMessage] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setIsOpen(true);
    };

    window.addEventListener('open-auth-modal', handleOpen);
    return () => window.removeEventListener('open-auth-modal', handleOpen);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw new Error(authError.message);
        if (!data.user) throw new Error('Authentication failed.');

        setSuccess('Signed in successfully! Loading portal...');
        setTimeout(() => {
          handleClose();
          router.push('/student');
          router.refresh();
        }, 800);
      } else {
        // Quick student sign up
        if (!name.trim()) throw new Error('Please provide your full name.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role: 'student',
            },
          },
        });

        if (signUpError) throw new Error(signUpError.message);
        if (!data.user) throw new Error('Registration failed.');

        try {
          await supabase.from('profiles').upsert(
            {
              id: data.user.id,
              name,
              email,
              role: 'student' as UserRole,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } catch {
          // Ignored
        }

        setSuccess('Account created! Entering student portal...');
        setTimeout(() => {
          handleClose();
          router.push('/student');
          router.refresh();
        }, 800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 text-center border-b border-neutral-100 dark:border-neutral-800">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center mx-auto shadow-md shadow-primary-500/20 mb-3">
            <GraduationCap className="w-6 h-6 text-neutral-950" />
          </div>

          <Badge variant="primary" className="text-[10px] uppercase font-bold tracking-wider mb-1">
            Access Required
          </Badge>
          <h3 className="text-xl font-extrabold text-neutral-950 dark:text-white">
            {mode === 'login' ? 'Sign In to Edutech' : 'Create Free Account'}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mt-1 leading-relaxed">
            {customMessage}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccess(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
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
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {mode === 'signup' && (
            <Input
              label="Full Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arun Kumar"
            />
          )}

          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2 font-bold shadow-md shadow-primary-500/20"
            isLoading={loading}
          >
            {mode === 'login' ? 'Sign In' : 'Create Student Account'}
          </Button>

          {mode === 'signup' && (
            <p className="text-[11px] text-center text-neutral-400 pt-1">
              Want to configure full academic preferences?{' '}
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  router.push('/signup');
                }}
                className="text-primary-600 dark:text-primary-400 font-semibold underline"
              >
                Go to Full Registration
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
