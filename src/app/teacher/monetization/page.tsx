'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { createClient } from '@/lib/supabase/client';
import { TeacherPricingManager } from '@/components/teacher/TeacherPricingManager';
import { ChannelItem, Profile } from '@/types';
import { TeacherService } from '@/lib/teacher-service';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TeacherMonetizationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<ChannelItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const chs = await TeacherService.getTeacherChannels(user.id);
        setChannels(chs);
      } catch (err) {
        console.error('Error loading channels for monetization:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col text-neutral-900 dark:text-neutral-100">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Teacher Dashboard</span>
        </Link>
        <TeacherPricingManager channels={channels} />
      </main>
    </div>
  );
}
