'use client';

import React, { useState } from 'react';
import { AttemptQuestion } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { ImageLightbox } from '@/components/media/ImageLightbox';

import { QuestionReportModal } from './QuestionReportModal';
import { toggleBookmarkAction } from '@/app/tests/actions';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Bookmark,
  BookmarkCheck,
  Flag,
  Lightbulb,
  ZoomIn,
  Check,
  X,
  Filter,
} from 'lucide-react';

interface QuestionReviewListProps {
  questions: AttemptQuestion[];
  initialBookmarkedIds?: string[];
}

type FilterTab = 'all' | 'incorrect' | 'skipped' | 'correct' | 'marked' | 'bookmarked';
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function QuestionReviewList({
  questions,
  initialBookmarkedIds = [],
}: QuestionReviewListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [bookmarkedSet, setBookmarkedSet] = useState<Set<string>>(
    new Set(initialBookmarkedIds)
  );
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    questionId: string;
    questionNumber: number;
  }>({
    isOpen: false,
    questionId: '',
    questionNumber: 1,
  });

  const handleToggleBookmark = async (qid: string) => {
    const nextSet = new Set(bookmarkedSet);
    const wasBookmarked = nextSet.has(qid);
    if (wasBookmarked) nextSet.delete(qid);
    else nextSet.add(qid);
    setBookmarkedSet(nextSet);

    try {
      await toggleBookmarkAction(qid);
    } catch {
      // Revert if error
      setBookmarkedSet(bookmarkedSet);
    }
  };

  // Filter calculation
  const incorrectQuestions = questions.filter(
    (q) => q.is_answered && q.is_correct === false
  );
  const skippedQuestions = questions.filter((q) => !q.is_answered);
  const correctQuestions = questions.filter((q) => q.is_correct === true);
  const reviewQuestions = questions.filter((q) => q.is_marked_for_review);
  const bookmarkedQuestions = questions.filter((q) => {
    const qid = q.question_id || q.id;
    return bookmarkedSet.has(qid);
  });

  const filteredList = questions.filter((q) => {
    const qid = q.question_id || q.id;
    if (activeFilter === 'incorrect') return q.is_answered && q.is_correct === false;
    if (activeFilter === 'skipped') return !q.is_answered;
    if (activeFilter === 'correct') return q.is_correct === true;
    if (activeFilter === 'marked') return q.is_marked_for_review;
    if (activeFilter === 'bookmarked') return bookmarkedSet.has(qid);
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Review Questions
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            (Showing {filteredList.length} of {questions.length})
          </span>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All ({questions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('incorrect')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
              activeFilter === 'incorrect'
                ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeFilter === 'incorrect' ? 'bg-white' : 'bg-rose-500'}`} />
            Incorrect ({incorrectQuestions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('skipped')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
              activeFilter === 'skipped'
                ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeFilter === 'skipped' ? 'bg-white' : 'bg-slate-400'}`} />
            Skipped ({skippedQuestions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('correct')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
              activeFilter === 'correct'
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeFilter === 'correct' ? 'bg-white' : 'bg-emerald-500'}`} />
            Correct ({correctQuestions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('marked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
              activeFilter === 'marked'
                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeFilter === 'marked' ? 'bg-white' : 'bg-purple-500'}`} />
            Marked ({reviewQuestions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('bookmarked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
              activeFilter === 'bookmarked'
                ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeFilter === 'bookmarked' ? 'bg-white' : 'bg-amber-500'}`} />
            Saved ({bookmarkedQuestions.length})
          </button>
        </div>
      </div>

      {/* Questions Stack */}
      <div className="space-y-6">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No questions found for this filter.
            </p>
          </div>
        ) : (
          filteredList.map((q) => {
            const qid = q.question_id || q.id;
            const isBookmarked = bookmarkedSet.has(qid);
            const snapshot = q.question_snapshot;
            const isAnswered = q.is_answered;
            const isCorrect = q.is_correct === true;
            const isWrong = isAnswered && !isCorrect;
            const correctOpt = snapshot.correct_option;
            const selectedOpt = q.selected_option;

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Question Item Header */}
                <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                      Q{q.question_order}
                    </span>

                    {/* Status Badge */}
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Correct (+{q.marks_awarded})
                      </span>
                    ) : isWrong ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5" />
                        Incorrect ({q.marks_awarded})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Skipped (0.0)
                      </span>
                    )}

                    {q.is_marked_for_review && (
                      <Badge variant="outline" className="text-[10px] text-purple-700 border-purple-300">
                        Flagged for Review
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Time Spent */}
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{q.time_spent_seconds}s</span>
                    </div>

                    {/* Bookmark Action */}
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(qid)}
                      className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
                        isBookmarked
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="w-4 h-4 fill-current text-amber-600" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>

                    {/* Report Action */}
                    <button
                      type="button"
                      onClick={() =>
                        setReportModalData({
                          isOpen: true,
                          questionId: qid,
                          questionNumber: q.question_order,
                        })
                      }
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
                      title="Report defect in this question"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Body */}
                <div className="p-6 space-y-5">
                  <p className="text-base text-slate-900 dark:text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                    {snapshot.question_text}
                  </p>

                  {/* Diagram / Image */}
                  {snapshot.question_image_path && (
                    <div className="relative inline-block border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 max-w-lg group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={snapshot.question_image_path}
                        alt="Question diagram"
                        className="max-h-64 object-contain cursor-pointer"
                        onClick={() => setLightboxSrc(snapshot.question_image_path)}
                      />
                      <button
                        type="button"
                        onClick={() => setLightboxSrc(snapshot.question_image_path)}
                        className="absolute bottom-2 right-2 p-1.5 rounded-md bg-slate-900/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <ZoomIn className="w-3.5 h-3.5" /> Enlarge
                      </button>
                    </div>
                  )}

                  {/* Options List */}
                  <div className="space-y-2.5 pt-1">
                    {snapshot.options.map((opt, optIdx) => {
                      const optNum = optIdx + 1;
                      const letter = OPTION_LETTERS[optIdx] || `${optNum}`;
                      const isOptionCorrect = optNum === correctOpt;
                      const isOptionSelected = optNum === selectedOpt;

                      let cardStyle =
                        'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300';
                      let letterStyle =
                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 font-semibold';

                      if (isOptionCorrect) {
                        cardStyle =
                          'border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-400';
                        letterStyle = 'bg-emerald-600 text-white border-emerald-600 font-bold';
                      } else if (isOptionSelected && !isOptionCorrect) {
                        cardStyle =
                          'border-rose-300 dark:border-rose-700 bg-rose-50/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-1 ring-rose-400';
                        letterStyle = 'bg-rose-600 text-white border-rose-600 font-bold';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${cardStyle}`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 border ${letterStyle}`}
                            >
                              {letter}
                            </span>
                            <div className="text-sm pt-0.5 space-y-1.5">
                              {opt.text && <p className="leading-snug">{opt.text}</p>}
                              {opt.image_path && (
                                <div className="relative inline-block border rounded-md overflow-hidden max-w-xs group">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={opt.image_path}
                                    alt={`Option ${letter}`}
                                    className="max-h-32 object-contain cursor-pointer"
                                    onClick={() => setLightboxSrc(opt.image_path)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Choice Tags */}
                          <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-semibold">
                            {isOptionCorrect && (
                              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                                <Check className="w-3.5 h-3.5" /> Correct Answer
                              </span>
                            )}
                            {isOptionSelected && (
                              <span
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${
                                  isOptionCorrect
                                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-200/60 dark:bg-emerald-900/60'
                                    : 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950'
                                }`}
                              >
                                {isOptionCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                Your Selection
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailed Solution / Explanation Box */}
                  {snapshot.explanation && (
                    <div className="mt-4 p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-200 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                        <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400 fill-indigo-100" />
                        <span>Explanation &amp; Solution Concept</span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {snapshot.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxSrc && (
        <ImageLightbox
          isOpen={!!lightboxSrc}
          imagePath={lightboxSrc}
          alt="Enlarged question review visual"
          onClose={() => setLightboxSrc(null)}
        />
      )}

      {/* Question Report Modal */}
      <QuestionReportModal
        isOpen={reportModalData.isOpen}
        onClose={() =>
          setReportModalData((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        questionId={reportModalData.questionId}
        questionNumber={reportModalData.questionNumber}
      />
    </div>
  );
}
