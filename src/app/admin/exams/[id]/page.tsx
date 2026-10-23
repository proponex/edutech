'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  FileQuestion,
  ChevronLeft,
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Globe,
  Lock,
  Tag,
  Award,
} from 'lucide-react';
import { AdminExamDetail } from '@/types';

export default function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [exam, setExam] = useState<AdminExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadExam = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/exams/${id}`);
      if (res.ok) {
        const data = await res.json();
        setExam(data);
      } else {
        router.push('/admin/exams');
      }
    } catch (err) {
      console.error('Failed to load exam details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExam();
  }, [id]);

  const handleTogglePublication = async () => {
    if (!exam) return;
    const targetStatus = !exam.is_published;

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/exams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: exam.id,
          is_published: targetStatus,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        loadExam();
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

  if (!exam) {
    return (
      <div className="p-12 text-center text-neutral-400">
        <p>Exam not found.</p>
        <Link href="/admin/exams" className="mt-4 inline-block text-primary-500 hover:underline">
          Return to Exam Directory
        </Link>
      </div>
    );
  }

  const isPublished = Boolean(exam.is_published);

  return (
    <div className="space-y-6">
      {/* Back button & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Link href="/admin/exams">
            <Button size="sm" variant="outline" className="h-9 px-2.5">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300">
                Assessment Item
              </span>
              <StatusBadge status={isPublished ? 'published' : 'draft'} type="publication" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {exam.title}
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">ID: {exam.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen(true)}
            className={`flex items-center gap-1.5 ${
              isPublished
                ? 'text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white'
                : 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30'
            }`}
          >
            {isPublished ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Unpublish Exam</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>Publish Exam</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Total Marks</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {exam.total_marks}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Questions Count</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {exam.questionsCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Student Attempts</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {exam.attemptsCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Time Limit</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {exam.time_limit_minutes ? `${exam.time_limit_minutes}m` : 'None'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata */}
        <div className="space-y-6">
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-purple-500" />
                Assessment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5">Description / Instructions</span>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {exam.description || 'No special instructions provided.'}
                </p>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Subject</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {exam.subject_name || 'General Subject'}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Associated Course / Channel</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {exam.channel?.name || 'Assigned Channel'}
                </span>
                <p className="text-[11px] text-neutral-400">
                  Teacher: {exam.channel?.teacher_name || 'Instructor'}
                </p>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Average Score</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {exam.averageScore} / {exam.total_marks}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Created Date</span>
                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {exam.created_at ? new Date(exam.created_at).toLocaleString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Future Pricing Foundation */}
          <Card className="border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-500" />
                  Exam Access & Pricing
                </CardTitle>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Free Access
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs text-neutral-500">
              <p>
                Configuring paid exam admissions can be managed through the Pricing Management console. Paid enforcement activates with the payment gateway.
              </p>
              <Link href="/admin/pricing" className="text-primary-600 dark:text-primary-400 hover:underline font-semibold block pt-1">
                Configure Pricing Plans &rarr;
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Question Structure Preview */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-500" />
                    Question Blueprint ({exam.questions.length} Items)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Assessment questions and answer choices structured for learners.
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {exam.total_marks} Total Marks
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {exam.questions.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  <FileQuestion className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No questions structured for this exam yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exam.questions.map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-2.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          Q{qIdx + 1}. {q.question_text}
                        </span>
                        <span className="font-semibold px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-950/80 text-primary-800 dark:text-primary-300 text-[11px] shrink-0">
                          {q.marks} Mark{q.marks > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={opt.id || optIdx}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                              opt.is_correct
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold'
                                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            <span>{opt.option_text}</span>
                            {opt.is_correct && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1.5" />
                            )}
                          </div>
                        ))}
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
        onConfirm={handleTogglePublication}
        title={
          isPublished
            ? `Unpublish ${exam.title}?`
            : `Publish ${exam.title}?`
        }
        description={
          isPublished
            ? 'Unpublishing will hide this assessment from students enrolled in this course.'
            : 'Publishing will make this exam live for students enrolled in the corresponding course.'
        }
        confirmText={isPublished ? 'Confirm Unpublish' : 'Confirm Publish'}
        variant={isPublished ? 'warning' : 'primary'}
        isLoading={actionLoading}
      />
    </div>
  );
}
