'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { openAuthModal } from '@/components/auth/auth-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  ArrowRight,
  Check,
  Layers,
  Lock,
} from 'lucide-react';
import { ClassItem, SubjectItem } from '@/types';

interface SubjectWithUnits extends SubjectItem {
  syllabus_units?: { id: string; title: string; is_active: boolean }[];
}

export function ClassSelectorSection() {
  const router = useRouter();
  const supabase = createClient();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [subjects, setSubjects] = useState<SubjectWithUnits[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check auth state for login protection
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser();
      setIsAuthenticated(!!data?.user);
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Load Classes from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadClasses() {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (isMounted && !error && data && data.length > 0) {
          const sorted = [...(data as ClassItem[])].sort((a, b) => a.display_order - b.display_order);
          setClasses(sorted);
          // Default to Class 12 or first class
          const class12 = sorted.find((c) => c.name === 'Class 12');
          setSelectedClass(class12 || (sorted[0] as ClassItem));
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadClasses();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Load Subjects when selectedClass changes
  useEffect(() => {
    if (!selectedClass) return;
    const currentClassId = selectedClass.id;
    let isMounted = true;

    async function loadSubjects() {
      try {
        setSubjectsLoading(true);
        const { data, error } = await supabase
          .from('subjects')
          .select(`
            id,
            class_id,
            name,
            slug,
            description,
            display_order,
            is_active,
            created_at,
            updated_at,
            syllabus_units (id, title, is_active)
          `)
          .eq('class_id', currentClassId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (isMounted && !error && data) {
          const formatted: SubjectWithUnits[] = data.map((s: Record<string, unknown>) => {
            const rawUnits = Array.isArray(s.syllabus_units)
              ? (s.syllabus_units as { id: string; title: string; is_active: boolean }[])
              : [];
            const activeUnits = rawUnits.filter((u) => u.is_active);

            return {
              id: s.id as string,
              class_id: s.class_id as string,
              name: s.name as string,
              slug: s.slug as string,
              description: s.description as string | null,
              display_order: Number(s.display_order),
              is_active: Boolean(s.is_active),
              created_at: s.created_at as string,
              updated_at: s.updated_at as string,
              units_count: activeUnits.length,
              syllabus_units: activeUnits,
            };
          });

          setSubjects(formatted);
        } else if (isMounted) {
          setSubjects([]);
        }
      } catch {
        if (isMounted) setSubjects([]);
      } finally {
        if (isMounted) setSubjectsLoading(false);
      }
    }

    loadSubjects();
    return () => {
      isMounted = false;
    };
  }, [selectedClass, supabase]);

  const handleClassClick = (cls: ClassItem) => {
    if (!isAuthenticated) {
      openAuthModal('login', `Please sign in or create an account to explore ${cls.name} curriculum and teacher channels.`);
      return;
    }
    setSelectedClass(cls);
  };

  const handleActionClick = (e: React.MouseEvent, title: string) => {
    if (!isAuthenticated) {
      e.preventDefault();
      openAuthModal('login', `Please sign in or create an account to enroll in ${title}.`);
    } else {
      router.push('/student');
    }
  };

  return (
    <section
      id="programs"
      className="py-16 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="secondary" className="mx-auto">
            Academic Curriculum
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            Select Your Grade Level
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
            Explore active disciplines, syllabus units, and learning roadmaps tailored for your class.
          </p>
        </div>

        {/* Horizontal Class Selector Tabs (No Horizontal Scrollbar Required) */}
        <div className="w-full">
          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-1.5 w-full">
            {loading ? (
              Array.from({ length: 13 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse"
                />
              ))
            ) : classes.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4 col-span-full">
                No active classes configured. Admin can activate classes in the Admin Portal.
              </p>
            ) : (
              classes.map((cls) => {
                const isSelected = selectedClass?.id === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleClassClick(cls)}
                    className={`py-2.5 px-1 sm:px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 text-center truncate ${
                      isSelected
                        ? 'bg-primary-500 text-neutral-950 shadow-md shadow-primary-500/20 ring-2 ring-primary-400 font-bold'
                        : 'border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                    title={cls.name}
                  >
                    <span className="hidden xl:inline truncate">{cls.name}</span>
                    <span className="xl:hidden truncate">
                      {cls.name === 'Kindergarten' ? 'KG' : cls.name.replace('Class ', '')}
                    </span>
                    {!isAuthenticated && <Lock className="w-2.5 h-2.5 opacity-40 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* DYNAMIC PROGRAMS / SUBJECTS SECTION */}
        <div className="pt-4 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                Grade Subjects & Catalog
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display mt-1">
                {selectedClass ? `${selectedClass.name} Programs` : 'Class Programs'}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Curriculum subjects and syllabus units calibrated for{' '}
                {selectedClass ? selectedClass.name : 'your grade'}.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleActionClick(e, selectedClass?.name || 'Classes')}
              className="flex items-center gap-1.5 self-start cursor-pointer"
            >
              Register for {selectedClass?.name || 'Classes'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Subjects Grid */}
          {subjectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-56 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 animate-pulse"
                />
              ))}
            </div>
          ) : subjects.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 max-w-2xl mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white">
                No subjects currently listed for {selectedClass?.name}
              </h4>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-md mx-auto">
                The academic catalog for {selectedClass?.name} is being calibrated for the upcoming session.
                Sign up today to receive notifications when curriculum modules are published.
              </p>
              <Link href="/signup" className="inline-block pt-2">
                <Button variant="primary" size="sm">
                  Enroll for {selectedClass?.name}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subj) => (
                <Card
                  key={subj.id}
                  className="flex flex-col justify-between border-neutral-200 dark:border-neutral-800 hover:border-primary-400 dark:hover:border-primary-500/60 hover:shadow-lg transition-all group"
                >
                  <CardContent className="p-6 sm:p-7 space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/80 border border-primary-300 dark:border-primary-800 flex items-center justify-center text-primary-800 dark:text-primary-300 group-hover:scale-105 transition-transform">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {selectedClass?.name}
                      </Badge>
                    </div>

                    {/* Subject Title & Description */}
                    <div>
                      <h4 className="text-xl font-bold text-neutral-900 dark:text-white font-display">
                        {subj.name}
                      </h4>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed line-clamp-3">
                        {subj.description ||
                          `Comprehensive syllabus and tuition track for ${subj.name} in ${selectedClass?.name}.`}
                      </p>
                    </div>

                    {/* Units Badge & Preview */}
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-300">
                          <Layers className="w-3.5 h-3.5 text-primary-500" />
                          {subj.units_count && subj.units_count > 0
                            ? `${subj.units_count} Syllabus Units`
                            : 'Standard Syllabus'}
                        </span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Active
                        </span>
                      </div>

                      {subj.syllabus_units && subj.syllabus_units.length > 0 && (
                        <ul className="space-y-1 pt-1">
                          {subj.syllabus_units.slice(0, 3).map((u) => (
                            <li
                              key={u.id}
                              className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 truncate"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                              <span className="truncate">{u.title}</span>
                            </li>
                          ))}
                          {subj.syllabus_units.length > 3 && (
                            <li className="text-[11px] text-neutral-400 italic">
                              + {subj.syllabus_units.length - 3} more units
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </CardContent>

                  <div className="p-6 pt-0">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={(e) => handleActionClick(e, subj.name)}
                      className="w-full flex items-center justify-center gap-2 group-hover:shadow-md group-hover:shadow-primary-500/20 cursor-pointer"
                    >
                      Enroll in {subj.name}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
