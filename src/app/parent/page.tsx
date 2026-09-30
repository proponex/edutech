'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeartHandshake, LogOut, CheckCircle } from 'lucide-react';
import { Profile } from '@/types';

export default function ParentDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data) setProfile(data as Profile);
        }
      } catch {
        // Handled by middleware
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
            <div className="h-4 w-72 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
            <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-2xl mt-6" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary">Parent Role</Badge>
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Authenticated
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Parent Dashboard
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Welcome back{profile?.name ? `, ${profile.name}` : ''}! You are logged in to the parent portal.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-1.5 self-start sm:self-center text-red-600 dark:text-red-400"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary-50 dark:bg-secondary-950/60 border border-secondary-200 dark:border-secondary-800 flex items-center justify-center mx-auto">
              <HeartHandshake className="w-8 h-8 text-secondary-600 dark:text-secondary-400" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              Phase 1 Role Verification Complete
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
              This confirms that parent registration, authentication, and role-based redirects are successfully operational. Child progress monitoring and parent-teacher communication tools will arrive in later phases.
            </p>
            <div className="pt-4 flex justify-center gap-3">
              <Link href="/">
                <Button variant="outline" size="sm">
                  Visit Homepage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
