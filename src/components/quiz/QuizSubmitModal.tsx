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
        <p className="text-xs text-slate-600 dark:text-slate-300 -mt-2">
          Please review your attempt summary before final submission.
        </p>

        {/* Warning if unanswered questions exist */}
        {unansweredCount > 0 && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/70 text-amber-900 dark:text-amber-200 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950 dark:text-amber-100">You have unanswered questions</p>
              <p className="text-xs mt-0.5 text-amber-900/90 dark:text-amber-300/90">
                {unansweredCount} question{unansweredCount > 1 ? 's are' : ' is'} left blank and will receive 0 marks.
              </p>
            </div>
          </div>
        )}

        {/* Stats Table */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Total Questions</span>
            <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">{totalQuestions}</span>
          </div>

          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Answered
            </span>
            <span className="font-extrabold text-base text-emerald-900 dark:text-emerald-100">{answeredCount}</span>
          </div>

          <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-300 dark:border-purple-800/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-purple-700 dark:text-purple-300">
              <Bookmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Marked for Review
            </span>
            <span className="font-extrabold text-base text-purple-900 dark:text-purple-100">{markedCount}</span>
          </div>

          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
              <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Not Answered
            </span>
            <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">{unansweredCount}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
          Once submitted, you cannot change your answers. Your final scorecard will be generated immediately.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="font-medium text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Return to Test
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={onSubmit}
            isLoading={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-900/20"
          >
            Confirm & Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
