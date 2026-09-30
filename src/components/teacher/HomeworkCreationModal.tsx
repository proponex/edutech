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
  FileText,
  Calendar,
  Award,
  AlertCircle,
  Loader2,
  GraduationCap,
  Paperclip,
} from 'lucide-react';
import { HomeworkItem } from '@/types';
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
  onSuccess: (homework: HomeworkItem) => void;
}

export function HomeworkCreationModal({
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

  // Homework Details State
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tasks, setTasks] = useState('');
  const [marks, setMarks] = useState('20');
  const [dueDate, setDueDate] = useState(() =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const reset = () => {
    setTitle('');
    setInstructions('');
    setTasks('');
    setMarks('20');
    setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setAttachmentUrl('');
    setErrorMsg(null);
  };

  const handleSave = async (isPublished: boolean) => {
    if (!title.trim() || !instructions.trim()) {
      setErrorMsg('Please enter a homework title and instructions.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await TeacherService.createHomework({
        channel_id: channelId,
        class_id: classId,
        board_id: boardId || '',
        subject_name: subjectName,
        unit_id: unitId,
        topic_id: null,
        sub_topic_id: null,
        scope: 'unit',
        title: title.trim(),
        instructions: instructions.trim(),
        tasks: tasks.trim() || null,
        marks: parseInt(marks, 10) || null,
        due_date: dueDate || null,
        attachment_url: attachmentUrl.trim() || null,
        is_published: isPublished,
      });

      onSuccess(created);
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to assign homework', err);
      setErrorMsg((err as Error).message || 'Failed to assign homework.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden rounded-3xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-heading text-neutral-900 dark:text-white">
                  Assign Unit Homework
                </DialogTitle>
                <p className="text-xs text-neutral-500">
                  Assign problem sets, reading tasks, or lab experiments
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
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

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="hwTitle" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Homework Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="hwTitle"
              placeholder="e.g. Electrostatics Practice Set 1: Force between charges"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="rounded-xl h-11 text-sm border-neutral-200 dark:border-neutral-800"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <Label htmlFor="hwInstructions" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Instructions <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="hwInstructions"
              rows={3}
              placeholder="Describe what students need to do, format guidelines, and submission expectations..."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="rounded-xl text-xs leading-relaxed border-neutral-200 dark:border-neutral-800"
            />
          </div>

          {/* Tasks & Questions */}
          <div className="space-y-1.5">
            <Label htmlFor="hwTasks" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Specific Tasks / Questions (Optional)
            </Label>
            <Textarea
              id="hwTasks"
              rows={3}
              placeholder="1. Derive the expression for electric field at an axial point.&#10;2. Solve Question 4 & 5 from Chapter 1..."
              value={tasks}
              onChange={e => setTasks(e.target.value)}
              className="rounded-xl text-xs leading-relaxed border-neutral-200 dark:border-neutral-800 font-mono"
            />
          </div>

          {/* Marks & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="hwMarks" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-neutral-400" />
                Total Marks
              </Label>
              <Input
                id="hwMarks"
                type="number"
                min="0"
                value={marks}
                onChange={e => setMarks(e.target.value)}
                className="rounded-xl h-11 text-xs border-neutral-200 dark:border-neutral-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hwDueDate" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Due Date
              </Label>
              <Input
                id="hwDueDate"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="rounded-xl h-11 text-xs border-neutral-200 dark:border-neutral-800"
              />
            </div>
          </div>

          {/* Optional Attachment */}
          <div className="space-y-1.5">
            <Label htmlFor="hwAttachment" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-neutral-400" />
              Attachment URL or Worksheet Link (Optional)
            </Label>
            <Input
              id="hwAttachment"
              placeholder="e.g. PDF link or shared Drive URL"
              value={attachmentUrl}
              onChange={e => setAttachmentUrl(e.target.value)}
              className="rounded-xl h-11 text-xs border-neutral-200 dark:border-neutral-800"
            />
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
              className="rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Assigning...
                </>
              ) : (
                'Assign Homework'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
