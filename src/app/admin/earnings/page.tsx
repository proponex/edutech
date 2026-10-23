'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/admin/StatCard';
import {
  Wallet,
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  Lock,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { AdminPaymentAnalytics } from '@/types';

export default function AdminTeacherEarningsPage() {
  const [analytics, setAnalytics] = useState<AdminPaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments/analytics');
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data.analytics);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const totalRevenueRupees = analytics
    ? (analytics.totalCapturedRevenuePaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })
    : '0.00';

  const platformCommissionRupees = analytics
    ? (analytics.platformCommissionPaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })
    : '0.00';

  const teacherEarningsRupees = analytics
    ? (analytics.teacherEarningsPaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
              Commission Ledger
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Teacher Earnings & Commission Splitting
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Authoritative educator revenue attribution, platform commission deduction, and payout balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          <Link href="/admin/teachers">
            <Button size="sm" variant="outline" className="flex items-center gap-1.5">
              <span>View Teachers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Gross Course Collections"
          value={`₹${totalRevenueRupees}`}
          subtitle="Total student payments captured"
          icon={Wallet}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800"
        />
        <StatCard
          title="Platform Commission (20%)"
          value={`₹${platformCommissionRupees}`}
          subtitle="Platform operational fee retained"
          icon={Percent}
          iconColor="text-primary-600 dark:text-primary-400"
          iconBgColor="bg-primary-50 dark:bg-primary-950/80 border-primary-200 dark:border-primary-800"
        />
        <StatCard
          title="Educator Net Share (80%)"
          value={`₹${teacherEarningsRupees}`}
          subtitle="Allocated teacher payable balance"
          icon={TrendingUp}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBgColor="bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800"
        />
      </div>

      {/* Mechanics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary-500" />
              Commission Formulation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
            <p>
              Each course purchase calculates the teacher revenue share automatically:
            </p>
            <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
              Teacher Share = Gross Amount &times; 80%
            </div>
            <p>
              Platform retains 20% commission for hosting, video streaming, payment processing, and infrastructure.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Settlement Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
            <p>
              Earnings are attributed strictly upon verified Razorpay payment capture or webhook receipt.
            </p>
            <p>
              Failed or disputed payments never enter the educator cleared balance, guaranteeing financial integrity.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              Teacher Payout Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
            <p>
              Per project security policy, automatic bank transfers are disabled.
            </p>
            <p>
              Educator withdrawal requests require administrative review and audit logging before disbursement.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Sales Attribution */}
      {analytics && analytics.courseSales.length > 0 && (
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary-500" />
              <span>Course-wise Sales & Earnings Attribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 text-[11px] uppercase tracking-wider font-semibold border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Course ID</th>
                    <th className="py-3 px-4">Paid Enrollments</th>
                    <th className="py-3 px-4">Gross Collections</th>
                    <th className="py-3 px-4">Platform Fee (20%)</th>
                    <th className="py-3 px-4">Teacher Share (80%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                  {analytics.courseSales.map((cs) => {
                    const gross = cs.totalPaise / 100;
                    const platform = gross * 0.2;
                    const teacher = gross * 0.8;
                    return (
                      <tr key={cs.courseId} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                          {cs.courseId}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white">
                          {cs.count}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                          ₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600 font-semibold">
                          ₹{platform.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-indigo-600 font-semibold">
                          ₹{teacher.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
