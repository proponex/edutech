'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserCheck,
  BookOpen,
  Award,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LogOut,
  Copy,
  Check,
  BarChart3,
  GraduationCap,
  User,
  RefreshCw,
  X,
  FileCheck,
  CheckCircle,
} from 'lucide-react';
import {
  Profile,
  ParentStudentRelation,
  ChildLearningAnalytics,
} from '@/types';

function ParentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || 'overview';
  const childParam = searchParams.get('child') || '';

  const supabase = createClient();

  // Auth & Profile
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Parent Data
  const [activeTab, setActiveTab] = useState<'overview' | 'children' | 'analysis'>(
    tabParam === 'children' || tabParam === 'analysis' ? tabParam : 'overview'
  );
  const [requests, setRequests] = useState<ParentStudentRelation[]>([]);
  const [children, setChildren] = useState<
    Array<{
      id: string;
      student_id: string;
      name: string;
      email: string;
      student_id_code: string;
      photo_url: string | null;
      relationship_type: string;
      class_name: string | null;
      board_name: string | null;
      enrolled_courses_count: number;
      overall_progress_percentage: number;
      connected_since: string;
    }>
  >([]);

  // Child Analytics
  const [selectedChildId, setSelectedChildId] = useState<string>(childParam);
  const [analytics, setAnalytics] = useState<ChildLearningAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Add Child Modal State
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [addStudentIdInput, setAddStudentIdInput] = useState('');
  const [addRelationshipType, setAddRelationshipType] = useState('Guardian');
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // General Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Copied student ID state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Synchronize tab parameter
  useEffect(() => {
    if (tabParam === 'children' || tabParam === 'analysis' || tabParam === 'overview') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Load Parent Profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          if (data.role !== 'parent') {
            router.push(`/${data.role}`);
            return;
          }
          setProfile(data as Profile);
        }
      } catch (err) {
        console.error('Failed to load parent profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase, router]);

  // Fetch Parent Requests & Linked Children
  const loadParentData = useCallback(async () => {
    try {
      const [reqRes, childRes] = await Promise.all([
        fetch('/api/parent/requests'),
        fetch('/api/parent/children'),
      ]);

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData.requests || []);
      }

      if (childRes.ok) {
        const childData = await childRes.json();
        const loadedChildren = childData.children || [];
        setChildren(loadedChildren);

        // Auto-select child if not selected or current selection is invalid
        if (loadedChildren.length > 0) {
          setSelectedChildId((prev) => {
            if (prev && loadedChildren.some((c: any) => c.student_id === prev)) {
              return prev;
            }
            return loadedChildren[0].student_id;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load parent data:', err);
    }
  }, []);

  useEffect(() => {
    if (!loading && profile) {
      loadParentData();
    }
  }, [loading, profile, loadParentData]);

  // Fetch Analytics for Selected Child
  const loadChildAnalytics = useCallback(async (studentId: string) => {
    if (!studentId) {
      setAnalytics(null);
      return;
    }
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await fetch(`/api/parent/children/${studentId}/analytics`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve child learning analytics.');
      }
      setAnalytics(data.analytics);
    } catch (err: any) {
      setAnalyticsError(err?.message || 'Error loading analytics.');
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'analysis' && selectedChildId) {
      loadChildAnalytics(selectedChildId);
    }
  }, [activeTab, selectedChildId, loadChildAnalytics]);

  // Handle Switch to Analysis for a specific child
  const handleViewChildAnalysis = (studentId: string) => {
    setSelectedChildId(studentId);
    setActiveTab('analysis');
    router.push(`/parent?tab=analysis&child=${studentId}`);
  };

  // Submit Add Child
  const handleAddChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);

    const trimmedId = addStudentIdInput.trim().toUpperCase();
    if (!trimmedId) {
      setAddError('Please enter a Student ID (e.g. ED-2026-000001).');
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await fetch('/api/parent/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id_code: trimmedId,
          relationship_type: addRelationshipType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send connection request.');
      }

      setAddSuccess(
        `Connection request sent to ${data.studentName || 'student'} (${data.studentIdCode})! Awaiting student approval.`
      );
      setAddStudentIdInput('');
      await loadParentData();

      setTimeout(() => {
        setIsAddChildOpen(false);
        setAddSuccess(null);
      }, 2000);
    } catch (err: any) {
      setAddError(err?.message || 'Failed to send request.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Cancel Pending Request
  const handleCancelRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/parent/requests/${requestId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel request.');
      }
      setNotification({ type: 'success', text: 'Connection request cancelled.' });
      await loadParentData();
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'Failed to cancel request.' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Copy ID helper
  const handleCopy = (idCode: string) => {
    navigator.clipboard.writeText(idCode);
    setCopiedId(idCode);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const totalEnrolled = children.reduce((sum, c) => sum + c.enrolled_courses_count, 0);
  const overallAvgProgress =
    children.length > 0
      ? Math.round(
          children.reduce((sum, c) => sum + c.overall_progress_percentage, 0) / children.length
        )
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            <div className="h-28 w-full bg-neutral-200 dark:bg-neutral-800 rounded-3xl" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ======================================================================= */}
        {/* TOP GREETING & HEADER BAR */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="primary" className="text-xs font-semibold uppercase tracking-wider">
                Parent Portal
              </Badge>
              <Badge variant="success" className="text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified Access
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white font-display">
              Welcome back{profile?.name ? `, ${profile.name}` : ''}!
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Monitor your children&apos;s learning progress, enrolled courses, and academic achievements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsAddChildOpen(true)}
              className="flex items-center gap-2 font-bold shadow-md shadow-primary-500/20 cursor-pointer"
              id="add-child-button"
            >
              <Plus className="w-4 h-4" />
              <span>Add Child</span>
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-950/30 px-4 py-2 text-sm font-semibold transition-all shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-neutral-500 hover:text-red-600 dark:hover:text-red-400" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>

        {/* NOTIFICATION MESSAGE */}
        {notification && (
          <div
            className={`p-4 rounded-2xl text-sm flex items-center gap-3 animate-in fade-in duration-150 ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span>{notification.text}</span>
          </div>
        )}

        {/* ======================================================================= */}
        {/* DASHBOARD TAB NAVIGATION BAR */}
        {/* ======================================================================= */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('overview');
              router.push('/parent?tab=overview');
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-primary-500 text-neutral-950 shadow-sm shadow-primary-500/20'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('children');
              router.push('/parent?tab=children');
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'children'
                ? 'bg-primary-500 text-neutral-950 shadow-sm shadow-primary-500/20'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>My Children</span>
            <Badge variant="secondary" className="text-[10px] ml-1">
              {children.length}
            </Badge>
          </button>

          <button
            onClick={() => {
              setActiveTab('analysis');
              router.push(
                selectedChildId
                  ? `/parent?tab=analysis&child=${selectedChildId}`
                  : '/parent?tab=analysis'
              );
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'analysis'
                ? 'bg-primary-500 text-neutral-950 shadow-sm shadow-primary-500/20'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Child Analysis</span>
          </button>
        </div>

        {/* ======================================================================= */}
        {/* VIEW 1: OVERVIEW TAB */}
        {/* ======================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    Linked Children
                  </span>
                  <Users className="w-4 h-4 text-primary-500" />
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                    {children.length}
                  </span>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {children.length === 1 ? '1 active connection' : `${children.length} active connections`}
                  </p>
                </div>
              </Card>

              <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    Enrolled Courses
                  </span>
                  <BookOpen className="w-4 h-4 text-primary-500" />
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                    {totalEnrolled}
                  </span>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Across all linked children
                  </p>
                </div>
              </Card>

              <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    Average Progress
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                    {overallAvgProgress}%
                  </span>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    Curriculum completion
                  </p>
                </div>
              </Card>

              <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    Pending Requests
                  </span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                    {pendingRequests.length}
                  </span>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                    Awaiting student approval
                  </p>
                </div>
              </Card>
            </div>

            {/* PENDING REQUESTS BANNER (IF ANY) */}
            {pendingRequests.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Connection Requests Awaiting Student Approval</span>
                  </h3>
                </div>

                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 flex items-center justify-center font-bold text-xs">
                          {req.student?.name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-neutral-900 dark:text-white">
                              {req.student?.name || 'Student'}
                            </span>
                            <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-800 px-2 py-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                              {req.student?.student_id_code}
                            </span>
                            <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300">
                              Awaiting Approval
                            </Badge>
                          </div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            Sent on {new Date(req.created_at).toLocaleDateString()} • Student must accept from their Student Dashboard
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelRequest(req.id)}
                        className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-red-600 border-neutral-300 dark:border-neutral-700 self-end sm:self-center cursor-pointer"
                      >
                        Cancel Request
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MY CHILDREN QUICK LIST */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-neutral-950 dark:text-white font-display">
                    Connected Children
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Select a child to inspect curriculum progress and test scores.
                  </p>
                </div>
                {children.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('children')}
                    className="text-xs font-bold"
                  >
                    View All
                  </Button>
                )}
              </div>

              {children.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {children.map((child) => (
                    <Card
                      key={child.id}
                      className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-6 hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-600 transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary-100 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 shrink-0 flex items-center justify-center font-bold text-lg text-primary-700 dark:text-primary-300">
                            {child.photo_url ? (
                              <Image
                                src={child.photo_url}
                                alt={child.name}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            ) : (
                              child.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-base font-extrabold text-neutral-900 dark:text-white truncate">
                              {child.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-800">
                                {child.student_id_code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(child.student_id_code)}
                                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                                title="Copy Student ID"
                              >
                                {copiedId === child.student_id_code ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 block mt-1">
                              {child.class_name || 'Student'} • {child.relationship_type}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-neutral-600 dark:text-neutral-400">
                              Learning Progress
                            </span>
                            <span className="text-primary-600 dark:text-primary-400 font-bold">
                              {child.overall_progress_percentage}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(child.overall_progress_percentage, 3)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-neutral-500 pt-0.5">
                            <span>{child.enrolled_courses_count} Enrolled Courses</span>
                            <span>Active Syllabus</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleViewChildAnalysis(child.student_id)}
                          className="w-full font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>View Analysis</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-10 text-center space-y-4 max-w-xl mx-auto shadow-sm">
                  <div className="w-16 h-16 rounded-3xl bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 flex items-center justify-center mx-auto">
                    <Users className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
                      No Children Linked Yet
                    </h4>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                      Connect your child using their unique Student ID (ED-YYYY-NNNNNN). Once the student approves the request, their course progress and analytics will appear here.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setIsAddChildOpen(true)}
                      className="font-bold shadow-md shadow-primary-500/20"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Child Now
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW 2: MY CHILDREN TAB */}
        {/* ======================================================================= */}
        {activeTab === 'children' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-neutral-950 dark:text-white font-display">
                  My Children
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  Manage all accepted and active child connections.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddChildOpen(true)}
                className="font-bold flex items-center gap-1.5 shadow-sm self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Child</span>
              </Button>
            </div>

            {children.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {children.map((child) => (
                  <Card
                    key={child.id}
                    className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-600 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary-100 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 shrink-0 flex items-center justify-center font-bold text-lg text-primary-700 dark:text-primary-300">
                          {child.photo_url ? (
                            <Image
                              src={child.photo_url}
                              alt={child.name}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            child.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base font-extrabold text-neutral-900 dark:text-white truncate">
                            {child.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-800">
                              {child.student_id_code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(child.student_id_code)}
                              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                              title="Copy Student ID"
                            >
                              {copiedId === child.student_id_code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 block mt-1">
                            {child.class_name || 'Classroom'} • {child.relationship_type}
                          </span>
                        </div>
                      </div>

                      {/* Progress Stats */}
                      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-neutral-600 dark:text-neutral-400">Overall Progress</span>
                          <span className="text-primary-600 dark:text-primary-400 font-bold">
                            {child.overall_progress_percentage}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(child.overall_progress_percentage, 3)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-neutral-500 pt-0.5">
                          <span>{child.enrolled_courses_count} Enrolled Courses</span>
                          <span>Active Connection</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewChildAnalysis(child.student_id)}
                        className="w-full font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>View Analysis</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-neutral-900 dark:text-white font-display">
                    No Children Linked
                  </h4>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                    You have not linked any child accounts yet. Click below to enter your child&apos;s Student ID.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setIsAddChildOpen(true)}
                    className="font-bold shadow-md shadow-primary-500/20"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Child
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW 3: CHILD ANALYSIS TAB */}
        {/* ======================================================================= */}
        {activeTab === 'analysis' && (
          <div className="space-y-8">
            {/* CHILD SELECTOR BAR */}
            {children.length > 0 ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                      Currently Viewing Child
                    </span>
                    <span className="text-base font-extrabold text-neutral-900 dark:text-white">
                      {children.find((c) => c.student_id === selectedChildId)?.name || 'Select Child'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {children.map((child) => (
                    <button
                      key={child.student_id}
                      onClick={() => handleViewChildAnalysis(child.student_id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        selectedChildId === child.student_id
                          ? 'bg-primary-500 text-neutral-950 border-primary-500 shadow-xs ring-2 ring-primary-400'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-8 text-center space-y-3">
                <Users className="w-10 h-10 text-neutral-400 mx-auto" />
                <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                  No accepted children to analyze.
                </h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Once your child accepts your connection request, their learning metrics will appear here.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddChildOpen(true)}
                  className="font-bold"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Child
                </Button>
              </Card>
            )}

            {/* ANALYTICS CONTENT */}
            {analyticsLoading ? (
              <div className="space-y-6">
                <div className="h-28 bg-neutral-100 dark:bg-neutral-800/60 rounded-3xl animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 bg-neutral-100 dark:bg-neutral-800/60 rounded-2xl animate-pulse" />
                  ))}
                </div>
                <div className="h-64 bg-neutral-100 dark:bg-neutral-800/60 rounded-3xl animate-pulse" />
              </div>
            ) : analyticsError ? (
              <Card className="border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 rounded-3xl p-8 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                  Unable to load child analytics
                </h4>
                <p className="text-xs text-red-600 dark:text-red-400 max-w-md mx-auto">
                  {analyticsError}
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadChildAnalytics(selectedChildId)}
                    className="text-xs font-bold flex items-center gap-1.5 mx-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </Button>
                </div>
              </Card>
            ) : analytics ? (
              <div className="space-y-8">
                {/* 1. CHILD PROFILE HEADER */}
                <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-7 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary-100 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 flex items-center justify-center font-bold text-2xl text-primary-700 dark:text-primary-300 shrink-0">
                        {analytics.student.photo_url ? (
                          <Image
                            src={analytics.student.photo_url}
                            alt={analytics.student.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          analytics.student.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-950 dark:text-white">
                            {analytics.student.name}
                          </h3>
                          <Badge variant="success" className="text-[10px]">
                            {analytics.relationship.relationship_type || 'Active Connection'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-800">
                            {analytics.student.student_id_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(analytics.student.student_id_code)}
                            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                            title="Copy Student ID"
                          >
                            {copiedId === analytics.student.student_id_code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {analytics.student.class_name || 'Enrolled Student'} • {analytics.student.board_name || 'Curriculum'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadChildAnalytics(selectedChildId)}
                        className="text-xs font-semibold flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh Data
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* 2. LEARNING OVERVIEW METRICS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      Enrolled Courses
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                        {analytics.overview.total_courses}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {analytics.overview.completed_courses} Completed
                      </span>
                    </div>
                  </Card>

                  <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      Overall Progress
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        {analytics.overview.overall_completion_percentage}%
                      </span>
                      <span className="text-xs text-neutral-500">
                        {analytics.overview.in_progress_courses} In Progress
                      </span>
                    </div>
                  </Card>

                  <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      Lessons Completed
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                        {analytics.overview.total_lessons_completed} / {analytics.overview.total_published_lessons}
                      </span>
                      <span className="text-xs text-neutral-500">
                        Published Lessons
                      </span>
                    </div>
                  </Card>

                  <Card className="p-5 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      Assessment Average
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
                        {analytics.overview.average_assessment_score}%
                      </span>
                      <span className="text-xs text-neutral-500">
                        {analytics.overview.total_assessments_taken} Tests Taken
                      </span>
                    </div>
                  </Card>
                </div>

                {/* 3. ENROLLED COURSES PROGRESS SECTION */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2 font-display">
                      <BookOpen className="w-5 h-5 text-primary-500" />
                      <span>Enrolled Courses &amp; Progress</span>
                    </h4>
                    <span className="text-xs text-neutral-500">
                      {analytics.courses.length} {analytics.courses.length === 1 ? 'course' : 'courses'}
                    </span>
                  </div>

                  {analytics.courses.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {analytics.courses.map((course) => (
                        <Card
                          key={course.channel_id}
                          className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-4">
                            <div className="flex items-start gap-4">
                              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary-100 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 shrink-0 flex items-center justify-center font-bold text-primary-700 dark:text-primary-300">
                                {course.channel_photo_url ? (
                                  <Image
                                    src={course.channel_photo_url}
                                    alt={course.channel_name}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <GraduationCap className="w-8 h-8" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      course.status === 'completed'
                                        ? 'success'
                                        : course.status === 'in_progress'
                                        ? 'primary'
                                        : 'secondary'
                                    }
                                    className="text-[10px]"
                                  >
                                    {course.status === 'completed'
                                      ? 'Completed'
                                      : course.status === 'in_progress'
                                      ? 'In Progress'
                                      : 'Not Started'}
                                  </Badge>
                                  {course.class_name && (
                                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                      {course.class_name}
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-base font-extrabold text-neutral-900 dark:text-white truncate mt-1">
                                  {course.channel_name}
                                </h5>
                                <div className="flex items-center gap-2 mt-1">
                                  {course.teacher_photo_url ? (
                                    <Image
                                      src={course.teacher_photo_url}
                                      alt={course.teacher_name}
                                      width={20}
                                      height={20}
                                      className="w-5 h-5 rounded-full object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <User className="w-4 h-4 text-neutral-400" />
                                  )}
                                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    Teacher: {course.teacher_name}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Progress details */}
                            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 space-y-2">
                              <div className="flex justify-between text-xs font-bold">
                                <span className="text-neutral-600 dark:text-neutral-400">
                                  Course Progress
                                </span>
                                <span className="text-primary-600 dark:text-primary-400 font-extrabold">
                                  {course.progress_percent}%
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(course.progress_percent, 2)}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[11px] text-neutral-500 pt-1">
                                <span>
                                  Lessons completed: <strong>{course.completed_lessons} / {course.total_lessons}</strong>
                                </span>
                                <span>
                                  {course.last_activity_at
                                    ? `Last active: ${new Date(course.last_activity_at).toLocaleDateString()}`
                                    : 'Enrolled'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-8 text-center space-y-2">
                      <BookOpen className="w-10 h-10 text-neutral-400 mx-auto" />
                      <h5 className="text-sm font-bold text-neutral-900 dark:text-white">
                        No enrolled courses yet.
                      </h5>
                      <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                        Course progress and lesson breakdown will appear here once your child enrolls in classroom channels.
                      </p>
                    </Card>
                  )}
                </div>

                {/* 4. ASSESSMENTS & EXAMS SECTION */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2 font-display">
                      <Award className="w-5 h-5 text-amber-500" />
                      <span>Assessments &amp; Test Records</span>
                    </h4>
                    <span className="text-xs text-neutral-500">
                      {analytics.assessments.length} {analytics.assessments.length === 1 ? 'record' : 'records'}
                    </span>
                  </div>

                  {analytics.assessments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analytics.assessments.map((test, idx) => (
                        <Card
                          key={`${test.quiz_id}-${idx}`}
                          className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="text-sm font-bold text-neutral-900 dark:text-white">
                                {test.quiz_title}
                              </h5>
                              <span className="text-[11px] text-neutral-400 block mt-0.5">
                                Submitted {new Date(test.submitted_at).toLocaleDateString()}
                              </span>
                            </div>
                            <Badge
                              variant={test.percentage >= 70 ? 'success' : test.percentage >= 40 ? 'primary' : 'secondary'}
                              className="text-xs font-bold"
                            >
                              {test.percentage}%
                            </Badge>
                          </div>

                          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 text-xs flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                            <span>
                              Score: <strong className="text-neutral-900 dark:text-white">{test.score} / {test.total_marks}</strong>
                            </span>
                            <span>
                              Correct: <strong className="text-emerald-600 dark:text-emerald-400">{test.correct_count}</strong>
                              {test.wrong_count > 0 && ` • Wrong: ${test.wrong_count}`}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-8 text-center space-y-2">
                      <FileCheck className="w-10 h-10 text-neutral-400 mx-auto" />
                      <h5 className="text-sm font-bold text-neutral-900 dark:text-white">
                        No assessment attempts recorded.
                      </h5>
                      <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                        Quiz attempts, scores, and accuracy percentages will be tracked here when your child completes assessments.
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>

      {/* ======================================================================= */}
      {/* MODAL: ADD CHILD WITH STUDENT ID (ED-YYYY-NNNNNN) */}
      {/* ======================================================================= */}
      {isAddChildOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Add Your Child
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Enter child&apos;s unique Student ID
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddChildOpen(false);
                  setAddError(null);
                  setAddSuccess(null);
                }}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddChildSubmit} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 text-xs flex items-center gap-2 border border-red-300 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {addSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{addSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="add-student-id-input"
                  className="text-xs font-bold text-neutral-700 dark:text-neutral-300"
                >
                  Child&apos;s Student ID <span className="text-red-500">*</span>
                </label>
                <Input
                  id="add-student-id-input"
                  name="student_id"
                  type="text"
                  required
                  placeholder="e.g. ED-2026-000001"
                  value={addStudentIdInput}
                  onChange={(e) => setAddStudentIdInput(e.target.value.toUpperCase())}
                  className="font-mono text-sm tracking-wide uppercase"
                  autoFocus
                />
                <p className="text-[11px] text-neutral-400">
                  Format: ED-YYYY-NNNNNN. Your child can find their Student ID on their Student Dashboard.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="add-relationship-type"
                  className="text-xs font-bold text-neutral-700 dark:text-neutral-300"
                >
                  Relationship Label
                </label>
                <select
                  id="add-relationship-type"
                  name="relationship_type"
                  value={addRelationshipType}
                  onChange={(e) => setAddRelationshipType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsAddChildOpen(false)}
                  disabled={submittingAdd}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={submittingAdd}
                  className="font-bold shadow-md shadow-primary-500/20"
                  id="send-connection-request-button"
                >
                  {submittingAdd ? 'Sending...' : 'Send Connection Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

export default function ParentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
        </div>
      }
    >
      <ParentDashboardContent />
    </Suspense>
  );
}
