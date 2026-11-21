'use client';

import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useSubscriptionCountdown, SubscriptionCountdown } from '@/lib/subscription-utils';

interface LiveCountdownBadgeProps {
  expiresAt: string | Date | null | undefined;
  variant?: 'digital' | 'full' | 'short' | 'pill' | 'banner';
  className?: string;
  showIcon?: boolean;
}

export function LiveCountdownBadge({
  expiresAt,
  variant = 'short',
  className = '',
  showIcon = true,
}: LiveCountdownBadgeProps) {
  const countdown = useSubscriptionCountdown(expiresAt);

  if (!expiresAt || countdown.isExpired) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
      >
        {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
        <span>Expired</span>
      </span>
    );
  }

  // Variant: Digital Box Counter (e.g. 27d : 14h : 32m : 45s)
  if (variant === 'digital') {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return (
      <div className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`}>
        <div className="flex items-center gap-1 bg-[#1E1035] text-white px-2.5 py-1 rounded-xl shadow-xs border border-[#3B2569]">
          <Clock className="w-3.5 h-3.5 text-[#DCCFFF] mr-1 animate-pulse" />
          <div className="flex items-baseline gap-1 font-bold">
            <span className="text-white">{pad(countdown.days)}<span className="text-[10px] text-[#DCCFFF] ml-0.5">d</span></span>
            <span className="text-[#DCCFFF]">:</span>
            <span className="text-white">{pad(countdown.hours)}<span className="text-[10px] text-[#DCCFFF] ml-0.5">h</span></span>
            <span className="text-[#DCCFFF]">:</span>
            <span className="text-white">{pad(countdown.minutes)}<span className="text-[10px] text-[#DCCFFF] ml-0.5">m</span></span>
            <span className="text-[#DCCFFF]">:</span>
            <span className="text-emerald-400 font-extrabold">{pad(countdown.seconds)}<span className="text-[10px] text-emerald-300 ml-0.5">s</span></span>
          </div>
          <span className="text-[10px] text-[#DCCFFF] font-medium ml-1">left</span>
        </div>
      </div>
    );
  }

  // Variant: Full text (e.g. "27d 14h 32m 45s left")
  if (variant === 'full') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
          countdown.isExpiringSoon
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        } ${className}`}
      >
        {showIcon && (
          <Clock
            className={`w-3.5 h-3.5 shrink-0 ${
              countdown.isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'
            }`}
          />
        )}
        <span className="font-mono">{countdown.formatted}</span>
      </span>
    );
  }

  // Variant: Pill (e.g. "Active • 27d 14h left")
  if (variant === 'pill') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
          countdown.isExpiringSoon
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : 'bg-[#EEE8FF] text-[#6244A6] border border-[#DCCFFF]'
        } ${className}`}
      >
        {showIcon && (
          <span
            className={`w-2 h-2 rounded-full ${
              countdown.isExpiringSoon ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
            }`}
          />
        )}
        <span>{countdown.isExpiringSoon ? 'Expiring soon' : 'Active'} &bull; </span>
        <span className="font-mono">{countdown.formattedShort}</span>
      </span>
    );
  }

  // Default: Short text with live ticking seconds on hover/view
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
        countdown.isExpiringSoon
          ? 'bg-amber-50 text-amber-800 border border-amber-200'
          : 'bg-[#EEE8FF] text-[#6244A6] border border-[#DCCFFF]'
      } ${className}`}
      title={`Exact countdown: ${countdown.formatted}`}
    >
      {showIcon && (
        <Clock
          className={`w-3.5 h-3.5 shrink-0 ${
            countdown.isExpiringSoon ? 'text-amber-600' : 'text-[#6244A6]'
          }`}
        />
      )}
      <span className="font-mono">{countdown.formatted}</span>
    </span>
  );
}

