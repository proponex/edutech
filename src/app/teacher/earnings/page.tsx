'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { TeacherEarningsManager } from '@/components/teacher/TeacherEarningsManager';
import { ArrowLeft } from 'lucide-react';

export default function TeacherEarningsPage() {
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
        <TeacherEarningsManager />
      </main>
    </div>
  );
}
