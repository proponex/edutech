'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { PrepnxFooter } from '@/components/student/PrepnxFooter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Calendar,
  Tv,
  ArrowRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { StudentPaymentHistoryItem, ChannelSubscription, ChannelItem, Profile } from '@/types';

interface ActiveSubscriptionItem {
  subscription: ChannelSubscription;
  channel: ChannelItem | null;
  teacher: Profile | null;
  progress: { total: number; completed: number; percentage: number };
}

export default function StudentPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<StudentPaymentHistoryItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<ActiveSubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
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
      setSubscriptions(data.subscriptions || []);
    } catch (err: any) {
      setError(err.message || 'Error loading transactions.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const totalSpentRupees = (
    payments
      .filter((p) => p.status === 'paid' || p.status === 'captured')
      .reduce((acc, curr) => acc + curr.amountPaise, 0) / 100
  ).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const activeSubscriptionsCount = subscriptions.length;

  const getDaysRemaining = (expiresAt?: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="prepnx-student-theme min-h-screen flex flex-col bg-[#FAF9FF] text-[#17133A] font-sans">
      <Header />

      <main className="flex-1 w-[92%] sm:w-[92%] md:w-[90%] max-w-[1440px] mx-auto py-8 space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E9DDF8]">
          <div>
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68647D] hover:text-[#9333EA] mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Student Dashboard</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17133A] font-display flex items-center gap-2.5">
              <span>My Subscriptions &amp; Purchases</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#F3E8FF] text-[#9333EA] font-bold border border-[#E9DDF8]">
                28-Day Cycle Access
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#68647D] mt-1">
              Active channel access entitlements and transaction history verified by Razorpay.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchPayments}
            disabled={loading}
            className="flex items-center gap-1.5 self-start sm:self-center border-[#E9DDF8] bg-white hover:bg-[#F3E8FF] hover:border-[#9333EA]/40 text-[#68647D] hover:text-[#9333EA] rounded-xl font-medium shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#9333EA]' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* DEDICATED RENEWAL REMINDER CARD (SHOWS WHEN EXPIRING IN <= 7 DAYS OR EXPIRED) */}
        {(() => {
          const urgentSub = subscriptions.find((item) => {
            const d = getDaysRemaining(item.subscription.expires_at);
            return d !== null && d <= 7;
          });
          if (!urgentSub || !urgentSub.channel) return null;

          const days = getDaysRemaining(urgentSub.subscription.expires_at);
          const isExpired = days !== null && days < 0;
          const expiryFormatted = urgentSub.subscription.expires_at
            ? new Date(urgentSub.subscription.expires_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'End of Cycle';

          return (
            <div
              className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${
                isExpired
                  ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                    isExpired ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  <Clock className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isExpired
                          ? 'bg-rose-200 text-rose-800'
                          : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      {isExpired
                        ? 'Subscription Expired'
                        : days === 0
                        ? 'Expires Today'
                        : `Expires in ${days} Days`}
                    </span>
                    <span className="text-xs text-[#68647D] font-medium">
                      Valid until: {expiryFormatted}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-[#17133A] truncate font-display">
                    {urgentSub.channel.name}
                    {urgentSub.subscription.subject_name ? ` • ${urgentSub.subscription.subject_name}` : ''}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#68647D] max-w-xl leading-relaxed">
                    {isExpired
                      ? 'Your 28-day cycle has expired. Complete payment now to reactivate instant streaming and quiz access.'
                      : 'Renew now to add 28 full days to your existing cycle. Early renewal never loses remaining days.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                <Link href={`/channels/${urgentSub.channel.id}?action=subscribe`}>
                  <Button
                    size="md"
                    className={`font-extrabold px-6 py-2.5 rounded-xl shadow-md text-white cursor-pointer ${
                      isExpired
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                        : 'bg-[#9333EA] hover:bg-[#7E22CE] shadow-purple-600/20'
                    }`}
                  >
                    <span>{isExpired ? 'Pay Now & Reactivate' : 'Renew Now (+28 Days)'}</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* SECTION 1: ACTIVE SUBSCRIPTIONS CARDS                                     */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#17133A] font-display flex items-center gap-2">
                <span>Active Subscriptions</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#9333EA] border border-[#E9DDF8]">
                  {subscriptions.length}
                </span>
              </h2>
              <p className="text-xs text-[#68647D]">
                Each subject or channel subscription remains active for 28 days from payment date.
              </p>
            </div>
            <Link href="/student?tab=channels">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold border-[#E9DDF8] hover:bg-[#F3E8FF] hover:border-[#9333EA] text-[#9333EA] rounded-xl"
              >
                Browse All Channels
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 bg-white border border-[#E9DDF8] rounded-3xl p-6 animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-[#F3E8FF] rounded-2xl" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-[#F3E8FF] rounded w-3/4" />
                      <div className="h-3 bg-[#F3E8FF] rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-2 bg-[#F3E8FF] rounded w-full" />
                  <div className="h-9 bg-[#F3E8FF] rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : subscriptions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptions.map(({ subscription, channel, teacher, progress }) => {
                if (!channel) return null;
                const daysLeft = getDaysRemaining(subscription.expires_at);
                const expiryDateFormatted = subscription.expires_at
                  ? new Date(subscription.expires_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Active (28 days)';

                const isExpiringSoon = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;
                const isExpired = daysLeft !== null && daysLeft < 0;

                return (
                  <div
                    key={subscription.id}
                    className="border border-[#E9DDF8] bg-white rounded-3xl p-6 shadow-xs hover:shadow-md hover:border-[#9333EA]/40 transition-all flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-4">
                      {/* Top Channel Header */}
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#F3E8FF] border border-[#E9DDF8] shrink-0 flex items-center justify-center">
                          {teacher?.photo_url || channel.photo_url ? (
                            <Image
                              src={teacher?.photo_url || channel.photo_url!}
                              alt={teacher?.name || channel.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <Tv className="w-8 h-8 text-[#9333EA]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#9333EA] border border-[#E9DDF8]">
                              {subscription.package_type ? subscription.package_type.replace(/_/g, ' ') : 'Full Channel'}
                            </span>
                            {isExpired ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                Expired
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Expires soon
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                                Active
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-extrabold text-[#17133A] truncate">
                            {channel.name}
                          </h3>
                          <p className="text-xs text-[#68647D] truncate mt-0.5">
                            By {teacher?.name || 'Educator'}
                            {subscription.subject_name ? ` • ${subscription.subject_name}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Expiry Details Box */}
                      <div className="p-3.5 rounded-2xl bg-[#FAF9FF] border border-[#E9DDF8] space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#68647D] font-medium flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#9333EA]" />
                            <span>Validity:</span>
                          </span>
                          <span className="font-bold text-[#17133A]">
                            {expiryDateFormatted}
                          </span>
                        </div>
                        {daysLeft !== null && daysLeft >= 0 && (
                          <div className="text-[11px] text-right text-[#9333EA] font-semibold">
                            {daysLeft === 0 ? 'Expires today' : `${daysLeft} days remaining in cycle`}
                          </div>
                        )}
                      </div>

                      {/* Learning Progress */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-[#68647D]">Syllabus Progress</span>
                          <span className="text-[#9333EA] font-bold">
                            {progress?.percentage || 0}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#F3E8FF] rounded-full overflow-hidden border border-[#E9DDF8]">
                          <div
                            className="h-full bg-[#9333EA] rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(progress?.percentage || 0, 3)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-[#E9DDF8] flex items-center gap-2.5">
                      <Link href={`/channels/${channel.id}`} className="flex-1">
                        <Button
                          size="sm"
                          className="w-full font-bold shadow-xs bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl py-2"
                        >
                          <span>Enter Classroom</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                      <Link href={`/channels/${channel.id}?action=subscribe`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-semibold border-[#E9DDF8] text-[#9333EA] hover:bg-[#F3E8FF] rounded-xl px-3 py-2 text-xs"
                          title="Renew or extend 28-day subscription"
                        >
                          Renew
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-[#E9DDF8] bg-white rounded-3xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-[#F3E8FF] text-[#9333EA] border border-[#E9DDF8] flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#17133A] font-display">
                  No Active Channel Subscriptions
                </h3>
                <p className="text-xs sm:text-sm text-[#68647D] max-w-md mx-auto leading-relaxed">
                  You do not have any active 28-day subscriptions yet. Browse teacher channels to unlock full subject chapters, study resources, and quizzes.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <Link href="/student?tab=channels">
                  <Button size="md" className="font-bold shadow-sm bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Explore Channels
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: PURCHASE HISTORY & INVOICES TABLE                             */}
        {/* ========================================================================= */}
        <div className="border border-[#E9DDF8] bg-white rounded-3xl overflow-hidden shadow-xs">
          <div className="border-b border-[#E9DDF8] px-6 py-4.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#17133A] font-display">
                  Purchases &amp; Invoices
                </h3>
                <p className="text-xs text-[#68647D]">
                  Every payment is verified and cleared with an official Razorpay payment ID.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FAF9FF] border border-[#E9DDF8] text-[#68647D] self-start sm:self-auto">
              {payments.length} {payments.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F3E8FF]/60 text-[#68647D] text-[11px] uppercase tracking-wider font-bold border-b border-[#E9DDF8]">
                <tr>
                  <th className="py-3.5 px-5">Course / Item</th>
                  <th className="py-3.5 px-4">Package</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Payment ID / Order</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9DDF8]">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="py-4 px-5">
                        <div className="h-6 bg-[#F3E8FF] rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#68647D]">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#9333EA]" />
                      <p className="font-semibold text-sm text-[#17133A]">No payment records found</p>
                      <p className="text-xs text-[#68647D] mt-1">
                        When you purchase a course or subscription package, the verified receipt will appear here.
                      </p>
                      <Link href="/student?tab=channels">
                        <Button size="sm" variant="outline" className="mt-4 border-[#E9DDF8] hover:bg-[#F3E8FF] text-[#9333EA] rounded-xl font-medium">
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

                    const isSuccess = p.status === 'paid' || p.status === 'captured';
                    const isFailed = p.status === 'failed';

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-[#FAF9FF] transition-colors"
                      >
                        <td className="py-4 px-5 font-semibold text-[#17133A]">
                          <div className="flex items-center gap-2">
                            <span>{p.itemTitle}</span>
                            <Link
                              href={`/channels/${p.itemId}`}
                              className="text-[#9333EA] hover:text-[#7E22CE]"
                              title="View Course"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-[#68647D] capitalize font-medium">
                          {p.packageType ? p.packageType.replace(/_/g, ' ') : 'Standard'}
                        </td>

                        <td className="py-4 px-4 font-extrabold text-[#17133A]">
                          ₹{amountFormatted}
                        </td>

                        <td className="py-4 px-4 font-mono text-[11px] text-[#68647D]">
                          <div className="text-[#17133A] font-semibold">{p.razorpayPaymentId || 'N/A'}</div>
                          <div className="text-[10px] text-[#68647D]/70">Ref: {p.orderId.slice(0, 14)}...</div>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isSuccess
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isFailed
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {isSuccess && <CheckCircle2 className="w-3 h-3 mr-1 text-[#10B981]" />}
                            {p.status}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-[#68647D] whitespace-nowrap text-xs">
                          {dateFormatted}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <PrepnxFooter />
    </div>
  );
}
