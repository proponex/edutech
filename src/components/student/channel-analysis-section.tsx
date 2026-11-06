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
  onSelectSubject?: (item: SubscribedSubjectProgress) => void;
}

export function ChannelAnalysisSection({ subjects, onSelectSubject }: ChannelAnalysisSectionProps) {
  if (!subjects || subjects.length === 0) {
    return null;
  }

  return (
    <section id="channel-analysis" className="w-full space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#9333EA] text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Academic Performance</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#17133A] font-display">
            Channel Analysis
          </h2>
          <p className="text-xs sm:text-sm text-[#68647D]">
            Subject-wise learning completion across your subscribed channels.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-semibold border-[#E9DDF8] bg-[#F3E8FF] text-[#9333EA] self-start sm:self-auto">
          {subjects.length} {subjects.length === 1 ? 'Subscribed Subject' : 'Subscribed Subjects'}
        </Badge>
      </div>

      <div className="border border-[#E9DDF8] bg-white shadow-xs rounded-3xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-6 py-3.5 bg-[#F3E8FF]/60 border-b border-[#E9DDF8] text-xs font-bold uppercase tracking-wider text-[#68647D]">
          <div className="col-span-4 sm:col-span-3">Subject / Channel</div>
          <div className="col-span-6 sm:col-span-7 px-2">Progress</div>
          <div className="col-span-2 text-right">View</div>
        </div>

        <div className="divide-y divide-[#E9DDF8]">
          {subjects.map((item, idx) => {
            return (
              <div
                key={`${item.channelId}-${item.subjectName}-${idx}`}
                className="grid grid-cols-12 items-center px-6 py-4.5 hover:bg-[#FAF9FF] transition-colors gap-2"
              >
                {/* Subject & Channel Info */}
                <div className="col-span-4 sm:col-span-3 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#9333EA] border border-[#E9DDF8] flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-sm sm:text-base text-[#17133A] block truncate">
                        {item.subjectName}
                      </span>
                      <span className="text-[11px] text-[#68647D] block truncate">
                        {item.channelName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Percentage: e.g. ███████░░░ 70% */}
                <div className="col-span-6 sm:col-span-7 px-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[#68647D] font-semibold">
                      {item.completedItems} / {item.totalItems} completed
                    </span>
                    <span className="font-extrabold text-sm text-[#9333EA]">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#F3E8FF] rounded-full overflow-hidden p-0.5 border border-[#E9DDF8]">
                    <div
                      className="h-full bg-gradient-to-r from-[#A855F7] to-[#9333EA] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(item.percentage, item.totalItems > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>

                {/* View / Analytics Action */}
                <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                  {onSelectSubject && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectSubject(item)}
                      className="rounded-xl px-2.5 py-1.5 text-xs font-bold border-[#E9DDF8] hover:border-[#9333EA] hover:bg-[#F3E8FF] text-[#9333EA] cursor-pointer"
                      title="View detailed breakdown"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Link href={`/channels/${item.channelId}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl px-3 py-1.5 text-xs font-bold border-[#E9DDF8] hover:border-[#9333EA] hover:bg-[#F3E8FF] text-[#9333EA]"
                    >
                      View
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
