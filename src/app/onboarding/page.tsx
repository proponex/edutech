'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
  Users,
  Check,
  HeartHandshake,
  Layers,
} from 'lucide-react';
import { ClassItem, BoardItem } from '@/types';
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

  // User auth state
  const [loadingUser, setLoadingUser] = useState(true);
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState('');

  // Role state (user must actively select a role; null initially)
  const [role, setRole] = useState<'student' | 'teacher' | 'parent' | null>(null);

  // Common contact fields
  const [phone, setPhone] = useState('');

  // Student-specific fields
  const [parentPhone, setParentPhone] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Physics', 'Chemistry', 'Maths']);
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Teacher-specific fields
  const [teachingSubject, setTeachingSubject] = useState('');
  const [bio, setBio] = useState('');

  // Parent-specific fields
  const [childPhone, setChildPhone] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = '/?auth=login#hero-login';
          return;
        }

        setEmail(user.email || '');

        const metaName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          '';
        setName(metaName);

        const photo =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null;
        setAvatarUrl(photo);

        // Fetch existing profile if one exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          // If already onboarded, redirect directly to their dashboard
          if (profile.onboarding_completed === true && profile.role) {
            const dest =
              profile.role === 'admin'
                ? '/admin'
                : profile.role === 'teacher'
                ? '/teacher'
                : profile.role === 'parent'
                ? '/parent'
                : '/student';
            window.location.href = dest;
            return;
          }

          if (profile.name) setName(profile.name);
          if (profile.phone) setPhone(profile.phone);
          if (profile.parent_phone) setParentPhone(profile.parent_phone);
          if (profile.photo_url) setAvatarUrl(profile.photo_url);
        }

        // Preload classes & boards for students
        const [cls, bds] = await Promise.all([
          TeacherService.getClasses(),
          TeacherService.getBoards(),
        ]);
        setClasses(cls);
        setBoards(bds);

        if (cls.length > 0) {
          const class11 = cls.find((c) => c.name.toLowerCase().includes('11'));
          setSelectedClassId(class11 ? class11.id : cls[0].id);
        }

        if (bds.length > 0) {
          const cbse = bds.find((b) => b.name.toLowerCase().includes('cbse'));
          setSelectedBoardId(cbse ? cbse.id : bds[0].id);
        }
      } catch (err) {
        console.error('Failed to load user onboarding state:', err);
      } finally {
        setLoadingUser(false);
      }
    }

    initUser();
  }, [supabase]);

  const toggleSubject = (subj: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!role) {
      setError('Please choose your account type (Student, Teacher, or Parent).');
      return;
    }

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (role === 'student') {
      if (!selectedClassId || !selectedBoardId) {
        setError('Please select both your Class and Educational Board.');
        return;
      }
      if (selectedSubjects.length === 0) {
        setError('Please select at least one subject of interest.');
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
          parentPhone: role === 'student' ? parentPhone.trim() || null : role === 'parent' ? childPhone.trim() || null : null,
          classId: role === 'student' ? selectedClassId || null : null,
          boardId: role === 'student' ? selectedBoardId || null : null,
          subjects: role === 'student' ? selectedSubjects : null,
          preferredLanguage: role === 'student' ? selectedLanguage : null,
          teachingSubject: role === 'teacher' ? teachingSubject.trim() || null : null,
          bio: role === 'teacher' ? bio.trim() || null : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete onboarding.');
      }

      // Hard redirect flushes cookies and ensures middleware validates session immediately
      window.location.href = data.redirectUrl || '/student';
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

      <div className="w-full max-w-3xl bg-white rounded-3xl p-7 sm:p-10 shadow-2xl shadow-violet-950/10 border border-[#DCCFFF] relative z-10 space-y-8">
        {/* STEP 1: Welcome Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            {avatarUrl ? (
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-[#6244A6]/30 shadow-md">
                <Image
                  src={avatarUrl}
                  alt={name || 'User avatar'}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3D1E6D] via-[#6244A6] to-[#A485E8] flex items-center justify-center text-white shadow-md shadow-violet-900/20 ring-2 ring-[#EEE8FF]">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEE8FF] text-[#6244A6] text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to Prepnx</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#1E1035] tracking-tight">
            {name ? `Welcome, ${name}!` : "Let's Set Up Your Account"}
          </h1>
          <p className="text-xs sm:text-sm text-[#5F5875] max-w-lg mx-auto leading-relaxed">
            Please choose your account type and complete your profile so we can tailor your experience.
          </p>

          {/* Google identity badge */}
          {email && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F8F6FF] border border-[#DCCFFF] text-xs font-medium text-[#5F5875]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Identity:</span>
              <span className="font-semibold text-[#1E1035]">{email}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* STEP 2: Choose Account Type (Role Selection Cards) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]">
                1. Select Your Account Type <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-[#5F5875] font-medium">
                Choose the role that fits you best
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Student Card */}
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                  role === 'student'
                    ? 'bg-gradient-to-br from-[#FAF8FF] to-[#EEE8FF] border-[#6244A6] shadow-lg shadow-violet-900/10 ring-2 ring-[#6244A6]'
                    : 'bg-white border-[#DCCFFF] hover:border-[#6244A6]/50 hover:bg-[#F8F6FF]/60 shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        role === 'student'
                          ? 'bg-[#6244A6] text-white shadow-sm'
                          : 'bg-[#EEE8FF] text-[#6244A6]'
                      }`}
                    >
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    {role === 'student' && (
                      <div className="w-6 h-6 rounded-full bg-[#6244A6] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1E1035]">Student</h3>
                    <p className="text-xs text-[#5F5875] mt-1 leading-relaxed">
                      Learn, practice, track your progress, and access educational content.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#DCCFFF]/60">
                  <span className="text-[11px] font-bold text-[#6244A6]">
                    Curriculum &amp; Tests &rarr;
                  </span>
                </div>
              </button>

              {/* Teacher Card */}
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                  role === 'teacher'
                    ? 'bg-gradient-to-br from-[#FAF8FF] to-[#EEE8FF] border-[#6244A6] shadow-lg shadow-violet-900/10 ring-2 ring-[#6244A6]'
                    : 'bg-white border-[#DCCFFF] hover:border-[#6244A6]/50 hover:bg-[#F8F6FF]/60 shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        role === 'teacher'
                          ? 'bg-[#6244A6] text-white shadow-sm'
                          : 'bg-[#EEE8FF] text-[#6244A6]'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                    </div>
                    {role === 'teacher' && (
                      <div className="w-6 h-6 rounded-full bg-[#6244A6] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1E1035]">Teacher</h3>
                    <p className="text-xs text-[#5F5875] mt-1 leading-relaxed">
                      Create educational content, manage students, publish lessons, and grow your teaching channel.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#DCCFFF]/60">
                  <span className="text-[11px] font-bold text-[#6244A6]">
                    Publish &amp; Teach &rarr;
                  </span>
                </div>
              </button>

              {/* Parent Card */}
              <button
                type="button"
                onClick={() => setRole('parent')}
                className={`relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                  role === 'parent'
                    ? 'bg-gradient-to-br from-[#FAF8FF] to-[#EEE8FF] border-[#6244A6] shadow-lg shadow-violet-900/10 ring-2 ring-[#6244A6]'
                    : 'bg-white border-[#DCCFFF] hover:border-[#6244A6]/50 hover:bg-[#F8F6FF]/60 shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        role === 'parent'
                          ? 'bg-[#6244A6] text-white shadow-sm'
                          : 'bg-[#EEE8FF] text-[#6244A6]'
                      }`}
                    >
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    {role === 'parent' && (
                      <div className="w-6 h-6 rounded-full bg-[#6244A6] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1E1035]">Parent</h3>
                    <p className="text-xs text-[#5F5875] mt-1 leading-relaxed">
                      Connect with your children and monitor their learning progress.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#DCCFFF]/60">
                  <span className="text-[11px] font-bold text-[#6244A6]">
                    Progress Tracking &rarr;
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* STEP 3: Role-Specific Profile Information */}
          {role && (
            <div className="space-y-6 pt-4 border-t border-[#EEE8FF] animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-xs font-black text-[#6244A6] uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>
                  2. {role === 'student' ? 'Student Profile & Academic Setup' : role === 'teacher' ? 'Educator Information' : 'Parent Information'}
                </span>
              </div>

              {/* Common Name & Phone Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="onboarding-name" className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="onboarding-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Arun Kumar"
                      className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/60 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6] transition-all"
                    />
                    <User className="absolute right-3.5 top-3 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="onboarding-phone" className="block text-xs font-bold uppercase tracking-wider text-[#1E1035]">
                    Phone Number {role !== 'student' && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      id="onboarding-phone"
                      type="tel"
                      required={role !== 'student'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-[#F8F6FF]/60 text-[#1E1035] placeholder:text-[#5F5875]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6] transition-all"
                    />
                    <Phone className="absolute right-3.5 top-3 w-4 h-4 text-[#5F5875]/60 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* STUDENT FIELDS */}
              {role === 'student' && (
                <div className="p-5 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF] space-y-5">
                  <div className="flex items-center gap-2 text-xs font-black text-[#6244A6] uppercase tracking-wider">
                    <BookOpen className="w-4 h-4" />
                    <span>Academic Preferences</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="onboarding-class" className="block text-xs font-bold text-[#1E1035]">
                        Select Class / Grade <span className="text-red-500">*</span>
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
                        Educational Board <span className="text-red-500">*</span>
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
                      Subject Interests (Select All Relevant) <span className="text-red-500">*</span>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="space-y-1.5">
                      <label htmlFor="onboarding-parent-phone" className="block text-xs font-bold text-[#1E1035]">
                        Parent&apos;s Phone (Optional)
                      </label>
                      <input
                        id="onboarding-parent-phone"
                        type="tel"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-2 rounded-xl text-sm border border-[#DCCFFF] bg-white text-[#1E1035] focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TEACHER FIELDS */}
              {role === 'teacher' && (
                <div className="p-5 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF] space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="teacher-subject" className="block text-xs font-bold text-[#1E1035]">
                      Primary Teaching Subject(s)
                    </label>
                    <input
                      id="teacher-subject"
                      type="text"
                      value={teachingSubject}
                      onChange={(e) => setTeachingSubject(e.target.value)}
                      placeholder="e.g. Mathematics & Physics"
                      className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-white text-[#1E1035] focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="teacher-bio" className="block text-xs font-bold text-[#1E1035]">
                      Short Bio / Teaching Experience
                    </label>
                    <textarea
                      id="teacher-bio"
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell students a little about your teaching experience and passion…"
                      className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-white text-[#1E1035] focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6]"
                    />
                  </div>
                </div>
              )}

              {/* PARENT FIELDS */}
              {role === 'parent' && (
                <div className="p-5 rounded-2xl bg-[#F8F6FF] border border-[#DCCFFF] space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="parent-child-phone" className="block text-xs font-bold text-[#1E1035]">
                      Child&apos;s Registered Phone / Student Identifier (Optional)
                    </label>
                    <input
                      id="parent-child-phone"
                      type="tel"
                      value={childPhone}
                      onChange={(e) => setChildPhone(e.target.value)}
                      placeholder="+91 98765 43210 (Child's phone)"
                      className="w-full px-4 py-2.5 rounded-xl text-sm border border-[#DCCFFF] bg-white text-[#1E1035] focus:outline-none focus:ring-2 focus:ring-[#8060CE]/40 focus:border-[#6244A6]"
                    />
                    <p className="text-[11px] text-[#5F5875]">
                      We can link your parent dashboard to your child&apos;s account automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !role}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#2A174E] via-[#3D1E6D] to-[#6244A6] hover:from-[#3D1E6D] hover:to-[#7A54CF] text-white font-extrabold text-base shadow-xl shadow-violet-950/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Your Profile…</span>
                </>
              ) : (
                <>
                  <span>Complete Setup &amp; Enter Portal</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
