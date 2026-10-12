'use client';

import * as React from 'react';
import { ZoomIn, CheckCircle2, HelpCircle } from 'lucide-react';
import { QuestionOption } from '@/types/database';
import { getPublicMediaUrl } from '@/lib/utils';
import { ImageLightbox } from '@/components/media/ImageLightbox';
import { Badge } from '@/components/ui/badge';
import { QuizoraQuestionContent } from '@/components/code/QuizoraQuestionContent';

interface QuestionPreviewProps {
  questionText: string;
  questionImagePath?: string | null;
  codeLanguage?: string | null;
  codeContent?: string | null;
  options: QuestionOption[];
  correctOption?: number;
  explanation?: string | null;
  mode?: 'student' | 'admin';
  selectedOption?: number | null;
  onSelectOption?: (optionIndex: number) => void;
  questionNumber?: number;
  totalQuestions?: number;
  marks?: number;
  negativeMarks?: number;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function QuestionPreview({
  questionText,
  questionImagePath,
  codeLanguage,
  codeContent,
  options,
  correctOption,
  explanation,
  mode = 'student',
  selectedOption: externalSelected,
  onSelectOption,
  questionNumber,
  totalQuestions,
  marks = 1,
  negativeMarks = 0,
}: QuestionPreviewProps) {
  const [internalSelected, setInternalSelected] = React.useState<number | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = React.useState<string | null>(null);

  const selected = externalSelected !== undefined ? externalSelected : internalSelected;

  const handleSelect = (idx: number) => {
    if (mode === 'admin') return; // Read-only in admin preview
    if (onSelectOption) {
      onSelectOption(idx + 1);
    } else {
      setInternalSelected(idx + 1);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-xs">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-2">
          {questionNumber && (
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-900 px-2.5 py-1 rounded-md">
              Question {questionNumber} {totalQuestions ? `of ${totalQuestions}` : ''}
            </span>
          )}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800">
            Single Choice
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            {options.length} Options
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{marks} Mark{marks !== 1 ? 's' : ''}</span>
          {negativeMarks > 0 && (
            <span className="text-rose-500 dark:text-rose-400 font-semibold">-{negativeMarks} Negative</span>
          )}
        </div>
      </div>

      {/* Question Text & Code Block */}
      <div className="text-base md:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
        {questionText ? (
          <QuizoraQuestionContent
            questionText={questionText}
            codeLanguage={codeLanguage}
            codeContent={codeContent}
          />
        ) : (
          <span className="italic text-slate-400 dark:text-slate-500">Enter question text...</span>
        )}
      </div>

      {/* Question Diagram / Image */}
      {questionImagePath && (
        <div className="mt-5 mb-6">
          <div className="relative inline-block rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 overflow-hidden group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getPublicMediaUrl(questionImagePath)}
              alt="Question diagram"
              className="max-h-72 w-auto max-w-full rounded-lg object-contain cursor-pointer"
              onClick={() => setActiveLightboxImage(questionImagePath)}
            />
            <button
              type="button"
              onClick={() => setActiveLightboxImage(questionImagePath)}
              className="absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-md bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-xs hover:bg-slate-900 transition"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              Enlarge
            </button>
          </div>
        </div>
      )}

      {/* Answer Options Grid / List */}
      <div className="mt-6 space-y-3">
        {options.map((option, idx) => {
          const optionNumber = idx + 1; // 1-based
          const isCorrect = mode === 'admin' && correctOption === optionNumber;
          const isStudentSelected = selected === optionNumber;
          const letter = OPTION_LETTERS[idx] || String.fromCharCode(65 + idx);

          let optionStyle =
            'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200';

          if (isCorrect) {
            optionStyle = 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500';
          } else if (isStudentSelected) {
            optionStyle = 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-2 ring-blue-600 dark:ring-blue-500';
          }

          return (
            <div
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`group flex items-start gap-4 rounded-xl border p-4 transition-all ${optionStyle} ${
                mode === 'student' ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              {/* Option Letter Bubble */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                  isCorrect
                    ? 'bg-emerald-600 text-white'
                    : isStudentSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
                }`}
              >
                {letter}
              </div>

              {/* Option Body (Text and/or Image) */}
              <div className="flex-1 min-w-0 pt-0.5">
                {option.text && (
                  <p className="text-sm md:text-base font-normal leading-normal select-none">
                    {option.text}
                  </p>
                )}

                {option.image_path && (
                  <div className="mt-2 inline-block">
                    <div className="relative rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 overflow-hidden group/optimg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getPublicMediaUrl(option.image_path)}
                        alt={`Option ${letter}`}
                        className="max-h-40 w-auto rounded object-contain cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLightboxImage(option.image_path);
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLightboxImage(option.image_path);
                        }}
                        className="absolute bottom-2.5 right-2.5 rounded bg-black/60 p-1 text-white hover:bg-black/80 transition"
                      >
                        <ZoomIn className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Correct Answer Badge */}
              {isCorrect && (
                <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Correct
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin Mode: Explanation Box */}
      {mode === 'admin' && explanation && (
        <div className="mt-6 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-1.5">
            <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Answer Explanation
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{explanation}</p>
        </div>
      )}

      <ImageLightbox
        isOpen={Boolean(activeLightboxImage)}
        onClose={() => setActiveLightboxImage(null)}
        imagePath={activeLightboxImage}
      />
    </div>
  );
}
