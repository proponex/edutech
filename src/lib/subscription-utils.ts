'use client';

import { useState, useEffect } from 'react';

/**
 * EXACT 28-DAY DURATION CONSTANTS
 * 28 days = 672 hours = 40,320 minutes = 2,419,200 seconds = 2,419,200,000 milliseconds
 */
export const DURATION_28_DAYS_SECONDS = 28 * 24 * 60 * 60; // 2,419,200 s
export const DURATION_28_DAYS_MS = DURATION_28_DAYS_SECONDS * 1000; // 2,419,200,000 ms

export interface SubscriptionCountdown {
  totalMs: number;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isExpiringSoon: boolean; // Less than 3 days
  formatted: string; // e.g. "27d 14h 32m 45s left"
  formattedShort: string; // e.g. "27d 14h left"
  formattedDigital: string; // e.g. "27d : 14h : 32m : 45s"
}

/**
 * Pure calculation of remaining time until subscription expiry.
 * Based on exact Unix epoch milliseconds, eliminating all calendar-day rounding errors.
 */
export function calculateSubscriptionCountdown(
  expiresAt: string | Date | null | undefined,
  currentNowMs: number = Date.now()
): SubscriptionCountdown {
  if (!expiresAt) {
    return {
      totalMs: 0,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isExpiringSoon: false,
      formatted: 'Expired',
      formattedShort: 'Expired',
      formattedDigital: '00d : 00h : 00m : 00s',
    };
  }

  const expiryMs = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();

  if (isNaN(expiryMs)) {
    return {
      totalMs: 0,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isExpiringSoon: false,
      formatted: 'Invalid date',
      formattedShort: 'Invalid date',
      formattedDigital: '00d : 00h : 00m : 00s',
    };
  }

  const diffMs = expiryMs - currentNowMs;

  if (diffMs <= 0) {
    return {
      totalMs: 0,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isExpiringSoon: false,
      formatted: 'Expired',
      formattedShort: 'Expired',
      formattedDigital: '00d : 00h : 00m : 00s',
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const isExpiringSoon = days < 3;

  return {
    totalMs: diffMs,
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    isExpiringSoon,
    formatted: `${days}d ${hours}h ${minutes}m ${seconds}s left`,
    formattedShort:
      days > 0
        ? `${days}d ${hours}h left`
        : hours > 0
        ? `${hours}h ${minutes}m left`
        : `${minutes}m ${seconds}s left`,
    formattedDigital: `${pad(days)}d : ${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`,
  };
}

/**
 * React hook that drives real-time 1-second countdown ticks.
 * Never resets when user navigates, refreshes, or remounts.
 */
export function useSubscriptionCountdown(expiresAt: string | Date | null | undefined): SubscriptionCountdown {
  const [countdown, setCountdown] = useState<SubscriptionCountdown>(() =>
    calculateSubscriptionCountdown(expiresAt)
  );

  useEffect(() => {
    // Initial sync
    setCountdown(calculateSubscriptionCountdown(expiresAt));

    if (!expiresAt) return;

    const timer = setInterval(() => {
      const next = calculateSubscriptionCountdown(expiresAt);
      setCountdown(next);

      if (next.isExpired) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  return countdown;
}

/**
 * Calculates new 28-day expiration timestamp from an activation time or renewal.
 */
export function computeSubscriptionExpiry(
  startsAt: string | Date = new Date(),
  existingExpiry?: string | Date | null
): { startsAt: string; expiresAt: string } {
  const startDate = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  const now = new Date();

  // If existing active subscription is valid, extend by 28 days from existing expiry
  if (existingExpiry) {
    const currentExpiryDate = typeof existingExpiry === 'string' ? new Date(existingExpiry) : existingExpiry;
    if (currentExpiryDate.getTime() > now.getTime()) {
      const extendedExpiry = new Date(currentExpiryDate.getTime() + DURATION_28_DAYS_MS);
      return {
        startsAt: startDate.toISOString(),
        expiresAt: extendedExpiry.toISOString(),
      };
    }
  }

  // Fresh 28-day cycle from activation timestamp
  const freshExpiry = new Date(startDate.getTime() + DURATION_28_DAYS_MS);
  return {
    startsAt: startDate.toISOString(),
    expiresAt: freshExpiry.toISOString(),
  };
}

