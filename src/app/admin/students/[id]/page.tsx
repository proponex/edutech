'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  Users,
  ChevronLeft,
  GraduationCap,
  BookOpen,
  FileQuestion,
  HeartHandshake,
  CreditCard,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Mail,
  Phone,
  Clock,
  Award,
  Layers,
  Lock,
} from 'lucide-react';
import { AdminStudentDetail } from '@/types';

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [student, setStudent] = useState<AdminStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/students/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data);
      } else {
        router.push('/admin/students');
      }
    } catch (err) {
      console.error('Failed to load student details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudent();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!student) return;
    const targetStatus = student.status === 'suspended' ? 'active' : 'suspended';

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          status: targetStatus,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        loadStudent();
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
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
          <div className="h-48 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 text-center text-neutral-400">
        <p>Student profile not found.</p>
        <Link href="/admin/students" className="mt-4 inline-block text-primary-500 hover:underline">
          Return to Student Directory
        </Link>
      </div>
    );
  }

  const isSuspended = student.status === 'suspended';

  return (
    <div className="space-y-6">
      {/* Back button & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Link href="/admin/students">
            <Button size="sm" variant="outline" className="h-9 px-2.5">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-900 dark:bg-primary-950/80 dark:text-primary-300">
                Student Record
              </span>
              <StatusBadge status={student.status || 'active'} type="account" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {student.name || 'Student Profile'}
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">ID: {student.id}</p>
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
                <span>Reactivate Student</span>
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

      {/* Overview Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/80 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Enrolled Courses</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {student.enrolledCoursesCount}
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
              <p className="text-xs text-neutral-400">Exam Attempts</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {student.examAttemptsCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Lessons Completed</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {student.completedItemsCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Linked Parents</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {student.linkedParents.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Information & Parents */}
        <div className="space-y-6">
          {/* Profile Details Card */}
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-500" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5">Full Name</span>
                <span className="font-semibold text-neutral-900 dark:text-white text-sm">
                  {student.name || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Email Address</span>
                <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{student.email}</span>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Mobile Phone</span>
                <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{student.phone || 'Not recorded'}</span>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Parent Contact Phone</span>
                <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                  <Phone className="w-3.5 h-3.5 text-amber-500" />
                  <span>{student.parent_phone || 'Not recorded'}</span>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Assigned Class</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {(student as any).class?.name || 'Unassigned'}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Education Board</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {(student as any).board?.name || 'Default Board'}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Preferred Language</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {student.preferred_language || 'English'}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Registration Date</span>
                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {student.created_at
                      ? new Date(student.created_at).toLocaleString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linked Parents Card */}
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-500" />
                Linked Parent Accounts
              </CardTitle>
              <CardDescription className="text-xs">
                Parent & guardian relationships attached to this student.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {student.linkedParents.length === 0 ? (
                <div className="text-center py-6 text-neutral-400 text-xs">
                  <HeartHandshake className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
                  <p>No parent accounts currently linked.</p>
                  {student.parent_phone && (
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Parent phone recorded as {student.parent_phone}.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {student.linkedParents.map((parent) => (
                    <div
                      key={parent.parentId}
                      className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {parent.name}
                        </span>
                        <StatusBadge status={parent.status} type="account" />
                      </div>
                      <p className="text-neutral-500">{parent.email}</p>
                      {parent.phone && <p className="text-neutral-500">Phone: {parent.phone}</p>}
                      <div className="pt-2 flex items-center justify-between border-t border-neutral-200/60 dark:border-neutral-800">
                        <span className="text-[11px] text-neutral-400">
                          Relationship: {parent.relationshipType}
                        </span>
                        <Link
                          href={`/admin/parents/${parent.parentId}`}
                          className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                        >
                          View Parent &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Enrolled Courses & Exam Attempts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enrolled Courses */}
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    Enrolled Courses & Academic Subscriptions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Courses and channels the student is actively subscribed to.
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {student.enrolledCourses.length} Enrolled
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {student.enrolledCourses.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Student is not enrolled in any courses yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {student.enrolledCourses.map((course) => (
                    <div
                      key={course.id}
                      className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-white text-sm">
                          {course.courseTitle}
                        </p>
                        <p className="text-neutral-500 mt-0.5">
                          Instructor: <span className="font-medium text-neutral-700 dark:text-neutral-300">{course.teacherName}</span>
                          {' '}&bull; Package: <span className="capitalize">{course.packageType.replace('_', ' ')}</span>
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                          Enrolled on: {new Date(course.enrolledAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link href={`/admin/courses/${course.channelId}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs">
                            Course Details &rarr;
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exam Attempts */}
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileQuestion className="w-4 h-4 text-purple-500" />
                    Exam & Quiz Performance History
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Assessments attempted and score outcomes recorded in the database.
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {student.examAttempts.length} Submissions
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {student.examAttempts.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  <FileQuestion className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No exam attempts submitted by this student yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {student.examAttempts.map((attempt) => {
                    const pct = attempt.totalMarks > 0 ? Math.round((attempt.score / attempt.totalMarks) * 100) : 0;
                    return (
                      <div
                        key={attempt.id}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {attempt.quizTitle}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Submitted:{' '}
                            {attempt.submittedAt
                              ? new Date(attempt.submittedAt).toLocaleString()
                              : 'Recent'}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-sm text-neutral-900 dark:text-white">
                            {attempt.score} / {attempt.totalMarks}
                          </span>
                          <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">
                            {pct}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Future Payment Information Card */}
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  Transaction & Purchase History
                </CardTitle>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Coming with Razorpay
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Course purchases, exam fees, invoices, and refund records will be logged here upon live Razorpay integration.
              </p>
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
            ? `Reactivate ${student.name || 'Student'}?`
            : `Suspend ${student.name || 'Student'}?`
        }
        description={
          isSuspended
            ? 'Reactivating this account will grant the student immediate access back into their dashboard, course lessons, and exams.'
            : 'Suspending this account prevents the student from logging in. All academic progress and attempt records are safely retained.'
        }
        confirmText={isSuspended ? 'Confirm Reactivation' : 'Confirm Suspension'}
        variant={isSuspended ? 'primary' : 'danger'}
        isLoading={actionLoading}
      />
    </div>
  );
}
