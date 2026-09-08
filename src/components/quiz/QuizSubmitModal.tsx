'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Bookmark, HelpCircle } from 'lucide-react';

interface QuizSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  totalQuestions: number;
  answeredCount: number;
  markedCount: number;
  unansweredCount: number;
  isSubmitting?: boolean;
}

export function QuizSubmitModal({
  isOpen,
  onClose,
  onSubmit,
  totalQuestions,
  answeredCount,
  markedCount,
  unansweredCount,
  isSubmitting = false,
}: QuizSubmitModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Test Confirmation"
      maxWidth="md"
    >
      <div className="space-y-5">
        <p className="text-xs text-slate-500 -mt-2">
          Please review your attempt summary before final submission.
        </p>

        {/* Warning if unanswered questions exist */}
        {unansweredCount > 0 && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">You have unanswered questions</p>
              <p className="text-xs mt-0.5">
                {unansweredCount} question{unansweredCount > 1 ? 's are' : ' is'} left blank and will receive 0 marks.
              </p>
            </div>
          </div>
        )}

        {/* Stats Table */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Total Questions</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{totalQuestions}</span>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Answered
            </span>
            <span className="font-bold">{answeredCount}</span>
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center justify-between text-purple-800 dark:text-purple-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Bookmark className="w-4 h-4 text-purple-600" />
              Marked for Review
            </span>
            <span className="font-bold">{markedCount}</span>
          </div>

          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              Not Answered
            </span>
            <span className="font-bold">{unansweredCount}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Once submitted, you cannot change your answers. Your final scorecard will be generated immediately.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Return to Test
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={onSubmit}
            isLoading={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            Confirm & Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
