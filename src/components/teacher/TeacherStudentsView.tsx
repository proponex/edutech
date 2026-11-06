'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  BookOpen,
  Video,
  FileQuestion,
  FileText,
  Search,
  RefreshCw,
  X,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChannelItem, Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface DetailedStudentProfile {
  studentId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  className?: string | null;
  boardName?: string | null;
  channelId: string;
  channelName: string;
  // Subscriptions (per channel/subject)
  subscriptions: Array<{
    id: string;
    channelId: string;
    channelName: string;
    subjectName?: string | null;
    packageType: string;
    status: string;
    paymentDate?: string | null;
    amountPaidPaise?: number;
    teacherEarningsPaise?: number;
    startsAt?: string | null;
    expiresAt?: string | null;
    daysRemaining: number;
  }>;
  // Academic Performance
  academic: {
    totalContentItems: number;
    completedItems: number;
    percentageCompleted: number;
    videosCompleted: number;
    totalVideos: number;
    quizzesCompleted: number;
    totalQuizzes: number;
    averageScore: number | null; // null if no assessments completed
    subjectWiseProgress: Record<string, { total: number; completed: number; percentage: number }>;
    chapterWiseProgress: Record<string, { total: number; completed: number; percentage: number }>;
    recentAssessments: Array<{
      contentId: string;
      title: string;
      contentType: string;
      score: number | null;
      completedAt: string;
    }>;
  };
}

interface ChannelGroup {
  channel: ChannelItem;
  classLabel: string;
  activeStudents: DetailedStudentProfile[];
}

