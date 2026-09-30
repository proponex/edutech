'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  GraduationCap,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Search,
} from 'lucide-react';
import { ClassItem } from '@/types';

const DEFAULT_CLASSES = [
  { name: 'Kindergarten', display_order: 1 },
  { name: 'Class 1', display_order: 2 },
  { name: 'Class 2', display_order: 3 },
  { name: 'Class 3', display_order: 4 },
  { name: 'Class 4', display_order: 5 },
  { name: 'Class 5', display_order: 6 },
  { name: 'Class 6', display_order: 7 },
  { name: 'Class 7', display_order: 8 },
  { name: 'Class 8', display_order: 9 },
  { name: 'Class 9', display_order: 10 },
  { name: 'Class 10', display_order: 11 },
  { name: 'Class 11', display_order: 12 },
  { name: 'Class 12', display_order: 13 },
];

export function ClassManager() {
  const supabase = createClient();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  // Form states
  const [className, setClassName] = useState('');
  const [classOrder, setClassOrder] = useState<number>(1);
  const [classIsActive, setClassIsActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  // Load classes on mount
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('classes')
          .select('*')
          .order('display_order', { ascending: true });

        if (!ignore) {
          if (fetchErr) {
            setError(fetchErr.message);
          } else {
            setClasses((data as ClassItem[]) || []);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to fetch classes.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  // Refetch helper for action handlers
  const fetchClasses = async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('classes')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setClasses((data as ClassItem[]) || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch classes.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Seed Button if table is empty
  const handleSeedClasses = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const toInsert = DEFAULT_CLASSES.map((c) => ({
        ...c,
        is_active: true,
      }));

      const { error: seedErr } = await supabase
        .from('classes')
        .upsert(toInsert, { onConflict: 'name' });

      if (seedErr) {
        throw new Error(seedErr.message);
      }

      setActionSuccess('Standard classes (Kindergarten to Class 12) seeded successfully!');
      fetchClasses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to seed classes.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const toggleClassActive = async (cls: ClassItem) => {
    try {
      const newStatus = !cls.is_active;
      // Optimistic update
      setClasses((prev) =>
        prev.map((c) => (c.id === cls.id ? { ...c, is_active: newStatus } : c))
      );

      const { error: updateErr } = await supabase
        .from('classes')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', cls.id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update class status.');
      fetchClasses();
    }
  };

  // Open Edit Modal
  const openEditModal = (cls: ClassItem) => {
    setSelectedClass(cls);
    setClassName(cls.name);
    setClassOrder(cls.display_order);
    setClassIsActive(cls.is_active);
    setIsEditOpen(true);
  };

  // Save Edit
  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    try {
      setSubmitting(true);
      setError(null);

      const { error: updateErr } = await supabase
        .from('classes')
        .update({
          name: className,
          display_order: Number(classOrder),
          is_active: classIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedClass.id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      setActionSuccess(`Class "${className}" updated successfully!`);
      setIsEditOpen(false);
      fetchClasses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update class.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add Custom Class
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className) return;

    try {
      setSubmitting(true);
      setError(null);

      const { error: insertErr } = await supabase.from('classes').insert({
        name: className,
        display_order: Number(classOrder),
        is_active: classIsActive,
      });

      if (insertErr) {
        throw new Error(insertErr.message);
      }

      setActionSuccess(`Class "${className}" added successfully!`);
      setIsAddOpen(false);
      setClassName('');
      setClassOrder(classes.length + 1);
      fetchClasses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add class.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
            Class Management
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Configure Kindergarten through Class 12, adjust ordering, and toggle visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {classes.length === 0 && (
            <Button
              onClick={handleSeedClasses}
              variant="outline"
              size="md"
              isLoading={submitting}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-accent-600" />
              Seed 13 Standard Classes
            </Button>
          )}
          <Button
            onClick={() => {
              setClassName('');
              setClassOrder(classes.length + 1);
              setClassIsActive(true);
              setIsAddOpen(true);
            }}
            variant="primary"
            size="md"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Class
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter classes..."
          className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/80 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-secondary-500/50"
        />
      </div>

      {/* Classes Table / Cards */}
      <Card className="overflow-hidden border-neutral-200 dark:border-neutral-800 shadow-sm">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-16 px-4">
            <GraduationCap className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
            <p className="text-base font-bold text-neutral-900 dark:text-white">
              No classes found
            </p>
            <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
              Run the SQL schema in Supabase or click &ldquo;Seed 13 Standard Classes&rdquo; to populate Kindergarten through Class 12.
            </p>
            <Button
              onClick={handleSeedClasses}
              variant="primary"
              size="sm"
              className="mt-4"
              isLoading={submitting}
            >
              Seed Standard Classes
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <th className="py-3.5 px-6">Order</th>
                  <th className="py-3.5 px-6">Class Name</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 text-sm">
                {filteredClasses.map((cls) => (
                  <tr
                    key={cls.id}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/50 transition-colors"
                  >
                    <td className="py-4 px-6 font-mono text-xs text-neutral-500 font-semibold">
                      #{cls.display_order}
                    </td>
                    <td className="py-4 px-6 font-semibold text-neutral-900 dark:text-white">
                      {cls.name}
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant={cls.is_active ? 'success' : 'neutral'}>
                        {cls.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleClassActive(cls)}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          {cls.is_active ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                              Activate
                            </>
                          )}
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(cls)}
                          className="h-8 w-8 p-0"
                          title="Edit Class"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* EDIT MODAL */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Class"
        description="Update class display name or order index."
        maxWidth="sm"
      >
        <form onSubmit={handleEditClass} className="space-y-4">
          <Input
            label="Class Name"
            required
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />

          <Input
            label="Display Order"
            type="number"
            min={1}
            value={classOrder}
            onChange={(e) => setClassOrder(Number(e.target.value))}
          />

          <label className="flex items-center gap-2.5 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={classIsActive}
              onChange={(e) => setClassIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Active / Visible on public website
            </span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ADD CLASS MODAL */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Class"
        description="Create an additional class entry for the platform."
        maxWidth="sm"
      >
        <form onSubmit={handleAddClass} className="space-y-4">
          <Input
            label="Class Name"
            required
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="e.g. Pre-Kindergarten"
          />

          <Input
            label="Display Order"
            type="number"
            min={1}
            value={classOrder}
            onChange={(e) => setClassOrder(Number(e.target.value))}
          />

          <label className="flex items-center gap-2.5 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={classIsActive}
              onChange={(e) => setClassIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Active / Visible on public website
            </span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
            >
              Add Class
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
