'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { GraduationCap, AlertCircle, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = isSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConfigured) {
      setError('Supabase connection pending. Please set your credentials in .env.local.');
      return;
    }

    if (!email || !password) {
      setError('Please provide your email and password.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!data.user) {
        throw new Error('Authentication failed: No user returned.');
      }

      // Query profile role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        // Fallback default: General Home Experience
        router.push('/');
        return;
      }

      // Role-based redirection
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
      setError(err instanceof Error ? err.message : 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-neutral-50 dark:bg-neutral-950 transition-colors">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-md shadow-primary-500/20">
            <GraduationCap className="w-5 h-5 text-neutral-950" />
          </div>
          <span className="font-display font-bold text-xl text-neutral-950 dark:text-white tracking-tight">
            EDUTECH
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Login */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 flex items-center justify-center mb-2">
              <LogIn className="w-6 h-6 text-primary-700 dark:text-primary-400" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              Welcome Back
            </CardTitle>
            <CardDescription>
              Sign in to your Student, Parent, or Teacher account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!isConfigured && (
              <div className="mb-5 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Please set your Supabase credentials in <code className="font-mono font-semibold">.env.local</code> to activate authentication.
                </div>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3.5 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 text-xs flex gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={loading}
              >
                Sign In
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center text-xs text-neutral-500 dark:text-neutral-400">
            <div>
              Don&apos;t have an account yet?{' '}
              <Link
                href="/signup"
                className="text-primary-600 dark:text-primary-400 hover:underline font-semibold ml-1"
              >
                Create Account
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>

      <footer className="py-4 text-center text-xs text-neutral-400">
        Edutech &bull; Empowering learners everywhere
      </footer>
    </div>
  );
}
