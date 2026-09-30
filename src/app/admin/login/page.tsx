'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { ShieldCheck, GraduationCap, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = isSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConfigured) {
      setError('Supabase credentials not configured yet. Please update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
      return;
    }

    if (!email || !password) {
      setError('Please provide both email and password.');
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

      // Check role in profiles table
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

      router.push('/admin');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-neutral-50 dark:bg-neutral-950 transition-colors">
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-sm">
            <GraduationCap className="w-4 h-4 text-neutral-950" />
          </div>
          <span className="font-display font-bold text-lg text-neutral-900 dark:text-white tracking-tight">
            EDUTECH
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800/80 flex items-center justify-center mb-2 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              Admin Portal
            </CardTitle>
            <CardDescription>
              Sign in with your administrative credentials to manage Edutech.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!isConfigured && (
              <div className="mb-5 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Supabase setup pending:</strong> Enter your Supabase URL & Anon Key in <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">.env.local</code>, then execute the schema in <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">supabase/schema.sql</code>.
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
                label="Admin Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gmail.com"
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
                Sign In to Dashboard
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center text-xs text-neutral-500 dark:text-neutral-400">
            <span>Are you a student, teacher, or parent? </span>
            <Link
              href="/login"
              className="text-primary-600 dark:text-primary-400 hover:underline font-semibold ml-1"
            >
              Public Login
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
