'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  BookOpen,
  ChevronLeft,
  GraduationCap,
  Users,
  Video,
  FileQuestion,
  Calendar,
  Layers,
  Globe,
  Lock,
  PlayCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AdminCourseDetail } from '@/types';

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [course, setCourse] = useState<AdminCourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/courses/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data);
      } else {
        router.push('/admin/courses');
      }
    } catch (err) {
      console.error('Failed to load course details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourse();
  }, [id]);

  const handleTogglePublication = async () => {
    if (!course) return;
    const targetStatus = !course.is_active;

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          is_active: targetStatus,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        loadCourse();
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

  if (!course) {
    return (
      <div className="p-12 text-center text-neutral-400">
        <p>Course not found.</p>
        <Link href="/admin/courses" className="mt-4 inline-block text-primary-500 hover:underline">
          Return to Course Catalog
        </Link>
      </div>
    );
  }

  const isPublished = Boolean(course.is_active);

  return (
    <div className="space-y-6">
      {/* Back button & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Link href="/admin/courses">
            <Button size="sm" variant="outline" className="h-9 px-2.5">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300">
                Course Catalog Item
              </span>
              <StatusBadge status={isPublished ? 'published' : 'draft'} type="publication" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {course.name}
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">ID: {course.id}</p>
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
                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            {isPublished ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Unpublish Course</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>Publish to Public</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Enrolled Learners</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {course.subscribers_count}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/80 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Curriculum Units</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {course.units.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Lessons / Videos</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {course.videos.length}
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
              <p className="text-xs text-neutral-400">Exams Attached</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {course.quizzes.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Metadata & Teacher Info */}
        <div className="space-y-6">
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                Course Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5">Description</span>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {course.description || 'No description provided for this course channel.'}
                </p>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Assigned Instructor</span>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {course.teacher?.name || 'Educator'}
                    </p>
                    <p className="text-neutral-500">{course.teacher?.email || 'N/A'}</p>
                  </div>
                  {course.teacher?.id && (
                    <Link href={`/admin/teachers/${course.teacher.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]">
                        Teacher Profile
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Creation Timestamp</span>
                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {course.created_at
                      ? new Date(course.created_at).toLocaleString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Units / Syllabus Preview */}
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary-500" />
                Curriculum Structure ({course.units.length} Units)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {course.units.length === 0 ? (
                <p className="text-neutral-400 text-xs">No syllabus units structured yet.</p>
              ) : (
                <div className="space-y-2">
                  {course.units.map((unit) => (
                    <div
                      key={unit.id}
                      className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {unit.unit_number ? `Unit ${unit.unit_number}: ` : ''}
                        {unit.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Video Lessons & Mux Processing Status */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Video className="w-4 h-4 text-emerald-500" />
                    Video Lessons & Mux Asset Pipeline
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Video streaming assets processed by Mux Node integration.
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {course.videos.length} Videos
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {course.videos.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No video lessons uploaded to this course yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {course.videos.map((vid) => {
                    const durationMins = vid.duration_seconds
                      ? Math.round(vid.duration_seconds / 60)
                      : vid.mux_duration
                      ? Math.round(vid.mux_duration / 60)
                      : null;

                    return (
                      <div
                        key={vid.id}
                        className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-neutral-900 dark:text-white text-sm truncate">
                              {vid.title}
                            </p>
                            <StatusBadge status={vid.mux_status || 'ready'} type="video" />
                            {vid.is_demo && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary-100 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300">
                                Demo Video
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-2">
                            {durationMins ? (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {durationMins} mins
                              </span>
                            ) : null}
                            <span>
                              Uploaded: {new Date(vid.created_at).toLocaleDateString()}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {vid.mux_playback_id ? (
                            <Link
                              href={`/watch/${vid.id}`}
                              target="_blank"
                              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                            >
                              <PlayCircle className="w-4 h-4" />
                              <span>Preview Player</span>
                            </Link>
                          ) : (
                            <span className="text-[11px] text-neutral-400">Processing Stream...</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
            ? `Unpublish ${course.name}?`
            : `Publish ${course.name}?`
        }
        description={
          isPublished
            ? 'Unpublishing hides this course from the public channel marketplace. Enrolled students continue having access.'
            : 'Publishing will immediately make this channel and its active video lessons available to students.'
        }
        confirmText={isPublished ? 'Confirm Unpublish' : 'Confirm Publish'}
        variant={isPublished ? 'warning' : 'primary'}
        isLoading={actionLoading}
      />
    </div>
  );
}
