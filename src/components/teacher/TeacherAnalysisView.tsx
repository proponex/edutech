'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  CreditCard,
  BookOpen,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  Video,
  FileQuestion,
  ArrowUpRight,
  PieChart,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChannelItem } from '@/types';
import { createClient } from '@/lib/supabase/client';

type DatePreset = 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom';

interface TimeBucket {
  label: string;
  start: Date;
  end: Date;
  newEnrollments: number;
  grossRevenuePaise: number;
  teacherSharePaise: number;
}

export function TeacherAnalysisView({
  teacherId,
  channels,
}: {
  teacherId: string;
  channels: ChannelItem[];
}) {
  const supabase = createClient();

  // =========================================================================
  // MASTER FILTERS (Date range, Channel, Subject - NO Grade filter)
  // =========================================================================
  const [datePreset, setDatePreset] = useState<DatePreset>('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Chart Interactive Hover States
  const [hoveredEnrollmentIdx, setHoveredEnrollmentIdx] = useState<number | null>(null);
  const [hoveredRevenueIdx, setHoveredRevenueIdx] = useState<number | null>(null);

  // Raw Database State
  const [loading, setLoading] = useState(true);
  const [rawSubs, setRawSubs] = useState<any[]>([]);
  const [rawEarnings, setRawEarnings] = useState<any[]>([]);
  const [rawWithdrawals, setRawWithdrawals] = useState<any[]>([]);
  const [rawProgress, setRawProgress] = useState<any[]>([]);
  const [rawVideos, setRawVideos] = useState<any[]>([]);
  const [rawQuizzes, setRawQuizzes] = useState<any[]>([]);
  const [rawPaymentOrders, setRawPaymentOrders] = useState<any[]>([]);

  // Discovered Subjects across channels (scoped to selected channel if chosen)
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    const targetChannels =
      selectedChannelId === 'all'
        ? channels
        : channels.filter((c) => c.id === selectedChannelId);

    targetChannels.forEach((ch) => {
      ch.specializations?.forEach((s) => set.add(s));
      ch.subjects?.forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [channels, selectedChannelId]);

  // Load Raw Data from Supabase
  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const channelIds = channels.map((c) => c.id);

      if (channelIds.length === 0) {
        setRawSubs([]);
        setRawEarnings([]);
        setRawWithdrawals([]);
        setRawProgress([]);
        setRawVideos([]);
        setRawQuizzes([]);
        setRawPaymentOrders([]);
        setLoading(false);
        return;
      }

      const [
        { data: subs },
        { data: earnings },
        { data: withdrawals },
        { data: progress },
        { data: videos },
        { data: quizzes },
        { data: paymentOrders },
      ] = await Promise.all([
        supabase.from('channel_subscriptions').select('*').in('channel_id', channelIds),
        supabase.from('teacher_earnings').select('*').eq('teacher_id', teacherId),
        supabase.from('withdrawal_requests').select('*').eq('teacher_id', teacherId),
        supabase.from('student_content_progress').select('*').in('channel_id', channelIds),
        supabase.from('videos').select('id, channel_id, subject_name, unit_id').in('channel_id', channelIds),
        supabase.from('quizzes').select('id, channel_id, subject_name, unit_id, total_marks').in('channel_id', channelIds),
        supabase.from('payment_orders').select('id, item_id, subject_name, package_type').in('item_id', channelIds),
      ]);

      setRawSubs(subs || []);
      setRawEarnings(earnings || []);
      setRawWithdrawals(withdrawals || []);
      setRawProgress(progress || []);
      setRawVideos(videos || []);
      setRawQuizzes(quizzes || []);
      setRawPaymentOrders(paymentOrders || []);
    } catch (err) {
      console.error('[TeacherAnalysisView] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [teacherId, channels, supabase]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Compute Active Date Range Window
  const dateWindow = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date(now.getTime() + 24 * 60 * 60 * 1000); // end of today

    if (datePreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (datePreset === '7days') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (datePreset === '30days') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (datePreset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (datePreset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (datePreset === 'custom') {
      if (customStartDate) start = new Date(customStartDate);
      if (customEndDate) end = new Date(new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }, [datePreset, customStartDate, customEndDate]);

  // Order mapping for earnings filtering by channel / subject
  const orderMap = useMemo(() => {
    const map: Record<string, { channel_id?: string; subject_name?: string }> = {};
    rawPaymentOrders.forEach((o) => {
      map[o.id] = {
        channel_id: o.item_id,
        subject_name: o.subject_name || undefined,
      };
    });
    return map;
  }, [rawPaymentOrders]);

  // Content map for subject identification of student progress
  const contentSubjectMap = useMemo(() => {
    const map: Record<string, string> = {};
    rawVideos.forEach((v) => {
      if (v.subject_name) map[v.id] = v.subject_name;
    });
    rawQuizzes.forEach((q) => {
      if (q.subject_name) map[q.id] = q.subject_name;
    });
    return map;
  }, [rawVideos, rawQuizzes]);

  // Filter Data by Active Master Filters
  const filteredData = useMemo(() => {
    const { start, end } = dateWindow;
    const now = new Date();

    // 1. Filter Subscriptions
    const subs = rawSubs.filter((s) => {
      if (selectedChannelId !== 'all' && s.channel_id !== selectedChannelId) return false;
      if (selectedSubject !== 'all' && s.subject_name !== selectedSubject) return false;
      return true;
    });

    // Subscriptions created within the date window
    const windowSubs = subs.filter((s) => {
      const d = new Date(s.starts_at || s.created_at);
      return d >= start && d <= end;
    });

    // Active subscriptions: status = 'active' and (!expires_at || expires_at > now)
    const activeSubs = subs.filter(
      (s) => s.status === 'active' && (!s.expires_at || new Date(s.expires_at) > now)
    );
    // Deduplicate active students across channels
    const uniqueActiveStudentIds = new Set(activeSubs.map((s) => s.student_id));
    const totalActiveStudents = uniqueActiveStudentIds.size;

    const expiredSubs = subs.filter(
      (s) => s.status === 'expired' || (s.expires_at && new Date(s.expires_at) <= now)
    );

    // 2. Filter Earnings
    const earn = rawEarnings.filter((e) => {
      const orderInfo = orderMap[e.order_id];
      if (selectedChannelId !== 'all' && orderInfo?.channel_id && orderInfo.channel_id !== selectedChannelId) {
        return false;
      }
      if (selectedSubject !== 'all' && orderInfo?.subject_name && orderInfo.subject_name !== selectedSubject) {
        return false;
      }
      const d = new Date(e.created_at);
      return d >= start && d <= end;
    });

    let totalStudentPaymentsPaise = 0;
    let totalTeacherEarningsPaise = 0;
    let totalPlatformFeePaise = 0;

    earn.forEach((e) => {
      totalStudentPaymentsPaise += Number(e.gross_amount_paise) || 0;
      totalTeacherEarningsPaise += Number(e.teacher_share_paise) || 0;
      totalPlatformFeePaise += Number(e.platform_commission_paise) || 0;
    });

    // 3. Filter Withdrawals
    const pendingWithdrawalsPaise = rawWithdrawals
      .filter((w) => w.status === 'requested' || w.status === 'processing')
      .reduce((acc, curr) => acc + (Number(curr.requested_amount_paise) || 0), 0);

    const completedWithdrawalsPaise = rawWithdrawals
      .filter((w) => w.status === 'completed')
      .reduce((acc, curr) => acc + (Number(curr.requested_amount_paise) || 0), 0);

    // 4. Learning Content & Progress
    const videosFiltered = rawVideos.filter((v) => {
      if (selectedChannelId !== 'all' && v.channel_id !== selectedChannelId) return false;
      if (selectedSubject !== 'all' && v.subject_name !== selectedSubject) return false;
      return true;
    });

    const quizzesFiltered = rawQuizzes.filter((q) => {
      if (selectedChannelId !== 'all' && q.channel_id !== selectedChannelId) return false;
      if (selectedSubject !== 'all' && q.subject_name !== selectedSubject) return false;
      return true;
    });

    const totalContentItems = videosFiltered.length + quizzesFiltered.length;

    const progressFiltered = rawProgress.filter((p) => {
      if (selectedChannelId !== 'all' && p.channel_id !== selectedChannelId) return false;
      if (selectedSubject !== 'all') {
        const itemSubject = contentSubjectMap[p.content_id];
        if (itemSubject && itemSubject !== selectedSubject) return false;
      }
      return true;
    });

    const completedProg = progressFiltered.filter((p) => p.status === 'completed');
    const inProgressProg = progressFiltered.filter((p) => p.status === 'in_progress');

    const completedVideosCount = completedProg.filter((p) => p.content_type === 'video').length;

    const scoredQuizzes = completedProg.filter(
      (p) => p.content_type === 'quiz' && typeof p.score === 'number'
    );
    const avgQuizScore =
      scoredQuizzes.length > 0
        ? Math.round(scoredQuizzes.reduce((acc, c) => acc + Number(c.score), 0) / scoredQuizzes.length)
        : null;

    // Content Completion Breakdown for Donut Chart
    const totalPotentialInteractions = Math.max(
      totalContentItems * Math.max(1, totalActiveStudents),
      completedProg.length + inProgressProg.length
    );

    const completedCount = completedProg.length;
    const inProgressCount = inProgressProg.length;
    const remainingCount = Math.max(0, totalPotentialInteractions - completedCount - inProgressCount);

    const totalInteractionsBase = Math.max(1, completedCount + inProgressCount + remainingCount);
    const pctCompleted = Math.round((completedCount / totalInteractionsBase) * 100);
    const pctInProgress = Math.round((inProgressCount / totalInteractionsBase) * 100);
    const pctRemaining = Math.max(0, 100 - pctCompleted - pctInProgress);

    // Subject-Wise Progress Breakdown
    const subjWise: Record<string, { totalItems: number; completedItems: number; pct: number }> = {};
    videosFiltered.forEach((v) => {
      const s = v.subject_name || 'General';
      if (!subjWise[s]) subjWise[s] = { totalItems: 0, completedItems: 0, pct: 0 };
      subjWise[s].totalItems++;
      if (completedProg.some((c) => c.content_id === v.id)) {
        subjWise[s].completedItems++;
      }
    });
    quizzesFiltered.forEach((q) => {
      const s = q.subject_name || 'General';
      if (!subjWise[s]) subjWise[s] = { totalItems: 0, completedItems: 0, pct: 0 };
      subjWise[s].totalItems++;
      if (completedProg.some((c) => c.content_id === q.id)) {
        subjWise[s].completedItems++;
      }
    });

    Object.keys(subjWise).forEach((k) => {
      if (subjWise[k].totalItems > 0) {
        subjWise[k].pct = Math.round((subjWise[k].completedItems / subjWise[k].totalItems) * 100);
      }
    });

    return {
      totalActiveStudents,
      newEnrollments: windowSubs.length,
      activeSubsCount: activeSubs.length,
      expiredSubsCount: expiredSubs.length,
      windowSubs,
      windowEarnings: earn,
      totalStudentPaymentsPaise,
      totalTeacherEarningsPaise,
      totalPlatformFeePaise,
      pendingWithdrawalsPaise,
      completedWithdrawalsPaise,
      totalContentItems,
      completedVideosCount,
      totalVideosCount: videosFiltered.length,
      avgQuizScore,
      completedCount,
      inProgressCount,
      remainingCount,
      pctCompleted,
      pctInProgress,
      pctRemaining,
      subjectWise: subjWise,
    };
  }, [
    dateWindow,
    rawSubs,
    rawEarnings,
    rawWithdrawals,
    rawProgress,
    rawVideos,
    rawQuizzes,
    selectedChannelId,
    selectedSubject,
    orderMap,
    contentSubjectMap,
  ]);

  // =========================================================================
  // TIME SERIES BUCKETS (Shared by Enrollment Chart and Revenue Chart)
  // =========================================================================
  const timeSeriesBuckets = useMemo(() => {
    const { start, end } = dateWindow;
    const startMs = start.getTime();
    const endMs = end.getTime();
    const totalDays = Math.max(1, Math.ceil((endMs - startMs) / (24 * 60 * 60 * 1000)));

    const buckets: TimeBucket[] = [];

    if (totalDays <= 1) {
      // 6 intervals of 4 hours for a 1-day range
      for (let i = 0; i < 6; i++) {
        const bStart = new Date(startMs + i * 4 * 60 * 60 * 1000);
        const bEnd = new Date(startMs + (i + 1) * 4 * 60 * 60 * 1000);
        const h = bStart.getHours().toString().padStart(2, '0');
        buckets.push({
          label: `${h}:00`,
          start: bStart,
          end: bEnd,
          newEnrollments: 0,
          grossRevenuePaise: 0,
          teacherSharePaise: 0,
        });
      }
    } else if (totalDays <= 31) {
      // Daily intervals
      for (let i = 0; i < totalDays; i++) {
        const bStart = new Date(startMs + i * 24 * 60 * 60 * 1000);
        const bEnd = new Date(startMs + (i + 1) * 24 * 60 * 60 * 1000);
        buckets.push({
          label: bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          start: bStart,
          end: bEnd,
          newEnrollments: 0,
          grossRevenuePaise: 0,
          teacherSharePaise: 0,
        });
      }
    } else {
      // Group into 12-14 intervals for longer windows
      const intervalDays = Math.ceil(totalDays / 12);
      for (let i = 0; i < totalDays; i += intervalDays) {
        const bStart = new Date(startMs + i * 24 * 60 * 60 * 1000);
        const bEnd = new Date(Math.min(endMs, startMs + (i + intervalDays) * 24 * 60 * 60 * 1000));
        buckets.push({
          label: bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          start: bStart,
          end: bEnd,
          newEnrollments: 0,
          grossRevenuePaise: 0,
          teacherSharePaise: 0,
        });
      }
    }

    // Allocate window enrollments to buckets
    filteredData.windowSubs.forEach((s) => {
      const d = new Date(s.starts_at || s.created_at).getTime();
      const b = buckets.find((bucket) => d >= bucket.start.getTime() && d < bucket.end.getTime());
      if (b) b.newEnrollments++;
    });

    // Allocate window earnings to buckets
    filteredData.windowEarnings.forEach((e) => {
      const d = new Date(e.created_at).getTime();
      const b = buckets.find((bucket) => d >= bucket.start.getTime() && d < bucket.end.getTime());
      if (b) {
        b.grossRevenuePaise += Number(e.gross_amount_paise) || 0;
        b.teacherSharePaise += Number(e.teacher_share_paise) || 0;
      }
    });

    return buckets;
  }, [dateWindow, filteredData.windowSubs, filteredData.windowEarnings]);

  const formatRupees = (paise: number) => {
    return (
      '₹' +
      (paise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  // =========================================================================
  // SVG ENROLLMENT CHART CALCULATIONS
  // =========================================================================
  const enrollmentChartData = useMemo(() => {
    const buckets = timeSeriesBuckets;
    const N = buckets.length;
    if (N === 0) return null;

    const values = buckets.map((b) => b.newEnrollments);
    const maxVal = Math.max(...values, 4);

    const width = 640;
    const height = 180;
    const pad = { top: 20, right: 25, bottom: 30, left: 35 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const points = values.map((v, i) => {
      const x = pad.left + (N === 1 ? plotW / 2 : (i / (N - 1)) * plotW);
      const y = pad.top + plotH - (v / maxVal) * plotH;
      return { x, y, value: v, label: buckets[i].label };
    });

    const linePath =
      points.length > 1
        ? 'M ' + points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
        : `M ${pad.left},${points[0]?.y || pad.top + plotH} L ${pad.left + plotW},${points[0]?.y || pad.top + plotH}`;

    const areaPath =
      points.length > 1
        ? `M ${points[0].x.toFixed(1)},${(pad.top + plotH).toFixed(1)} L ` +
          points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ') +
          ` L ${points[points.length - 1].x.toFixed(1)},${(pad.top + plotH).toFixed(1)} Z`
        : '';

    return {
      width,
      height,
      pad,
      plotW,
      plotH,
      maxVal,
      points,
      linePath,
      areaPath,
    };
  }, [timeSeriesBuckets]);

  // =========================================================================
  // SVG REVENUE CHART CALCULATIONS
  // =========================================================================
  const revenueChartData = useMemo(() => {
    const buckets = timeSeriesBuckets;
    const N = buckets.length;
    if (N === 0) return null;

    const valuesGrossRupees = buckets.map((b) => b.grossRevenuePaise / 100);
    const valuesTeacherRupees = buckets.map((b) => b.teacherSharePaise / 100);
    const maxVal = Math.max(...valuesGrossRupees, 100);

    const width = 600;
    const height = 180;
    const pad = { top: 20, right: 25, bottom: 30, left: 45 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const pointsGross = valuesGrossRupees.map((v, i) => {
      const x = pad.left + (N === 1 ? plotW / 2 : (i / (N - 1)) * plotW);
      const y = pad.top + plotH - (v / maxVal) * plotH;
      return {
        x,
        y,
        value: v,
        teacherShare: valuesTeacherRupees[i],
        label: buckets[i].label,
      };
    });

    const linePathGross =
      pointsGross.length > 1
        ? 'M ' + pointsGross.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
        : `M ${pad.left},${pointsGross[0]?.y || pad.top + plotH} L ${pad.left + plotW},${pointsGross[0]?.y || pad.top + plotH}`;

    const areaPathGross =
      pointsGross.length > 1
        ? `M ${pointsGross[0].x.toFixed(1)},${(pad.top + plotH).toFixed(1)} L ` +
          pointsGross.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ') +
          ` L ${pointsGross[pointsGross.length - 1].x.toFixed(1)},${(pad.top + plotH).toFixed(1)} Z`
        : '';

    return {
      width,
      height,
      pad,
      plotW,
      plotH,
      maxVal,
      pointsGross,
      linePathGross,
      areaPathGross,
    };
  }, [timeSeriesBuckets]);

  // =========================================================================
  // DONUT CHART CALCULATIONS (Section 3: Curriculum Distribution)
  // =========================================================================
  const donutData = useMemo(() => {
    const r = 38;
    const circumference = 2 * Math.PI * r; // ~238.76

    const pComp = filteredData.pctCompleted;
    const pProg = filteredData.pctInProgress;
    const pRem = filteredData.pctRemaining;

    // Stroke dashes
    const dashCompleted = (pComp / 100) * circumference;
    const dashProgress = (pProg / 100) * circumference;
    const dashRemaining = (pRem / 100) * circumference;

    // Offsets (clockwise rotation starting from top)
    const offsetCompleted = 0;
    const offsetProgress = -dashCompleted;
    const offsetRemaining = -(dashCompleted + dashProgress);

    return {
      r,
      circumference,
      pComp,
      pProg,
      pRem,
      dashCompleted,
      dashProgress,
      dashRemaining,
      offsetCompleted,
      offsetProgress,
      offsetRemaining,
    };
  }, [filteredData]);

  return (
    <div className="space-y-8 font-sans">
      {/* ========================================================================= */}
      {/* TOP HEADER */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              <BarChart3 className="w-3.5 h-3.5 text-primary-600" />
              Tab 3 &bull; Analytics &amp; Performance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            Teacher Channel &amp; Revenue Analytics
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Student enrollment trends, financial revenue splits, and curriculum learning metrics.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadAnalyticsData}
          disabled={loading}
          className="text-xs h-9 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* MASTER FILTERS BAR (Date presets + Channel + Subject - No Grade Filter) */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            <Filter className="w-4 h-4 text-primary-600" />
            <span>Master Analytics Filters</span>
          </div>
          <span className="text-[11px] text-neutral-400">All filters apply concurrently</span>
        </div>

        {/* Date Presets Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-neutral-500 mr-1">Date Range:</span>
          {(
            [
              ['today', 'Today'],
              ['7days', 'Last 7 Days'],
              ['30days', 'Last 30 Days'],
              ['this_month', 'This Month'],
              ['last_month', 'Last Month'],
              ['custom', 'Custom Range'],
            ] as [DatePreset, string][]
          ).map(([preset, label]) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDatePreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === preset
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if Custom selected */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-3 pt-1">
            <div>
              <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Channel & Subject Selectors ONLY (Grade/Class Filter Removed) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          {/* Channel Filter */}
          <div>
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
              Channel:
            </label>
            <select
              value={selectedChannelId}
              onChange={(e) => {
                setSelectedChannelId(e.target.value);
                setSelectedSubject('all'); // reset subject on channel change
              }}
              className="w-full h-9 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs px-3 text-neutral-800 dark:text-neutral-200 font-medium"
            >
              <option value="all">All Channels ({channels.length})</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
              Subject / Specialization:
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full h-9 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs px-3 text-neutral-800 dark:text-neutral-200 font-medium"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: STUDENT ENROLLMENT ANALYTICS */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary-600" />
            1. Student Enrollment Analytics
          </h2>
          <Badge variant="outline" className="text-[10px]">
            Active Subscriber Insights
          </Badge>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card: Total Active Students */}
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold uppercase text-neutral-500 block">
              Total Active Students
            </span>
            <span className="text-3xl font-black text-neutral-900 dark:text-white mt-2 block tracking-tight">
              {filteredData.totalActiveStudents}
            </span>
            <p className="text-[11px] text-neutral-400 mt-1 font-medium">
              Currently holding active access
            </p>
          </Card>

          {/* Card: New Enrollments */}
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold uppercase text-neutral-500 block">
              New Enrollments
            </span>
            <span className="text-3xl font-black text-primary-600 dark:text-primary-400 mt-2 block tracking-tight">
              +{filteredData.newEnrollments}
            </span>
            <p className="text-[11px] text-neutral-400 mt-1 font-medium">
              Joined in selected time window
            </p>
          </Card>

          {/* Card: Active vs Expired */}
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold uppercase text-neutral-500 block">
              Active vs Expired
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-emerald-600">
                {filteredData.activeSubsCount}
              </span>
              <span className="text-xs text-neutral-400">active /</span>
              <span className="text-2xl font-black text-neutral-400">
                {filteredData.expiredSubsCount}
              </span>
              <span className="text-xs text-neutral-400">expired</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1 font-medium">
              Overall subscription retention
            </p>
          </Card>
        </div>

        {/* Compact Line/Area Chart: Enrollments Over Time */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                <span>New Student Enrollments Over Time</span>
                <span className="text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/80 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
                  Trendline
                </span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Timeline distribution of active memberships joining your channel
              </p>
            </div>

            {/* Hover Tooltip Readout */}
            {hoveredEnrollmentIdx !== null && enrollmentChartData?.points[hoveredEnrollmentIdx] && (
              <div className="text-right">
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                  {enrollmentChartData.points[hoveredEnrollmentIdx].label}
                </span>
                <span className="text-xs font-extrabold text-primary-600">
                  +{enrollmentChartData.points[hoveredEnrollmentIdx].value} new enrollment
                  {enrollmentChartData.points[hoveredEnrollmentIdx].value === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </div>

          {/* Responsive SVG Line/Area Container */}
          {enrollmentChartData && (
            <div className="w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${enrollmentChartData.width} ${enrollmentChartData.height}`}
                className="w-full h-44 sm:h-52 select-none"
              >
                <defs>
                  <linearGradient id="enrollmentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                  const y =
                    enrollmentChartData.pad.top +
                    enrollmentChartData.plotH * (1 - ratio);
                  const gridVal = Math.round(enrollmentChartData.maxVal * ratio);
                  return (
                    <g key={idx}>
                      <line
                        x1={enrollmentChartData.pad.left}
                        y1={y}
                        x2={enrollmentChartData.width - enrollmentChartData.pad.right}
                        y2={y}
                        stroke="currentColor"
                        className="text-neutral-200 dark:text-neutral-800"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={enrollmentChartData.pad.left - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        className="fill-neutral-400 text-[9px] font-medium"
                      >
                        {gridVal}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Area */}
                {enrollmentChartData.areaPath && (
                  <path d={enrollmentChartData.areaPath} fill="url(#enrollmentGrad)" />
                )}

                {/* Trendline */}
                <path
                  d={enrollmentChartData.linePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Hover Guideline */}
                {hoveredEnrollmentIdx !== null &&
                  enrollmentChartData.points[hoveredEnrollmentIdx] && (
                    <line
                      x1={enrollmentChartData.points[hoveredEnrollmentIdx].x}
                      y1={enrollmentChartData.pad.top}
                      x2={enrollmentChartData.points[hoveredEnrollmentIdx].x}
                      y2={enrollmentChartData.pad.top + enrollmentChartData.plotH}
                      stroke="#059669"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                {/* Data Points */}
                {enrollmentChartData.points.map((pt, i) => {
                  const isHovered = hoveredEnrollmentIdx === i;
                  return (
                    <g key={i}>
                      {/* Invisible hover hitbox */}
                      <rect
                        x={pt.x - 12}
                        y={enrollmentChartData.pad.top}
                        width={24}
                        height={enrollmentChartData.plotH}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredEnrollmentIdx(i)}
                        onMouseLeave={() => setHoveredEnrollmentIdx(null)}
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5.5 : pt.value > 0 ? 3.5 : 2}
                        fill={isHovered ? '#059669' : '#10b981'}
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 2 : 1}
                        className="transition-all"
                      />
                    </g>
                  );
                })}

                {/* X-Axis Date Labels */}
                {enrollmentChartData.points.map((pt, i) => {
                  const N = enrollmentChartData.points.length;
                  // Show all if <= 8, or sample every step to prevent label overlap
                  const step = N <= 8 ? 1 : Math.ceil(N / 7);
                  if (i % step !== 0 && i !== N - 1) return null;

                  return (
                    <text
                      key={i}
                      x={pt.x}
                      y={enrollmentChartData.height - 8}
                      textAnchor="middle"
                      className="fill-neutral-400 text-[9px] font-medium"
                    >
                      {pt.label}
                    </text>
                  );
                })}
              </svg>
            </div>
          )}
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: FINANCIAL & REVENUE ANALYTICS */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-primary-600" />
            2. Financial &amp; Revenue Analytics
          </h2>
          <Badge variant="outline" className="text-[10px]">
            Educator Share &amp; Platform Fee
          </Badge>
        </div>

        {/* 3 Main Financial Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card: Total Student Payments */}
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-neutral-500">
                Total Student Payments
              </span>
              <Badge variant="outline" className="text-[10px]">
                Gross Received
              </Badge>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mt-2 block tracking-tight">
              {formatRupees(filteredData.totalStudentPaymentsPaise)}
            </span>
            <p className="text-[11px] text-neutral-400 mt-1 font-medium">
              Gross payments received via Razorpay
            </p>
          </Card>

          {/* Card: Teacher Earnings */}
          <Card className="border border-primary-200 dark:border-primary-800 bg-primary-50/25 dark:bg-primary-950/25 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-primary-700 dark:text-primary-300">
                Teacher Earnings
              </span>
              <Badge variant="primary" className="text-[10px]">
                Your Base Ask (100%)
              </Badge>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-primary-700 dark:text-primary-300 mt-2 block tracking-tight">
              {formatRupees(filteredData.totalTeacherEarningsPaise)}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-medium">
              Educator net share after 20% platform fee
            </p>
          </Card>

          {/* Card: Platform Fee */}
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-neutral-500">
                Platform Fee (20%)
              </span>
              <Badge variant="secondary" className="text-[10px]">
                Surcharge
              </Badge>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-neutral-600 dark:text-neutral-300 mt-2 block tracking-tight">
              {formatRupees(filteredData.totalPlatformFeePaise)}
            </span>
            <p className="text-[11px] text-neutral-400 mt-1 font-medium">
              Platform surcharge commission
            </p>
          </Card>
        </div>

        {/* Financial Graphs: Revenue Line Chart + Comparison Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Graph 1: Revenue Over Time Line Chart */}
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-extrabold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>Revenue Over Time</span>
                    <span className="text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-950/80 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
                      Daily
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Gross student payment inflow across selected date window
                  </p>
                </div>

                {/* Hover Readout */}
                {hoveredRevenueIdx !== null && revenueChartData?.pointsGross[hoveredRevenueIdx] && (
                  <div className="text-right">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                      {revenueChartData.pointsGross[hoveredRevenueIdx].label}
                    </span>
                    <span className="text-xs font-extrabold text-primary-600">
                      ₹{revenueChartData.pointsGross[hoveredRevenueIdx].value.toFixed(2)} Gross
                    </span>
                  </div>
                )}
              </div>

              {/* Responsive SVG Revenue Line Chart */}
              {revenueChartData && (
                <div className="w-full overflow-hidden">
                  <svg
                    viewBox={`0 0 ${revenueChartData.width} ${revenueChartData.height}`}
                    className="w-full h-44 sm:h-48 select-none"
                  >
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    {[0, 0.5, 1].map((ratio, idx) => {
                      const y =
                        revenueChartData.pad.top +
                        revenueChartData.plotH * (1 - ratio);
                      const gridVal = Math.round(revenueChartData.maxVal * ratio);
                      return (
                        <g key={idx}>
                          <line
                            x1={revenueChartData.pad.left}
                            y1={y}
                            x2={revenueChartData.width - revenueChartData.pad.right}
                            y2={y}
                            stroke="currentColor"
                            className="text-neutral-200 dark:text-neutral-800"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                          <text
                            x={revenueChartData.pad.left - 8}
                            y={y + 3.5}
                            textAnchor="end"
                            className="fill-neutral-400 text-[9px] font-medium"
                          >
                            ₹{gridVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* Shaded Area */}
                    {revenueChartData.areaPathGross && (
                      <path d={revenueChartData.areaPathGross} fill="url(#revenueGrad)" />
                    )}

                    {/* Line */}
                    <path
                      d={revenueChartData.linePathGross}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Hover Guideline */}
                    {hoveredRevenueIdx !== null &&
                      revenueChartData.pointsGross[hoveredRevenueIdx] && (
                        <line
                          x1={revenueChartData.pointsGross[hoveredRevenueIdx].x}
                          y1={revenueChartData.pad.top}
                          x2={revenueChartData.pointsGross[hoveredRevenueIdx].x}
                          y2={revenueChartData.pad.top + revenueChartData.plotH}
                          stroke="#059669"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                        />
                      )}

                    {/* Data Points */}
                    {revenueChartData.pointsGross.map((pt, i) => {
                      const isHovered = hoveredRevenueIdx === i;
                      return (
                        <g key={i}>
                          <rect
                            x={pt.x - 12}
                            y={revenueChartData.pad.top}
                            width={24}
                            height={revenueChartData.plotH}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredRevenueIdx(i)}
                            onMouseLeave={() => setHoveredRevenueIdx(null)}
                          />
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 5.5 : pt.value > 0 ? 3.5 : 2}
                            fill={isHovered ? '#059669' : '#10b981'}
                            stroke="#ffffff"
                            strokeWidth={isHovered ? 2 : 1}
                            className="transition-all"
                          />
                        </g>
                      );
                    })}

                    {/* X-Axis Date Labels */}
                    {revenueChartData.pointsGross.map((pt, i) => {
                      const N = revenueChartData.pointsGross.length;
                      const step = N <= 8 ? 1 : Math.ceil(N / 6);
                      if (i % step !== 0 && i !== N - 1) return null;

                      return (
                        <text
                          key={i}
                          x={pt.x}
                          y={revenueChartData.height - 8}
                          textAnchor="middle"
                          className="fill-neutral-400 text-[9px] font-medium"
                        >
                          {pt.label}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
              <span>Selected Window Gross:</span>
              <span className="font-extrabold text-neutral-900 dark:text-white">
                {formatRupees(filteredData.totalStudentPaymentsPaise)}
              </span>
            </div>
          </Card>

          {/* Graph 2: Comparison Graph for Teacher Earnings vs Platform Fee */}
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                    Earnings vs Platform Fee Comparison
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Proportional revenue split between educator and platform
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Standard 80/20 Model
                </Badge>
              </div>

              {/* Segmented Ratio Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Teacher Share:{' '}
                    {filteredData.totalStudentPaymentsPaise > 0
                      ? `${Math.round(
                          (filteredData.totalTeacherEarningsPaise /
                            filteredData.totalStudentPaymentsPaise) *
                            100
                        )}%`
                      : '83%'}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                    Platform Fee:{' '}
                    {filteredData.totalStudentPaymentsPaise > 0
                      ? `${Math.round(
                          (filteredData.totalPlatformFeePaise /
                            filteredData.totalStudentPaymentsPaise) *
                            100
                        )}%`
                      : '17%'}
                  </span>
                </div>

                <div className="w-full h-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex p-0.5 gap-0.5">
                  <div
                    className="h-full bg-emerald-500 rounded-lg transition-all duration-500"
                    style={{
                      width: `${
                        filteredData.totalStudentPaymentsPaise > 0
                          ? Math.max(
                              10,
                              Math.round(
                                (filteredData.totalTeacherEarningsPaise /
                                  filteredData.totalStudentPaymentsPaise) *
                                  100
                              )
                            )
                          : 83
                      }%`,
                    }}
                  />
                  <div
                    className="h-full bg-neutral-400 dark:bg-neutral-600 rounded-lg transition-all duration-500"
                    style={{
                      width: `${
                        filteredData.totalStudentPaymentsPaise > 0
                          ? Math.min(
                              90,
                              Math.round(
                                (filteredData.totalPlatformFeePaise /
                                  filteredData.totalStudentPaymentsPaise) *
                                  100
                              )
                            )
                          : 17
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Side-by-Side Comparison Bars */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block uppercase">
                    Teacher Net Share
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 block">
                    {formatRupees(filteredData.totalTeacherEarningsPaise)}
                  </span>
                  <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                    Base educator asking price
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 block uppercase">
                    Platform Fee (20%)
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-neutral-200 block">
                    {formatRupees(filteredData.totalPlatformFeePaise)}
                  </span>
                  <p className="text-[10px] text-neutral-400">
                    20% retained platform fee
                  </p>
                </div>
              </div>
            </div>

            {/* Formula Explanation Pill */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-600 shrink-0" />
              <span>
                <strong>Formula:</strong> Student Paid = Teacher Base Ask + 20% Platform Fee (e.g., ₹1,200 = ₹1,000 + ₹200).
              </span>
            </div>
          </Card>
        </div>

        {/* Withdrawals Status Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-neutral-500 block">
                Pending Withdrawals
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                {formatRupees(filteredData.pendingWithdrawalsPaise)}
              </span>
              <span className="text-[10px] text-neutral-400">In-flight payout requests</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </Card>

          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-neutral-500 block">
                Completed Withdrawals
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                {formatRupees(filteredData.completedWithdrawalsPaise)}
              </span>
              <span className="text-[10px] text-neutral-400">Disbursed to your bank / UPI</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: CURRICULUM & LEARNING ANALYTICS */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary-600" />
            3. Curriculum &amp; Learning Analytics
          </h2>
          <Badge variant="outline" className="text-[10px]">
            Syllabus Completion
          </Badge>
        </div>

        {/* Learning Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold uppercase text-neutral-500 block">
              Overall Content Completion
            </span>
            <span className="text-3xl font-black text-neutral-900 dark:text-white mt-2 block tracking-tight">
              {filteredData.pctCompleted}%
            </span>
            <p className="text-[11px] text-neutral-400 mt-1 font-medium">
              Aggregated across enrolled active students
            </p>
          </Card>

          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold uppercase text-neutral-500 block">
              Lessons Completed
            </span>
            <span className="text-3xl font-black text-neutral-900 dark:text-white mt-2 block tracking-tight">
              {filteredData.completedCount}
            </span>
            <p className="text-[11px] text-neutral-400 mt-1 font-medium">
              out of {filteredData.totalContentItems} uploaded curriculum items
            </p>
          </Card>

          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold uppercase text-neutral-500 block">
              Avg Assessment Score
            </span>
            <span className="text-3xl font-black text-neutral-900 dark:text-white mt-2 block tracking-tight">
              {filteredData.avgQuizScore !== null ? `${filteredData.avgQuizScore}%` : 'N/A'}
            </span>
            <p className="text-[11px] text-neutral-400 mt-1 font-medium">
              {filteredData.avgQuizScore !== null
                ? 'Recorded across evaluated quizzes'
                : 'No quiz attempts recorded yet'}
            </p>
          </Card>
        </div>

        {/* Visuals: Compact Donut Chart + Subject-Wise Progress */}
        {filteredData.totalContentItems === 0 ? (
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-10 text-center shadow-xs">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                No curriculum content uploaded yet
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Upload video lessons, quizzes, and homework in your classroom channel to start tracking real-time student completion rates.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Donut Chart Card */}
            <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                      Content Completion Distribution
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Learner progress ratio across syllabus materials
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Donut View
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
                  {/* Compact SVG Donut Chart */}
                  <div className="relative w-36 h-36 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {/* Background Ring */}
                      <circle
                        cx="50"
                        cy="50"
                        r={donutData.r}
                        fill="transparent"
                        stroke="currentColor"
                        className="text-neutral-100 dark:text-neutral-800"
                        strokeWidth="12"
                      />

                      {/* Remaining Slice */}
                      {donutData.pRem > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={donutData.r}
                          fill="transparent"
                          stroke="#cbd5e1"
                          strokeWidth="12"
                          strokeDasharray={`${donutData.dashRemaining} ${donutData.circumference}`}
                          strokeDashoffset={donutData.offsetRemaining}
                          className="dark:stroke-neutral-700 transition-all duration-500"
                        />
                      )}

                      {/* In Progress Slice */}
                      {donutData.pProg > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={donutData.r}
                          fill="transparent"
                          stroke="#f59e0b"
                          strokeWidth="12"
                          strokeDasharray={`${donutData.dashProgress} ${donutData.circumference}`}
                          strokeDashoffset={donutData.offsetProgress}
                          className="transition-all duration-500"
                        />
                      )}

                      {/* Completed Slice */}
                      {donutData.pComp > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={donutData.r}
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth="12"
                          strokeDasharray={`${donutData.dashCompleted} ${donutData.circumference}`}
                          strokeDashoffset={donutData.offsetCompleted}
                          className="transition-all duration-500"
                        />
                      )}
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-black text-neutral-900 dark:text-white">
                        {donutData.pComp}%
                      </span>
                      <span className="text-[10px] uppercase font-bold text-neutral-400">
                        Covered
                      </span>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div className="space-y-2.5 w-full max-w-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          Completed
                        </span>
                      </div>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                        {filteredData.completedCount} ({donutData.pComp}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/40">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          In Progress
                        </span>
                      </div>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                        {filteredData.inProgressCount} ({donutData.pProg}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-neutral-400 shrink-0" />
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          Remaining
                        </span>
                      </div>
                      <span className="text-xs font-black text-neutral-600 dark:text-neutral-400">
                        {filteredData.remainingCount} ({donutData.pRem}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                Calculated in real-time from active student lesson watch times and test submissions.
              </p>
            </Card>

            {/* Subject-Wise Progress Breakdown Card */}
            <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                      Subject-Wise Completion
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Student syllabus coverage categorized per subject
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Specializations
                  </Badge>
                </div>

                {Object.keys(filteredData.subjectWise).length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 text-xs">
                    No subject progress recorded for current filters.
                  </div>
                ) : (
                  <div className="space-y-3.5 pt-1">
                    {Object.entries(filteredData.subjectWise).map(([subj, data]) => (
                      <div key={subj} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-neutral-900 dark:text-white">{subj}</span>
                          <span className="text-primary-700 dark:text-primary-400 font-extrabold">
                            {data.completedItems} / {data.totalItems} ({data.pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full bg-primary-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, data.pct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                <span>Active Subjects Monitored:</span>
                <span className="font-extrabold text-neutral-900 dark:text-white">
                  {Object.keys(filteredData.subjectWise).length}
                </span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
