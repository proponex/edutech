'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/admin/StatCard';
import { SimpleTrendChart } from '@/components/admin/SimpleTrendChart';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Wallet,
  Receipt,
  FileCheck,
  AlertCircle,
  TrendingUp,
  Percent,
  Download,
  Search,
  Filter,
  Eye,
  X,
  Layers,
  BookOpen,
  Calendar,
  Clock,
  User,
  Hash,
} from 'lucide-react';
import { MonetizationScope, SubscriptionDuration } from '@/types';

interface TransactionLedgerItem {
  id: string;
  orderId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  teacherId: string;
  teacherName: string;
  contentTitle: string;
  scope: MonetizationScope;
  subjectName?: string | null;
  unitTitle?: string | null;
  duration: SubscriptionDuration;
  grossAmountPaise: number;
  platformCommissionPaise: number;
  teacherSharePaise: number;
  currency: string;
  paymentStatus: string;
  refundStatus: string;
  entitlementStatus: string;
  expiresAt?: string;
  createdAt: string;
}

interface AnalyticsData {
  totalCapturedRevenuePaise: number;
  platformCommissionPaise: number;
  teacherEarningsPaise: number;
  refundsTotalPaise: number;
  netPlatformRevenuePaise: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  pendingOrdersCount: number;
  activeEntitlementsCount: number;
  dailyRevenue: Array<{ date: string; amountPaise: number; count: number }>;
  transactionsLedger: TransactionLedgerItem[];
}

