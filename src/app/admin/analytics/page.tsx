'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/admin/StatCard';
import { SimpleTrendChart } from '@/components/admin/SimpleTrendChart';
import {
  BarChart3,
  Calendar,
  Users,
  GraduationCap,
  HeartHandshake,
  BookOpen,
  UserCheck,
  FileQuestion,
  RefreshCw,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { AdminOverviewStats, DateFilterOption } from '@/types';

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (filter: DateFilterOption) => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/admin/overview?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats(dateFilter);
  }, [dateFilter, loadStats]);

  // Derived metrics
  const studentToTeacherRatio =
    stats && stats.totalTeachers > 0
      ? (stats.totalStudents / stats.totalTeachers).toFixed(1)
      : stats?.totalStudents.toString() || '0';

  const parentEngagementPercent =
    stats && stats.totalParents > 0
      ? Math.round((stats.parentsWithLinkedStudents / stats.totalParents) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300">
              Platform Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Analytics & Comprehensive Reports
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Data-backed metrics across user acquisition, learning retention, curriculum distribution, and guardian engagement.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
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
                onClick={() => setDateFilter(opt.id)}
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
            onClick={() => loadStats(dateFilter)}
            disabled={refreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 1. KEY RATIOS & BENCHMARKS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Student-to-Teacher Ratio"
          value={`${studentToTeacherRatio} : 1`}
          subtitle="Learners per verified educator"
          icon={Users}
          iconBgColor="bg-primary-50 dark:bg-primary-950/80 border-primary-200 dark:border-primary-800"
          iconColor="text-primary-600 dark:text-primary-400"
          loading={loading}
        />

        <StatCard
          title="Parent Linkage Rate"
          value={`${parentEngagementPercent}%`}
          subtitle={`${stats?.distinctLinkedStudents ?? 0} linked children total`}
          icon={HeartHandshake}
          iconBgColor="bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800"
          iconColor="text-amber-600 dark:text-amber-400"
          loading={loading}
        />

        <StatCard
          title="Course Publication Rate"
          value={
            stats && stats.totalCourses > 0
              ? `${Math.round((stats.publishedCourses / stats.totalCourses) * 100)}%`
              : '100%'
          }
          subtitle={`${stats?.publishedCourses ?? 0} of ${stats?.totalCourses ?? 0} courses published`}
          icon={BookOpen}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800"
          iconColor="text-emerald-600 dark:text-emerald-400"
          loading={loading}
        />

        <StatCard
          title="Exam Completion Volume"
          value={stats?.totalExamAttempts ?? 0}
          subtitle="Total assessments attempted"
          icon={FileQuestion}
          iconBgColor="bg-purple-50 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800"
          iconColor="text-purple-600 dark:text-purple-400"
          loading={loading}
        />
      </div>

      {/* 2. TREND CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              Registration Velocity
            </CardTitle>
            <CardDescription className="text-xs">
              Daily trajectory of new students, teachers, and parents joining the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
            ) : (
              <SimpleTrendChart
                data={stats?.registrationTrends || []}
                title="Ecosystem Growth"
                mode="multi"
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-500" />
              Enrollment Subscriptions
            </CardTitle>
            <CardDescription className="text-xs">
              Learner subscriptions created across courses during the selected timeframe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
            ) : (
              <SimpleTrendChart
                data={stats?.enrollmentTrends || []}
                title="Enrollment Trajectory"
                mode="single"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. BREAKDOWN BY ROLES & STATUSES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-500" />
              User Role Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Students</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {stats?.totalStudents ?? 0}
              </span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${
                    stats
                      ? Math.min(100, (stats.totalStudents / Math.max(1, (stats.totalStudents + stats.totalTeachers + stats.totalParents))) * 100)
                      : 0
                  }%`,
                }}
                className="bg-primary-500 h-full rounded-full"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-neutral-500">Teachers</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {stats?.totalTeachers ?? 0}
              </span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${
                    stats
                      ? Math.min(100, (stats.totalTeachers / Math.max(1, (stats.totalStudents + stats.totalTeachers + stats.totalParents))) * 100)
                      : 0
                  }%`,
                }}
                className="bg-indigo-500 h-full rounded-full"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-neutral-500">Parents</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {stats?.totalParents ?? 0}
              </span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${
                    stats
                      ? Math.min(100, (stats.totalParents / Math.max(1, (stats.totalStudents + stats.totalTeachers + stats.totalParents))) * 100)
                      : 0
                  }%`,
                }}
                className="bg-amber-500 h-full rounded-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              Course Publication Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Published Courses</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {stats?.publishedCourses ?? 0}
              </span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${
                    stats && stats.totalCourses > 0
                      ? (stats.publishedCourses / stats.totalCourses) * 100
                      : 0
                  }%`,
                }}
                className="bg-emerald-500 h-full rounded-full"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-neutral-500">Draft Courses</span>
              <span className="font-bold text-neutral-400">
                {stats?.draftCourses ?? 0}
              </span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${
                    stats && stats.totalCourses > 0
                      ? (stats.draftCourses / stats.totalCourses) * 100
                      : 0
                  }%`,
                }}
                className="bg-neutral-400 h-full rounded-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-amber-500" />
              Parent Linkage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Parents with Linked Students</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {stats?.parentsWithLinkedStudents ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-neutral-500">Distinct Linked Students</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {stats?.distinctLinkedStudents ?? 0}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800 leading-relaxed">
              Maintains clean N:M multi-parent guardian links while preserving backward-compatible phone matches.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
