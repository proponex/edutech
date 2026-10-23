'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  HeartHandshake,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Profile } from '@/types';

export default function AdminParentsPage() {
  const [parents, setParents] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Confirmation dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Profile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchParents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/parents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setParents(data.parents || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load parents:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchParents();
  };

  const handleToggleStatus = async () => {
    if (!selectedParent) return;
    const targetStatus = selectedParent.status === 'suspended' ? 'active' : 'suspended';

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/parents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: selectedParent.id,
          status: targetStatus,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        fetchParents();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update parent status');
      }
    } catch (err) {
      console.error('Status update error:', err);
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
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
              Guardian Directory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Parent Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Monitor registered parent accounts, inspect linked student relationships, and manage account statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchParents}
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
                placeholder="Search by parent name, email, or ID..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Accounts</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>

              <Button size="sm" variant="primary" type="submit" className="text-xs">
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Parent Data Table */}
      <Card className="shadow-sm border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Parent / Guardian</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Registered</th>
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
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <HeartHandshake className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-sm">No parent accounts registered yet</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Parents can sign up from the public registration portal selecting the Parent role.
                    </p>
                  </td>
                </tr>
              ) : (
                parents.map((parent) => {
                  const isSuspended = parent.status === 'suspended';
                  const dateStr = parent.created_at
                    ? new Date(parent.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr
                      key={parent.id}
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 flex items-center justify-center font-bold text-xs text-amber-800 dark:text-amber-300 shrink-0">
                            {parent.name ? parent.name.slice(0, 2).toUpperCase() : 'PR'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-900 dark:text-white truncate">
                              {parent.name || 'Parent User'}
                            </p>
                            <p className="text-[11px] font-mono text-neutral-400 truncate">
                              ID: {parent.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="text-neutral-900 dark:text-neutral-100">{parent.email}</p>
                        <p className="text-[11px] text-neutral-400">
                          {parent.phone ? `Phone: ${parent.phone}` : 'No phone specified'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                          <HeartHandshake className="w-3.5 h-3.5" />
                          Parent
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={parent.status || 'active'} type="account" />
                      </td>

                      <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/parents/${parent.id}`}>
                            <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Profile</span>
                            </Button>
                          </Link>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedParent(parent);
                              setDialogOpen(true);
                            }}
                            className={`h-8 px-2.5 text-xs flex items-center gap-1 ${
                              isSuspended
                                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                            }`}
                          >
                            {isSuspended ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Reactivate</span>
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Suspend</span>
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
            Showing {parents.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total} registered parents
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
        onConfirm={handleToggleStatus}
        title={
          selectedParent?.status === 'suspended'
            ? `Reactivate ${selectedParent?.name || 'Parent'}?`
            : `Suspend ${selectedParent?.name || 'Parent'}?`
        }
        description={
          selectedParent?.status === 'suspended'
            ? 'Reactivating this parent account will restore their Parent Portal access immediately.'
            : 'Suspending this parent account blocks them from logging in. Linked student records will NOT be unlinked or modified.'
        }
        confirmText={
          selectedParent?.status === 'suspended' ? 'Confirm Reactivation' : 'Confirm Suspension'
        }
        variant={selectedParent?.status === 'suspended' ? 'primary' : 'danger'}
        isLoading={actionLoading}
      />
    </div>
  );
}
