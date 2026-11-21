'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  GraduationCap,
  User,
  Phone,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ClassItem, BoardItem, UserRole } from '@/types';
import { TeacherService, DEFAULT_LANGUAGES } from '@/lib/teacher-service';

export const POPULAR_SUBJECTS = [
  'Tamil',
  'English',
  'Maths',
  'Science',
  'Social Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Economics',
  'Accountancy',
  'Business Studies',
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  // User state
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  // Role & Details state
  const [role, setRole] = useState<'student' | 'parent' | 'teacher'>('student');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Academic taxonomy
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Physics', 'Chemistry', 'Maths']);
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/');
          return;
        }

        setUserId(user.id);
        setEmail(user.email || '');

        const metaName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          '';
        setName(metaName);

        // Fetch existing profile if partially created
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          if (profile.name) setName(profile.name);
          if (profile.role && ['student', 'teacher', 'parent'].includes(profile.role)) {
            setRole(profile.role as 'student' | 'teacher' | 'parent');
          }
          if (profile.phone) setPhone(profile.phone);
          if (profile.parent_phone) setParentPhone(profile.parent_phone);
          if (profile.class_id) setSelectedClassId(profile.class_id);
          if (profile.board_id) setSelectedBoardId(profile.board_id);
          if (profile.preferred_language) setSelectedLanguage(profile.preferred_language);
          if (Array.isArray(profile.subjects) && profile.subjects.length > 0) {
            setSelectedSubjects(profile.subjects);
          }

          // If already onboarded, redirect immediately
          if (profile.onboarding_completed) {
            const dest =
              profile.role === 'admin'
                ? '/admin'
                : profile.role === 'teacher'
                ? '/teacher'
                : profile.role === 'parent'
                ? '/parent'
                : '/student';
            router.push(dest);
            return;
          }
        }

        // Fetch classes & boards
        const [cls, bds] = await Promise.all([
          TeacherService.getClasses(),
          TeacherService.getBoards(),
        ]);
        setClasses(cls);
        setBoards(bds);

        if (cls.length > 0 && !selectedClassId) {
          const class11 = cls.find((c) => c.name.toLowerCase().includes('11'));
          setSelectedClassId(class11 ? class11.id : cls[0].id);
        }

        if (bds.length > 0 && !selectedBoardId) {
          const cbse = bds.find((b) => b.name.toLowerCase().includes('cbse'));
          setSelectedBoardId(cbse ? cbse.id : bds[0].id);
        }
      } catch (err) {
        console.error('Failed to load user onboarding state', err);
      } finally {
        setLoadingUser(false);
      }
    }

    initUser();
  }, [router, supabase]);

  const toggleSubject = (subj: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (role === 'student') {
      if (!selectedClassId || !selectedBoardId || selectedSubjects.length === 0 || !selectedLanguage) {
        setError('Please configure your Class, Board, at least one Subject, and Study Language.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role,
          phone: phone.trim() || null,
          parentPhone: parentPhone.trim() || null,
          classId: selectedClassId || null,
          boardId: selectedBoardId || null,
          subjects: selectedSubjects,
          preferredLanguage: selectedLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete onboarding.');
      }

      router.push(data.redirectUrl || '/student');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during onboarding.');
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#F8F6FF] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#6244A6] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#5F5875] uppercase tracking-wider">
            Preparing your Prepnx account…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F6FF] via-[#FAF8FF] to-white py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center relative overflow-hidden font-sans">
      {/* Ambient background decoration */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#DCCFFF]/60 rounded-full blur-3xl opacity-75 pointer-events-none -z-10 animate-glow-pulse" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-[#EEE8FF] rounded-full blur-3xl opacity-70 pointer-events-none -z-10" />

      <div className="w-full max-w-2xl bg-white rounded-3xl p-8 sm:p-10 shadow-2xl shadow-violet-950/10 border border-[#DCCFFF] relative z-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3D1E6D] via-[#6244A6] to-[#A485E8] flex items-center justify-center text-white mx-auto shadow-md shadow-violet-900/20 ring-2 ring-[#EEE8FF]">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEE8FF] text-[#6244A6] text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to Prepnx</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#1E1035] tracking-tight">
            Complete Your Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#5F5875] max-w-md mx-auto leading-relaxed">
            Please tell us about yourself so we can curate your personalized dashboard and video lessons.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Account Type Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]">
              Account Type / Role
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'student', label: 'Student', desc: 'Learn & Test' },
                { id: 'parent', label: 'Parent', desc: 'Track Progress' },
                { id: 'teacher', label: 'Teacher', desc: 'Teach & Publish' },
              ].map((item) => {
                const isSelected = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id as 'student' | 'parent' | 'teacher')}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#EEE8FF] to-[#DCCFFF] border-[#6244A6] text-[#1E1035] font-black shadow-sm ring-2 ring-[#6244A6]/20'
                        : 'bg-[#F8F6FF]/60 border-[#DCCFFF] text-[#5F5875] hover:bg-white hover:border-[#6244A6]/40 font-semibold'
                    }`}
                  >
                    <span className="text-sm font-bold">{item.label}</span>
                    <span className="text-[10px] opacity-75">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Personal Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="onboarding-name" className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="onboarding-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arun Kumar"
                  className="w-full px-4 py-3 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/60 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6] transition-all"
                />
                <User className="absolute right-3.5 top-3.5 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onboarding-email" className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]">
                Email Address
              </label>
              <input
                id="onboarding-email"
                type="email"
                disabled
                value={email}
                className="w-full px-4 py-3 rounded-xl text-sm border border-[#DCCFFF]/60 bg-neutral-100/70 text-[#5F5875] cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="onboarding-phone" className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <input
                  id="onboarding-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/60 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6] transition-all"
                />
                <Phone className="absolute right-3.5 top-3.5 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
              </div>
            </div>

            {role === 'student' && (
              <div className="space-y-1.5">
                <label htmlFor="onboarding-parent-phone" className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]">
                  Parent&apos;s Phone (Optional)
                </label>
                <div className="relative">
                  <input
                    id="onboarding-parent-phone"
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/60 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6] transition-all"
                  />
                  <Phone className="absolute right-3.5 top-3.5 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* 3. Student Specific Academic Config */}
          {role === 'student' && (
            <div className="p-5 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF] space-y-5">
              <div className="flex items-center gap-2 text-xs font-black text-[#6244A6] uppercase tracking-wider">
                <BookOpen className="w-4 h-4" />
                <span>Academic Curriculum Preferences</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="onboarding-class" className="block text-xs font-bold text-[#1E1035]">
                    Select Your Class
                  </label>
                  <select
                    id="onboarding-class"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-white text-[#1E1035] focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6]"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="onboarding-board" className="block text-xs font-bold text-[#1E1035]">
                    Educational Board
                  </label>
                  <select
                    id="onboarding-board"
                    value={selectedBoardId}
                    onChange={(e) => setSelectedBoardId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-white text-[#1E1035] focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6]"
                  >
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1E1035]">
                  Subject Interests (Select All Relevant)
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {POPULAR_SUBJECTS.map((subj) => {
                    const isSelected = selectedSubjects.includes(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => toggleSubject(subj)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#6244A6] text-white border-[#6244A6] shadow-xs'
                            : 'bg-white text-[#5F5875] border-[#DCCFFF] hover:border-[#6244A6]/50'
                        }`}
                      >
                        {isSelected ? `✓ ${subj}` : `+ ${subj}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="onboarding-lang" className="block text-xs font-bold text-[#1E1035]">
                  Preferred Study Language
                </label>
                <select
                  id="onboarding-lang"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-white text-[#1E1035] focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6]"
                >
                  {DEFAULT_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#2A174E] via-[#3D1E6D] to-[#6244A6] hover:from-[#3D1E6D] hover:to-[#7A54CF] text-white font-extrabold text-base shadow-xl shadow-violet-950/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Your Preferences…</span>
              </>
            ) : (
              <>
                <span>Complete Setup &amp; Enter Portal</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
