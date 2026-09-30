'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  BookOpen,
  RotateCcw,
  Clock,
  Globe2,
  GraduationCap,
} from 'lucide-react';

interface PreferenceState {
  board: string;
  language: string;
  learningPreference: string;
  preparingFor: string;
  timePerDay: string;
}

const QUESTIONS = [
  {
    id: 'board',
    title: 'Which board do you study under?',
    description: 'We will calibrate the syllabus to match your exact examination pattern.',
    options: ['Tamil Nadu State Board', 'CBSE', 'ICSE', 'Other'],
  },
  {
    id: 'language',
    title: 'What is your preferred language of instruction?',
    description: 'Select the primary language for your video lessons and tuition teachers.',
    options: ['English', 'Tamil', 'Hindi', 'Bilingual'],
  },
  {
    id: 'learningPreference',
    title: 'What is your preferred learning style?',
    description: 'How would you like to attend your daily tuition sessions?',
    options: ['Recorded + Quizzes', 'Mostly Video Lessons', 'Self-paced'],
  },
  {
    id: 'preparingFor',
    title: 'What are you primarily preparing for?',
    description: 'This helps us organize milestone reviews and mock test schedules.',
    options: ['School exams', 'Half-yearly', 'Board/Public exam', 'Competitive exams'],
  },
  {
    id: 'timePerDay',
    title: 'How much time can you dedicate per day?',
    description: 'Daily practice and study duration outside regular school hours.',
    options: ['Less than 1 hour', '1–2 hours', '2–3 hours', '3+ hours'],
  },
];

const EXAMPLE_SEARCHES = [
  'Class 12 Physics',
  'Class 10 Mathematics',
  'Class 11 Chemistry',
  'Class 9 Science',
  'Class 8 English',
];

export function SearchPreferenceSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuestionnaireActive, setIsQuestionnaireActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<PreferenceState>({
    board: '',
    language: '',
    learningPreference: '',
    preparingFor: '',
    timePerDay: '',
  });
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchQuery('Class 12 Physics');
    }
    setIsQuestionnaireActive(true);
    setIsCompleted(false);
    setCurrentStep(0);
  };

  const currentQuestion = QUESTIONS[currentStep];
  const currentAnswer = preferences[currentQuestion?.id as keyof PreferenceState] || '';

  const handleSelectOption = (option: string) => {
    setPreferences((prev) => ({
      ...prev,
      [currentQuestion.id]: option,
    }));
  };

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      setIsQuestionnaireActive(false);
    }
  };

  const handleReset = () => {
    setPreferences({
      board: '',
      language: '',
      learningPreference: '',
      preparingFor: '',
      timePerDay: '',
    });
    setIsCompleted(false);
    setIsQuestionnaireActive(false);
    setCurrentStep(0);
  };

  return (
    <section id="courses" className="py-12 sm:py-16 bg-neutral-50 dark:bg-neutral-950 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Heading */}
        <div className="text-center space-y-3 mb-8">
          <Badge variant="primary" className="mx-auto">
            Find Your Program
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-display">
            What do you want to learn?
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto">
            Personalize your curriculum across Tamil Nadu State Board, CBSE, ICSE, and grade levels.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative mb-4">
          <div className="flex items-center rounded-2xl border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 shadow-sm focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/20 transition-all">
            <Search className="w-5 h-5 text-neutral-400 ml-3 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, subjects, teachers or programs"
              className="w-full px-3 py-2 text-sm sm:text-base bg-transparent text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none"
            />
            <Button type="submit" variant="primary" size="md" className="shrink-0 px-5">
              Search
            </Button>
          </div>
        </form>

        {/* Quick Example Search Chips */}
        {!isQuestionnaireActive && !isCompleted && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-neutral-500">
            <span className="font-medium">Popular:</span>
            {EXAMPLE_SEARCHES.map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => {
                  setSearchQuery(query);
                  setIsQuestionnaireActive(true);
                  setIsCompleted(false);
                  setCurrentStep(0);
                }}
                className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary-500 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                {query}
              </button>
            ))}
          </div>
        )}

        {/* PREFERENCE QUESTIONNAIRE (Up to 5 questions) */}
        {isQuestionnaireActive && !isCompleted && currentQuestion && (
          <Card className="mt-8 border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Step Progress Bar */}
            <div className="bg-neutral-100 dark:bg-neutral-800/80 h-1.5 w-full">
              <div
                className="bg-primary-500 h-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <span className="font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  Question {currentStep + 1} of {QUESTIONS.length}
                </span>
                <span>Searching: &ldquo;{searchQuery || 'General Curriculum'}&rdquo;</span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white font-display">
                  {currentQuestion.title}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {currentQuestion.description}
                </p>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentQuestion.options.map((option) => {
                  const isSelected = currentAnswer === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelectOption(option)}
                      className={`p-4 rounded-xl border text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/60 text-primary-950 dark:text-primary-200 ring-2 ring-primary-500/40'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <span className="text-sm font-semibold">{option}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-neutral-300 dark:border-neutral-700" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {currentStep === 0 ? 'Cancel' : 'Previous'}
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={!currentAnswer}
                  onClick={handleNext}
                  className="flex items-center gap-2"
                >
                  {currentStep === QUESTIONS.length - 1 ? 'View Recommendation' : 'Next Question'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STRUCTURED RECOMMENDATION STATE */}
        {isCompleted && (
          <Card className="mt-8 border-primary-300/80 dark:border-primary-800/80 shadow-xl overflow-hidden bg-gradient-to-b from-primary-50/30 to-white dark:from-primary-950/20 dark:to-neutral-900 animate-in fade-in duration-300">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-neutral-950 shadow-md">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <Badge variant="success" className="mb-1">
                      Curriculum Path Generated
                    </Badge>
                    <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white font-display">
                      Customized Track for &ldquo;{searchQuery}&rdquo;
                    </h3>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs text-neutral-500 flex items-center gap-1 self-start sm:self-center"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Preferences
                </Button>
              </div>

              {/* Preference Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <GraduationCap className="w-3.5 h-3.5 text-primary-500" />
                    <span>Board</span>
                  </div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                    {preferences.board || 'CBSE'}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Globe2 className="w-3.5 h-3.5 text-secondary-500" />
                    <span>Language</span>
                  </div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                    {preferences.language || 'English'}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-accent-500" />
                    <span>Learning</span>
                  </div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                    {preferences.learningPreference || 'Recorded + Quizzes'}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary-500" />
                    <span>Goal</span>
                  </div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                    {preferences.preparingFor || 'Board exams'}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Clock className="w-3.5 h-3.5 text-secondary-500" />
                    <span>Daily Pace</span>
                  </div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                    {preferences.timePerDay || '1–2 hours'}
                  </span>
                </div>
              </div>

              {/* Recommended Track Description */}
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 space-y-2">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                  Program Highlights:
                </h4>
                <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-1.5 list-disc list-inside">
                  <li>Comprehensive syllabus coverage tailored for <strong>{preferences.board}</strong> examinations.</li>
                  <li>Video concept sessions conducted in <strong>{preferences.language}</strong> with structured quizzes.</li>
                  <li>Structured milestone evaluations designed for <strong>{preferences.preparingFor}</strong>.</li>
                  <li>Targeted pace aligned with your <strong>{preferences.timePerDay}</strong> daily commitment.</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <span className="text-xs text-neutral-500">
                  Ready to start learning with dedicated tuition teachers?
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link href="/signup" className="w-full sm:w-auto">
                    <Button variant="primary" size="md" className="w-full sm:w-auto flex items-center gap-2">
                      Enroll in This Program
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
