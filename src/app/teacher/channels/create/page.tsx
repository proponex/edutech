'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Search,
  Sparkles,
  Tv,
  GraduationCap,
  Globe,
  BookOpen,
  Layers,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  TeacherService,
  DEFAULT_LANGUAGES,
} from '@/lib/teacher-service';
import { ClassItem, BoardItem, ReferenceSubjectItem } from '@/types';

const TOTAL_STEPS = 5;

export default function CreateChannelPage() {
  const router = useRouter();
  const supabase = createClient();

  // Wizard Step (1 - 5) + Review Modal / State (Step 6)
  const [currentStep, setCurrentStep] = useState(1);
  const [isReviewing, setIsReviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdChannelId, setCreatedChannelId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  // Available Reference Options
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [availableBoards, setAvailableBoards] = useState<BoardItem[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<ReferenceSubjectItem[]>([]);

  // Form State
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English', 'Tamil']);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);

  // Search filter states
  const [specializationSearch, setSpecializationSearch] = useState('');
  const [customSpecialization, setCustomSpecialization] = useState('');

  // Initial Auth & Reference Data
  useEffect(() => {
    let isMounted = true;
    async function initData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        if (isMounted) setTeacherId(user.id);

        const [clsList, brdList, subjList] = await Promise.all([
          TeacherService.getClasses(),
          TeacherService.getBoards(),
          TeacherService.getReferenceSubjects(),
        ]);

        if (isMounted) {
          setAvailableClasses(clsList);
          setAvailableBoards(brdList);
          setAvailableSubjects(subjList);
        }
      } catch (err: unknown) {
        console.error('Error loading reference data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initData();
    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  // Specialization Filter
  const filteredSubjects = useMemo(() => {
    if (!specializationSearch.trim()) return availableSubjects;
    return availableSubjects.filter(s =>
      s.name.toLowerCase().includes(specializationSearch.toLowerCase())
    );
  }, [availableSubjects, specializationSearch]);

  // Toggle Handlers
  const selectClass = (id: string) => {
    setSelectedClassId(id);
  };

  const toggleSpecialization = (name: string) => {
    setSelectedSpecializations(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const addCustomSpecialization = () => {
    const trimmed = customSpecialization.trim();
    if (trimmed && !selectedSpecializations.includes(trimmed)) {
      setSelectedSpecializations(prev => [...prev, trimmed]);
      setCustomSpecialization('');
    }
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const toggleBoard = (id: string) => {
    setSelectedBoardIds(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  // Step Validation (ONE CHANNEL = EXACTLY ONE CLASS)
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return channelName.trim().length >= 3 && channelDescription.trim().length >= 10;
      case 2:
        return !!selectedClassId;
      case 3:
        return selectedSpecializations.length > 0;
      case 4:
        return selectedLanguages.length > 0;
      case 5:
        return selectedBoardIds.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (!canProceedFromStep(currentStep)) {
      if (currentStep === 1) {
        setErrorMsg('Please enter a channel name (min 3 characters) and description (min 10 characters).');
      } else if (currentStep === 2) {
        setErrorMsg('Please select exactly one class for this channel.');
      } else if (currentStep === 3) {
        setErrorMsg('Please select at least one subject specialization.');
      } else if (currentStep === 4) {
        setErrorMsg('Please select at least one teaching language.');
      } else if (currentStep === 5) {
        setErrorMsg('Please select at least one education board.');
      }
      return;
    }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsReviewing(true);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (isReviewing) {
      setIsReviewing(false);
    } else if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      router.push('/teacher');
    }
  };

  // Image Upload helper (file to base64 preview)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submission
  const handleCreateChannel = async () => {
    if (!teacherId) {
      setErrorMsg('User session not found. Please log in again.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const channel = await TeacherService.createChannel({
        teacherId,
        name: channelName.trim(),
        description: channelDescription.trim(),
        photoUrl: photoUrl || null,
        classId: selectedClassId,
        classIds: [selectedClassId],
        boardIds: selectedBoardIds,
        specializations: selectedSpecializations,
        languages: selectedLanguages,
      });

      setCreatedChannelId(channel.id);
    } catch (err: unknown) {
      console.error('Channel creation failed', err);
      setErrorMsg((err as Error).message || 'Failed to create channel. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-xs font-semibold text-neutral-500">Loading channel creation wizard...</p>
        </main>
      </div>
    );
  }

  // Success screen
  if (createdChannelId) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-lg w-full border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-3xl overflow-hidden text-center p-8 bg-white dark:bg-neutral-900">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-extrabold font-heading text-neutral-900 dark:text-white mb-2">
              Channel Created Successfully!
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
              Your channel <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-heading">{channelName}</span> is now ready. You can start creating and structuring your curriculum with Videos, Quizzes, and Homework.
            </p>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-left mb-6 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Class:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {availableClasses.find(c => c.id === selectedClassId)?.name || 'Class Assigned'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Boards:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectedBoardIds.length} boards selected
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Specialization:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectedSpecializations.slice(0, 3).join(', ')}
                  {selectedSpecializations.length > 3 && ` +${selectedSpecializations.length - 3}`}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 rounded-2xl shadow-lg shadow-emerald-600/20"
              >
                <Link href={`/teacher/channels/${createdChannelId}`}>
                  Go to Channel
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-2xl py-6 border-neutral-300 dark:border-neutral-700"
              >
                <Link href="/teacher">Teacher Dashboard</Link>
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10">
        {/* Top Navigation & Title */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isReviewing ? 'Edit Details' : currentStep === 1 ? 'Cancel' : 'Back'}
          </button>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            {isReviewing ? 'Final Review' : `Step ${currentStep} of ${TOTAL_STEPS}`}
          </span>
        </div>

        {/* Wizard Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-neutral-200 dark:bg-neutral-800 w-full z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-600 transition-all duration-300 z-0"
              style={{
                width: isReviewing ? '100%' : `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%`
              }}
            />

            {[1, 2, 3, 4, 5].map(stepNum => {
              const isCompleted = stepNum < currentStep || isReviewing;
              const isCurrent = stepNum === currentStep && !isReviewing;

              return (
                <div
                  key={stepNum}
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : isCurrent
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60 shadow-lg'
                      : 'bg-white dark:bg-neutral-800 text-neutral-400 border border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[11px] font-semibold text-neutral-500 mt-2 px-1">
            <span>Details</span>
            <span>Class</span>
            <span>Subject</span>
            <span>Language</span>
            <span>Boards</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Form Container */}
        <Card className="border-neutral-200 dark:border-neutral-800 shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-neutral-900">
          <CardContent className="p-6 sm:p-8">
            {/* STEP 1: CHANNEL DETAILS */}
            {currentStep === 1 && !isReviewing && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
                    <Tv className="w-6 h-6 text-emerald-600" />
                    Channel Details
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Set up your educational channel brand identity for students and parents.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="channelName" className="font-semibold text-neutral-800 dark:text-neutral-200">
                      Channel Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="channelName"
                      placeholder="e.g. Physics with Karthi, Concept Mathematics"
                      value={channelName}
                      onChange={e => setChannelName(e.target.value)}
                      className="rounded-xl border-neutral-300 dark:border-neutral-700 h-12 text-base"
                    />
                    <p className="text-xs text-neutral-500">
                      Choose a descriptive name that students can easily recognise.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="channelDesc" className="font-semibold text-neutral-800 dark:text-neutral-200">
                      Channel Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="channelDesc"
                      rows={4}
                      placeholder="Explain what you teach, your teaching methodology, experience, and the curriculum covered..."
                      value={channelDescription}
                      onChange={e => setChannelDescription(e.target.value)}
                      className="rounded-xl border-neutral-300 dark:border-neutral-700 text-sm leading-relaxed"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="font-semibold text-neutral-800 dark:text-neutral-200">
                      Profile / Channel Photo
                    </Label>
                    <div className="flex items-center gap-5">
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center shrink-0">
                        {photoUrl ? (
                          <Image
                            src={photoUrl}
                            alt="Channel Preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-neutral-400" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="inline-block cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors border border-neutral-200 dark:border-neutral-700">
                            Upload Photo
                          </span>
                        </label>
                        <p className="text-xs text-neutral-500">
                          Recommended: 400x400 JPG, PNG or WEBP (max 3MB).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: WHICH CLASS IS THIS CHANNEL FOR? (ONE CHANNEL = ONE CLASS) */}
            {currentStep === 2 && !isReviewing && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-emerald-600" />
                    Which class is this channel for?
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Select exactly one class. Each channel is dedicated to a single class.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableClasses.map(cls => {
                    const isSelected = selectedClassId === cls.id;
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => selectClass(cls.id)}
                        className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-neutral-400">Class</span>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'border-2 border-neutral-300 dark:border-neutral-600'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                        <span className="font-bold text-sm text-neutral-900 dark:text-white font-heading">
                          {cls.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedClassId && (
                  <div className="pt-2 text-xs font-medium text-neutral-500">
                    Selected: <span className="text-emerald-600 font-bold">{availableClasses.find(c => c.id === selectedClassId)?.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: SPECIALIZATION */}
            {currentStep === 3 && !isReviewing && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-emerald-600" />
                    What are you specialized in?
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Search and pick your subject specializations. You can choose multiple subjects.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    placeholder="Search subject (e.g. Physics, Mathematics, Science)..."
                    value={specializationSearch}
                    onChange={e => setSpecializationSearch(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-neutral-300 dark:border-neutral-700 text-sm"
                  />
                </div>

                {/* Selected Specializations Chips */}
                {selectedSpecializations.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 pb-2">
                    {selectedSpecializations.map(spec => (
                      <Badge
                        key={spec}
                        className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
                      >
                        {spec}
                        <button
                          type="button"
                          onClick={() => toggleSpecialization(spec)}
                          className="hover:text-red-500 text-neutral-400 text-sm leading-none"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Subject Options Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {filteredSubjects.map(sub => {
                    const isSelected = selectedSpecializations.includes(sub.name);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSpecialization(sub.name)}
                        className={`p-3 rounded-xl text-left border text-sm font-semibold transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-emerald-500'
                        }`}
                      >
                        <span className="truncate">{sub.name}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Subject Addition */}
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <Label className="text-xs font-semibold text-neutral-500 block mb-1.5">
                    Can&apos;t find your subject? Add custom subject:
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Robotics, Vedic Maths, Astronomy"
                      value={customSpecialization}
                      onChange={e => setCustomSpecialization(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomSpecialization();
                        }
                      }}
                      className="rounded-xl h-10 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCustomSpecialization}
                      className="rounded-xl font-semibold"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: TEACHING LANGUAGE */}
            {currentStep === 4 && !isReviewing && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
                    <Globe className="w-6 h-6 text-emerald-600" />
                    What language do you teach in?
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Select your medium(s) of instruction. You can select multiple languages.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {DEFAULT_LANGUAGES.map(lang => {
                    const isSelected = selectedLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`p-4 rounded-2xl text-left border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">
                          {lang}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'border border-neutral-300 dark:border-neutral-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 5: BOARDS */}
            {currentStep === 5 && !isReviewing && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-6 h-6 text-emerald-600" />
                    Which boards do you teach?
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Select the educational boards you cater to. Select all that apply.
                  </p>
                </div>

                <div className="space-y-3">
                  {availableBoards.map(brd => {
                    const isSelected = selectedBoardIds.includes(brd.id);
                    return (
                      <button
                        key={brd.id}
                        type="button"
                        onClick={() => toggleBoard(brd.id)}
                        className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-base text-neutral-900 dark:text-white font-heading">
                            {brd.name}
                          </div>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            Code: {brd.code}
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'border border-neutral-300 dark:border-neutral-600'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FINAL REVIEW SCREEN */}
            {isReviewing && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-emerald-600" />
                    Review & Confirm Channel
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Please double-check your channel information before publishing.
                  </p>
                </div>

                <div className="space-y-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 p-5">
                  {/* Channel Header Review */}
                  <div className="flex items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700/60">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                      {photoUrl ? (
                        <Image
                          src={photoUrl}
                          alt={channelName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <Tv className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-heading text-neutral-900 dark:text-white">
                        {channelName}
                      </h3>
                      <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">
                        {channelDescription}
                      </p>
                    </div>
                  </div>

                  {/* Class */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                      Class
                    </span>
                    <div>
                      {selectedClassId ? (
                        <Badge variant="secondary" className="rounded-lg text-xs font-semibold px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          {availableClasses.find(c => c.id === selectedClassId)?.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-neutral-400">None selected</span>
                      )}
                    </div>
                  </div>

                  {/* Specializations */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                      Specializations
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSpecializations.map(spec => (
                        <Badge key={spec} className="bg-emerald-600 text-white rounded-lg text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                      Medium of Instruction
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLanguages.map(l => (
                        <Badge key={l} variant="outline" className="rounded-lg text-xs">
                          {l}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Boards */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                      Boards
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {availableBoards
                        .filter(b => selectedBoardIds.includes(b.id))
                        .map(b => (
                          <Badge key={b.id} variant="secondary" className="rounded-lg text-xs">
                            {b.name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Navigation Buttons */}
            <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={submitting}
                className="rounded-xl px-5 h-11 border-neutral-300 dark:border-neutral-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {!isReviewing ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-6 h-11 shadow-lg shadow-emerald-600/20"
                >
                  {currentStep === TOTAL_STEPS ? 'Review' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCreateChannel}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-8 h-11 shadow-lg shadow-emerald-600/25"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Channel...
                    </>
                  ) : (
                    <>
                      Create Channel
                      <Sparkles className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
