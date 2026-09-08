'use client';

import React, { useState } from 'react';
import { QuestionSnapshot } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageLightbox } from '@/components/media/ImageLightbox';
import {
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from 'lucide-react';

interface QuizQuestionViewProps {
  questionNumber: number;
  totalQuestions: number;
  snapshot: QuestionSnapshot;
  selectedOption: number | null;
  isMarkedForReview: boolean;
  onSelectOption: (optionNumber: number) => void;
  onClearOption: () => void;
  onToggleMarkForReview: () => void;
  onPrevious: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function QuizQuestionView({
  questionNumber,
  totalQuestions,
  snapshot,
  selectedOption,
  isMarkedForReview,
  onSelectOption,
  onClearOption,
  onToggleMarkForReview,
  onPrevious,
  onNext,
  isFirst,
  isLast,
}: QuizQuestionViewProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const marks = snapshot.marks ?? 1.0;
  const negativeMarks = snapshot.negative_marks ?? 0.0;

  return (
    <div className="flex flex-col flex-1 h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header Info Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
            Question {questionNumber}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            of {totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-300">
            +{marks} mark{marks !== 1 ? 's' : ''}
          </Badge>
          {negativeMarks > 0 && (
            <Badge variant="outline" className="text-rose-700 dark:text-rose-400 border-rose-300">
              -{negativeMarks}
            </Badge>
          )}
        </div>
      </div>

      {/* Question & Options Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Question Text */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <p className="text-base sm:text-lg text-slate-900 dark:text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
            {snapshot.question_text}
          </p>

          {/* Question Diagram / Image */}
          {snapshot.question_image_path && (
            <div className="relative inline-block border rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 max-w-xl group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={snapshot.question_image_path}
                alt="Question diagram"
                className="max-h-72 object-contain w-auto mx-auto cursor-pointer"
                onClick={() => setLightboxSrc(snapshot.question_image_path)}
              />

              <button
                type="button"
                onClick={() => setLightboxSrc(snapshot.question_image_path)}
                className="absolute bottom-2 right-2 p-1.5 rounded-md bg-slate-900/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                aria-label="Enlarge image"
              >
                <ZoomIn className="w-3.5 h-3.5" /> Enlarge
              </button>
            </div>
          )}
        </div>

        {/* Options List */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Select one option:
          </h4>

          {snapshot.options.map((option, idx) => {
            const optionNum = idx + 1;
            const letter = OPTION_LETTERS[idx] || `${optionNum}`;
            const isSelected = selectedOption === optionNum;

            let cardBorder =
              'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900';
            if (isSelected) {
              cardBorder =
                'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10';
            }

            return (
              <div
                key={idx}
                role="radio"
                tabIndex={0}
                aria-checked={isSelected}
                aria-label={`Option ${letter}: ${option.text}`}
                onClick={() => onSelectOption(optionNum)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onSelectOption(optionNum);
                  }
                }}
                className={`p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all duration-150 ${cardBorder}`}
              >
                {/* Option Letter Circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {letter}
                </div>

                {/* Option Text and/or Image */}
                <div className="flex-1 text-sm sm:text-base text-slate-800 dark:text-slate-200 pt-0.5 space-y-2">
                  {option.text && <p className="leading-snug">{option.text}</p>}
                  {option.image_path && (
                    <div className="relative inline-block border rounded-md overflow-hidden bg-slate-50 dark:bg-slate-800 max-w-sm group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={option.image_path}
                        alt={`Option ${letter} visual`}
                        className="max-h-36 object-contain cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxSrc(option.image_path);
                        }}
                      />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxSrc(option.image_path);
                        }}
                        className="absolute bottom-1 right-1 p-1 rounded bg-slate-900/80 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Enlarge option image"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Keyboard helper hint */}
                <div className="hidden sm:block text-[11px] text-slate-400 font-mono">
                  [{optionNum}]
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions Toolbar */}
      <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isMarkedForReview ? 'secondary' : 'outline'}
            size="sm"
            onClick={onToggleMarkForReview}
            className={`flex items-center gap-1.5 ${
              isMarkedForReview
                ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                : ''
            }`}
          >
            {isMarkedForReview ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-purple-600" />
                <span className="font-semibold">Marked</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>Mark for Review</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={selectedOption === null}
            onClick={onClearOption}
            className="text-slate-600 dark:text-slate-400 hover:text-rose-600 flex items-center gap-1 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={isFirst}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onNext}
            className="flex items-center gap-1 bg-primary text-primary-foreground font-semibold"
          >
            {isLast ? 'Save' : 'Save & Next'}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={!!lightboxSrc}
        imagePath={lightboxSrc}
        alt="Enlarged question visual"
        onClose={() => setLightboxSrc(null)}
      />

    </div>
  );
}
