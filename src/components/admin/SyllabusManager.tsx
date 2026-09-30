'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
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
  ArrowLeft,
} from 'lucide-react';
import { SubjectItem, SyllabusUnitItem, TopicItem } from '@/types';

interface SyllabusManagerProps {
  subjectId: string;
}

export function SyllabusManager({ subjectId }: SyllabusManagerProps) {
  const supabase = createClient();

  const [subject, setSubject] = useState<SubjectItem | null>(null);
  const [units, setUnits] = useState<SyllabusUnitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Unit Modals State
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isEditUnitOpen, setIsEditUnitOpen] = useState(false);
  const [isDeleteUnitOpen, setIsDeleteUnitOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<SyllabusUnitItem | null>(null);

  // Unit Form fields
  const [unitTitle, setUnitTitle] = useState('');
  const [unitNumber, setUnitNumber] = useState<number | ''>('');
  const [unitDescription, setUnitDescription] = useState('');
  const [unitOrder, setUnitOrder] = useState<number>(1);
  const [unitIsActive, setUnitIsActive] = useState<boolean>(true);
  const [unitSubmitting, setUnitSubmitting] = useState(false);
  const [unitError, setUnitError] = useState<string | null>(null);

  // Topic Modals State
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isEditTopicOpen, setIsEditTopicOpen] = useState(false);
  const [isDeleteTopicOpen, setIsDeleteTopicOpen] = useState(false);
  const [targetUnitForTopic, setTargetUnitForTopic] = useState<SyllabusUnitItem | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);

  // Topic Form fields
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicOrder, setTopicOrder] = useState<number>(1);
  const [topicIsActive, setTopicIsActive] = useState<boolean>(true);
  const [topicSubmitting, setTopicSubmitting] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  // Fetch subject details and all units with topics
  const fetchSyllabus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Subject
      const { data: subData, error: subErr } = await supabase
        .from('subjects')
        .select(`
          *,
          class:classes (id, name)
        `)
        .eq('id', subjectId)
        .single();

      if (subErr || !subData) {
        throw new Error(subErr?.message || 'Subject not found');
      }

      setSubject({
        id: subData.id,
        class_id: subData.class_id,
        name: subData.name,
        slug: subData.slug,
        description: subData.description,
        display_order: subData.display_order,
        is_active: subData.is_active,
        created_at: subData.created_at,
        updated_at: subData.updated_at,
        class: subData.class,
      });

      // 2. Fetch Units and Topics
      const { data: unitsData, error: unitsErr } = await supabase
        .from('syllabus_units')
        .select(`
          *,
          topics (*)
        `)
        .eq('subject_id', subjectId)
        .order('display_order', { ascending: true });

      if (unitsErr) throw unitsErr;

      const formattedUnits: SyllabusUnitItem[] = (unitsData || []).map((u: Record<string, unknown>) => {
        const rawTopics = Array.isArray(u.topics) ? (u.topics as Record<string, unknown>[]) : [];
        const sortedTopics: TopicItem[] = rawTopics
          .map((t) => ({
            id: t.id as string,
            unit_id: t.unit_id as string,
            title: t.title as string,
            description: t.description as string | null,
            display_order: Number(t.display_order),
            is_active: Boolean(t.is_active),
            created_at: t.created_at as string,
            updated_at: t.updated_at as string,
          }))
          .sort((a, b) => a.display_order - b.display_order);

        return {
          id: u.id as string,
          subject_id: u.subject_id as string,
          title: u.title as string,
          description: u.description as string | null,
          unit_number: u.unit_number ? Number(u.unit_number) : null,
          display_order: Number(u.display_order),
          is_active: Boolean(u.is_active),
          created_at: u.created_at as string,
          updated_at: u.updated_at as string,
          topics: sortedTopics,
        };
      });

      setUnits(formattedUnits);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading syllabus');
    } finally {
      setLoading(false);
    }
  }, [subjectId, supabase]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data: subData, error: subErr } = await supabase
          .from('subjects')
          .select(`
            *,
            class:classes (id, name)
          `)
          .eq('id', subjectId)
          .single();

        if (subErr || !subData) {
          throw new Error(subErr?.message || 'Subject not found');
        }

        if (isMounted) {
          setSubject({
            id: subData.id,
            class_id: subData.class_id,
            name: subData.name,
            slug: subData.slug,
            description: subData.description,
            display_order: subData.display_order,
            is_active: subData.is_active,
            created_at: subData.created_at,
            updated_at: subData.updated_at,
            class: subData.class,
          });
        }

        const { data: unitsData, error: unitsErr } = await supabase
          .from('syllabus_units')
          .select(`
            *,
            topics (*)
          `)
          .eq('subject_id', subjectId)
          .order('display_order', { ascending: true });

        if (unitsErr) throw unitsErr;

        if (isMounted) {
          const formattedUnits: SyllabusUnitItem[] = (unitsData || []).map((u: Record<string, unknown>) => {
            const rawTopics = Array.isArray(u.topics) ? (u.topics as Record<string, unknown>[]) : [];
            const sortedTopics: TopicItem[] = rawTopics
              .map((t) => ({
                id: t.id as string,
                unit_id: t.unit_id as string,
                title: t.title as string,
                description: t.description as string | null,
                display_order: Number(t.display_order),
                is_active: Boolean(t.is_active),
                created_at: t.created_at as string,
                updated_at: t.updated_at as string,
              }))
              .sort((a, b) => a.display_order - b.display_order);

            return {
              id: u.id as string,
              subject_id: u.subject_id as string,
              title: u.title as string,
              description: u.description as string | null,
              unit_number: u.unit_number ? Number(u.unit_number) : null,
              display_order: Number(u.display_order),
              is_active: Boolean(u.is_active),
              created_at: u.created_at as string,
              updated_at: u.updated_at as string,
              topics: sortedTopics,
            };
          });

          setUnits(formattedUnits);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading syllabus');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [subjectId, supabase]);

  // ---------------------------------------------------------------------------
  // UNIT ACTIONS
  // ---------------------------------------------------------------------------
  const openAddUnitModal = () => {
    setUnitTitle('');
    setUnitNumber(units.length + 1);
    setUnitDescription('');
    setUnitOrder(units.length + 1);
    setUnitIsActive(true);
    setUnitError(null);
    setIsAddUnitOpen(true);
  };

  const openEditUnitModal = (unit: SyllabusUnitItem) => {
    setSelectedUnit(unit);
    setUnitTitle(unit.title);
    setUnitNumber(unit.unit_number || '');
    setUnitDescription(unit.description || '');
    setUnitOrder(unit.display_order);
    setUnitIsActive(unit.is_active);
    setUnitError(null);
    setIsEditUnitOpen(true);
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnitError(null);

    if (!unitTitle.trim()) {
      setUnitError('Unit title is required.');
      return;
    }

    try {
      setUnitSubmitting(true);
      const { error: insErr } = await supabase.from('syllabus_units').insert({
        subject_id: subjectId,
        title: unitTitle.trim(),
        unit_number: unitNumber ? Number(unitNumber) : null,
        description: unitDescription.trim() || null,
        display_order: Number(unitOrder),
        is_active: unitIsActive,
      });

      if (insErr) throw insErr;

      setActionSuccess(`Unit "${unitTitle.trim()}" successfully created!`);
      setIsAddUnitOpen(false);
      fetchSyllabus();
    } catch (err: unknown) {
      setUnitError(err instanceof Error ? err.message : 'Error creating unit');
    } finally {
      setUnitSubmitting(false);
    }
  };

  const handleEditUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    setUnitError(null);

    if (!unitTitle.trim()) {
      setUnitError('Unit title is required.');
      return;
    }

    try {
      setUnitSubmitting(true);
      const { error: updErr } = await supabase
        .from('syllabus_units')
        .update({
          title: unitTitle.trim(),
          unit_number: unitNumber ? Number(unitNumber) : null,
          description: unitDescription.trim() || null,
          display_order: Number(unitOrder),
          is_active: unitIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedUnit.id);

      if (updErr) throw updErr;

      setActionSuccess(`Unit "${unitTitle.trim()}" updated successfully!`);
      setIsEditUnitOpen(false);
      fetchSyllabus();
    } catch (err: unknown) {
      setUnitError(err instanceof Error ? err.message : 'Error updating unit');
    } finally {
      setUnitSubmitting(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!selectedUnit) return;
    try {
      setUnitSubmitting(true);
      const { error: delErr } = await supabase
        .from('syllabus_units')
        .delete()
        .eq('id', selectedUnit.id);

      if (delErr) throw delErr;

      setActionSuccess(`Unit "${selectedUnit.title}" and its topics were deleted.`);
      setIsDeleteUnitOpen(false);
      setSelectedUnit(null);
      fetchSyllabus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error deleting unit');
    } finally {
      setUnitSubmitting(false);
    }
  };

  const toggleUnitActive = async (unit: SyllabusUnitItem) => {
    try {
      const nextState = !unit.is_active;
      const { error: updErr } = await supabase
        .from('syllabus_units')
        .update({ is_active: nextState, updated_at: new Date().toISOString() })
        .eq('id', unit.id);

      if (updErr) throw updErr;

      setUnits((prev) =>
        prev.map((u) => (u.id === unit.id ? { ...u, is_active: nextState } : u))
      );
      setActionSuccess(`Unit "${unit.title}" is now ${nextState ? 'Active' : 'Inactive'}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error toggling unit');
    }
  };

  const handleMoveUnit = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= units.length) return;

    const current = units[index];
    const target = units[targetIndex];

    try {
      await Promise.all([
        supabase
          .from('syllabus_units')
          .update({ display_order: target.display_order, updated_at: new Date().toISOString() })
          .eq('id', current.id),
        supabase
          .from('syllabus_units')
          .update({ display_order: current.display_order, updated_at: new Date().toISOString() })
          .eq('id', target.id),
      ]);
      fetchSyllabus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error reordering units');
    }
  };

  // ---------------------------------------------------------------------------
  // TOPIC ACTIONS
  // ---------------------------------------------------------------------------
  const openAddTopicModal = (unit: SyllabusUnitItem) => {
    setTargetUnitForTopic(unit);
    setTopicTitle('');
    setTopicDescription('');
    setTopicOrder((unit.topics?.length || 0) + 1);
    setTopicIsActive(true);
    setTopicError(null);
    setIsAddTopicOpen(true);
  };

  const openEditTopicModal = (unit: SyllabusUnitItem, topic: TopicItem) => {
    setTargetUnitForTopic(unit);
    setSelectedTopic(topic);
    setTopicTitle(topic.title);
    setTopicDescription(topic.description || '');
    setTopicOrder(topic.display_order);
    setTopicIsActive(topic.is_active);
    setTopicError(null);
    setIsEditTopicOpen(true);
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUnitForTopic) return;
    setTopicError(null);

    if (!topicTitle.trim()) {
      setTopicError('Topic title is required.');
      return;
    }

    try {
      setTopicSubmitting(true);
      const { error: insErr } = await supabase.from('topics').insert({
        unit_id: targetUnitForTopic.id,
        title: topicTitle.trim(),
        description: topicDescription.trim() || null,
        display_order: Number(topicOrder),
        is_active: topicIsActive,
      });

      if (insErr) throw insErr;

      setActionSuccess(`Topic "${topicTitle.trim()}" created!`);
      setIsAddTopicOpen(false);
      fetchSyllabus();
    } catch (err: unknown) {
      setTopicError(err instanceof Error ? err.message : 'Error creating topic');
    } finally {
      setTopicSubmitting(false);
    }
  };

  const handleEditTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic) return;
    setTopicError(null);

    if (!topicTitle.trim()) {
      setTopicError('Topic title is required.');
      return;
    }

    try {
      setTopicSubmitting(true);
      const { error: updErr } = await supabase
        .from('topics')
        .update({
          title: topicTitle.trim(),
          description: topicDescription.trim() || null,
          display_order: Number(topicOrder),
          is_active: topicIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTopic.id);

      if (updErr) throw updErr;

      setActionSuccess(`Topic "${topicTitle.trim()}" updated!`);
      setIsEditTopicOpen(false);
      fetchSyllabus();
    } catch (err: unknown) {
      setTopicError(err instanceof Error ? err.message : 'Error updating topic');
    } finally {
      setTopicSubmitting(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!selectedTopic) return;
    try {
      setTopicSubmitting(true);
      const { error: delErr } = await supabase
        .from('topics')
        .delete()
        .eq('id', selectedTopic.id);

      if (delErr) throw delErr;

      setActionSuccess(`Topic "${selectedTopic.title}" deleted.`);
      setIsDeleteTopicOpen(false);
      setSelectedTopic(null);
      fetchSyllabus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error deleting topic');
    } finally {
      setTopicSubmitting(false);
    }
  };

  const toggleTopicActive = async (topic: TopicItem) => {
    try {
      const nextState = !topic.is_active;
      const { error: updErr } = await supabase
        .from('topics')
        .update({ is_active: nextState, updated_at: new Date().toISOString() })
        .eq('id', topic.id);

      if (updErr) throw updErr;

      fetchSyllabus();
      setActionSuccess(`Topic "${topic.title}" is now ${nextState ? 'Active' : 'Inactive'}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error toggling topic');
    }
  };

  const handleMoveTopic = async (unit: SyllabusUnitItem, topicIndex: number, direction: 'up' | 'down') => {
    const topics = unit.topics || [];
    const targetIndex = direction === 'up' ? topicIndex - 1 : topicIndex + 1;
    if (targetIndex < 0 || targetIndex >= topics.length) return;

    const current = topics[topicIndex];
    const target = topics[targetIndex];

    try {
      await Promise.all([
        supabase
          .from('topics')
          .update({ display_order: target.display_order, updated_at: new Date().toISOString() })
          .eq('id', current.id),
        supabase
          .from('topics')
          .update({ display_order: current.display_order, updated_at: new Date().toISOString() })
          .eq('id', target.id),
      ]);
      fetchSyllabus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error reordering topics');
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="h-32 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
        <div className="h-64 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold">Subject Not Found</h2>
        <p className="text-neutral-500">The subject you are trying to manage could not be found.</p>
        <Link href="/admin/subjects">
          <Button variant="outline">Back to Subject Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumbs & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/subjects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Subjects
        </Link>

        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          <span>Admin</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>{subject.class?.name || 'Class'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-primary-600 dark:text-primary-400">{subject.name}</span>
        </div>
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

      {/* Subject Header Banner */}
      <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-neutral-950 shadow-lg shadow-primary-500/20 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <Badge variant="secondary" className="text-xs">
                  {subject.class?.name || 'Class'}
                </Badge>
                <Badge variant={subject.is_active ? 'primary' : 'neutral'} className="text-xs">
                  {subject.is_active ? 'Active' : 'Draft'}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
                {subject.name}
              </h1>
              {subject.description && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
                  {subject.description}
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={openAddUnitModal}
            variant="primary"
            size="md"
            className="flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-md shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Syllabus Unit
          </Button>
        </CardContent>
      </Card>

      {/* Units & Nested Topics Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white font-display">
              Syllabus Units ({units.length})
            </h2>
          </div>
        </div>

        {units.length === 0 ? (
          /* Empty Units State */
          <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-800 py-12 text-center">
            <CardContent className="flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                <Layers className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg font-bold">No Syllabus Units Added</CardTitle>
              <p className="text-neutral-500 text-xs sm:text-sm max-w-sm">
                Add units (chapters/modules) to outline the curriculum structure for {subject.name}.
              </p>
              <Button onClick={openAddUnitModal} variant="primary" size="sm" className="mt-2">
                <Plus className="w-4 h-4 mr-1.5" />
                Add First Unit
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {units.map((unit, uIdx) => (
              <Card
                key={unit.id}
                className={`border transition-all overflow-hidden ${
                  unit.is_active
                    ? 'border-neutral-200 dark:border-neutral-800 shadow-sm'
                    : 'border-neutral-200/60 dark:border-neutral-800/60 opacity-80 bg-neutral-50/50 dark:bg-neutral-900/40'
                }`}
              >
                {/* Unit Header Bar */}
                <div className="p-4 sm:p-5 bg-neutral-50 dark:bg-neutral-800/40 border-b border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 flex items-center justify-center text-primary-800 dark:text-primary-300 font-bold text-xs shrink-0 mt-0.5">
                      {unit.unit_number ? `U${unit.unit_number}` : `${uIdx + 1}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white font-display">
                          {unit.title}
                        </h3>
                        <Badge variant={unit.is_active ? 'primary' : 'neutral'} className="text-[10px]">
                          {unit.is_active ? 'Active' : 'Draft'}
                        </Badge>
                      </div>
                      {unit.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {unit.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Unit Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <div className="flex items-center gap-1 border-r border-neutral-200 dark:border-neutral-700 pr-2">
                      <button
                        type="button"
                        disabled={uIdx === 0}
                        onClick={() => handleMoveUnit(uIdx, 'up')}
                        className="p-1 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                        title="Move Unit Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={uIdx === units.length - 1}
                        onClick={() => handleMoveUnit(uIdx, 'down')}
                        className="p-1 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                        title="Move Unit Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleUnitActive(unit)}
                        className="p-1 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                        title={unit.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {unit.is_active ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </button>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditUnitModal(unit)}
                      className="h-8 px-2 text-xs"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedUnit(unit);
                        setIsDeleteUnitOpen(true);
                      }}
                      className="h-8 px-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Delete Unit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openAddTopicModal(unit)}
                      className="h-8 px-2.5 text-xs flex items-center gap-1 ml-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Topic
                    </Button>
                  </div>
                </div>

                {/* Topics Container */}
                <div className="p-4 sm:p-5 space-y-2">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Topics in this Unit ({unit.topics?.length || 0})
                    </span>
                  </div>

                  {!unit.topics || unit.topics.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-400">
                      No topics added yet. Click &quot;Add Topic&quot; to define concepts and lesson breakdowns.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {unit.topics.map((topic, tIdx) => (
                        <div
                          key={topic.id}
                          className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 flex items-center justify-between gap-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[11px] font-mono text-neutral-500 shrink-0">
                              {tIdx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                                  {topic.title}
                                </span>
                                {!topic.is_active && (
                                  <Badge variant="neutral" className="text-[9px] py-0 px-1.5">
                                    Draft
                                  </Badge>
                                )}
                              </div>
                              {topic.description && (
                                <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                                  {topic.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={tIdx === 0}
                              onClick={() => handleMoveTopic(unit, tIdx, 'up')}
                              className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-white disabled:opacity-20"
                              title="Move Topic Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={tIdx === (unit.topics?.length || 0) - 1}
                              onClick={() => handleMoveTopic(unit, tIdx, 'down')}
                              className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-white disabled:opacity-20"
                              title="Move Topic Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleTopicActive(topic)}
                              className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                              title={topic.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {topic.is_active ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3 text-emerald-500" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditTopicModal(unit, topic)}
                              className="p-1 rounded text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400"
                              title="Edit Topic"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTopic(topic);
                                setIsDeleteTopicOpen(true);
                              }}
                              className="p-1 rounded text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                              title="Delete Topic"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* UNIT MODALS */}
      {/* ----------------------------------------------------------------------- */}

      {/* Add Unit Modal */}
      <Dialog
        isOpen={isAddUnitOpen}
        onClose={() => setIsAddUnitOpen(false)}
        title="Add Syllabus Unit"
        description={`Define a new syllabus unit or chapter for ${subject.name}.`}
        maxWidth="md"
      >
        <form onSubmit={handleAddUnit} className="space-y-4">
          {unitError && (
            <div className="p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{unitError}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Input
                label="Unit #"
                type="number"
                min={1}
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value ? Number(e.target.value) : '')}
                placeholder="1"
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Unit / Chapter Title"
                required
                value={unitTitle}
                onChange={(e) => setUnitTitle(e.target.value)}
                placeholder="e.g. Calculus, Optics, Electrostatics"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Unit Description (Optional)
            </label>
            <textarea
              rows={2}
              value={unitDescription}
              onChange={(e) => setUnitDescription(e.target.value)}
              placeholder="Outline of concepts covered in this unit..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Display Order"
              type="number"
              min={1}
              value={unitOrder}
              onChange={(e) => setUnitOrder(Number(e.target.value))}
            />

            <div className="flex flex-col justify-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unitIsActive}
                  onChange={(e) => setUnitIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Active Unit
                </span>
              </label>
            </div>
          </div>

          {/* Sticky Modal Action Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-neutral-900 pt-3 pb-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5 z-10 -mx-1 px-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddUnitOpen(false)}
              disabled={unitSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={unitSubmitting}>
              Create Unit
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Unit Modal */}
      <Dialog
        isOpen={isEditUnitOpen}
        onClose={() => setIsEditUnitOpen(false)}
        title="Edit Syllabus Unit"
        description="Update unit information, unit number, or visibility."
        maxWidth="md"
      >
        <form onSubmit={handleEditUnit} className="space-y-4">
          {unitError && (
            <div className="p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{unitError}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Input
                label="Unit #"
                type="number"
                min={1}
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Unit Title"
                required
                value={unitTitle}
                onChange={(e) => setUnitTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Unit Description
            </label>
            <textarea
              rows={2}
              value={unitDescription}
              onChange={(e) => setUnitDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Display Order"
              type="number"
              min={1}
              value={unitOrder}
              onChange={(e) => setUnitOrder(Number(e.target.value))}
            />

            <div className="flex flex-col justify-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unitIsActive}
                  onChange={(e) => setUnitIsActive(e.target.checked)}
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
              onClick={() => setIsEditUnitOpen(false)}
              disabled={unitSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={unitSubmitting}>
              Save Unit
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Unit Modal */}
      <Dialog
        isOpen={isDeleteUnitOpen}
        onClose={() => setIsDeleteUnitOpen(false)}
        title="Delete Unit"
        description="Are you sure you want to delete this syllabus unit? All of its topics will also be permanently removed."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300">
            <strong>Warning:</strong> Deleting <strong>{selectedUnit?.title}</strong> will also delete all associated topics.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteUnitOpen(false)}
              disabled={unitSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteUnit}
              isLoading={unitSubmitting}
            >
              Delete Unit
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ----------------------------------------------------------------------- */}
      {/* TOPIC MODALS */}
      {/* ----------------------------------------------------------------------- */}

      {/* Add Topic Modal */}
      <Dialog
        isOpen={isAddTopicOpen}
        onClose={() => setIsAddTopicOpen(false)}
        title={`Add Topic to ${targetUnitForTopic?.title || 'Unit'}`}
        description="Define a specific lesson topic or concept under this unit."
        maxWidth="md"
      >
        <form onSubmit={handleAddTopic} className="space-y-4">
          {topicError && (
            <div className="p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{topicError}</span>
            </div>
          )}

          <Input
            label="Topic Title"
            required
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            placeholder="e.g. Electric Charges and Fields"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Topic Description (Optional)
            </label>
            <textarea
              rows={2}
              value={topicDescription}
              onChange={(e) => setTopicDescription(e.target.value)}
              placeholder="Key formulas, concepts, or subtopics..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Display Order"
              type="number"
              min={1}
              value={topicOrder}
              onChange={(e) => setTopicOrder(Number(e.target.value))}
            />

            <div className="flex flex-col justify-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={topicIsActive}
                  onChange={(e) => setTopicIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Active Topic
                </span>
              </label>
            </div>
          </div>

          {/* Sticky Modal Action Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-neutral-900 pt-3 pb-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5 z-10 -mx-1 px-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddTopicOpen(false)}
              disabled={topicSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={topicSubmitting}>
              Create Topic
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Topic Modal */}
      <Dialog
        isOpen={isEditTopicOpen}
        onClose={() => setIsEditTopicOpen(false)}
        title="Edit Topic"
        description="Update topic title, details, or order."
        maxWidth="md"
      >
        <form onSubmit={handleEditTopic} className="space-y-4">
          {topicError && (
            <div className="p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{topicError}</span>
            </div>
          )}

          <Input
            label="Topic Title"
            required
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Topic Description
            </label>
            <textarea
              rows={2}
              value={topicDescription}
              onChange={(e) => setTopicDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Display Order"
              type="number"
              min={1}
              value={topicOrder}
              onChange={(e) => setTopicOrder(Number(e.target.value))}
            />

            <div className="flex flex-col justify-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={topicIsActive}
                  onChange={(e) => setTopicIsActive(e.target.checked)}
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
              onClick={() => setIsEditTopicOpen(false)}
              disabled={topicSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={topicSubmitting}>
              Save Topic
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Topic Modal */}
      <Dialog
        isOpen={isDeleteTopicOpen}
        onClose={() => setIsDeleteTopicOpen(false)}
        title="Delete Topic"
        description="Are you sure you want to delete this topic?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-500">
            Topic: <strong>{selectedTopic?.title}</strong>
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteTopicOpen(false)}
              disabled={topicSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteTopic}
              isLoading={topicSubmitting}
            >
              Delete Topic
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