export function TeacherStudentsView({ teacherId }: { teacherId: string }) {
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedStudent, setSelectedStudent] = useState<DetailedStudentProfile | null>(null);

  const supabase = createClient();

  const loadActiveStudents = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch teacher channels
      const { data: channels, error: chErr } = await supabase
        .from('channels')
        .select(`
          id, name, description, class_id,
          classes:classes(id, name),
          channel_classes(class_id, class:classes(id, name)),
          specializations:channel_specializations(subject_name)
        `)
        .eq('teacher_id', teacherId);

      if (chErr || !channels || channels.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const channelIds = channels.map((c) => c.id);
      const now = new Date();

      // 2. Fetch ACTIVE subscriptions only (strictly exclude expired/inactive)
      const { data: subs, error: subErr } = await supabase
        .from('channel_subscriptions')
        .select('*')
        .in('channel_id', channelIds)
        .eq('status', 'active');

      if (subErr || !subs || subs.length === 0) {
        setGroups(
          channels.map((ch: any) => ({
            channel: ch,
            classLabel: ch.channel_classes?.[0]?.class?.name || ch.classes?.name || 'Class',
            activeStudents: [],
          }))
        );
        setLoading(false);
        return;
      }

      // Filter out any where expires_at <= now
      const activeSubs = subs.filter((s) => !s.expires_at || new Date(s.expires_at) > now);

      if (activeSubs.length === 0) {
        setGroups(
          channels.map((ch: any) => ({
            channel: ch,
            classLabel: ch.channel_classes?.[0]?.class?.name || ch.classes?.name || 'Class',
            activeStudents: [],
          }))
        );
        setLoading(false);
        return;
      }

      const activeStudentIds = Array.from(new Set(activeSubs.map((s) => s.student_id)));

      // 3. Fetch Student Profiles & Academic data
      const [
        { data: profiles },
        { data: studentsExtra },
        { data: academicProfiles },
        { data: payments },
        { data: earnings },
        { data: progressList },
        { data: videos },
        { data: quizzes },
        { data: homework },
        { data: units },
      ] = await Promise.all([
        supabase.from('profiles').select('*').in('id', activeStudentIds),
        supabase.from('students').select('*').in('id', activeStudentIds),
        supabase.from('student_academic_profiles')
          .select('student_id, class:classes(name), board:boards(name)')
          .in('student_id', activeStudentIds)
          .eq('is_current', true),
        supabase.from('payment_transactions').select('*').in('student_id', activeStudentIds).eq('status', 'captured'),
        supabase.from('teacher_earnings').select('*').eq('teacher_id', teacherId),
        supabase.from('student_content_progress').select('*').in('student_id', activeStudentIds).in('channel_id', channelIds),
        supabase.from('videos').select('id, channel_id, subject_name, unit_id, title').in('channel_id', channelIds),
        supabase.from('quizzes').select('id, channel_id, subject_name, unit_id, title').in('channel_id', channelIds),
        supabase.from('homework').select('id, channel_id, subject_name, unit_id, title').in('channel_id', channelIds),
        supabase.from('units').select('id, channel_id, subject_name, title').in('channel_id', channelIds),
      ]);

      const profMap = new Map((profiles || []).map((p) => [p.id, p]));
      const extraMap = new Map((studentsExtra || []).map((s) => [s.id, s]));
      const acadMap = new Map((academicProfiles || []).map((a) => [a.student_id, a]));
      const channelMap = new Map(channels.map((c: any) => [c.id, c]));
      const unitMap = new Map((units || []).map((u) => [u.id, u.title]));

      // Build groups by Channel
      const builtGroups: ChannelGroup[] = [];
      const autoExpanded: Record<string, boolean> = {};

      for (const ch of channels as any[]) {
        const classLabel = ch.channel_classes?.[0]?.class?.name || ch.classes?.name || 'Class';
        const chSubs = activeSubs.filter((s) => s.channel_id === ch.id);
        const chStudentsMap = new Map<string, DetailedStudentProfile>();

        // Content in this channel
        const chVideos = (videos || []).filter((v) => v.channel_id === ch.id);
        const chQuizzes = (quizzes || []).filter((q) => q.channel_id === ch.id);
        const chHw = (homework || []).filter((h) => h.channel_id === ch.id);
        const totalChannelContentCount = chVideos.length + chQuizzes.length + chHw.length;

        chSubs.forEach((sub) => {
          const sid = sub.student_id;
          const prof = profMap.get(sid);
          const extra = extraMap.get(sid);
          const acad = acadMap.get(sid);

          // Subscription info
          const linkedTx = (payments || []).find((p) => p.student_id === sid);
          const linkedEarn = (earnings || []).find((e) => e.transaction_id === linkedTx?.id || e.order_id === sub.order_id);
          const daysRem = sub.expires_at
            ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : 28;

          const subDetail = {
            id: sub.id,
            channelId: ch.id,
            channelName: ch.name,
            subjectName: sub.subject_name || 'All Subjects',
            packageType: sub.package_type || 'channel',
            status: sub.status || 'active',
            paymentDate: linkedTx?.created_at || sub.created_at,
            amountPaidPaise: linkedTx ? Number(linkedTx.amount_paise) : 120000,
            teacherEarningsPaise: linkedEarn ? Number(linkedEarn.teacher_share_paise) : 100000,
            startsAt: sub.starts_at || sub.created_at,
            expiresAt: sub.expires_at,
            daysRemaining: daysRem,
          };

          if (!chStudentsMap.has(sid)) {
            // Student Content Progress in this channel
            const stProg = (progressList || []).filter((p) => p.student_id === sid && p.channel_id === ch.id);
            const completedItems = stProg.filter((p) => p.status === 'completed');
            const completedVideos = completedItems.filter((p) => p.content_type === 'video').length;
            const completedQuizzes = completedItems.filter((p) => p.content_type === 'quiz').length;

            // Assessments scores (only real recorded scores)
            const scoredItems = completedItems.filter((p) => typeof p.score === 'number' && p.score !== null);
            const avgScore = scoredItems.length > 0
              ? Math.round(scoredItems.reduce((acc, curr) => acc + Number(curr.score), 0) / scoredItems.length)
              : null;

            // Subject-wise progress
            const subjMap: Record<string, { total: number; completed: number; percentage: number }> = {};
            chVideos.forEach((v) => {
              const sn = v.subject_name || 'General';
              if (!subjMap[sn]) subjMap[sn] = { total: 0, completed: 0, percentage: 0 };
              subjMap[sn].total++;
              if (completedItems.some((c) => c.content_id === v.id)) {
                subjMap[sn].completed++;
              }
            });
            Object.keys(subjMap).forEach((k) => {
              if (subjMap[k].total > 0) {
                subjMap[k].percentage = Math.round((subjMap[k].completed / subjMap[k].total) * 100);
              }
            });

            // Chapter-wise progress
            const chapMap: Record<string, { total: number; completed: number; percentage: number }> = {};
            chVideos.forEach((v) => {
              if (v.unit_id) {
                const uTitle = unitMap.get(v.unit_id) || 'Chapter';
                if (!chapMap[uTitle]) chapMap[uTitle] = { total: 0, completed: 0, percentage: 0 };
                chapMap[uTitle].total++;
                if (completedItems.some((c) => c.content_id === v.id)) {
                  chapMap[uTitle].completed++;
                }
              }
            });
            Object.keys(chapMap).forEach((k) => {
              if (chapMap[k].total > 0) {
                chapMap[k].percentage = Math.round((chapMap[k].completed / chapMap[k].total) * 100);
              }
            });

            const videosCompleted = completedItems.filter((c) => c.content_type === 'video').length;
            const quizzesCompleted = completedItems.filter((c) => c.content_type === 'quiz').length;

            const pctTotal = totalChannelContentCount > 0
              ? Math.round((completedItems.length / totalChannelContentCount) * 100)
              : 0;

            chStudentsMap.set(sid, {
              studentId: sid,
              name: prof?.name || 'Enrolled Student',
              email: prof?.email || '',
              phone: prof?.phone || extra?.phone || null,
              className: (acad as any)?.class?.name || classLabel,
              boardName: (acad as any)?.board?.name || 'State Board',
              channelId: ch.id,
              channelName: ch.name,
              subscriptions: [subDetail],
              academic: {
                totalContentItems: totalChannelContentCount,
                completedItems: completedItems.length,
                percentageCompleted: pctTotal,
                videosCompleted,
                totalVideos: chVideos.length,
                quizzesCompleted,
                totalQuizzes: chQuizzes.length,
                averageScore: avgScore,
                subjectWiseProgress: subjMap,
                chapterWiseProgress: chapMap,
                recentAssessments: scoredItems.slice(0, 5).map((p) => ({
                  contentId: p.content_id,
                  title: p.content_type === 'quiz' ? 'Quiz Assessment' : 'Content Item',
                  contentType: p.content_type,
                  score: p.score,
                  completedAt: p.updated_at,
                })),
              },
            });
          } else {
            // Already added student from another subscription in this channel
            const existingStudent = chStudentsMap.get(sid)!;
            existingStudent.subscriptions.push(subDetail);
          }
        });

        const activeStudentList = Array.from(chStudentsMap.values());
        builtGroups.push({
          channel: ch,
          classLabel,
          activeStudents: activeStudentList,
        });

        // Auto-expand groups that have students
        if (activeStudentList.length > 0) {
          autoExpanded[ch.id] = true;
        }
      }

      setGroups(builtGroups);
      setExpandedSections(autoExpanded);
    } catch (err) {
      console.error('[TeacherStudentsView] Error loading students:', err);
    } finally {
      setLoading(false);
    }
  }, [teacherId, supabase]);

  useEffect(() => {
    loadActiveStudents();
  }, [loadActiveStudents]);

  const toggleSection = (channelId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [channelId]: !prev[channelId],
    }));
  };

  const formatRupees = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              <Users className="w-3.5 h-3.5 text-primary-600" />
              Tab 2 &bull; Active Students Directory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            Active Subscribed Students
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Organized by class and channel. Displays only learners with active subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search active students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadActiveStudents}
            disabled={loading}
            className="text-xs h-9 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-neutral-100 dark:bg-neutral-800/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-neutral-300 dark:border-neutral-800 rounded-3xl">
          <Users className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">No Channels Found</h3>
          <p className="text-xs text-neutral-500 mt-1">Create a channel in Overview to start enrolling students.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const isExpanded = Boolean(expandedSections[group.channel.id]);
            const filteredStudents = group.activeStudents.filter((st) => {
              if (!searchTerm) return true;
              const term = searchTerm.toLowerCase();
              return (
                st.name.toLowerCase().includes(term) ||
                st.studentId.toLowerCase().includes(term) ||
                st.email?.toLowerCase().includes(term)
              );
            });

            return (
              <div
                key={group.channel.id}
                className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-sm"
              >
                {/* Expandable Class/Channel Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(group.channel.id)}
                  className="w-full px-6 py-4.5 bg-neutral-50/70 dark:bg-neutral-800/40 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/70 border-b border-neutral-200/80 dark:border-neutral-800 transition-colors flex items-center justify-between cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-950/80 text-primary-800 dark:text-primary-300 font-bold flex items-center justify-center text-sm">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-neutral-900 dark:text-white font-display">
                        Class {group.classLabel} – {group.channel.name} ({group.activeStudents.length} active students)
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        {group.activeStudents.length} Active {group.activeStudents.length === 1 ? 'Student' : 'Students'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                      {group.activeStudents.length} Active
                    </span>
                    <div className="p-1 rounded-lg text-neutral-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {/* Section Content: Table */}
                {isExpanded && (
                  <div className="animate-in fade-in duration-150">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-100 dark:border-neutral-800 text-neutral-500 uppercase font-black tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-5 w-16 text-center">S.No</th>
                            <th className="py-3 px-5">Student Name</th>
                            <th className="py-3 px-5">Student ID</th>
                            <th className="py-3 px-5 text-center w-24">View</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-10 text-center text-neutral-400">
                                {searchTerm ? 'No active students matching search.' : 'No active subscribed students in this channel.'}
                              </td>
                            </tr>
                          ) : (
                            filteredStudents.map((student, sIdx) => (
                              <tr
                                key={student.studentId}
                                className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                              >
                                {/* S.No */}
                                <td className="py-3.5 px-5 text-center font-bold text-neutral-500">
                                  {sIdx + 1}
                                </td>

                                {/* Student Name */}
                                <td className="py-3.5 px-5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                                      {student.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <span className="font-bold text-neutral-900 dark:text-white block text-sm">
                                        {student.name}
                                      </span>
                                      <span className="text-[10px] text-neutral-400">{student.email || 'No email provided'}</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Student ID */}
                                <td className="py-3.5 px-5 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                                  {student.studentId}
                                </td>

                                {/* View Arrow Button */}
                                <td className="py-3.5 px-5 text-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedStudent(student)}
                                    className="w-8 h-8 p-0 rounded-full text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/60 inline-flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                                    title="View Student Profile & Academic Progress"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STUDENT DETAILED PROFILE MODAL */}
      {/* ========================================================================= */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white font-extrabold flex items-center justify-center text-base shrink-0 shadow-sm">
                  {selectedStudent.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                    {selectedStudent.name}
                  </h3>
                  <p className="text-xs text-neutral-400 capitalize">
                    Active Subscriber &bull; {selectedStudent.className} &bull; {selectedStudent.boardName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. STUDENT INFORMATION */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Student Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Student ID</span>
                  <span className="font-mono text-neutral-900 dark:text-white font-semibold">{selectedStudent.studentId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Email Address</span>
                  <span className="text-neutral-900 dark:text-white">{selectedStudent.email || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Phone Number</span>
                  <span className="text-neutral-900 dark:text-white">{selectedStudent.phone || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Enrolled Channel</span>
                  <span className="text-primary-700 dark:text-primary-400 font-bold">{selectedStudent.channelName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Grade / Class</span>
                  <span className="text-neutral-900 dark:text-white">{selectedStudent.className || 'General'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Educational Board</span>
                  <span className="text-neutral-900 dark:text-white">{selectedStudent.boardName || 'State Board'}</span>
                </div>
              </div>
            </div>

            {/* 2. ACADEMIC PERFORMANCE */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Academic Performance &amp; Learning Progress
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 text-center">
                  <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase block">Completed</span>
                  <span className="text-2xl font-black text-neutral-900 dark:text-white">
                    {selectedStudent.academic.percentageCompleted}%
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {selectedStudent.academic.completedItems} / {selectedStudent.academic.totalContentItems} items
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 text-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Videos Watched</span>
                  <span className="text-2xl font-black text-neutral-900 dark:text-white">
                    {selectedStudent.academic.videosCompleted}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    out of {selectedStudent.academic.totalVideos} videos
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 text-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Quizzes Done</span>
                  <span className="text-2xl font-black text-neutral-900 dark:text-white">
                    {selectedStudent.academic.quizzesCompleted}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    out of {selectedStudent.academic.totalQuizzes} quizzes
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 text-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Avg Score</span>
                  <span className="text-2xl font-black text-neutral-900 dark:text-white">
                    {selectedStudent.academic.averageScore !== null ? `${selectedStudent.academic.averageScore}%` : 'N/A'}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {selectedStudent.academic.averageScore !== null ? 'Graded assessments' : 'No tests taken'}
                  </span>
                </div>
              </div>

              {/* Subject-Wise & Chapter-Wise Breakdown */}
              {Object.keys(selectedStudent.academic.subjectWiseProgress).length > 0 && (
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Subject-Wise Syllabus Progress
                  </span>
                  <div className="space-y-2">
                    {Object.entries(selectedStudent.academic.subjectWiseProgress).map(([subj, prog]) => (
                      <div key={subj} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{subj}</span>
                          <span className="text-primary-700 dark:text-primary-400 font-bold">
                            {prog.completed} / {prog.total} ({prog.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                          <div
                            className="h-full bg-primary-600 rounded-full transition-all"
                            style={{ width: `${prog.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. SUBSCRIPTION INFORMATION */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Subscription &amp; Payment Information
              </span>
              <div className="space-y-3">
                {selectedStudent.subscriptions.map((sub, i) => (
                  <div
                    key={sub.id || i}
                    className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-neutral-900 dark:text-white">
                        {sub.subjectName || 'Entire Channel'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        Active &bull; {sub.daysRemaining} days left
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-bold uppercase">Payment Date</span>
                        <span className="font-mono text-neutral-900 dark:text-white">
                          {sub.paymentDate ? new Date(sub.paymentDate).toLocaleDateString() : 'Active'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-bold uppercase">Amount Paid</span>
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {formatRupees(sub.amountPaidPaise || 120000)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-bold uppercase">Teacher Earnings</span>
                        <span className="font-black text-primary-700 dark:text-primary-400">
                          {formatRupees(sub.teacherEarningsPaise || 100000)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-bold uppercase">Expires On</span>
                        <span className="font-mono text-neutral-900 dark:text-white">
                          {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '28 days'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudent(null)}
                className="text-xs rounded-xl cursor-pointer"
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
