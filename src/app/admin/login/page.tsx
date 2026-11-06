'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { ShieldCheck, GraduationCap, AlertCircle, Lock, Mail } from 'lucide-react';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = isSupabaseConfigured();

  // Check if redirected with unauthorized error
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'unauthorized') {
      setError('Access denied: Valid administrative credentials required.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConfigured) {
      setError('Supabase credentials not configured in .env.local.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Please provide both administrator email and password.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw new Error(authError.message || 'Invalid administrator credentials.');
      }

      if (!data.user) {
        throw new Error('Authentication failed: No user returned.');
      }

      // Authoritative Role Check in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        // Sign out if not admin
        await supabase.auth.signOut();
        throw new Error('Access denied: You do not have administrator permissions.');
      }

      // STEP 3: Redirect to Admin Dashboard (Income tab by default)
      router.push('/admin');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-neutral-50 dark:bg-neutral-950 font-sans transition-colors">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-sm">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-display font-black text-lg text-neutral-900 dark:text-white tracking-tight">
            EDUTECH
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Login Card (Clean Application Green Theme) */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/80 border border-primary-200 dark:border-primary-800 flex items-center justify-center mb-3 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Admin Portal Login
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Sign in with your administrative credentials to access the central console.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-4">
            {error && (
              <div className="mb-5 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug font-medium">{error}</div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Admin Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@gmail.com"
                    autoComplete="email"
                    className="pl-10 h-11 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-10 h-11 text-xs rounded-xl"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-3 h-11 font-bold text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md shadow-primary-600/20"
                isLoading={loading}
              >
                Sign In to Admin Dashboard
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center pb-6 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <span>Are you an educator, student, or parent? </span>
            <Link
              href="/login"
              className="text-primary-700 dark:text-primary-400 hover:underline font-bold ml-1"
            >
              Public Login &rarr;
            </Link>
          </CardFooter>
        </Card>
      </main>

      {/* Footer Note */}
      <footer className="py-4 text-center text-xs text-neutral-400">
        Edutech Platform &bull; Secure Administrative Access
      </footer>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
