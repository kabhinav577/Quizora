'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut, ArrowLeft, RotateCcw } from 'lucide-react';

interface QuizExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
  isExiting?: boolean;
  testTitle?: string;
  totalQuestions: number;
  answeredCount: number;
}

export function QuizExitModal({
  isOpen,
  onClose,
  onConfirmExit,
  isExiting = false,
  testTitle,
  totalQuestions,
  answeredCount,
}: QuizExitModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={isExiting ? () => {} : onClose}
      title="Leave Examination?"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Urgent Warning Box */}
        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-rose-950 dark:text-rose-100">
              Your test session will be restarted!
            </p>
            <p className="text-xs leading-relaxed text-rose-900/90 dark:text-rose-300/90">
              If you leave this test or navigate back, your ongoing examination attempt will be canceled.
              When you or any student returns, <strong>the test will restart from the beginning (Question 1)</strong>.
            </p>
          </div>
        </div>

        {/* Attempt Status Snapshot */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
          {testTitle && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 font-medium">
              <span className="text-slate-500 dark:text-slate-400">Examination</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px] text-right">
                {testTitle}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Total Questions</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{totalQuestions}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Questions Answered</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {answeredCount} of {totalQuestions}
            </span>
          </div>
        </div>

        {/* Decision Notice */}
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Click <strong>Stay in Test</strong> to keep taking your exam, or <strong>Exit &amp; Restart</strong> to leave.
        </p>

        {/* Modal Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isExiting}
            className="w-full sm:w-auto text-xs font-semibold gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Stay in Test
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={onConfirmExit}
            disabled={isExiting}
            className="w-full sm:w-auto text-xs font-semibold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            {isExiting ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                Exiting &amp; Resetting...
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                Exit &amp; Restart Test
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
