'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ReportReason } from '@/types/database';
import { submitQuestionReportAction } from '@/app/tests/actions';
import { CheckCircle, Flag } from 'lucide-react';


interface QuestionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  questionNumber: number;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  {
    value: 'incorrect_answer',
    label: 'Incorrect Answer Key',
    description: 'The specified correct option is wrong according to exam official keys.',
  },
  {
    value: 'wrong_explanation',
    label: 'Flawed or Misleading Explanation',
    description: 'The solution contains calculation or conceptual inaccuracies.',
  },
  {
    value: 'formatting_issue',
    label: 'Typo or Text Formatting Issue',
    description: 'Broken formulas, missing words, or unreadable characters.',
  },
  {
    value: 'image_problem',
    label: 'Image / Diagram Problem',
    description: 'Diagram is missing, blurry, unreadable, or mismatched.',
  },
  {
    value: 'duplicate_question',
    label: 'Duplicate Question',
    description: 'This exact question appeared earlier in this test.',
  },
  {
    value: 'other',
    label: 'Other Problem',
    description: 'Any other syllabus or question defect.',
  },
];

export function QuestionReportModal({
  isOpen,
  onClose,
  questionId,
  questionNumber,
}: QuestionReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('incorrect_answer');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitQuestionReportAction({
        questionId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
        setDescription('');
      }, 1600);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Report Question #${questionNumber}`}
      maxWidth="md"
    >
      <div className="space-y-5">
        {isSubmitted ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Report Submitted Successfully
            </h4>
            <p className="text-xs text-slate-500">
              Thank you for helping us maintain Quizora&apos;s high academic accuracy. Our content team will review it.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 -mt-2">
              Found an issue in this question or answer? Let us know and we will investigate and correct it.
            </p>

            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                What is the problem?
              </label>

              <div className="space-y-2">
                {REPORT_REASONS.map((r) => {
                  const isChecked = selectedReason === r.value;
                  return (
                    <div
                      key={r.value}
                      onClick={() => setSelectedReason(r.value)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 dark:border-indigo-500 ring-1 ring-indigo-500/30'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="report_reason"
                          value={r.value}
                          checked={isChecked}
                          onChange={() => setSelectedReason(r.value)}
                          className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {r.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Additional Context / Remarks (Optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the discrepancy or provide reference..."
                rows={3}
                className="text-xs resize-none dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5 fill-current" />
                <span>Submit Report</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
