'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IdCard,
  Copy,
  Check,
  Users,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { ParentStudentRelation } from '@/types';

interface StudentParentLinkingSectionProps {
  initialStudentId?: string;
  onStudentIdLoaded?: (id: string) => void;
  className?: string;
}

export function StudentParentLinkingSection({
  initialStudentId,
  onStudentIdLoaded,
  className,
}: StudentParentLinkingSectionProps) {
  const [studentId, setStudentId] = useState<string>(initialStudentId || '');
  const [copied, setCopied] = useState(false);
  const [requests, setRequests] = useState<ParentStudentRelation[]>([]);
  const [linkedParents, setLinkedParents] = useState<
    Array<{
      id: string;
      parent_id: string;
      name: string;
      email: string;
      relationship_type: string;
      connected_since: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch Student ID if not already provided
      const idRes = await fetch('/api/student/my-id');
      if (idRes.ok) {
        const idData = await idRes.json();
        if (idData.student_id_code) {
          setStudentId(idData.student_id_code);
          if (onStudentIdLoaded) {
            onStudentIdLoaded(idData.student_id_code);
          }
        }
      }

      // 2. Fetch Parent Requests & Linked Parents
      const reqRes = await fetch('/api/student/parent-requests');
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData.requests || []);
        setLinkedParents(reqData.linked_parents || []);
      }
    } catch (err) {
      console.error('Failed to load parent connection requests:', err);
    } finally {
      setLoading(false);
    }
  }, [onStudentIdLoaded]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (initialStudentId && !studentId) {
      setStudentId(initialStudentId);
    }
  }, [initialStudentId, studentId]);

  const handleCopyId = async () => {
    if (!studentId) return;
    try {
      await navigator.clipboard.writeText(studentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = studentId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    setActionInProgress(requestId);
    setMessage(null);
    try {
      const res = await fetch(`/api/student/parent-requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} request.`);
      }

      setMessage({
        type: 'success',
        text:
          action === 'accept'
            ? 'Parent connection accepted! Your parent can now view your learning progress.'
            : 'Parent connection request rejected.',
      });

      // Reload list
      await loadData();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || `Failed to ${action} request.`,
      });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* FEEDBACK BANNER */}
      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-200 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* TOP SECTION: LEFT CORNER (STUDENT ID) & RIGHT SIDE (PARENT REQUESTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* ======================================================================= */}
        {/* LEFT CORNER: STUDENT ID (READ-ONLY, CANNOT BE CHANGED) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 flex flex-col">
          <Card className="h-full border border-primary-200/80 dark:border-primary-900/60 bg-gradient-to-br from-primary-50/70 via-white to-amber-50/30 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
            <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs font-bold">
                      <IdCard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-primary-900 dark:text-primary-300 block">
                        Student ID
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Official Student Identifier
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-white/90 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold border-neutral-300 dark:border-neutral-700"
                  >
                    Cannot be changed
                  </Badge>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-950/80 border border-primary-200/70 dark:border-primary-900/70 flex items-center justify-between gap-3 shadow-inner">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                      Permanent Unique ID
                    </span>
                    <span
                      id="student-dashboard-id-display"
                      className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950 dark:text-white font-mono truncate block select-all"
                    >
                      {loading && !studentId ? (
                        <span className="inline-block w-40 h-7 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-md" />
                      ) : (
                        studentId || 'Generating...'
                      )}
                    </span>
                  </div>
                  <Button
                    variant={copied ? 'success' : 'primary'}
                    size="sm"
                    onClick={handleCopyId}
                    disabled={!studentId || loading}
                    className="font-bold shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs shadow-xs cursor-pointer"
                    id="copy-student-id-button"
                    title="Copy Student ID"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Share this permanent ID with your parents so they can request connection to follow your syllabus progress.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT SIDE: PARENT REQUESTS (ACCEPT/REJECT INLINE, NO SEPARATE PAGE) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 flex flex-col">
          <Card className="h-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
            <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-950/70 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0 font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-neutral-950 dark:text-white font-display">
                        Parent Requests
                      </h3>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Approve or decline connection requests
                      </span>
                    </div>
                  </div>

                  {pendingRequests.length > 0 ? (
                    <Badge variant="primary" className="text-xs font-bold animate-pulse">
                      {pendingRequests.length} Pending
                    </Badge>
                  ) : linkedParents.length > 0 ? (
                    <Badge variant="success" className="text-[11px] font-semibold">
                      {linkedParents.length} Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-neutral-500">
                      0 Pending
                    </Badge>
                  )}
                </div>

                {loading ? (
                  <div className="h-28 bg-neutral-100 dark:bg-neutral-800/60 rounded-2xl animate-pulse" />
                ) : pendingRequests.length > 0 ? (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-2xl border border-primary-200/80 dark:border-primary-900/60 bg-primary-50/30 dark:bg-primary-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-primary-500 text-neutral-950 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {req.parent?.name?.charAt(0).toUpperCase() || 'P'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                                {req.parent?.name || 'Parent'}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
                                {req.relationship_type || 'Guardian'}
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Awaiting approval
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                              {req.parent?.email ? `${req.parent.email} • ` : ''}
                              Requested{' '}
                              {new Date(req.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRespond(req.id, 'reject')}
                            disabled={actionInProgress === req.id}
                            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50 rounded-xl px-2.5 py-1.5 cursor-pointer"
                            title="Reject connection request"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleRespond(req.id, 'accept')}
                            disabled={actionInProgress === req.id}
                            className="text-xs font-bold rounded-xl px-3 py-1.5 cursor-pointer shadow-xs"
                            title="Accept connection"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            {actionInProgress === req.id ? 'Processing...' : 'Accept'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : linkedParents.length > 0 ? (
                  <div className="space-y-2">
                    <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {linkedParents[0].name?.charAt(0).toUpperCase() || 'P'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                            Linked: {linkedParents[0].name}
                          </span>
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {linkedParents[0].relationship_type || 'Guardian'} • Active access to curriculum analytics
                          </span>
                        </div>
                      </div>
                      <Badge variant="success" className="text-[10px]">
                        Active
                      </Badge>
                    </div>
                    {linkedParents.length > 1 && (
                      <p className="text-[11px] text-neutral-400 pl-1">
                        +{linkedParents.length - 1} more linked guardian(s)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-neutral-400 shrink-0" />
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300 block">
                        No pending parent connection requests
                      </span>
                      When your parent enters your Student ID in their dashboard, their connection request will appear here for your immediate approval.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                <span>Student approval required before parents can view analytics</span>
                <span className="font-semibold text-primary-600 dark:text-primary-400">Secure Parent Linking</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
