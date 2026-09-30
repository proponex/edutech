'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  FileQuestion,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Clock,
  GraduationCap,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { QuizItem, QuizQuestionItem } from '@/types';
import { TeacherService } from '@/lib/teacher-service';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  classId: string;
  className: string;
  boardId?: string;
  subjectName: string;
  unitId: string;
  unitTitle: string;
  onSuccess: (quiz: QuizItem) => void;
}

export function QuizCreationModal({
  open,
  onOpenChange,
  channelId,
  classId,
  className,
  boardId,
  subjectName,
  unitId,
  unitTitle,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quiz Details State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('20');

  // Question Builder State
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([
    {
      question_text: '',
      marks: 2,
      display_order: 1,
      options: [
        { option_text: '', is_correct: true, display_order: 1 },
        { option_text: '', is_correct: false, display_order: 2 },
        { option_text: '', is_correct: false, display_order: 3 },
        { option_text: '', is_correct: false, display_order: 4 },
      ],
    },
  ]);

  const reset = () => {
    setTitle('');
    setDescription('');
    setTimeLimitMinutes('20');
    setQuestions([
      {
        question_text: '',
        marks: 2,
        display_order: 1,
        options: [
          { option_text: '', is_correct: true, display_order: 1 },
          { option_text: '', is_correct: false, display_order: 2 },
          { option_text: '', is_correct: false, display_order: 3 },
          { option_text: '', is_correct: false, display_order: 4 },
        ],
      },
    ]);
    setErrorMsg(null);
  };

  // Question manipulation
  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        question_text: '',
        marks: 2,
        display_order: prev.length + 1,
        options: [
          { option_text: '', is_correct: true, display_order: 1 },
          { option_text: '', is_correct: false, display_order: 2 },
          { option_text: '', is_correct: false, display_order: 3 },
          { option_text: '', is_correct: false, display_order: 4 },
        ],
      },
    ]);
  };

  const removeQuestion = (qIdx: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, idx) => idx !== qIdx));
  };

  const moveQuestion = (qIdx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && qIdx === 0) return;
    if (direction === 'down' && qIdx === questions.length - 1) return;
    const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;
    setQuestions(prev => {
      const copy = [...prev];
      const temp = copy[qIdx];
      copy[qIdx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const updateQuestionText = (qIdx: number, text: string) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], question_text: text };
      return copy;
    });
  };

  const updateQuestionMarks = (qIdx: number, marks: number) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], marks: Math.max(1, marks) };
      return copy;
    });
  };

  const updateOptionText = (qIdx: number, oIdx: number, text: string) => {
    setQuestions(prev => {
      const copy = [...prev];
      const opts = [...copy[qIdx].options];
      opts[oIdx] = { ...opts[oIdx], option_text: text };
      copy[qIdx] = { ...copy[qIdx], options: opts };
      return copy;
    });
  };

  const setCorrectOption = (qIdx: number, oIdx: number) => {
    setQuestions(prev => {
      const copy = [...prev];
      const opts = copy[qIdx].options.map((opt, idx) => ({
        ...opt,
        is_correct: idx === oIdx,
      }));
      copy[qIdx] = { ...copy[qIdx], options: opts };
      return copy;
    });
  };

  const addOption = (qIdx: number) => {
    setQuestions(prev => {
      const copy = [...prev];
      const currentOpts = copy[qIdx].options;
      if (currentOpts.length >= 6) return prev;
      copy[qIdx] = {
        ...copy[qIdx],
        options: [
          ...currentOpts,
          {
            option_text: '',
            is_correct: false,
            display_order: currentOpts.length + 1,
          },
        ],
      };
      return copy;
    });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions(prev => {
      const copy = [...prev];
      const currentOpts = copy[qIdx].options;
      if (currentOpts.length <= 2) return prev;
      const filtered = currentOpts.filter((_, idx) => idx !== oIdx);
      // Ensure at least one is correct
      if (!filtered.some(o => o.is_correct)) {
        filtered[0].is_correct = true;
      }
      copy[qIdx] = { ...copy[qIdx], options: filtered };
      return copy;
    });
  };

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  const handleSave = async (isPublished: boolean) => {
    if (!title.trim()) {
      setErrorMsg('Please enter a quiz title.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        setErrorMsg(`Question ${i + 1} has empty text.`);
        return;
      }
      const filledOptions = q.options.filter(o => o.option_text.trim());
      if (filledOptions.length < 2) {
        setErrorMsg(`Question ${i + 1} requires at least 2 non-empty options.`);
        return;
      }
      if (!q.options.some(o => o.is_correct && o.option_text.trim())) {
        setErrorMsg(`Please mark a valid non-empty option as correct for Question ${i + 1}.`);
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await TeacherService.createQuiz({
        channel_id: channelId,
        class_id: classId,
        board_id: boardId || '',
        subject_name: subjectName,
        unit_id: unitId,
        topic_id: null,
        sub_topic_id: null,
        scope: 'unit',
        title: title.trim(),
        description: description.trim() || null,
        time_limit_minutes: parseInt(timeLimitMinutes, 10) || null,
        total_marks: totalMarks,
        is_published: isPublished,
        questions: questions.map((q, idx) => ({
          question_text: q.question_text.trim(),
          marks: q.marks || 1,
          display_order: idx + 1,
          options: q.options
            .filter(o => o.option_text.trim())
            .map((o, oIdx) => ({
              option_text: o.option_text.trim(),
              is_correct: o.is_correct,
              display_order: oIdx + 1,
            })),
        })),
      });

      onSuccess(created);
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to create quiz', err);
      setErrorMsg((err as Error).message || 'Failed to create quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden rounded-3xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-heading text-neutral-900 dark:text-white">
                  Create Interactive Quiz
                </DialogTitle>
                <p className="text-xs text-neutral-500">
                  Build multi-choice assessments directly inside this unit
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {questions.length} Questions
              </Badge>
              <Badge className="bg-purple-600 text-white text-xs">
                {totalMarks} Marks
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Inherited Academic Context Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
            <Badge variant="secondary" className="rounded-lg text-xs bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-bold">
              {className}
            </Badge>
            <span className="text-neutral-400">•</span>
            <Badge className="bg-emerald-600 text-white rounded-lg text-xs font-bold">
              {subjectName}
            </Badge>
            <span className="text-neutral-400">•</span>
            <span className="text-neutral-900 dark:text-white font-bold truncate max-w-xs">
              {unitTitle}
            </span>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-red-700 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Quiz Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="quizTitle" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Quiz Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quizTitle"
                placeholder="e.g. Unit 1 Quick Check: Coulomb's Law & Electric Potential"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="rounded-xl h-11 text-sm border-neutral-200 dark:border-neutral-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quizTime" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                Time Limit (Mins)
              </Label>
              <Input
                id="quizTime"
                type="number"
                min="5"
                step="5"
                value={timeLimitMinutes}
                onChange={e => setTimeLimitMinutes(e.target.value)}
                className="rounded-xl h-11 text-xs border-neutral-200 dark:border-neutral-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quizDesc" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Instructions (Optional)
            </Label>
            <Textarea
              id="quizDesc"
              rows={2}
              placeholder="Instructions for students (e.g. negative marks, calculator allowed, etc.)..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="rounded-xl text-xs leading-relaxed border-neutral-200 dark:border-neutral-800"
            />
          </div>

          {/* Question Builder List */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
                Questions Builder
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuestion}
                className="rounded-xl text-xs font-semibold h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Question
              </Button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold">
                        {qIdx + 1}
                      </span>
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Question #{qIdx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveQuestion(qIdx, 'up')}
                        disabled={qIdx === 0}
                        className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(qIdx, 'down')}
                        disabled={qIdx === questions.length - 1}
                        className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1.5 ml-2">
                        <Label className="text-[11px] text-neutral-400 font-normal">Marks:</Label>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={q.marks}
                          onChange={e => updateQuestionMarks(qIdx, parseInt(e.target.value, 10) || 1)}
                          className="w-14 h-7 text-xs rounded-lg text-center p-0 border-neutral-300 dark:border-neutral-700"
                        />
                      </div>

                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIdx)}
                          className="p-1 text-red-500 hover:text-red-700 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <Textarea
                    rows={2}
                    placeholder="Enter question text here..."
                    value={q.question_text}
                    onChange={e => updateQuestionText(qIdx, e.target.value)}
                    className="rounded-xl text-xs border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />

                  {/* Options */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-semibold text-neutral-400 block">
                      Options (Click radio to select correct answer):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                            opt.is_correct
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={opt.is_correct}
                            onChange={() => setCorrectOption(qIdx, oIdx)}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                            value={opt.option_text}
                            onChange={e => updateOptionText(qIdx, oIdx, e.target.value)}
                            className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 p-1 flex-1"
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(qIdx, oIdx)}
                              className="text-neutral-400 hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {q.options.length < 6 && (
                      <button
                        type="button"
                        onClick={() => addOption(qIdx)}
                        className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline pt-1 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add another option
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between sm:justify-between bg-neutral-50/50 dark:bg-neutral-900">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={submitting}
            className="rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={submitting}
              className="rounded-xl text-xs font-semibold"
            >
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={() => handleSave(true)}
              disabled={submitting}
              className="rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                'Publish Quiz'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
