'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { ClassItem, SubjectItem } from '@/types';

export function SubjectManager() {
  const supabase = createClient();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Add/Edit Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-generate slug from name
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormName(val);
    if (!selectedSubject) {
      setFormSlug(generateSlug(val));
    }
  };

  // Fetch classes
  useEffect(() => {
    async function loadClasses() {
      try {
        setLoading(true);
        const { data, error: fetchErr } = await supabase
          .from('classes')
          .select('*')
          .order('display_order', { ascending: true });

        if (fetchErr) throw fetchErr;

        if (data && data.length > 0) {
          setClasses(data as ClassItem[]);
          // Default to Class 12 or first active class
          const class12 = data.find((c) => c.name === 'Class 12');
          setSelectedClassId(class12 ? class12.id : data[0].id);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading classes');
      } finally {
        setLoading(false);
      }
    }
    loadClasses();
  }, [supabase]);

  // Fetch subjects for mutations
  const fetchSubjects = useCallback(async () => {
    if (!selectedClassId) return;

    try {
      setSubjectsLoading(true);
      setError(null);

      const { data, error: subjErr } = await supabase
        .from('subjects')
        .select(`
          *,
          syllabus_units (id)
        `)
        .eq('class_id', selectedClassId)
        .order('display_order', { ascending: true });

      if (subjErr) throw subjErr;

      const formatted = (data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        class_id: s.class_id as string,
        name: s.name as string,
        slug: s.slug as string,
        description: s.description as string | null,
        display_order: Number(s.display_order),
        is_active: Boolean(s.is_active),
        created_at: s.created_at as string,
        updated_at: s.updated_at as string,
        units_count: Array.isArray(s.syllabus_units) ? s.syllabus_units.length : 0,
      }));

      setSubjects(formatted);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching subjects');
    } finally {
      setSubjectsLoading(false);
    }
  }, [selectedClassId, supabase]);

  useEffect(() => {
    if (!selectedClassId) return;
    let isMounted = true;

    async function load() {
      try {
        setSubjectsLoading(true);
        setError(null);

        const { data, error: subjErr } = await supabase
          .from('subjects')
          .select(`
            *,
            syllabus_units (id)
          `)
          .eq('class_id', selectedClassId)
          .order('display_order', { ascending: true });

        if (subjErr) throw subjErr;

        if (isMounted) {
          const formatted = (data || []).map((s: Record<string, unknown>) => ({
            id: s.id as string,
            class_id: s.class_id as string,
            name: s.name as string,
            slug: s.slug as string,
            description: s.description as string | null,
            display_order: Number(s.display_order),
            is_active: Boolean(s.is_active),
            created_at: s.created_at as string,
            updated_at: s.updated_at as string,
            units_count: Array.isArray(s.syllabus_units) ? s.syllabus_units.length : 0,
          }));
          setSubjects(formatted);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error fetching subjects');
        }
      } finally {
        if (isMounted) {
          setSubjectsLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [selectedClassId, supabase]);

  // Reset form
  const resetForm = () => {
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormClassId(selectedClassId);
    setFormOrder(subjects.length + 1);
    setFormIsActive(true);
    setFormError(null);
  };

  const openAddModal = () => {
    resetForm();
    setFormClassId(selectedClassId);
    setFormOrder(subjects.length + 1);
    setIsAddOpen(true);
  };

  const openEditModal = (subject: SubjectItem) => {
    setSelectedSubject(subject);
    setFormName(subject.name);
    setFormSlug(subject.slug);
    setFormDescription(subject.description || '');
    setFormClassId(subject.class_id);
    setFormOrder(subject.display_order);
    setFormIsActive(subject.is_active);
    setFormError(null);
    setIsEditOpen(true);
  };

  // Add Subject
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Subject name is required.');
      return;
    }
    if (!formClassId) {
      setFormError('Class selection is required.');
      return;
    }

    const finalSlug = formSlug.trim() || generateSlug(formName);

    // Duplicate check in existing subjects
    const isDuplicate = subjects.some(
      (s) => s.name.toLowerCase() === formName.trim().toLowerCase() || s.slug === finalSlug
    );
    if (isDuplicate) {
      setFormError('A subject with this name or slug already exists in this class.');
      return;
    }

    try {
      setFormSubmitting(true);

      const { error: insertErr } = await supabase.from('subjects').insert({
        class_id: formClassId,
        name: formName.trim(),
        slug: finalSlug,
        description: formDescription.trim() || null,
        display_order: Number(formOrder),
        is_active: formIsActive,
      });

      if (insertErr) throw insertErr;

      setActionSuccess(`Subject "${formName.trim()}" successfully created!`);
      setIsAddOpen(false);
      resetForm();
      fetchSubjects();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error creating subject');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Edit Subject
  const handleEditSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;

    setFormError(null);

    if (!formName.trim()) {
      setFormError('Subject name is required.');
      return;
    }

    const finalSlug = formSlug.trim() || generateSlug(formName);

    // Duplicate check
    const isDuplicate = subjects.some(
      (s) =>
        s.id !== selectedSubject.id &&
        (s.name.toLowerCase() === formName.trim().toLowerCase() || s.slug === finalSlug)
    );
    if (isDuplicate) {
      setFormError('Another subject with this name or slug already exists in this class.');
      return;
    }

    try {
      setFormSubmitting(true);

      const { error: updateErr } = await supabase
        .from('subjects')
        .update({
          name: formName.trim(),
          slug: finalSlug,
          description: formDescription.trim() || null,
          display_order: Number(formOrder),
          is_active: formIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedSubject.id);

      if (updateErr) throw updateErr;

      setActionSuccess(`Subject "${formName.trim()}" updated successfully!`);
      setIsEditOpen(false);
      fetchSubjects();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error updating subject');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Subject
  const handleDeleteSubject = async () => {
    if (!selectedSubject) return;

    try {
      setFormSubmitting(true);

      const { error: delErr } = await supabase
        .from('subjects')
        .delete()
        .eq('id', selectedSubject.id);

      if (delErr) throw delErr;

      setActionSuccess(`Subject "${selectedSubject.name}" deleted.`);
      setIsDeleteOpen(false);
      setSelectedSubject(null);
      fetchSubjects();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error deleting subject');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Active
  const toggleActive = async (subject: SubjectItem) => {
    try {
      const nextState = !subject.is_active;
      const { error: updateErr } = await supabase
        .from('subjects')
        .update({
          is_active: nextState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subject.id);

      if (updateErr) throw updateErr;

      setSubjects((prev) =>
        prev.map((s) => (s.id === subject.id ? { ...s, is_active: nextState } : s))
      );
      setActionSuccess(`Subject "${subject.name}" is now ${nextState ? 'Active' : 'Inactive'}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error toggling subject state');
    }
  };

  // Reorder Subject
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subjects.length) return;

    const currentSub = subjects[index];
    const targetSub = subjects[targetIndex];

    try {
      // Swap display_orders
      const newCurrentOrder = targetSub.display_order;
      const newTargetOrder = currentSub.display_order;

      await Promise.all([
        supabase
          .from('subjects')
          .update({ display_order: newCurrentOrder, updated_at: new Date().toISOString() })
          .eq('id', currentSub.id),
        supabase
          .from('subjects')
          .update({ display_order: newTargetOrder, updated_at: new Date().toISOString() })
          .eq('id', targetSub.id),
      ]);

      fetchSubjects();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error reordering subjects');
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
            <span>Admin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Academic Catalog</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-primary-600 dark:text-primary-400">Subjects</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            Subject Catalog
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Organize core disciplines, curriculum mappings, and syllabus units across grades.
          </p>
        </div>

        <Button
          onClick={openAddModal}
          variant="primary"
          size="md"
          className="flex items-center gap-2 self-start sm:self-auto shadow-md shadow-primary-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </Button>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Class Selector Bar */}
      <Card className="border-neutral-200 dark:border-neutral-800">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                Select Class / Grade
              </span>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {selectedClass ? selectedClass.name : 'Loading Classes...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full sm:max-w-xl scrollbar-none">
            {loading ? (
              <div className="h-9 w-40 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                {classes.map((cls) => {
                  const active = cls.id === selectedClassId;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-primary-500 text-neutral-950 shadow-sm font-bold ring-1 ring-primary-400'
                          : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {cls.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subjects List */}
      {subjectsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 animate-pulse"
            />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-800 py-12 text-center">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg font-bold">
              No subjects in {selectedClass?.name || 'this class'}
            </CardTitle>
            <CardDescription className="max-w-sm text-xs sm:text-sm">
              Create the first subject to define syllabus units, chapter outlines, and learning topics.
            </CardDescription>
            <Button onClick={openAddModal} variant="primary" size="sm" className="mt-2">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Subject to {selectedClass?.name}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((subj, index) => (
            <Card
              key={subj.id}
              className={`flex flex-col justify-between border transition-all ${
                subj.is_active
                  ? 'border-neutral-200 dark:border-neutral-800 hover:border-primary-400 dark:hover:border-primary-600/60 shadow-sm'
                  : 'border-neutral-200/60 dark:border-neutral-800/60 opacity-75 bg-neutral-50/50 dark:bg-neutral-900/40'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-neutral-900 dark:text-white">
                        {subj.name}
                      </CardTitle>
                      <span className="text-[11px] font-mono text-neutral-400">
                        /{subj.slug}
                      </span>
                    </div>
                  </div>

                  <Badge variant={subj.is_active ? 'primary' : 'neutral'} className="text-[10px]">
                    {subj.is_active ? 'Active' : 'Draft'}
                  </Badge>
                </div>

                {subj.description ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                    {subj.description}
                  </p>
                ) : (
                  <p className="text-xs text-neutral-400 italic mt-2">
                    No description provided.
                  </p>
                )}
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                {/* Metrics */}
                <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                  <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300 font-medium">
                    <Layers className="w-3.5 h-3.5 text-primary-500" />
                    {subj.units_count ?? 0} Syllabus Units
                  </span>
                  <span className="text-neutral-400 font-mono text-[11px]">
                    Order #{subj.display_order}
                  </span>
                </div>

                {/* Manage Syllabus Link */}
                <Link
                  href={`/admin/subjects/${subj.id}`}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-primary-200 dark:border-primary-900/60 bg-primary-50/50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-300 text-xs font-semibold hover:bg-primary-100/60 dark:hover:bg-primary-900/40 transition-colors group"
                >
                  <span>Manage Syllabus & Topics</span>
                  <ChevronRight className="w-4 h-4 text-primary-600 dark:text-primary-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Card Actions Footer */}
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveOrder(index, 'up')}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === subjects.length - 1}
                      onClick={() => handleMoveOrder(index, 'down')}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(subj)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title={subj.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {subj.is_active ? (
                        <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </button>
                  </div>

                  {/* Edit / Delete */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(subj)}
                      className="h-8 px-2.5 text-xs flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedSubject(subj);
                        setIsDeleteOpen(true);
                      }}
                      className="h-8 px-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ADD SUBJECT MODAL */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={`Add Subject to ${selectedClass?.name || 'Class'}`}
        description="Enter academic subject details, syllabus identifier, and display position."
        maxWidth="md"
      >
        <form onSubmit={handleAddSubject} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Assigned Grade / Class
            </label>
            <select
              value={formClassId}
              onChange={(e) => setFormClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500/50"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Subject Name"
            required
            value={formName}
            onChange={handleNameChange}
            placeholder="e.g. Mathematics, Physics, Chemistry"
          />

          <Input
            label="URL Slug (Identifier)"
            required
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
            placeholder="e.g. mathematics"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief summary of syllabus scope..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Display Order"
              type="number"
              min={1}
              value={formOrder}
              onChange={(e) => setFormOrder(Number(e.target.value))}
            />

            <div className="flex flex-col justify-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Active (Visible publicly)
                </span>
              </label>
            </div>
          </div>

          {/* Sticky Modal Action Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-neutral-900 pt-3 pb-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5 z-10 -mx-1 px-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={formSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formSubmitting}>
              Create Subject
            </Button>
          </div>
        </form>
      </Dialog>

      {/* EDIT SUBJECT MODAL */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Subject: ${selectedSubject?.name || ''}`}
        description="Modify subject details, display order, or visibility."
        maxWidth="md"
      >
        <form onSubmit={handleEditSubject} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Subject Name"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <Input
            label="URL Slug"
            required
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Description
            </label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Display Order"
              type="number"
              min={1}
              value={formOrder}
              onChange={(e) => setFormOrder(Number(e.target.value))}
            />

            <div className="flex flex-col justify-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Active
                </span>
              </label>
            </div>
          </div>

          {/* Sticky Modal Action Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-neutral-900 pt-3 pb-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5 z-10 -mx-1 px-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={formSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Subject"
        description="Are you sure you want to delete this subject? All associated syllabus units and topics will also be permanently deleted."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300">
            <strong>Warning:</strong> Deleting <strong>{selectedSubject?.name}</strong> will also delete all of its syllabus units and learning topics.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={formSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteSubject}
              isLoading={formSubmitting}
            >
              Delete Subject
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
