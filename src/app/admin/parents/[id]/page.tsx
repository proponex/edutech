'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  HeartHandshake,
  ChevronLeft,
  Users,
  Calendar,
  Mail,
  Phone,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { AdminParentDetail } from '@/types';

export default function ParentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [parent, setParent] = useState<AdminParentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadParent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/parents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setParent(data);
      } else {
        router.push('/admin/parents');
      }
    } catch (err) {
      console.error('Failed to load parent details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParent();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!parent) return;
    const targetStatus = parent.status === 'suspended' ? 'active' : 'suspended';

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/parents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: parent.id,
          status: targetStatus,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        loadParent();
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

  if (!parent) {
    return (
      <div className="p-12 text-center text-neutral-400">
        <p>Parent profile not found.</p>
        <Link href="/admin/parents" className="mt-4 inline-block text-primary-500 hover:underline">
          Return to Parent Directory
        </Link>
      </div>
    );
  }

  const isSuspended = parent.status === 'suspended';

  return (
    <div className="space-y-6">
      {/* Back button & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Link href="/admin/parents">
            <Button size="sm" variant="outline" className="h-9 px-2.5">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
                Guardian Profile
              </span>
              <StatusBadge status={parent.status || 'active'} type="account" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {parent.name || 'Parent Profile'}
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">ID: {parent.id}</p>
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
                <span>Reactivate Parent</span>
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Information */}
        <div className="space-y-6">
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-500" />
                Parent Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5">Full Name</span>
                <span className="font-semibold text-neutral-900 dark:text-white text-sm">
                  {parent.name || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Email Address</span>
                <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{parent.email}</span>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Phone Number</span>
                <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{parent.phone || 'Not recorded'}</span>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Registration Date</span>
                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {parent.created_at
                      ? new Date(parent.created_at).toLocaleString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Linked Children / Students */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary-500" />
                    Linked Students / Children
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Students connected to this parent through database relations or phone mapping.
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {parent.linkedStudents.length} Students
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {parent.linkedStudents.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No student accounts are currently linked to this parent.</p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    When students specify this parent phone number during profile setup, links are formed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {parent.linkedStudents.map((st) => (
                    <div
                      key={st.studentId}
                      className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-neutral-900 dark:text-white text-sm">
                            {st.name}
                          </p>
                          <StatusBadge status={st.status} type="account" />
                        </div>
                        <p className="text-neutral-500 mt-0.5">{st.email}</p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                          Class: {st.className || 'Unassigned'} &bull; Phone: {st.phone || 'N/A'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/admin/students/${st.studentId}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs flex items-center gap-1">
                            <span>Inspect Student</span>
                            <ExternalLink className="w-3 h-3" />
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
            ? `Reactivate ${parent.name || 'Parent'}?`
            : `Suspend ${parent.name || 'Parent'}?`
        }
        description={
          isSuspended
            ? 'Reactivating this parent account will restore their access to the Parent Portal immediately.'
            : 'Suspending this parent account prevents them from logging in. Linked student accounts and progress records are NOT affected.'
        }
        confirmText={isSuspended ? 'Confirm Reactivation' : 'Confirm Suspension'}
        variant={isSuspended ? 'primary' : 'danger'}
        isLoading={actionLoading}
      />
    </div>
  );
}
