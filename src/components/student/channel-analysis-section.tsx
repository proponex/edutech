'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, ExternalLink, BookOpen, CheckCircle2 } from 'lucide-react';
import { SubscribedSubjectProgress } from '@/types';

interface ChannelAnalysisSectionProps {
  subjects: SubscribedSubjectProgress[];
}

export function ChannelAnalysisSection({ subjects }: ChannelAnalysisSectionProps) {
  if (!subjects || subjects.length === 0) {
    return null;
  }

  return (
    <section id="channel-analysis" className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Academic Performance</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-950 dark:text-white font-display">
            Channel Analysis
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            Subject-wise learning completion across your subscribed channels.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-semibold">
          {subjects.length} {subjects.length === 1 ? 'Subscribed Subject' : 'Subscribed Subjects'}
        </Badge>
      </div>

      <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm rounded-3xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-6 py-3.5 bg-neutral-50 dark:bg-neutral-950/60 border-b border-neutral-200/80 dark:border-neutral-800/80 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          <div className="col-span-4 sm:col-span-3">Subject / Channel</div>
          <div className="col-span-6 sm:col-span-7 px-2">Progress</div>
          <div className="col-span-2 text-right">View</div>
        </div>

        <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800/70">
          {subjects.map((item, idx) => {
            return (
              <div
                key={`${item.channelId}-${item.subjectName}-${idx}`}
                className="grid grid-cols-12 items-center px-6 py-4.5 hover:bg-neutral-50/70 dark:hover:bg-neutral-950/40 transition-colors gap-2"
              >
                {/* Subject & Channel Info */}
                <div className="col-span-4 sm:col-span-3 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-sm sm:text-base text-neutral-900 dark:text-white block truncate">
                        {item.subjectName}
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block truncate">
                        {item.channelName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Percentage: e.g. ███████░░░ 70% */}
                <div className="col-span-6 sm:col-span-7 px-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-neutral-600 dark:text-neutral-300 font-semibold">
                      {item.completedItems} / {item.totalItems} completed
                    </span>
                    <span className="font-extrabold text-sm text-neutral-900 dark:text-white">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-neutral-200/50 dark:border-neutral-700/50">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(item.percentage, item.totalItems > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>

                {/* View Action */}
                <div className="col-span-2 text-right">
                  <Link href={`/channels/${item.channelId}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl px-4 py-1.5 text-xs font-bold hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      View
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
