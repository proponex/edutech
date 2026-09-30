'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, PlayCircle, BookOpen, GraduationCap, CheckCircle2 } from 'lucide-react';
import { StudentRecentLearning } from '@/types';

interface RecentLearningSectionProps {
  learning: StudentRecentLearning | null;
}

export function RecentLearningSection({ learning }: RecentLearningSectionProps) {
  if (!learning) return null;

  return (
    <section className="w-full">
      <Card className="border-2 border-primary-500/30 dark:border-primary-500/20 bg-gradient-to-br from-primary-50/50 via-white to-neutral-50 dark:from-primary-950/20 dark:via-neutral-900 dark:to-neutral-950 shadow-lg rounded-3xl overflow-hidden">
        <div className="px-6 py-3 bg-primary-500/10 dark:bg-primary-500/15 border-b border-primary-200/50 dark:border-primary-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-900 dark:text-primary-300">
              Recent Learning
            </span>
          </div>
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Active Classroom
          </span>
        </div>

        <CardContent className="p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* LEFT COLUMN: Channel Name, Teacher Details, Channel Information */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {learning.className && (
                    <Badge variant="primary" className="text-xs font-bold">
                      <GraduationCap className="w-3.5 h-3.5 mr-1" />
                      {learning.className}
                    </Badge>
                  )}
                  {learning.subjectName && (
                    <Badge variant="secondary" className="text-xs font-semibold">
                      <BookOpen className="w-3 h-3 mr-1" />
                      {learning.subjectName}
                    </Badge>
                  )}
                </div>

                {/* Channel Name */}
                <Link href={`/channels/${learning.channelId}`}>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 dark:text-white font-display hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    {learning.channelName}
                  </h2>
                </Link>

                {/* Channel Information / Description */}
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                  {learning.channelDescription || 'Comprehensive curriculum lessons, interactive quizzes, and concept mastery.'}
                </p>
              </div>

              {/* Teacher Details */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800/80 w-fit">
                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-primary-100 dark:bg-primary-950/80 border border-primary-300 dark:border-primary-800 flex items-center justify-center shrink-0">
                  {learning.teacherPhotoUrl ? (
                    <Image
                      src={learning.teacherPhotoUrl}
                      alt={learning.teacherName}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User className="w-6 h-6 text-primary-700 dark:text-primary-300" />
                  )}
                </div>
                <div className="min-w-0 pr-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Instructor
                  </span>
                  <span className="text-sm font-bold text-neutral-900 dark:text-white truncate block">
                    {learning.teacherName}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Overall Learning %, Progress Bar, Continue Learning Button */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                    Overall Learning
                  </span>
                  <span className="text-3xl sm:text-4xl font-extrabold text-neutral-950 dark:text-white font-display">
                    {learning.overallPercentage}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    {learning.completedItems} of {learning.totalItems} done
                  </span>
                </div>
              </div>

              {/* Progress Bar (calculated strictly from real completed content) */}
              <div className="w-full h-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-neutral-200/60 dark:border-neutral-700/60">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-emerald-500 rounded-full transition-all duration-700 shadow-xs"
                  style={{ width: `${Math.max(learning.overallPercentage, 3)}%` }}
                />
              </div>

              {/* Action Button */}
              <div className="pt-1">
                <Link href={`/channels/${learning.channelId}`} className="block">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full font-bold shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 py-3"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Continue Learning
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
