'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Target
} from 'lucide-react';
import { StudentService } from '@/lib/student-service';

function QuizPageContent() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.quizId as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Data State
  const [quiz, setQuiz] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  
  // Taker State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push('/');
          return;
        }
        
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profileData) setCurrentUser(profileData);

        const quizData = await StudentService.getQuizDetails(quizId);
        if (!quizData) {
          router.push('/student');
          return;
        }
        setQuiz(quizData);

        // Check for existing attempt
        const existingAttempt = await StudentService.getQuizAttempt(session.user.id, quizId);
        if (existingAttempt && existingAttempt.is_completed) {
          setAttempt(existingAttempt);
        } else {
          // Initialize timer if not attempted
          const limitSeconds = (quizData.time_limit_minutes || 0) * 60;
          setTimeLeft(limitSeconds > 0 ? limitSeconds : 0);
        }
      } catch (err) {
        console.error('Error loading quiz:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [quizId, router, supabase]);

  // Timer Countdown Effect
  useEffect(() => {
    if (loading || attempt?.is_completed || timeLeft <= 0 || !quiz?.time_limit_minutes) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, attempt, timeLeft, quiz]);

  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitting) return;
    await submitQuiz(answers, true);
  }, [answers, isSubmitting]);

  const submitQuiz = async (finalAnswers: Record<string, string>, isAutoSubmit: boolean = false) => {
    if (!quiz || !currentUser) return;
    setIsSubmitting(true);
    setShowConfirmSubmit(false);

    try {
      let score = 0;
      let totalMarks = 0;
      let correctCount = 0;
      let wrongCount = 0;

      quiz.questions.forEach((q: any) => {
        totalMarks += q.marks || 1;
        const selectedOptId = finalAnswers[q.id];
        const correctOpt = q.options.find((o: any) => o.is_correct);
        
        if (selectedOptId) {
          if (correctOpt && selectedOptId === correctOpt.id) {
            score += q.marks || 1;
            correctCount++;
          } else {
            wrongCount++;
          }
        }
      });

      const timeTakenSeconds = (quiz.time_limit_minutes * 60) - timeLeft;

      await StudentService.submitQuizAttempt({
        studentId: currentUser.id,
        quizId: quiz.id,
        score,
        totalMarks,
        correctCount,
        wrongCount,
        timeTakenSeconds: timeTakenSeconds > 0 ? timeTakenSeconds : 0,
        answers: finalAnswers,
      });

      // Update student progress record to completed
      await StudentService.updateContentProgress({
        studentId: currentUser.id,
        channelId: quiz.channel_id,
        contentType: 'quiz',
        contentId: quiz.id,
        status: 'completed',
      });

      // Fetch the newly created attempt
      const newAttempt = await StudentService.getQuizAttempt(currentUser.id, quiz.id);
      setAttempt(newAttempt);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm font-semibold text-neutral-500">Loading Quiz Experience...</p>
      </div>
    );
  }

  if (!quiz) return null;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const isTimeRunningOut = timeLeft > 0 && timeLeft < 60; // Less than 1 min
  const hasTimeLimit = (quiz.time_limit_minutes || 0) > 0;

  // =========================================================================================
  // RENDER: COMPLETED / RESULT VIEW
  // =========================================================================================
  if (attempt?.is_completed) {
    const scorePercentage = Math.round((attempt.score / attempt.total_marks) * 100) || 0;
    
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-20">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="text-sm font-bold text-neutral-900 dark:text-white truncate mx-4">
              {quiz.title} - Results
            </div>
            <div className="w-16" /> {/* Spacer */}
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Summary Card */}
          <Card className="bg-gradient-to-br from-primary-500 to-primary-700 text-white border-0 shadow-xl overflow-hidden rounded-3xl relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Trophy className="w-48 h-48" />
            </div>
            <CardContent className="p-8 sm:p-10 relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-extrabold uppercase tracking-widest">
                Quiz Completed
              </div>
              
              <div>
                <div className="text-6xl sm:text-7xl font-black font-display tracking-tight">
                  {attempt.score} <span className="text-3xl sm:text-4xl text-primary-200 font-bold">/ {attempt.total_marks}</span>
                </div>
                <p className="mt-2 text-primary-100 font-semibold text-lg">
                  Total Score ({scorePercentage}%)
                </p>
              </div>
              
              <div className="flex items-center gap-4 sm:gap-8 pt-4 w-full justify-center">
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm min-w-[100px]">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-2xl font-bold">{attempt.correct_count}</span>
                  <span className="text-[11px] uppercase tracking-wider text-primary-200">Correct</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm min-w-[100px]">
                  <XCircle className="w-6 h-6 text-red-400 mb-1" />
                  <span className="text-2xl font-bold">{attempt.wrong_count}</span>
                  <span className="text-[11px] uppercase tracking-wider text-primary-200">Wrong</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm min-w-[100px]">
                  <Target className="w-6 h-6 text-amber-300 mb-1" />
                  <span className="text-2xl font-bold">{attempt.score * 10}</span>
                  <span className="text-[11px] uppercase tracking-wider text-primary-200">Points</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Review */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white font-display px-2">
              Detailed Review
            </h3>
            
            {quiz.questions.map((q: any, idx: number) => {
              const studentOptId = attempt.answers?.[q.id];
              const correctOpt = q.options.find((o: any) => o.is_correct);
              const isCorrect = studentOptId === correctOpt?.id;

              return (
                <Card key={q.id} className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-sm">
                  <div className={`p-4 border-b ${isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50' : 'bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50'} flex items-start justify-between gap-4`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'}`}>
                        {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>
                      <h4 className="font-bold text-neutral-900 dark:text-white text-base">
                        Question {idx + 1}
                      </h4>
                    </div>
                    <Badge variant="outline" className="text-xs bg-white dark:bg-neutral-900">
                      {q.marks} Marks
                    </Badge>
                  </div>
                  
                  <CardContent className="p-6 space-y-6">
                    <p className="text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed whitespace-pre-wrap">
                      {q.question_text}
                    </p>
                    
                    <div className="space-y-3">
                      {q.options.map((opt: any) => {
                        const isStudentChoice = studentOptId === opt.id;
                        const isActualCorrect = opt.is_correct;
                        
                        let optClass = "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-600 dark:text-neutral-400";
                        let Icon = null;
                        
                        if (isActualCorrect) {
                          optClass = "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 shadow-sm ring-1 ring-emerald-500";
                          Icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
                        } else if (isStudentChoice && !isActualCorrect) {
                          optClass = "border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-900 dark:text-red-100 shadow-sm ring-1 ring-red-500";
                          Icon = <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
                        }
                        
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${optClass}`}
                          >
                            <div className="flex-1 font-medium">{opt.option_text}</div>
                            {Icon && <div>{Icon}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================================
  // RENDER: ACTIVE QUIZ TAKER VIEW
  // =========================================================================================
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
          
          <div className="text-sm font-extrabold text-neutral-900 dark:text-white truncate mx-4 font-display">
            {quiz.title}
          </div>
          
          {hasTimeLimit ? (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm transition-colors ${
              isTimeRunningOut 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 animate-pulse' 
                : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            }`}>
              <Clock className="w-4 h-4 shrink-0" />
              <span className="tabular-nums tracking-tight">{formatTime(timeLeft)}</span>
            </div>
          ) : (
            <div className="w-20" /> // Spacer
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800">
          <div 
            className="h-full bg-primary-500 transition-all duration-300" 
            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col">
        {/* Question Card */}
        <Card className="border-0 shadow-lg bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden flex-1 flex flex-col">
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/50">
            <h3 className="font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-xs">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </h3>
            <Badge variant="outline" className="font-bold">
              {currentQuestion.marks} Marks
            </Badge>
          </div>
          
          <CardContent className="p-6 sm:p-10 flex-1 flex flex-col">
            <p className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white leading-relaxed mb-10">
              {currentQuestion.question_text}
            </p>
            
            <div className="space-y-3 mt-auto">
              {currentQuestion.options.map((opt: any) => {
                const isSelected = answers[currentQuestion.id] === opt.id;
                
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionSelect(currentQuestion.id, opt.id)}
                    className={`w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 shadow-md ring-4 ring-primary-500/10'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'border-primary-500 bg-primary-500 text-white' 
                        : 'border-neutral-300 dark:border-neutral-700 text-transparent'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                    <span className={`font-medium sm:text-lg ${isSelected ? 'text-primary-900 dark:text-primary-100' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {opt.option_text}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation / Submit Controls */}
        <div className="mt-6 sm:mt-8 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            disabled={currentQuestionIndex === 0}
            className="w-28 font-bold border-2 rounded-2xl disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Prev
          </Button>
          
          {isLastQuestion ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowConfirmSubmit(true)}
              className="flex-1 sm:flex-none sm:min-w-[200px] font-extrabold rounded-2xl shadow-xl shadow-primary-500/20"
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="w-28 font-bold rounded-2xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Next <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          )}
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <div>
              <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white font-display mb-2">
                Ready to Submit?
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                You have answered {Object.keys(answers).length} out of {quiz.questions.length} questions. You won't be able to change your answers after submission.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowConfirmSubmit(false)}
                disabled={isSubmitting}
                className="font-bold border-2"
              >
                Go Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => submitQuiz(answers, false)}
                disabled={isSubmitting}
                className="font-extrabold shadow-lg"
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <QuizPageContent />
    </Suspense>
  );
}
