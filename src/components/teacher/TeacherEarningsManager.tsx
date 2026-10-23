'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  CreditCard,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  BookOpen,
  Layers,
  Tv,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TeacherMonetizationOverview, MonetizationScope, SubscriptionDuration } from '@/types';

export function TeacherEarningsManager() {
  const [overview, setOverview] = useState<TeacherMonetizationOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterScope, setFilterScope] = useState<string>('all');
  const [filterDuration, setFilterDuration] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teacher/monetization');
      const data = await res.json();
      if (res.ok && data.overview) {
        setOverview(data.overview);
      }
    } catch (err) {
      console.error('Error loading teacher earnings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const grossSalesRupees = overview
    ? (overview.grossSalesPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '0.00';

  const platformCommissionRupees = overview
    ? (overview.platformCommissionPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '0.00';

  const netEarningsRupees = overview
    ? (overview.netTeacherEarningsPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '0.00';

  const pendingRupees = overview
    ? (overview.pendingEarningsPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '0.00';

  const paidOutRupees = overview
    ? (overview.paidOutEarningsPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '0.00';

  // Filter transactions
  const transactions = (overview?.recentTransactions || []).filter((tx) => {
    if (filterScope !== 'all' && tx.scope !== filterScope) return false;
    if (filterDuration !== 'all' && tx.duration !== filterDuration) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = tx.studentName?.toLowerCase().includes(term);
      const matchEmail = tx.studentEmail?.toLowerCase().includes(term);
      const matchOrder = tx.orderId?.toLowerCase().includes(term);
      const matchTitle = (tx.channelName || tx.unitTitle || tx.subjectName || '').toLowerCase().includes(term);
      if (!matchName && !matchEmail && !matchOrder && !matchTitle) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Financial Ledger
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            Teacher Earnings &amp; Revenue Overview
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time statement of student subscription collections, 20% platform commission, and your 80% net earnings share.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchOverview}
          disabled={loading}
          className="flex items-center gap-1.5 self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <Card className="rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Gross Sales
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-950 dark:text-white font-display">
              ₹{grossSalesRupees}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Total student subscription payments captured
            </p>
          </div>
        </Card>

        {/* Platform Commission (20%) */}
        <Card className="rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Platform Fee (20%)
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/60 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary-600 dark:text-primary-400 font-display">
              ₹{platformCommissionRupees}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Hosting, video streaming &amp; payment gateway fee
            </p>
          </div>
        </Card>

        {/* Net Teacher Earnings (80%) */}
        <Card className="rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Net Teacher Earnings (80%)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-display">
              ₹{netEarningsRupees}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Your 80% educator allocation credited to balance
            </p>
          </div>
        </Card>

        {/* Active Subscriptions Count */}
        <Card className="rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Active Entitlements
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-display">
              {overview?.activeSubscriptions || 0}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Currently active student access passes
            </p>
          </div>
        </Card>
      </div>

      {/* Revenue Breakdown by Scope & Duration */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue by Scope */}
          <Card className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-500" />
              <CardTitle className="text-base font-bold text-neutral-900 dark:text-white">
                Revenue by Monetization Level
              </CardTitle>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-primary-500" />
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Channel Subscriptions
                  </span>
                </div>
                <strong className="text-neutral-900 dark:text-white font-mono">
                  ₹{(overview.revenueByScope.channelPaise / 100).toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Subject Subscriptions
                  </span>
                </div>
                <strong className="text-neutral-900 dark:text-white font-mono">
                  ₹{(overview.revenueByScope.subjectPaise / 100).toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Chapter Subscriptions
                  </span>
                </div>
                <strong className="text-neutral-900 dark:text-white font-mono">
                  ₹{(overview.revenueByScope.chapterPaise / 100).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </Card>

          {/* Revenue by Duration */}
          <Card className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <CardTitle className="text-base font-bold text-neutral-900 dark:text-white">
                Revenue by Subscription Duration
              </CardTitle>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Monthly Subscriptions (1 Month)
                </span>
                <strong className="text-neutral-900 dark:text-white font-mono">
                  ₹{(overview.revenueByDuration.monthlyPaise / 100).toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Six-Month Subscriptions (6 Months)
                </span>
                <strong className="text-neutral-900 dark:text-white font-mono">
                  ₹{(overview.revenueByDuration.sixMonthPaise / 100).toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Yearly Subscriptions (12 Months)
                </span>
                <strong className="text-neutral-900 dark:text-white font-mono">
                  ₹{(overview.revenueByDuration.yearlyPaise / 100).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filterable Transactions Ledger */}
      <Card className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-800/80 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-neutral-950 dark:text-white">
                Recent Purchase Transactions
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Immutable record of verified student payments and your 80% revenue share.
              </CardDescription>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search student or order..."
                  className="pl-8 text-xs h-9 w-44 sm:w-56"
                />
              </div>

              <select
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 h-9"
              >
                <option value="all">All Scopes</option>
                <option value="channel">Channel</option>
                <option value="subject">Subject</option>
                <option value="chapter">Chapter</option>
              </select>

              <select
                value={filterDuration}
                onChange={(e) => setFilterDuration(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 h-9"
              >
                <option value="all">All Durations</option>
                <option value="1_month">1 Month</option>
                <option value="6_months">6 Months</option>
                <option value="12_months">12 Months</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-10 text-center text-xs text-neutral-500">
              No matching purchase transactions found for this educator account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-neutral-50/80 dark:bg-neutral-950 text-neutral-500 text-[11px] uppercase tracking-wider font-semibold border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Content Scope</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Gross Sale</th>
                    <th className="py-3 px-4">Platform (20%)</th>
                    <th className="py-3 px-4 font-bold text-emerald-600">Your Share (80%)</th>
                    <th className="py-3 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white">
                        <div>{tx.studentName}</div>
                        {tx.studentEmail && (
                          <div className="text-[10px] text-neutral-400 font-normal">{tx.studentEmail}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900 dark:text-white text-xs">
                          {tx.scope === 'channel'
                            ? tx.channelName || 'Full Channel'
                            : tx.scope === 'subject'
                            ? tx.subjectName || 'Subject'
                            : tx.unitTitle || 'Chapter'}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400">
                          {tx.scope}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px] py-0.5">
                          {tx.duration.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        ₹{(tx.grossAmountPaise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-500">
                        ₹{(tx.platformCommissionPaise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{(tx.teacherSharePaise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Badge variant="success" className="text-[10px]">
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
