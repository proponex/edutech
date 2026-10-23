'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'neutral' | 'danger';
  };
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-primary-50 dark:bg-primary-950/80 border-primary-200 dark:border-primary-800',
  iconColor = 'text-primary-600 dark:text-primary-400',
  badge,
  loading = false,
}: StatCardProps) {
  return (
    <Card className="hover:border-primary-400/50 transition-all shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {title}
          </span>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBgColor}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {loading ? (
                <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              ) : (
                value
              )}
            </span>
          </div>

          {badge && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                badge.variant === 'success'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : badge.variant === 'warning'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : badge.variant === 'danger'
                  ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800'
                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              {badge.text}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
