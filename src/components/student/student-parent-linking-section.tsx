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

export function StudentParentLinkingSection() {
  const [studentId, setStudentId] = useState<string>('');
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
      // 1. Fetch Student ID
      const idRes = await fetch('/api/student/my-id');
      if (idRes.ok) {
        const idData = await idRes.json();
        if (idData.student_id_code) {
          setStudentId(idData.student_id_code);
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    <div className="space-y-6">
      {/* 1. STUDENT ID CARD */}
      <Card className="border border-primary-200 dark:border-primary-900/60 bg-gradient-to-br from-primary-50/60 via-white to-amber-50/40 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 rounded-3xl shadow-sm overflow-hidden">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-md shadow-primary-500/20 font-bold">
                <IdCard className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-800 dark:text-primary-300">
                    Official Student Identifier
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white/80 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    Permanent
                  </Badge>
                </div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white font-mono">
                    {loading ? (
                      <span className="inline-block w-44 h-8 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-lg" />
                    ) : (
                      studentId || 'Generating...'
                    )}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-xl">
                  Share this ID with your parent so they can request access to your learning progress and curriculum analytics.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
              <Button
                variant={copied ? 'success' : 'primary'}
                size="md"
                onClick={handleCopyId}
                disabled={!studentId || loading}
                className="font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                id="copy-student-id-button"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Student ID</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FEEDBACK BANNER */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-3 animate-in fade-in duration-200 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 2. PARENT CONNECTION REQUESTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-bold text-neutral-950 dark:text-white font-display">
              Parent Connection Requests
            </h3>
            {pendingRequests.length > 0 && (
              <Badge variant="primary" className="text-xs">
                {pendingRequests.length} Pending
              </Badge>
            )}
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Explicit student approval required
          </span>
        </div>

        {loading ? (
          <div className="h-24 bg-neutral-100 dark:bg-neutral-800/60 rounded-2xl animate-pulse" />
        ) : pendingRequests.length > 0 ? (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <Card
                key={req.id}
                className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/70 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-sm shrink-0">
                      {req.parent?.name?.charAt(0).toUpperCase() || 'P'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {req.parent?.name || 'Parent'}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {req.relationship_type || 'Guardian'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] flex items-center gap-1 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800">
                          <Clock className="w-3 h-3" />
                          Awaiting Approval
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {req.parent?.email ? `${req.parent.email} • ` : ''}Requested on{' '}
                        {new Date(req.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRespond(req.id, 'reject')}
                      disabled={actionInProgress === req.id}
                      className="text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleRespond(req.id, 'accept')}
                      disabled={actionInProgress === req.id}
                      className="text-xs font-bold cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      {actionInProgress === req.id ? 'Processing...' : 'Accept Connection'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 rounded-2xl p-6 text-center">
            <div className="flex flex-col items-center justify-center space-y-1.5 text-neutral-500 dark:text-neutral-400">
              <ShieldCheck className="w-7 h-7 text-neutral-400" />
              <p className="text-sm font-medium">No pending parent connection requests.</p>
              <p className="text-xs text-neutral-400 max-w-sm">
                When a parent enters your Student ID in their dashboard, their connection request will appear here for your explicit authorization.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* 3. LINKED PARENTS SECTION */}
      {linkedParents.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              Connected Parents ({linkedParents.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {linkedParents.map((parent) => (
              <div
                key={parent.id}
                className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    {parent.name?.charAt(0).toUpperCase() || 'P'}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                      {parent.name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {parent.relationship_type || 'Guardian'} • Connected{' '}
                      {new Date(parent.connected_since).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px]">
                  Active Access
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
