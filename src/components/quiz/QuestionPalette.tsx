'use client';

import React from 'react';


export interface QuestionStatusItem {
  questionOrder: number;
  isAnswered: boolean;
  isMarkedForReview: boolean;
}

interface QuestionPaletteProps {
  items: QuestionStatusItem[];
  currentIndex: number;
  onSelectQuestion: (index: number) => void;
}

export function QuestionPalette({
  items,
  currentIndex,
  onSelectQuestion,
}: QuestionPaletteProps) {
  // Counts
  const answeredCount = items.filter((i) => i.isAnswered && !i.isMarkedForReview).length;
  const answeredMarkedCount = items.filter((i) => i.isAnswered && i.isMarkedForReview).length;
  const markedOnlyCount = items.filter((i) => !i.isAnswered && i.isMarkedForReview).length;
  const unansweredCount = items.filter((i) => !i.isAnswered && !i.isMarkedForReview).length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full sm:w-80 p-4">
      {/* Summary Stat Grid */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
          <span>Question Palette</span>
          <span className="text-xs font-normal text-slate-500">Total: {items.length}</span>
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
              {answeredCount}
            </span>
            <span className="font-medium truncate">Answered</span>
          </div>

          <div className="flex items-center gap-2 p-1.5 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
              {markedOnlyCount}
            </span>
            <span className="font-medium truncate">Review</span>
          </div>

          <div className="flex items-center gap-2 p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300">
            <span className="w-5 h-5 rounded-full bg-purple-600 ring-2 ring-emerald-400 text-white flex items-center justify-center font-bold text-[10px]">
              {answeredMarkedCount}
            </span>
            <span className="font-medium truncate">Ans + Review</span>
          </div>

          <div className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            <span className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-[10px]">
              {unansweredCount}
            </span>
            <span className="font-medium truncate">Not Answered</span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 my-2" />

      {/* Question Number Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-5 gap-2 py-2">
          {items.map((item, idx) => {
            const isCurrent = idx === currentIndex;
            const { isAnswered, isMarkedForReview } = item;

            // Strict border-2 on all buttons ensures zero layout shift when active state changes
            let stateClasses = '';

            if (isAnswered && isMarkedForReview) {
              stateClasses = isCurrent
                ? 'bg-purple-600 text-white border-emerald-300 ring-2 ring-emerald-400/50 ring-inset font-bold shadow-xs'
                : 'bg-purple-600 text-white border-transparent ring-2 ring-emerald-400 ring-inset font-bold hover:bg-purple-700 shadow-xs';
            } else if (isMarkedForReview) {
              stateClasses = isCurrent
                ? 'bg-purple-600 text-white border-white dark:border-purple-200 ring-2 ring-purple-400/40 ring-inset font-bold shadow-xs'
                : 'bg-purple-600 text-white border-transparent font-bold hover:bg-purple-700 shadow-xs';
            } else if (isAnswered) {
              stateClasses = isCurrent
                ? 'bg-emerald-600 text-white border-white dark:border-emerald-200 ring-2 ring-emerald-400/40 ring-inset font-bold shadow-xs'
                : 'bg-emerald-600 text-white border-transparent font-bold hover:bg-emerald-700 shadow-xs';
            } else {
              // Unanswered
              stateClasses = isCurrent
                ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                : 'border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700';
            }

            return (
              <button
                key={item.questionOrder}
                type="button"
                onClick={() => onSelectQuestion(idx)}
                aria-label={`Jump to Question ${item.questionOrder}`}
                aria-current={isCurrent ? 'true' : undefined}
                className={`relative h-10 w-full rounded-lg text-xs font-semibold flex items-center justify-center border-2 transition-colors ${stateClasses}`}
              >
                <span>{item.questionOrder}</span>
                {isAnswered && isMarkedForReview && (
                  <span
                    title="Answered & Marked"
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-1 ring-white dark:ring-slate-900"
                  />
                )}
                {isCurrent && (
                  <span
                    className={`absolute bottom-1 w-2.5 h-0.5 rounded-full ${
                      isAnswered || isMarkedForReview
                        ? 'bg-white/90'
                        : 'bg-indigo-600 dark:bg-indigo-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
        <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Status Legend:</p>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
          <span>Green: Saved Answer</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
          <span>Purple: Marked for Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
          <span>Gray: Not Answered Yet</span>
        </div>
      </div>
    </div>
  );
}
