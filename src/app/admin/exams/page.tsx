'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  FileQuestion,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Globe,
  Lock,
} from 'lucide-react';

export default function AdminExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Confirmation dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/exams?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchExams();
  };

  const handleTogglePublication = async () => {
    if (!selectedExam) return;
    const targetStatus = !selectedExam.is_published;

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/exams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExam.id,
          is_published: targetStatus,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        fetchExams();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update exam publication status');
      }
    } catch (err) {
      console.error('Exam status update error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300">
              Assessment Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Exam & Assessment Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Monitor course quizzes and examinations, question structures, student participation, and scores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchExams}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
        <CardContent className="p-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by exam title or subject..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Publication:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All States</option>
                <option value="published">Published Only</option>
                <option value="draft">Draft Only</option>
              </select>

              <Button size="sm" variant="primary" type="submit" className="text-xs">
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Exams Data Table */}
      <Card className="shadow-sm border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Exam / Quiz Title</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Total Marks</th>
                <th className="py-3.5 px-4">Publication State</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 text-neutral-700 dark:text-neutral-300">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <FileQuestion className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-sm">No exams found</p>
                    <p className="text-xs text-neutral-500 mt-1">Try resetting filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                exams.map((exam) => {
                  const isPublished = Boolean(exam.is_published);
                  const dateStr = exam.created_at
                    ? new Date(exam.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr
                      key={exam.id}
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0">
                            <FileQuestion className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-900 dark:text-white truncate">
                              {exam.title}
                            </p>
                            <p className="text-[11px] font-mono text-neutral-400 truncate">
                              ID: {exam.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                          {exam.subject_name || 'General'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {exam.total_marks || 0} Marks
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={isPublished ? 'published' : 'draft'}
                          type="publication"
                        />
                      </td>

                      <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/exams/${exam.id}`}>
                            <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>Exam Details</span>
                            </Button>
                          </Link>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedExam(exam);
                              setDialogOpen(true);
                            }}
                            className={`h-8 px-2.5 text-xs flex items-center gap-1 ${
                              isPublished
                                ? 'text-neutral-600 hover:text-neutral-900 dark:hover:text-white'
                                : 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30'
                            }`}
                          >
                            {isPublished ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Unpublish</span>
                              </>
                            ) : (
                              <>
                                <Globe className="w-3.5 h-3.5" />
                                <span>Publish</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div>
            Showing {exams.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total} exams
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 font-semibold text-neutral-800 dark:text-neutral-200">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleTogglePublication}
        title={
          selectedExam?.is_published
            ? `Unpublish ${selectedExam?.title || 'Exam'}?`
            : `Publish ${selectedExam?.title || 'Exam'}?`
        }
        description={
          selectedExam?.is_published
            ? 'Unpublishing will hide this assessment from students enrolled in this course.'
            : 'Publishing will make this exam live for students enrolled in the corresponding course.'
        }
        confirmText={selectedExam?.is_published ? 'Confirm Unpublish' : 'Confirm Publish'}
        variant={selectedExam?.is_published ? 'warning' : 'primary'}
        isLoading={actionLoading}
      />
    </div>
  );
}
