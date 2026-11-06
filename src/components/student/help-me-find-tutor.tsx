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
    <Card className="border border-[#E9DDF8] bg-white shadow-xs rounded-3xl overflow-hidden">
      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Header with Title & Reset Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9DDF8]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="text-xs uppercase tracking-wider font-bold bg-[#F3E8FF] text-[#9333EA] border-0">
                Smart Tutor Match
              </Badge>
              <span className="text-xs text-[#68647D]">
                Question {activeStep + 1} of {steps.length}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#17133A] font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#9333EA]" />
              Help Me Find My Tutor
            </h2>
            <p className="text-xs sm:text-sm text-[#68647D]">
              Answer 6 quick preferences to find teacher channels tailored to your exact learning needs.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-[#68647D] hover:text-[#17133A] hover:bg-[#FAF9FF] rounded-xl flex items-center gap-1.5 self-start sm:self-center"
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
                className={`h-2 rounded-full transition-all cursor-pointer ${isCurrent
                    ? 'bg-[#9333EA] ring-2 ring-[#9333EA]/20'
                    : isDone
                      ? 'bg-[#C084FC]'
                      : 'bg-[#E9DDF8]'
                  }`}
                title={`Go to Question ${idx + 1}: ${st.title}`}
              />
            );
          })}
        </div>

        {/* Active Question Box */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#FAF9FF] border border-[#E9DDF8] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#17133A]">
                {currentStep.title}
              </h3>
              <p className="text-xs text-[#68647D]">
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
                      className={`p-3.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${isSelected
                          ? 'bg-[#9333EA] text-white border-[#9333EA] shadow-2xs font-bold'
                          : 'bg-white text-[#68647D] border-[#E9DDF8] hover:border-[#9333EA]/40 hover:bg-white/80'
                        }`}
                    >
                      <span>{time}</span>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
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
                      className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${isSelected
                          ? 'bg-[#9333EA] text-white border-[#9333EA] shadow-2xs font-bold'
                          : 'bg-white text-[#68647D] border-[#E9DDF8] hover:border-[#9333EA]/40 hover:bg-white/80'
                        }`}
                    >
                      <span>{lang}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
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
                        className={`py-2 px-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center truncate ${isSelected
                            ? 'bg-[#9333EA] text-white border-[#9333EA] shadow-2xs font-extrabold'
                            : 'bg-white text-[#68647D] border-[#E9DDF8] hover:border-[#9333EA]/40 hover:bg-white/80'
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
                      className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-between text-left ${isSelected
                          ? 'bg-[#9333EA] text-white border-[#9333EA] shadow-2xs font-bold'
                          : 'bg-white text-[#68647D] border-[#E9DDF8] hover:border-[#9333EA]/40 hover:bg-white/80'
                        }`}
                    >
                      <div className="truncate">
                        <span className="block truncate">{b.name}</span>
                        {b.code && (
                          <span className="text-[11px] opacity-75 font-mono">{b.code}</span>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-white ml-2" />}
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
                      className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${isSelected
                          ? 'bg-[#9333EA] text-white border-[#9333EA] shadow-2xs font-bold'
                          : 'bg-white text-[#68647D] border-[#E9DDF8] hover:border-[#9333EA]/40 hover:bg-white/80'
                        }`}
                    >
                      <span>{lang}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wizard Navigation: Back & Next */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E9DDF8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              className="text-xs flex items-center gap-1 border-[#E9DDF8] text-[#17133A] hover:bg-white rounded-xl"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>

            <span className="text-xs text-[#68647D] hidden sm:inline">
              Selected: <strong className="text-[#17133A]">{allClasses.find((c) => c.id === classId)?.name || 'Class'}</strong> •{' '}
              <strong className="text-[#17133A]">{preferredLanguage}</strong>
            </span>

            {activeStep < steps.length - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="text-xs flex items-center gap-1 font-bold bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl shadow-xs"
              >
                Next Step
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const target = document.getElementById('results-section');
                  if (target) target.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs flex items-center gap-1 font-bold bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl shadow-xs"
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
