'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Clock,
  Radio,
  Languages,
  GraduationCap,
  Building2,
  BookOpen,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { ClassItem, BoardItem } from '@/types';

export interface TutorFinderFilters {
  dailyStudyTime: string;
  preferredLanguage: string;
  classId: string;
  className: string;
  boardId: string;
  boardName: string;
  languageWantedToLearn: string;
}

interface HelpMeFindMyTutorProps {
  allClasses: ClassItem[];
  allBoards: BoardItem[];
  currentFilters: Partial<TutorFinderFilters>;
  onFilterChange: (filters: TutorFinderFilters) => void;
  compact?: boolean;
}

const STUDY_TIMES = ['< 1 hr', '1–2 hrs', '2–3 hrs', '3+ hrs'];
const TUTOR_LANGUAGES = ['English', 'Tamil', 'Hindi', 'Marathi', 'Hinglish'];
const LEARN_LANGUAGES = ['English', 'Hindi', 'Sanskrit', 'French', 'German', 'Spanish', 'Tamil'];

export function HelpMeFindMyTutor({
  allClasses,
  allBoards,
  currentFilters,
  onFilterChange,
  compact = false,
}: HelpMeFindMyTutorProps) {
  const [dailyStudyTime, setDailyStudyTime] = useState<string>(currentFilters.dailyStudyTime || '1–2 hrs');
  const [preferredLanguage, setPreferredLanguage] = useState<string>(currentFilters.preferredLanguage || 'English');
  const [classId, setClassId] = useState<string>(currentFilters.classId || (allClasses[0]?.id || ''));
  const [boardId, setBoardId] = useState<string>(currentFilters.boardId || (allBoards[0]?.id || ''));
  const [languageWantedToLearn, setLanguageWantedToLearn] = useState<string>(currentFilters.languageWantedToLearn || 'English');

  const [activeStep, setActiveStep] = useState<number>(0);

  const applyChanges = (updates: Partial<TutorFinderFilters>) => {
    const updatedClassId = updates.classId ?? classId;
    const updatedBoardId = updates.boardId ?? boardId;
    const updatedClassName = allClasses.find((c) => c.id === updatedClassId)?.name || '';
    const updatedBoardName = allBoards.find((b) => b.id === updatedBoardId)?.name || '';

    const newFilters: TutorFinderFilters = {
      dailyStudyTime: updates.dailyStudyTime ?? dailyStudyTime,
      preferredLanguage: updates.preferredLanguage ?? preferredLanguage,
      classId: updatedClassId,
      className: updatedClassName,
      boardId: updatedBoardId,
      boardName: updatedBoardName,
      languageWantedToLearn: updates.languageWantedToLearn ?? languageWantedToLearn,
    };

    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const defaultClassId = allClasses[0]?.id || '';
    const defaultBoardId = allBoards[0]?.id || '';
    setDailyStudyTime('1–2 hrs');
    setPreferredLanguage('English');
    setClassId(defaultClassId);
    setBoardId(defaultBoardId);
    setLanguageWantedToLearn('English');
    setActiveStep(0);

    applyChanges({
      dailyStudyTime: '1–2 hrs',
      preferredLanguage: 'English',
      classId: defaultClassId,
      boardId: defaultBoardId,
      languageWantedToLearn: 'English',
    });
  };

  const steps = [
    {
      id: 'daily_study_time',
      title: 'Daily Study Time',
      subtitle: 'How much time do you plan to study outside school?',
      icon: Clock,
    },
    {
      id: 'preferred_tutor_language',
      title: 'Preferred Tutor Language',
      subtitle: 'In which language would you like the tutor to explain concepts?',
      icon: Languages,
    },
    {
      id: 'class',
      title: 'Your Class / Grade',
      subtitle: 'Select your current academic standard (Class 1 – 12)',
      icon: GraduationCap,
    },
    {
      id: 'board',
      title: 'Education Board',
      subtitle: 'Select your school syllabus pattern',
      icon: Building2,
    },
    {
      id: 'language_wanted_to_learn',
      title: 'Language Wanted to Learn',
      subtitle: 'Specific target language or focus subject',
      icon: BookOpen,
    },
  ];

  const currentStep = steps[activeStep];
  const StepIcon = currentStep.icon;

  return (
    <Card className="border border-neutral-200 dark:border-neutral-800 bg-gradient-to-b from-white to-neutral-50/50 dark:from-neutral-900 dark:to-neutral-950 shadow-md rounded-3xl overflow-hidden">
      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Header with Title & Reset Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="primary" className="text-xs uppercase tracking-wider font-bold">
                Smart Tutor Match
              </Badge>
              <span className="text-xs text-neutral-400">
                Question {activeStep + 1} of {steps.length}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-950 dark:text-white font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-500" />
              Help Me Find My Tutor
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Answer 6 quick preferences to find teacher channels tailored to your exact learning needs.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 self-start sm:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </Button>
        </div>

        {/* Step Progress Pills */}
        <div className="grid grid-cols-6 gap-1.5 w-full">
          {steps.map((st, idx) => {
            const isDone = idx < activeStep;
            const isCurrent = idx === activeStep;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-primary-500 ring-2 ring-primary-400/40'
                    : isDone
                    ? 'bg-primary-300 dark:bg-primary-800'
                    : 'bg-neutral-200 dark:bg-neutral-800'
                }`}
                title={`Go to Question ${idx + 1}: ${st.title}`}
              />
            );
          })}
        </div>

        {/* Active Question Box */}
        <div className="p-5 sm:p-6 rounded-2xl bg-neutral-100/60 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800/80 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                {currentStep.title}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {currentStep.subtitle}
              </p>
            </div>
          </div>

          {/* Options Renderer based on active question */}
          <div className="pt-2">
            {/* 1. Daily Study Time */}
            {activeStep === 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STUDY_TIMES.map((time) => {
                  const isSelected = dailyStudyTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        setDailyStudyTime(time);
                        applyChanges({ dailyStudyTime: time });
                      }}
                      className={`p-3.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-primary-500 text-neutral-950 border-primary-500 shadow-sm font-bold'
                          : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                      }`}
                    >
                      <span>{time}</span>
                      {isSelected && <Check className="w-4 h-4 text-neutral-950" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Preferred Tutor Language */}
            {activeStep === 1 && (
              <div className="flex flex-wrap gap-2.5">
                {TUTOR_LANGUAGES.map((lang) => {
                  const isSelected = preferredLanguage.toLowerCase() === lang.toLowerCase();
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setPreferredLanguage(lang);
                        applyChanges({ preferredLanguage: lang });
                      }}
                      className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-primary-500 text-neutral-950 border-primary-500 shadow-sm font-bold'
                          : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                      }`}
                    >
                      <span>{lang}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-neutral-950" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. Class (Class 1 to 12) */}
            {activeStep === 2 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                {allClasses
                  .slice()
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((cls) => {
                    const isSelected = classId === cls.id;
                    const shortName = cls.name.replace('Class ', 'C');
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          setClassId(cls.id);
                          applyChanges({ classId: cls.id });
                        }}
                        className={`py-2 px-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                          isSelected
                            ? 'bg-primary-500 text-neutral-950 border-primary-500 shadow-sm font-extrabold'
                            : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                        }`}
                        title={cls.name}
                      >
                        {cls.name === 'Kindergarten' ? 'KG' : shortName}
                      </button>
                    );
                  })}
              </div>
            )}

            {/* 4. Board */}
            {activeStep === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {allBoards.map((b) => {
                  const isSelected = boardId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBoardId(b.id);
                        applyChanges({ boardId: b.id });
                      }}
                      className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-between text-left ${
                        isSelected
                          ? 'bg-primary-500 text-neutral-950 border-primary-500 shadow-sm font-bold'
                          : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                      }`}
                    >
                      <div className="truncate">
                        <span className="block truncate">{b.name}</span>
                        {b.code && (
                          <span className="text-[11px] opacity-75 font-mono">{b.code}</span>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-neutral-950 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 5. Language Wanted to Learn */}
            {activeStep === 4 && (
              <div className="flex flex-wrap gap-2.5">
                {LEARN_LANGUAGES.map((lang) => {
                  const isSelected = languageWantedToLearn.toLowerCase() === lang.toLowerCase();
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLanguageWantedToLearn(lang);
                        applyChanges({ languageWantedToLearn: lang });
                      }}
                      className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-primary-500 text-neutral-950 border-primary-500 shadow-sm font-bold'
                          : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                      }`}
                    >
                      <span>{lang}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-neutral-950" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wizard Navigation: Back & Next */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              className="text-xs flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>

            <span className="text-xs text-neutral-400 hidden sm:inline">
              Selected: <strong className="text-neutral-900 dark:text-white">{allClasses.find((c) => c.id === classId)?.name || 'Class'}</strong> •{' '}
              <strong className="text-neutral-900 dark:text-white">{preferredLanguage}</strong>
            </span>

            {activeStep < steps.length - 1 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="text-xs flex items-center gap-1 font-bold"
              >
                Next Step
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  const target = document.getElementById('results-section');
                  if (target) target.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs flex items-center gap-1 font-bold shadow-md shadow-primary-500/20"
              >
                <Check className="w-3.5 h-3.5" />
                View Matched Tutors
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
