'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Filter,
  RefreshCw,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Percent,
  Layers,
  GraduationCap,
  Tv,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  Search,
} from 'lucide-react';
import { PaymentAnalyticsReport, PaymentAnalyticsFilters } from '@/types';

export default function AdminPaymentAnalyticsPage() {
  const [report, setReport] = useState<PaymentAnalyticsReport | null>(null);
  const [filterOptions, setFilterOptions] = useState<{
    teachers: Array<{ id: string; name: string }>;
    channels: Array<{ id: string; name: string }>;
  }>({ teachers: [], channels: [] });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Master Filters State
  const [dateRange, setDateRange] = useState<PaymentAnalyticsFilters['dateRange']>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [teacherId, setTeacherId] = useState('all');
  const [studentId, setStudentId] = useState('');
  const [channelId, setChannelId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState<PaymentAnalyticsFilters['paymentStatus']>('all');
  const [payoutStatus, setPayoutStatus] = useState<PaymentAnalyticsFilters['payoutStatus']>('all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentAnalyticsFilters['paymentMethod']>('all');

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('dateRange', dateRange);
      if (dateRange === 'custom') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }
      if (teacherId !== 'all') params.set('teacherId', teacherId);
      if (studentId.trim()) params.set('studentId', studentId.trim());
      if (channelId !== 'all') params.set('channelId', channelId);
      if (paymentStatus && paymentStatus !== 'all') params.set('paymentStatus', paymentStatus);
      if (payoutStatus && payoutStatus !== 'all') params.set('payoutStatus', payoutStatus);
      if (paymentMethod && paymentMethod !== 'all') params.set('paymentMethod', paymentMethod);

      const res = await fetch(`/api/admin/analytics?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setReport(json.report);
        if (json.filterOptions) {
          setFilterOptions(json.filterOptions);
        }
      }
    } catch (err) {
      console.error('Failed to load payment analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, startDate, endDate, teacherId, studentId, channelId, paymentStatus, payoutStatus, paymentMethod]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleClearFilters = () => {
    setDateRange('30d');
    setStartDate('');
    setEndDate('');
    setTeacherId('all');
    setStudentId('');
    setChannelId('all');
    setPaymentStatus('all');
    setPayoutStatus('all');
    setPaymentMethod('all');
  };

  const formatRupees = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const summary = report?.summary;
  const charts = report?.charts;

  // Max value in daily timeline for scaling bars
  const maxDailyRevenue = Math.max(
    1,
    ...(charts?.revenueOverTime.map((d) => d.revenuePaise) || [1])
  );

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
              Tab 2 &bull; Financial Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
            Payment Analytics & Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time financial analytics, revenue over time, fee breakdowns, and educator leaderboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs shadow-xs hover:border-primary-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Analytics'}</span>
          </Button>
        </div>
      </div>

      {/* MASTER FILTER BAR */}
      <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
                Master Filter Console
              </span>
            </div>
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-primary-700 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>

          {/* Date Range Presets */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
              Time Period
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom Range' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDateRange(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dateRange === p.id
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Range Inputs */}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-400 font-medium">From:</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-400 font-medium">To:</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Multi-parameter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {/* Teacher Dropdown */}
            <div>
              <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                Teacher
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full h-9 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs px-2.5 text-neutral-900 dark:text-white"
              >
                <option value="all">All Teachers</option>
                {filterOptions.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Channel Dropdown */}
            <div>
              <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                Channel
              </label>
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full h-9 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs px-2.5 text-neutral-900 dark:text-white"
              >
                <option value="all">All Channels</option>
                {filterOptions.channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Status Dropdown */}
            <div>
              <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full h-9 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs px-2.5 text-neutral-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="captured">Captured (Success)</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Payout Status Dropdown */}
            <div>
              <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                Payout Status
              </label>
              <select
                value={payoutStatus}
                onChange={(e) => setPayoutStatus(e.target.value as any)}
                className="w-full h-9 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs px-2.5 text-neutral-900 dark:text-white"
              >
                <option value="all">All Payouts</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-9 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs px-2.5 text-neutral-900 dark:text-white"
              >
                <option value="all">All Methods</option>
                <option value="upi">UPI</option>
                <option value="card">Cards</option>
                <option value="netbanking">Net Banking</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Volume */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-neutral-400 block">Total Volume</span>
          <span className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-1 block">
            {loading ? '...' : formatRupees(summary?.totalRevenuePaise || 0)}
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">
            {summary?.successfulTransactionsCount || 0} successful orders
          </span>
        </Card>

        {/* Platform Fee */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-primary-700 dark:text-primary-400 block">Platform Fee</span>
          <span className="text-xl sm:text-2xl font-black text-primary-700 dark:text-primary-400 mt-1 block">
            {loading ? '...' : formatRupees(summary?.platformIncomePaise || 0)}
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">20% Platform surcharge</span>
        </Card>

        {/* Teacher Earnings */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block">Teacher Earnings</span>
          <span className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-1 block">
            {loading ? '...' : formatRupees(summary?.teacherEarningsPaise || 0)}
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">Educator net earnings</span>
        </Card>

        {/* Success Rate */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block">Success Rate</span>
          <span className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-1 block">
            {loading ? '...' : `${summary?.successRatePercent || 100}%`}
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">
            Avg Order: {formatRupees(summary?.averageTransactionValuePaise || 0)}
          </span>
        </Card>
      </div>

      {/* CHARTS SECTION 1: REVENUE & EARNINGS OVER TIME */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Revenue Over Time Timeline */}
        <Card className="lg:col-span-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-neutral-900 dark:text-white">
                  Revenue Over Time
                </CardTitle>
                <p className="text-xs text-neutral-500">
                  Daily captured revenue and 20% platform commission split
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-600" /> Total Volume
                </span>
                <span className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-800" /> Platform Fee
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!charts?.revenueOverTime || charts.revenueOverTime.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-neutral-400">
                No transaction timeline points in the selected range.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-56 flex items-end gap-2 pt-6">
                  {charts.revenueOverTime.map((pt, i) => {
                    const heightPercent = Math.max(8, Math.round((pt.revenuePaise / maxDailyRevenue) * 100));
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative"
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-neutral-950 text-white text-[10px] p-1.5 rounded-lg whitespace-nowrap shadow-lg">
                          <span>{pt.date}</span>
                          <span className="font-bold text-primary-400">{formatRupees(pt.revenuePaise)}</span>
                        </div>

                        {/* Bar */}
                        <div
                          className="w-full max-w-[40px] bg-neutral-100 dark:bg-neutral-800 rounded-t-lg overflow-hidden flex flex-col justify-end"
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div
                            className="w-full bg-primary-600 group-hover:bg-primary-500 transition-colors"
                            style={{ height: '83%' }}
                          />
                          <div
                            className="w-full bg-primary-800 group-hover:bg-primary-700 transition-colors"
                            style={{ height: '17%' }}
                          />
                        </div>

                        {/* Date label */}
                        <span className="text-[10px] text-neutral-400 truncate max-w-[48px]">
                          {pt.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts 4 & 5: Payouts & Success Distribution */}
        <div className="space-y-6">
          {/* Chart 4: Pending vs Completed Payouts */}
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs">
            <CardHeader className="pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-extrabold text-neutral-900 dark:text-white">
                Disbursement Clearance
              </CardTitle>
              <p className="text-[11px] text-neutral-500">
                Pending educator share vs. completed disbursements
              </p>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {(() => {
                const pending = charts?.payoutStatusBreakdown.pendingPaise || 0;
                const completed = charts?.payoutStatusBreakdown.completedPaise || 0;
                const total = pending + completed;
                const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
                const pendingPct = total > 0 ? 100 - completedPct : 0;

                return (
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    <div className="w-full h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex">
                      <div
                        className="bg-primary-600 h-full transition-all"
                        style={{ width: `${completedPct}%` }}
                        title={`Completed: ${completedPct}%`}
                      />
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${pendingPct}%` }}
                        title={`Pending: ${pendingPct}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary-600" />
                          <span className="text-neutral-500">Completed Payouts</span>
                        </div>
                        <span className="font-extrabold text-neutral-900 dark:text-white block mt-0.5">
                          {formatRupees(completed)} ({completedPct}%)
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-neutral-500">Pending Money</span>
                        </div>
                        <span className="font-extrabold text-amber-700 dark:text-amber-400 block mt-0.5">
                          {formatRupees(pending)} ({pendingPct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Chart 5: Success vs Failure */}
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs">
            <CardHeader className="pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-extrabold text-neutral-900 dark:text-white">
                Payment Success vs Failure
              </CardTitle>
              <p className="text-[11px] text-neutral-500">
                Razorpay payment gateway attempt outcomes
              </p>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-sm border border-primary-200 dark:border-primary-800">
                    {charts?.paymentStatusBreakdown.success || 0}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block">Captured</span>
                    <span className="text-[10px] text-neutral-400">Successful checkouts</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-sm border border-rose-200 dark:border-rose-800">
                    {charts?.paymentStatusBreakdown.failed || 0}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block">Failed</span>
                    <span className="text-[10px] text-neutral-400">Declined attempts</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CHARTS SECTION 2: LEADERBOARDS (TOP TEACHERS & TOP CHANNELS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 6: Top Teachers by Revenue */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary-600" />
              <CardTitle className="text-base font-extrabold text-neutral-900 dark:text-white">
                Top Teachers by Revenue
              </CardTitle>
            </div>
            <p className="text-xs text-neutral-500">
              Ranked by gross student subscription payments received
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {!charts?.topTeachers || charts.topTeachers.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No educator earnings recorded in selected range.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {charts.topTeachers.map((t, idx) => (
                  <div
                    key={t.teacherId}
                    className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary-50 dark:bg-primary-950 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                          {t.teacherName}
                        </h4>
                        <span className="text-[10px] text-neutral-400">
                          {t.studentCount} student subscriber(s)
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-neutral-900 dark:text-white block">
                        {formatRupees(t.revenuePaise)}
                      </span>
                      <span className="text-[10px] text-primary-700 dark:text-primary-400">
                        Teacher: {formatRupees(Math.round(t.revenuePaise / 1.20))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 7: Top Channels by Revenue */}
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-primary-600" />
              <CardTitle className="text-base font-extrabold text-neutral-900 dark:text-white">
                Top Channels by Revenue
              </CardTitle>
            </div>
            <p className="text-xs text-neutral-500">
              Ranked by total subscriber subscription volume
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {!charts?.topChannels || charts.topChannels.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No channel subscription revenue recorded in selected range.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {charts.topChannels.map((c, idx) => (
                  <div
                    key={c.channelId}
                    className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary-50 dark:bg-primary-950 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                          {c.channelName}
                        </h4>
                        <span className="text-[10px] text-neutral-400">
                          Educator: {c.teacherName} &bull; {c.subscriberCount} sub(s)
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-neutral-900 dark:text-white block">
                        {formatRupees(c.revenuePaise)}
                      </span>
                      <span className="text-[10px] text-primary-700 dark:text-primary-400">
                        Platform Fee: {formatRupees(c.revenuePaise - Math.round(c.revenuePaise / 1.20))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
