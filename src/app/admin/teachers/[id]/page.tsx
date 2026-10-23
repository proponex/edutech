'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  GraduationCap,
  ChevronLeft,
  BookOpen,
  Users,
  Video,
  FileQuestion,
  CreditCard,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Mail,
  Phone,
  Lock,
} from 'lucide-react';
import { AdminTeacherDetail } from '@/types';

export default function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [teacher, setTeacher] = useState<AdminTeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTeacher = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/teachers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTeacher(data);
      } else {
        router.push('/admin/teachers');
      }
    } catch (err) {
      console.error('Failed to load teacher details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeacher();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!teacher) return;
    const targetStatus = teacher.status === 'suspended' ? 'active' : 'suspended';

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: teacher.id,
          status: targetStatus,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        loadTeacher();
      }
    } catch (err) {
      console.error('Status change error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
        <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-12 text-center text-neutral-400">
        <p>Teacher profile not found.</p>
        <Link href="/admin/teachers" className="mt-4 inline-block text-primary-500 hover:underline">
          Return to Teacher Directory
        </Link>
      </div>
    );
  }

  const isSuspended = teacher.status === 'suspended';

  return (
    <div className="space-y-6">
      {/* Back button & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Link href="/admin/teachers">
            <Button size="sm" variant="outline" className="h-9 px-2.5">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-300">
                Educator Profile
              </span>
              <StatusBadge status={teacher.status || 'active'} type="account" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {teacher.name || 'Educator Profile'}
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">ID: {teacher.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen(true)}
            className={`flex items-center gap-1.5 ${
              isSuspended
                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
            }`}
          >
            {isSuspended ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Reactivate Teacher</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Suspend Account</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/80 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Channels / Courses</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {teacher.channelsCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Total Enrolled</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {teacher.totalStudentsEnrolled}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Lessons / Videos</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {teacher.totalVideosCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Exams Created</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {teacher.totalQuizzesCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Information */}
        <div className="space-y-6">
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                Teacher Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5">Educator Name</span>
                <span className="font-semibold text-neutral-900 dark:text-white text-sm">
                  {teacher.name || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Email Address</span>
                <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{teacher.email}</span>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Contact Phone</span>
                <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{teacher.phone || 'Not recorded'}</span>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Registration Date</span>
                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {teacher.created_at
                      ? new Date(teacher.created_at).toLocaleString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Future Teacher Earnings Blueprint */}
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  Teacher Earnings Ledger
                </CardTitle>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Coming Soon
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <p className="text-neutral-500 leading-relaxed">
                Platform commission split, gross course earnings, pending withdrawals, and payout receipts will be displayed here following Razorpay integration.
              </p>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between font-mono text-[11px] text-neutral-400">
                <span>Commission Rate:</span>
                <span>Configured at Platform Level</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Teacher's Created Channels */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary-500" />
                    Courses & Channels Created
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Published educational channels owned by this teacher.
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {teacher.channels.length} Courses
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {teacher.channels.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>This teacher has not created any courses yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teacher.channels.map((ch) => (
                    <div
                      key={ch.id}
                      className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-neutral-900 dark:text-white text-sm truncate">
                            {ch.name}
                          </p>
                          <StatusBadge
                            status={ch.isActive ? 'published' : 'draft'}
                            type="publication"
                          />
                        </div>
                        <p className="text-neutral-500 mt-1 line-clamp-1">
                          {ch.description || 'No course description provided'}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                          Created on: {new Date(ch.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/admin/courses/${ch.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs">
                            Manage Course &rarr;
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleToggleStatus}
        title={
          isSuspended
            ? `Reactivate ${teacher.name || 'Teacher'}?`
            : `Suspend ${teacher.name || 'Teacher'}?`
        }
        description={
          isSuspended
            ? 'Reactivating this teacher account will restore their channel publishing and content management privileges immediately.'
            : 'Suspending this teacher prevents them from accessing the Teacher Dashboard or editing courses. Published channels will remain visible unless separately unpublished.'
        }
        confirmText={isSuspended ? 'Confirm Reactivation' : 'Confirm Suspension'}
        variant={isSuspended ? 'primary' : 'danger'}
        isLoading={actionLoading}
      />
    </div>
  );
}
