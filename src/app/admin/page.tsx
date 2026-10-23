'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/admin/StatCard';
import { SimpleTrendChart } from '@/components/admin/SimpleTrendChart';
import {
  Users,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  BookOpen,
  FileQuestion,
  UserCheck,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Lock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AdminOverviewStats, DateFilterOption, ActivityLogItem } from '@/types';

export default function AdminOverviewDashboard() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (filter: DateFilterOption) => {
    try {
      setRefreshing(true);
      const [statsRes, activityRes] = await Promise.all([
        fetch(`/api/admin/overview?filter=${filter}`),
        fetch(`/api/admin/activity?limit=6`),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivities(activityData.activities || []);
      }
    } catch (err) {
      console.error('Failed to load admin overview data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(dateFilter);
  }, [dateFilter, loadData]);

  const handleFilterChange = (newFilter: DateFilterOption) => {
    setDateFilter(newFilter);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 dark:bg-primary-950/80 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              Central Control Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Platform Overview
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time operational monitoring of students, educators, parents, academic courses, and enrollments.
          </p>
        </div>

        {/* Date Filter & Refresh Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-neutral-400 ml-2 mr-1" />
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleFilterChange(opt.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  dateFilter === opt.id
                    ? 'bg-primary-500 text-neutral-950 font-semibold shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => loadData(dateFilter)}
            disabled={refreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* 1. USER ROLE STATISTICS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-500" />
            User Ecosystem
          </h2>
          <span className="text-xs text-neutral-400">Lifetime verified records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Students"
            value={stats?.totalStudents ?? 0}
            subtitle={`+${stats?.newStudentsThisMonth ?? 0} registered this month`}
            icon={Users}
            iconBgColor="bg-primary-50 dark:bg-primary-950/80 border-primary-200 dark:border-primary-800"
            iconColor="text-primary-600 dark:text-primary-400"
            loading={loading}
          />
          <StatCard
            title="Total Teachers"
            value={stats?.totalTeachers ?? 0}
            subtitle={`+${stats?.newTeachersThisMonth ?? 0} registered this month`}
            icon={GraduationCap}
            iconBgColor="bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800"
            iconColor="text-indigo-600 dark:text-indigo-400"
            loading={loading}
          />
          <StatCard
            title="Total Parents"
            value={stats?.totalParents ?? 0}
            subtitle={`${stats?.distinctLinkedStudents ?? 0} distinct students linked`}
            icon={HeartHandshake}
            iconBgColor="bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800"
            iconColor="text-amber-600 dark:text-amber-400"
            loading={loading}
          />
          <StatCard
            title="Administrators"
            value={stats?.totalAdmins ?? 1}
            subtitle="Security & Super Admin level"
            icon={ShieldCheck}
            iconBgColor="bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800"
            iconColor="text-emerald-600 dark:text-emerald-400"
            loading={loading}
          />
        </div>
      </div>

      {/* 2. EDUCATIONAL & LEARNING METRICS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            Curriculum & Learning Performance
          </h2>
          <span className="text-xs text-neutral-400">Content & learner activity</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Courses"
            value={stats?.totalCourses ?? 0}
            subtitle={`${stats?.publishedCourses ?? 0} published, ${stats?.draftCourses ?? 0} draft`}
            icon={BookOpen}
            iconBgColor="bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800"
            iconColor="text-emerald-600 dark:text-emerald-400"
            loading={loading}
          />
          <StatCard
            title="Exams & Quizzes"
            value={stats?.totalExams ?? 0}
            subtitle="Assessments across courses"
            icon={FileQuestion}
            iconBgColor="bg-purple-50 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800"
            iconColor="text-purple-600 dark:text-purple-400"
            loading={loading}
          />
          <StatCard
            title="Total Enrollments"
            value={stats?.totalEnrollments ?? 0}
            subtitle="Active learner course packages"
            icon={UserCheck}
            iconBgColor="bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800"
            iconColor="text-blue-600 dark:text-blue-400"
            loading={loading}
          />
          <StatCard
            title="Exam Attempts"
            value={stats?.totalExamAttempts ?? 0}
            subtitle={`${stats?.completedProgressCount ?? 0} lessons completed`}
            icon={CheckCircle2}
            iconBgColor="bg-teal-50 dark:bg-teal-950/80 border-teal-200 dark:border-teal-800"
            iconColor="text-teal-600 dark:text-teal-400"
            loading={loading}
          />
        </div>
      </div>

      {/* 3. INTERACTIVE VISUAL CHARTS (ACTUAL DATA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  User Registration Trajectory
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily registrations across students, teachers, and parents.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
            ) : (
              <SimpleTrendChart
                data={stats?.registrationTrends || []}
                title="Registrations Trend"
                mode="multi"
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-500" />
                  Course Enrollment Volume
                </CardTitle>
                <CardDescription className="text-xs">
                  Student channel subscriptions registered over time.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
            ) : (
              <SimpleTrendChart
                data={stats?.enrollmentTrends || []}
                title="Enrollment Trend"
                mode="single"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. WEBSITE ACTIVITY & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Website Activity Stream */}
        <Card className="lg:col-span-2 shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Recent Platform Activity</CardTitle>
                <CardDescription className="text-xs">
                  Live platform registrations, course creations, and exam attempts.
                </CardDescription>
              </div>
              <Link
                href="/admin/activity"
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                No recent activity logged yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activities.map((act) => {
                  const dateStr = act.created_at
                    ? new Date(act.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recent';

                  return (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 dark:text-white truncate">
                            {act.description}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            Type: <span className="font-medium text-neutral-500">{act.activity_type}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-neutral-400 shrink-0">{dateStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Management Shortcuts */}
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <CardTitle className="text-base font-bold">Quick Management</CardTitle>
            <CardDescription className="text-xs">
              Direct access to entity administration.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-2">
            {[
              { label: 'Manage Students', href: '/admin/students', icon: Users, count: stats?.totalStudents },
              { label: 'Manage Teachers', href: '/admin/teachers', icon: GraduationCap, count: stats?.totalTeachers },
              { label: 'Manage Parents', href: '/admin/parents', icon: HeartHandshake, count: stats?.totalParents },
              { label: 'Manage Courses', href: '/admin/courses', icon: BookOpen, count: stats?.totalCourses },
              { label: 'Manage Exams', href: '/admin/exams', icon: FileQuestion, count: stats?.totalExams },
              { label: 'Pricing Plans', href: '/admin/pricing', icon: CreditCard, count: 'INR' },
            ].map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <Link
                  key={shortcut.label}
                  href={shortcut.href}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50 hover:border-primary-400 dark:hover:border-primary-600 hover:bg-white dark:hover:bg-neutral-800/80 transition-all text-xs font-medium text-neutral-800 dark:text-neutral-200"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-neutral-500" />
                    <span>{shortcut.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {shortcut.count ?? '—'}
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 5. FUTURE FINANCIAL STATISTICS (PREPARED BLUEPRINT) */}
      <Card className="border-amber-200/60 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm">
        <CardHeader className="pb-3 border-b border-amber-100 dark:border-amber-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-neutral-900 dark:text-white">
                  Financial Analytics & Earnings Engine
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Layout prepared for Razorpay Payment Gateway integration.
                </CardDescription>
              </div>
            </div>
            <span className="inline-flex items-center self-start sm:self-auto px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
              Gateway Integration Pending
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
            Per platform specifications, financial calculations will activate upon Razorpay live payment gateway and webhook verification. The underlying architecture strictly uses integer minor units (paise) and idempotent processing to protect against transaction discrepancies.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Monthly Gross Revenue', note: 'Pending Razorpay Webhooks' },
              { label: 'Platform Commission', note: 'Pending Revenue Split Engine' },
              { label: 'Teacher Allocated Earnings', note: 'Pending Payment Verification' },
              { label: 'Teacher Pending Withdrawals', note: 'Pending Payout Routing' },
              { label: 'Completed Disbursements', note: 'Pending Banking Transfer' },
              { label: 'Refunds & Adjustments', note: 'Pending Gateway Reconciliation' },
            ].map((fItem) => (
              <div
                key={fItem.label}
                className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 space-y-1.5"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  {fItem.label}
                </span>
                <p className="text-xl font-bold text-neutral-400 dark:text-neutral-500">
                  ₹ — . — —
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {fItem.note}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