export default function AdminPaymentsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Detail Modal State
  const [selectedTx, setSelectedTx] = useState<TransactionLedgerItem | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (selectedScope !== 'all') params.set('scope', selectedScope);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);

      const res = await fetch(`/api/admin/payments/analytics?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch payment analytics.');
      }
      setData(json.analytics);
    } catch (err: any) {
      setError(err.message || 'Error loading payment data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedScope, selectedStatus]);

  // Client-side quick filter fallback
  const filteredTransactions = useMemo(() => {
    if (!data?.transactionsLedger) return [];
    let list = data.transactionsLedger;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.studentName.toLowerCase().includes(q) ||
          t.studentEmail.toLowerCase().includes(q) ||
          t.teacherName.toLowerCase().includes(q) ||
          t.contentTitle.toLowerCase().includes(q) ||
          (t.razorpayPaymentId && t.razorpayPaymentId.toLowerCase().includes(q)) ||
          (t.orderId && t.orderId.toLowerCase().includes(q)) ||
          t.id.toLowerCase().includes(q)
      );
    }

    if (selectedScope !== 'all') {
      list = list.filter((t) => t.scope === selectedScope);
    }

    if (selectedStatus !== 'all') {
      list = list.filter((t) => t.paymentStatus === selectedStatus);
    }

    return list;
  }, [data?.transactionsLedger, searchTerm, selectedScope, selectedStatus]);

  // Export CSV
  const exportCSV = () => {
    if (!filteredTransactions.length) return;

    const headers = [
      'Transaction ID',
      'Date',
      'Razorpay Payment ID',
      'Order ID',
      'Student Name',
      'Student Email',
      'Student ID',
      'Teacher Name',
      'Teacher ID',
      'Content Title',
      'Scope',
      'Duration',
      'Gross Amount (INR)',
      'Platform Commission 20% (INR)',
      'Teacher Allocation 80% (INR)',
      'Payment Status',
      'Refund Status',
      'Entitlement Status',
      'Expiry Date',
    ];

    const rows = filteredTransactions.map((tx) => [
      `"${tx.id}"`,
      `"${new Date(tx.createdAt).toISOString()}"`,
      `"${tx.razorpayPaymentId || ''}"`,
      `"${tx.orderId || ''}"`,
      `"${tx.studentName.replace(/"/g, '""')}"`,
      `"${tx.studentEmail}"`,
      `"${tx.studentId}"`,
      `"${tx.teacherName.replace(/"/g, '""')}"`,
      `"${tx.teacherId}"`,
      `"${tx.contentTitle.replace(/"/g, '""')}"`,
      `"${tx.scope}"`,
      `"${tx.duration}"`,
      (tx.grossAmountPaise / 100).toFixed(2),
      (tx.platformCommissionPaise / 100).toFixed(2),
      (tx.teacherSharePaise / 100).toFixed(2),
      `"${tx.paymentStatus}"`,
      `"${tx.refundStatus}"`,
      `"${tx.entitlementStatus}"`,
      `"${tx.expiresAt ? new Date(tx.expiresAt).toISOString() : ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `platform_monetization_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCapturedRevenueRupees = data
    ? (data.totalCapturedRevenuePaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })
    : '0.00';

  const platformCommissionRupees = data
    ? (data.platformCommissionPaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })
    : '0.00';

  const teacherEarningsRupees = data
    ? (data.teacherEarningsPaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })
    : '0.00';

  const refundsTotalRupees = data
    ? (data.refundsTotalPaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })
    : '0.00';

  const netPlatformRevenueRupees = data
    ? (data.netPlatformRevenuePaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Razorpay Connected
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-900 dark:bg-primary-950/80 dark:text-primary-300 border border-primary-300 dark:border-primary-800">
              20% Platform Commission Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Payment Analytics & Transactions
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time ledger of Channel, Subject, and Chapter paid subscriptions, 20% platform commissions, educator payouts, and student entitlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportCSV}
            disabled={!filteredTransactions.length}
            className="flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/admin/pricing">
            <Button size="sm" variant="outline" className="flex items-center gap-1.5">
              <span>Platform Pricing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Captured Gross Sales"
          value={`₹${totalCapturedRevenueRupees}`}
          subtitle={`${data?.successfulPaymentsCount || 0} successful orders`}
          icon={CreditCard}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800"
        />
        <StatCard
          title="Platform Commission (20%)"
          value={`₹${platformCommissionRupees}`}
          subtitle={`Net: ₹${netPlatformRevenueRupees} after refunds`}
          icon={Percent}
          iconColor="text-primary-600 dark:text-primary-400"
          iconBgColor="bg-primary-50 dark:bg-primary-950/80 border-primary-200 dark:border-primary-800"
        />
        <StatCard
          title="Teacher Allocations (80%)"
          value={`₹${teacherEarningsRupees}`}
          subtitle="Educator earnings share"
          icon={Wallet}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800"
        />
        <StatCard
          title="Active Paid Entitlements"
          value={(data?.activeEntitlementsCount || 0).toString()}
          subtitle={`${data?.refundsTotalPaise ? `₹${refundsTotalRupees} refunded` : '0 active refunds'}`}
          icon={ShieldCheck}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBgColor="bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800"
        />
      </div>

      {/* Revenue Trend Chart */}
      {data && data.dailyRevenue && data.dailyRevenue.length > 0 && (
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4">
            <SimpleTrendChart
              data={data.dailyRevenue.map((d) => ({
                date: d.date,
                count: Math.round(d.amountPaise / 100),
              }))}
              title="Daily Captured Revenue Trend"
              subtitle="Daily volume in rupees (₹)"
              mode="single"
            />
          </CardContent>
        </Card>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search student, teacher, order or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Scope:</span>
          </div>
          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          >
            <option value="all">All Levels</option>
            <option value="channel">Channel Only</option>
            <option value="subject">Subject Only</option>
            <option value="chapter">Chapter (Unit) Only</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-neutral-500 ml-2">
            <span>Status:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          >
            <option value="all">All Statuses</option>
            <option value="captured">Captured</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Live Transactions Table */}
      <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
        <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary-500" />
              <span>Financial Ledger & Paid Entitlements</span>
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500 mt-0.5">
              Live database records detailing student payments, educator allocations, 20% platform cut, and entitlement statuses.
            </CardDescription>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {filteredTransactions.length} records found
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 dark:text-neutral-400 text-[11px] uppercase tracking-wider font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Educator</th>
                  <th className="py-3 px-3">Content / Scope</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Gross Sale</th>
                  <th className="py-3 px-3">Platform 20%</th>
                  <th className="py-3 px-3">Teacher 80%</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Entitlement</th>
                  <th className="py-3 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={11} className="py-4 px-4">
                        <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-neutral-400">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-sm">No transaction records match filter</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Try adjusting search term, scope level, or status filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const grossRupees = (tx.grossAmountPaise / 100).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    });
                    const platformRupees = (tx.platformCommissionPaise / 100).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    });
                    const teacherRupees = (tx.teacherSharePaise / 100).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    });
                    const dateStr = new Date(tx.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    const durationLabel =
                      tx.duration === '12_months'
                        ? '12 Mo'
                        : tx.duration === '6_months'
                        ? '6 Mo'
                        : '1 Mo';

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors"
                      >
                        <td className="py-3 px-3 text-neutral-500 whitespace-nowrap text-xs">
                          {dateStr}
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-semibold text-neutral-900 dark:text-white truncate max-w-[140px]">
                            {tx.studentName}
                          </p>
                          <p className="text-[11px] text-neutral-400 font-mono truncate max-w-[140px]">
                            {tx.studentEmail}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[120px]">
                            {tx.teacherName}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase font-bold px-1.5 py-0 ${
                                tx.scope === 'channel'
                                  ? 'border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950/40'
                                  : tx.scope === 'subject'
                                  ? 'border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/40'
                                  : 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                              }`}
                            >
                              {tx.scope}
                            </Badge>
                            <span className="text-xs text-neutral-800 dark:text-neutral-200 truncate max-w-[120px]">
                              {tx.contentTitle}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                          {durationLabel}
                        </td>

                        <td className="py-3 px-3 font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                          ₹{grossRupees}
                        </td>

                        <td className="py-3 px-3 font-semibold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                          ₹{platformRupees}
                        </td>

                        <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          ₹{teacherRupees}
                        </td>

                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              tx.paymentStatus === 'captured'
                                ? 'success'
                                : tx.paymentStatus === 'failed'
                                ? 'error'
                                : 'warning'
                            }
                            className="text-[10px] font-bold uppercase tracking-wider"
                          >
                            {tx.paymentStatus}
                          </Badge>
                        </td>

                        <td className="py-3 px-3">
                          <Badge
                            variant={tx.entitlementStatus === 'active' ? 'success' : 'outline'}
                            className="text-[10px] font-bold uppercase tracking-wider"
                          >
                            {tx.entitlementStatus}
                          </Badge>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedTx(tx)}
                            className="h-7 w-7 p-0"
                            title="View Transaction Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-neutral-500 hover:text-primary-600" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 text-primary-600">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Transaction Audit & Financial Details
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  ID: {selectedTx.id}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              {/* Financial Allocation Box */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Financial Reconciliation
                </span>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-neutral-600 dark:text-neutral-400">Gross Sale Amount:</span>
                  <span className="font-extrabold text-neutral-900 dark:text-white">
                    ₹{(selectedTx.grossAmountPaise / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-primary-600 dark:text-primary-400 font-medium">
                    Platform Commission (20%):
                  </span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">
                    ₹{(selectedTx.platformCommissionPaise / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-neutral-200 dark:border-neutral-700 pt-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Educator Net Share (80%):
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{(selectedTx.teacherSharePaise / 100).toFixed(2)}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 pt-1">
                  Exact minor unit reconciliation: {selectedTx.platformCommissionPaise} + {selectedTx.teacherSharePaise} = {selectedTx.grossAmountPaise} paise.
                </p>
              </div>

              {/* Entitlement & Scope Box */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Purchased Entitlement
                </span>
                <div className="text-xs space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Access Level:</span>
                    <Badge variant="outline" className="uppercase text-[10px] font-bold">
                      {selectedTx.scope}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Item Title:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[180px]">
                      {selectedTx.contentTitle}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Duration:</span>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {selectedTx.duration.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Expiry Date:</span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">
                      {selectedTx.expiresAt
                        ? new Date(selectedTx.expiresAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Active / Not set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Student & Teacher Identities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              <div className="p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Student Information</span>
                </span>
                <p className="text-sm font-bold text-neutral-900 dark:text-white pt-1">
                  {selectedTx.studentName}
                </p>
                <p className="text-xs text-neutral-500 font-mono">{selectedTx.studentEmail}</p>
                <p className="text-[10px] text-neutral-400 font-mono">ID: {selectedTx.studentId}</p>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Educator Payee</span>
                </span>
                <p className="text-sm font-bold text-neutral-900 dark:text-white pt-1">
                  {selectedTx.teacherName}
                </p>
                <p className="text-[10px] text-neutral-400 font-mono">ID: {selectedTx.teacherId}</p>
              </div>
            </div>

            {/* Payment Provider Identifiers */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Razorpay Payment ID:</span>
                <span className="text-neutral-900 dark:text-white font-bold">{selectedTx.razorpayPaymentId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Razorpay Order ID:</span>
                <span className="text-neutral-700 dark:text-neutral-300">{selectedTx.razorpayOrderId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Internal Order ID:</span>
                <span className="text-neutral-700 dark:text-neutral-300">{selectedTx.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Recorded At:</span>
                <span className="text-neutral-700 dark:text-neutral-300">{new Date(selectedTx.createdAt).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedTx(null)} size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
