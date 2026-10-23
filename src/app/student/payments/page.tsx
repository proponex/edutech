'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/admin/StatusBadge';
import {
  CreditCard,
  Receipt,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { StudentPaymentHistoryItem } from '@/types';

export default function StudentPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<StudentPaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/student/payments');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch payment history.');
      }
      setPayments(data.payments || []);
    } catch (err: any) {
      setError(err.message || 'Error loading transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalSpentRupees = (
    payments
      .filter((p) => p.status === 'paid' || p.status === 'captured')
      .reduce((acc, curr) => acc + curr.amountPaise, 0) / 100
  ).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const activeSubscriptionsCount = payments.filter(
    (p) => p.status === 'paid' || p.status === 'captured'
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-primary-600 mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Student Dashboard</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              My Purchases & Invoices
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Authoritative transaction history and access entitlements verified by Razorpay.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchPayments}
            disabled={loading}
            className="flex items-center gap-1.5 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">Total Spent</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  ₹{totalSpentRupees}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">Active Enrolled Courses</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {activeSubscriptionsCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">Payment Protection</p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Razorpay Verified
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary-500" />
              <span>Purchase History & Official Invoices</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {error && (
              <div className="p-4 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 dark:text-neutral-400 text-[11px] uppercase tracking-wider font-semibold border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Course / Item</th>
                    <th className="py-3 px-4">Package</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment ID / Order</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="py-4 px-4">
                          <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded w-full" />
                        </td>
                      </tr>
                    ))
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-sm">No payment records found</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          When you purchase a course or subscription package, the verified receipt will appear here.
                        </p>
                        <Link href="/student">
                          <Button size="sm" variant="outline" className="mt-4">
                            Browse Available Tutors
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => {
                      const amountFormatted = (p.amountPaise / 100).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      });
                      const dateFormatted = new Date(p.paidAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{p.itemTitle}</span>
                              <Link
                                href={`/channels/${p.itemId}`}
                                className="text-primary-600 hover:text-primary-700"
                                title="View Course"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400 capitalize">
                            {p.packageType ? p.packageType.replace(/_/g, ' ') : 'Standard'}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                            ₹{amountFormatted}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-500">
                            <div>{p.razorpayPaymentId || 'N/A'}</div>
                            <div className="text-[10px] text-neutral-400">Ref: {p.orderId.slice(0, 14)}...</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                p.status === 'paid' || p.status === 'captured'
                                  ? 'success'
                                  : p.status === 'failed'
                                  ? 'error'
                                  : 'warning'
                              }
                              className="text-[10px] font-bold uppercase tracking-wider"
                            >
                              {p.status}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap text-xs">
                            {dateFormatted}
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
      </main>

      <Footer />
    </div>
  );
}
