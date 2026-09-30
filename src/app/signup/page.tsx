'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { GraduationCap, AlertCircle, UserPlus, CheckCircle2, BookOpen, Camera, Trash2, X, User } from 'lucide-react';
import { UserRole, ClassItem, BoardItem } from '@/types';
import { TeacherService, DEFAULT_LANGUAGES } from '@/lib/teacher-service';
import { StudentService } from '@/lib/student-service';

export const ALL_RELEVANT_SUBJECTS = [
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
  'History',
  'Geography',
  'Hindi',
];

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Admin is strictly excluded from public selection
  const [role, setRole] = useState<'student' | 'parent' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Student specific details (Photo, Phone, Parent Phone)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Academic preferences for student registration (with multi-subject)
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Physics', 'Chemistry', 'Maths']);
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  useEffect(() => {
    async function loadAcademicMeta() {
      const [cls, bds] = await Promise.all([
        TeacherService.getClasses(),
        TeacherService.getBoards(),
      ]);
      setClasses(cls);
      setBoards(bds);

      // Default to Class 11, CBSE, English if available
      const class11 = cls.find((c) => c.name.toLowerCase().includes('11'));
      if (class11) setSelectedClassId(class11.id);
      else if (cls.length > 0) setSelectedClassId(cls[0].id);

      const cbse = bds.find((b) => b.name.toLowerCase().includes('cbse'));
      if (cbse) setSelectedBoardId(cbse.id);
      else if (bds.length > 0) setSelectedBoardId(bds[0].id);
    }
    loadAcademicMeta();
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const toggleSubject = (subjectName: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectName)
        ? prev.filter((s) => s !== subjectName)
        : [...prev, subjectName]
    );
  };

  const isConfigured = isSupabaseConfigured();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isConfigured) {
      setError('Supabase credentials pending. Please set them in .env.local.');
      return;
    }

    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // Student academic requirements
    if (role === 'student') {
      if (!selectedClassId || !selectedBoardId || selectedSubjects.length === 0 || !selectedLanguage) {
        setError('Please select your Class, Board, at least one Subject, and Preferred Study Language.');
        return;
      }
    }

    // Safety assertion: Admin cannot be chosen
    if ((role as string) === 'admin') {
      setError('Invalid role selection.');
      return;
    }

    setLoading(true);

    try {
      // Sign up with Supabase Auth including raw_user_meta_data for the trigger
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!data.user) {
        throw new Error('Registration failed: No user returned.');
      }

      // Handle photo upload if student selected an image file
      let photoUrl: string | null = null;
      if (role === 'student' && photoFile) {
        try {
          photoUrl = await StudentService.uploadAvatar(data.user.id, photoFile);
        } catch {
          photoUrl = photoPreview;
        }
      }

      // Check if profile was created by trigger; if trigger is not installed yet, insert as backup
      try {
        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            name,
            email,
            role: role as UserRole,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (role === 'student') {
          await supabase.from('students').upsert(
            {
              id: data.user.id,
              name,
              email,
              photo_url: photoUrl || null,
              phone: phone || null,
              parent_phone: parentPhone || null,
              class_id: selectedClassId || null,
              board_id: selectedBoardId || null,
              preferred_language: selectedLanguage || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } else if (role === 'teacher') {
          await supabase.from('teachers').upsert(
            {
              id: data.user.id,
              name,
              email,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } else if (role === 'parent') {
          await supabase.from('parents').upsert(
            {
              id: data.user.id,
              name,
              email,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        }
      } catch {
        // Trigger might have already handled it or RLS prevented insert
      }

      // Save Student Academic Profile & Timeline record with multi-subjects
      if (role === 'student') {
        try {
          await StudentService.saveStudentAcademicProfile({
            studentId: data.user.id,
            academicYear: '2026–27',
            classId: selectedClassId,
            boardId: selectedBoardId,
            subjects: selectedSubjects,
            preferredLanguage: selectedLanguage,
          });

          // Sync local profile cache
          await StudentService.updateStudentProfile(data.user.id, {
            photo_url: photoUrl || null,
            phone: phone || null,
            parent_phone: parentPhone || null,
            class_id: selectedClassId || null,
            board_id: selectedBoardId || null,
            preferred_language: selectedLanguage || null,
            subjects: selectedSubjects,
          });
        } catch (e) {
          console.error('Error saving academic profile', e);
        }
      }

      const targetRoute = role === 'student' ? '/student' : `/${role}`;

      // If session is present directly from signup
      if (data.session) {
        setSuccess('Registration successful! Redirecting to your dashboard...');
        router.push(targetRoute);
        router.refresh();
        return;
      }

      // If email confirmation was required by project settings, immediately sign in with password
      // (as development email confirmation is bypassed)
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInErr && signInData?.session) {
        setSuccess('Account created successfully! Entering dashboard...');
        router.push(targetRoute);
        router.refresh();
        return;
      }

      // If sign in succeeded
      setSuccess('Account registered! Redirecting to dashboard...');
      router.push(targetRoute);
      router.refresh();
    } catch (err: unknown) {
      // If error indicates email rate limit exceeded, attempt direct sign in
      if (err instanceof Error && err.message.toLowerCase().includes('rate limit')) {
        try {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (!signInErr && signInData?.session) {
            const targetRoute = role === 'student' ? '/student' : `/${role}`;
            router.push(targetRoute);
            router.refresh();
            return;
          }
        } catch {
          // Fall through to display original error
        }
      }
      setError(err instanceof Error ? err.message : 'Registration error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-neutral-50 dark:bg-neutral-950 transition-colors">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-md shadow-primary-500/20">
            <GraduationCap className="w-5 h-5 text-neutral-950" />
          </div>
          <span className="font-display font-bold text-xl text-neutral-950 dark:text-white tracking-tight">
            EDUTECH
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Registration Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-neutral-200/80 dark:border-neutral-800 my-6">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 flex items-center justify-center mb-2">
              <UserPlus className="w-6 h-6 text-primary-700 dark:text-primary-400" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              Create Your Account
            </CardTitle>
            <CardDescription>
              Join the Edutech learning community today.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!isConfigured && (
              <div className="mb-5 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Please set your Supabase credentials in <code className="font-mono font-semibold">.env.local</code> to activate registration.
                </div>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3.5 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 text-xs flex gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            {success && (
              <div className="mb-5 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">{success}</div>
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
              />

              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
              />

              {/* Role Selection (Student, Parent, Teacher) */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="role-select"
                  className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  I am a
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['student', 'parent', 'teacher'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-semibold capitalize transition-all cursor-pointer ${
                        role === r
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/60 text-primary-900 dark:text-primary-300 shadow-sm ring-1 ring-primary-500'
                          : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Profile & Academic Preferences */}
              {role === 'student' && (
                <div className="p-4 rounded-2xl border border-primary-200 dark:border-primary-800/60 bg-primary-50/40 dark:bg-primary-950/20 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary-900 dark:text-primary-300 uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5" />
                    Student Profile &amp; Academic Setup
                  </div>

                  {/* 1. Student Profile Photo Upload */}
                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-3.5">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-primary-100 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 flex items-center justify-center shrink-0">
                      {photoPreview ? (
                        <Image
                          src={photoPreview}
                          alt="Student Avatar"
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <User className="w-7 h-7 text-primary-700 dark:text-primary-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Profile Photo (Upload)
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => photoInputRef.current?.click()}
                          className="text-xs py-1 h-7 flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3" />
                          {photoPreview ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                        {photoPreview && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemovePhoto}
                            className="text-xs py-1 h-7 text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Phone & Parent Phone Numbers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Student Mobile Number"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                    />
                    <Input
                      label="Parent Mobile Number"
                      type="tel"
                      required
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="+91 9123456780"
                    />
                  </div>

                  {/* 3. Class & Board Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Current Class <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Educational Board <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedBoardId}
                        onChange={(e) => setSelectedBoardId(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {boards.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 4. Subject of the Year (Multi-Select) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Subject of the Year (Select Multiple) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-neutral-500">
                        {selectedSubjects.length} selected
                      </span>
                    </div>

                    {/* Selected Subjects Chips */}
                    {selectedSubjects.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        {selectedSubjects.map((subj) => (
                          <span
                            key={subj}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-100 dark:bg-primary-950/80 text-primary-950 dark:text-primary-200 border border-primary-300 dark:border-primary-800 shadow-sm"
                          >
                            {subj}
                            <button
                              type="button"
                              onClick={() => toggleSubject(subj)}
                              className="hover:text-red-600 rounded-full p-0.5"
                              title={`Remove ${subj}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quick Select Buttons */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-neutral-500">
                        Click to toggle subjects:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                        {ALL_RELEVANT_SUBJECTS.map((s) => {
                          const isSelected = selectedSubjects.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => toggleSubject(s)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-primary-500 text-neutral-950 border-primary-500 font-bold shadow-sm'
                                  : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-neutral-400'
                              }`}
                            >
                              {isSelected ? `✓ ${s}` : `+ ${s}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 5. Preferred Study Language */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Preferred Study Language <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
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


              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={loading}
              >
                Create Account
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center text-xs text-neutral-500 dark:text-neutral-400">
            <span>Already have an account? </span>
            <Link
              href="/login"
              className="text-primary-600 dark:text-primary-400 hover:underline font-semibold ml-1"
            >
              Sign In
            </Link>
          </CardFooter>
        </Card>
      </main>

      <footer className="py-4 text-center text-xs text-neutral-400">
        Edutech &bull; Empowering learners everywhere
      </footer>
    </div>
  );
}
