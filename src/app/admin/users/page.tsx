'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  GraduationCap,
  HeartHandshake,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  CreditCard,
  Tv,
  Calendar,
  UserCheck,
  UserX,
} from 'lucide-react';
import { AdminUsersStats } from '@/types';

export default function AdminUsersPage() {
  const [activeRole, setActiveRole] = useState<'student' | 'teacher' | 'parent'>('student');
  const [stats, setStats] = useState<AdminUsersStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
  });

  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Status Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected User Drill-down Detail Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        role: activeRole,
        page: page.toString(),
        limit: '10',
      });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setUsers(json.users || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
        if (json.stats) {
          setStats(json.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load users data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeRole, page, search, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = (role: 'student' | 'teacher' | 'parent') => {
    setActiveRole(role);
    setPage(1);
    setSearch('');
    setStatusFilter('all');
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        if (selectedUser && selectedUser.id === user.id) {
          setSelectedUser({ ...selectedUser, status: nextStatus });
        }
        await fetchUsers(true);
      }
    } catch (err) {
      console.error('Failed to toggle user status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatRupees = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
              Tab 3 &bull; User Directory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
            User Management & Directories
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Centralized directory for students, educators, and parents with enrollment histories and account controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchUsers(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Users'}</span>
          </Button>
        </div>
      </div>

      {/* 3 REAL COUNT CARDS AT TOP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Students Card */}
        <Card
          onClick={() => handleRoleChange('student')}
          className={`cursor-pointer transition-all border rounded-2xl p-5 shadow-sm hover:shadow-md ${activeRole === 'student'
              ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/20 ring-1 ring-primary-500'
              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Total Students
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
              {stats.totalStudents}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-medium">
              Registered learners across channels
            </p>
          </div>
        </Card>

        {/* Total Teachers Card */}
        <Card
          onClick={() => handleRoleChange('teacher')}
          className={`cursor-pointer transition-all border rounded-2xl p-5 shadow-sm hover:shadow-md ${activeRole === 'teacher'
              ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/20 ring-1 ring-primary-500'
              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Total Teachers
            </span>
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-primary-600 dark:text-primary-400 tracking-tight">
              {stats.totalTeachers}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-medium">
              Educators managing channels & content
            </p>
          </div>
        </Card>

        {/* Total Parents Card */}
        <Card
          onClick={() => handleRoleChange('parent')}
          className={`cursor-pointer transition-all border rounded-2xl p-5 shadow-sm hover:shadow-md ${activeRole === 'parent'
              ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/20 ring-1 ring-primary-500'
              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Total Parents
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
              {stats.totalParents}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-medium">
              Guardians linked with student accounts
            </p>
          </div>
        </Card>
      </div>

      {/* THREE CATEGORY SUB-TABS (Oval / Pill Style) */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="inline-flex p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => handleRoleChange('student')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${activeRole === 'student'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>Students ({stats.totalStudents})</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('teacher')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${activeRole === 'teacher'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Teachers ({stats.totalTeachers})</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('parent')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${activeRole === 'parent'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Parents ({stats.totalParents})</span>
          </button>
        </div>

        {/* Filter controls: Search and Status */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md justify-end">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <Input
              placeholder={`Search ${activeRole} by name, email, ID...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 rounded-xl text-xs bg-white dark:bg-neutral-900"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs px-2.5 text-neutral-800 dark:text-neutral-200"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* USERS LIST TABLE */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase font-black tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Contact & ID</th>
                {activeRole === 'student' && <th className="py-3.5 px-4">Subscriptions</th>}
                {activeRole === 'student' && <th className="py-3.5 px-4 text-right">Total Spent</th>}
                {activeRole === 'teacher' && <th className="py-3.5 px-4">Channels</th>}
                {activeRole === 'teacher' && <th className="py-3.5 px-4 text-right">Total Earnings</th>}
                {activeRole === 'teacher' && <th className="py-3.5 px-4 text-right">Pending Payout</th>}
                {activeRole === 'parent' && <th className="py-3.5 px-4">Linked Students</th>}
                <th className="py-3.5 px-4">Registered</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-400">
                    {loading ? 'Loading users...' : `No ${activeRole}s found.`}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    {/* User profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          {u.name ? u.name.slice(0, 2).toUpperCase() : 'US'}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">{u.name}</p>
                          <p className="text-[10px] text-neutral-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact & ID */}
                    <td className="py-3 px-4 font-mono text-[10px]">
                      <span className="text-neutral-500 block">{u.phone || 'No phone'}</span>
                      <span className="text-neutral-400 block truncate max-w-[120px]">ID: {u.id.slice(0, 8)}...</span>
                    </td>

                    {/* Role-specific columns */}
                    {activeRole === 'student' && (
                      <td className="py-3 px-4">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {u.subscriptions?.length || 0} channel(s)
                        </span>
                      </td>
                    )}
                    {activeRole === 'student' && (
                      <td className="py-3 px-4 text-right font-bold text-neutral-900 dark:text-white">
                        {formatRupees(u.totalSpentPaise || 0)}
                      </td>
                    )}

                    {activeRole === 'teacher' && (
                      <td className="py-3 px-4">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {u.channels?.length || 0} channel(s)
                        </span>
                      </td>
                    )}
                    {activeRole === 'teacher' && (
                      <td className="py-3 px-4 text-right font-bold text-neutral-900 dark:text-white">
                        {formatRupees(u.earnings?.totalEarnings || 0)}
                      </td>
                    )}
                    {activeRole === 'teacher' && (
                      <td className="py-3 px-4 text-right font-bold text-primary-700 dark:text-primary-400">
                        {formatRupees(u.earnings?.pendingEarnings || 0)}
                      </td>
                    )}

                    {activeRole === 'parent' && (
                      <td className="py-3 px-4">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {u.linkedStudents?.length || 0} student(s)
                        </span>
                      </td>
                    )}

                    {/* Registration Date */}
                    <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {u.status === 'suspended' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300">
                          <UserX className="w-3 h-3" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                          <UserCheck className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedUser(u)}
                        className="h-8 px-2 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        <span>Details</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="py-3 px-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              Page {page} of {totalPages} &bull; Total {total} {activeRole}s
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-2.5 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 px-2.5 text-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* DRILL-DOWN DETAIL MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white font-bold flex items-center justify-center text-base shrink-0 shadow-sm">
                  {selectedUser.name ? selectedUser.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                    {selectedUser.name}
                  </h3>
                  <p className="text-xs text-neutral-400 capitalize">{selectedUser.role} Profile &bull; {selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Data Box */}
            <div className="space-y-3 text-xs bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-700">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-neutral-400 block text-[10px] font-bold uppercase">User ID</span>
                  <span className="font-mono text-neutral-900 dark:text-white">{selectedUser.id}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] font-bold uppercase">Phone Number</span>
                  <span className="text-neutral-900 dark:text-white">{selectedUser.phone || 'Not Provided'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                <div>
                  <span className="text-neutral-400 block text-[10px] font-bold uppercase">Registration Date</span>
                  <span className="text-neutral-900 dark:text-white">
                    {new Date(selectedUser.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] font-bold uppercase">Account Status</span>
                  <span className={`font-bold capitalize ${selectedUser.status === 'suspended' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedUser.status || 'Active'}
                  </span>
                </div>
              </div>

              {/* Student Extra Data */}
              {selectedUser.role === 'student' && (
                <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-neutral-400 block text-[10px] font-bold uppercase mb-1">
                    Enrolled Channels & Subscriptions
                  </span>
                  {selectedUser.subscriptions && selectedUser.subscriptions.length > 0 ? (
                    <div className="space-y-1">
                      {selectedUser.subscriptions.map((s: any, idx: number) => (
                        <div key={idx} className="flex justify-between font-medium">
                          <span>{s.channels?.name || 'Channel'}</span>
                          <span className="text-neutral-500">
                            Expires: {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-400">No active channel subscriptions.</span>
                  )}
                  <div className="mt-2 pt-2 border-t border-neutral-200/40 flex justify-between font-bold">
                    <span>Total Lifetime Spend:</span>
                    <span className="text-neutral-900 dark:text-white">{formatRupees(selectedUser.totalSpentPaise || 0)}</span>
                  </div>
                </div>
              )}

              {/* Teacher Extra Data */}
              {selectedUser.role === 'teacher' && (
                <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Channels Owned:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{selectedUser.channels?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Teacher Earnings (Base Share):</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {formatRupees(selectedUser.earnings?.totalEarnings || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-700 dark:text-primary-400 font-bold">Remaining Pending Disbursal:</span>
                    <span className="font-black text-primary-700 dark:text-primary-400">
                      {formatRupees(selectedUser.earnings?.pendingEarnings || 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* Parent Extra Data */}
              {selectedUser.role === 'parent' && (
                <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-neutral-400 block text-[10px] font-bold uppercase mb-1">
                    Linked Student Accounts
                  </span>
                  {selectedUser.linkedStudents && selectedUser.linkedStudents.length > 0 ? (
                    <div className="space-y-1">
                      {selectedUser.linkedStudents.map((st: any) => (
                        <div key={st.id} className="flex justify-between font-medium">
                          <span>{st.name}</span>
                          <span className="text-neutral-500 font-mono text-[10px]">{st.email}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-400">No linked student accounts.</span>
                  )}
                </div>
              )}
            </div>

            {/* Actions: Toggle Status and Close */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <Button
                variant={selectedUser.status === 'suspended' ? 'default' : 'danger'}
                size="sm"
                onClick={() => handleToggleStatus(selectedUser)}
                disabled={actionLoading}
                className="text-xs rounded-xl"
              >
                {selectedUser.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUser(null)}
                className="text-xs rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
