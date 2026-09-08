'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AttemptWithDetails } from '@/types/quiz';
import { QuizTimer } from './QuizTimer';

import { QuestionPalette, QuestionStatusItem } from './QuestionPalette';
import { QuizQuestionView } from './QuizQuestionView';
import { QuizSubmitModal } from './QuizSubmitModal';
import { Button } from '@/components/ui/button';
import {
  Maximize2,
  Minimize2,
  Menu,
  X,
  Send,
  ShieldCheck,
} from 'lucide-react';


interface QuizEngineProps {
  attempt: AttemptWithDetails;
  onSaveAnswer: (
    questionId: string,
    selectedOption: number | null,
    isMarkedForReview: boolean,
    timeSpentSeconds: number
  ) => Promise<boolean>;
  onSubmitAttempt: (
    finalAnswers: Array<{
      question_id: string;
      selected_option: number | null;
      is_marked_for_review: boolean;
      time_spent_seconds: number;
    }>
  ) => Promise<void>;
  testTitle?: string;
}

export function QuizEngine({
  attempt,
  onSaveAnswer,
  onSubmitAttempt,
  testTitle,
}: QuizEngineProps) {
  const questions = attempt.questions;
  const totalQuestions = questions.length;

  // Initialize per-question answers and time state from attempt questions
  const [answersState, setAnswersState] = useState<
    Record<
      string,
      {
        selectedOption: number | null;
        isMarkedForReview: boolean;
        timeSpentSeconds: number;
      }
    >
  >(() => {
    const map: Record<
      string,
      { selectedOption: number | null; isMarkedForReview: boolean; timeSpentSeconds: number }
    > = {};
    for (const q of questions) {
      const qid = q.question_id || q.id;
      map[qid] = {
        selectedOption: q.selected_option,
        isMarkedForReview: q.is_marked_for_review,
        timeSpentSeconds: q.time_spent_seconds || 0,
      };
    }
    return map;
  });

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentQId = currentQuestion ? currentQuestion.question_id || currentQuestion.id : '';
  const currentAns = answersState[currentQId] || {
    selectedOption: null,
    isMarkedForReview: false,
    timeSpentSeconds: 0,
  };

  // Timer per active question tick
  useEffect(() => {
    if (!currentQId) return;
    const interval = setInterval(() => {
      setAnswersState((prev) => {
        const existing = prev[currentQId];
        if (!existing) return prev;
        return {
          ...prev,
          [currentQId]: {
            ...existing,
            timeSpentSeconds: existing.timeSpentSeconds + 1,
          },
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQId]);

  // Window unload warning if attempt in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitting]);

  // Autosave helper
  const triggerAutoSave = useCallback(
    (qid: string, selectedOption: number | null, isMarked: boolean, timeSpent: number) => {
      onSaveAnswer(qid, selectedOption, isMarked, timeSpent).catch((err) => {
        console.error('AutoSave failed:', err);
      });
    },
    [onSaveAnswer]
  );

  // Option select handler
  const handleSelectOption = useCallback(
    (optionNum: number) => {
      if (!currentQId) return;
      setAnswersState((prev) => {
        const cur = prev[currentQId] || {
          selectedOption: null,
          isMarkedForReview: false,
          timeSpentSeconds: 0,
        };
        const updated = {
          ...cur,
          selectedOption: optionNum,
        };
        triggerAutoSave(currentQId, optionNum, cur.isMarkedForReview, cur.timeSpentSeconds);
        return {
          ...prev,
          [currentQId]: updated,
        };
      });
    },
    [currentQId, triggerAutoSave]
  );

  // Clear Option handler
  const handleClearOption = useCallback(() => {
    if (!currentQId) return;
    setAnswersState((prev) => {
      const cur = prev[currentQId] || {
        selectedOption: null,
        isMarkedForReview: false,
        timeSpentSeconds: 0,
      };
      const updated = {
        ...cur,
        selectedOption: null,
      };
      triggerAutoSave(currentQId, null, cur.isMarkedForReview, cur.timeSpentSeconds);
      return {
        ...prev,
        [currentQId]: updated,
      };
    });
  }, [currentQId, triggerAutoSave]);

  // Toggle Mark for review
  const handleToggleMarkForReview = useCallback(() => {
    if (!currentQId) return;
    setAnswersState((prev) => {
      const cur = prev[currentQId] || {
        selectedOption: null,
        isMarkedForReview: false,
        timeSpentSeconds: 0,
      };
      const updatedMark = !cur.isMarkedForReview;
      const updated = {
        ...cur,
        isMarkedForReview: updatedMark,
      };
      triggerAutoSave(currentQId, cur.selectedOption, updatedMark, cur.timeSpentSeconds);
      return {
        ...prev,
        [currentQId]: updated,
      };
    });
  }, [currentQId, triggerAutoSave]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsSubmitModalOpen(true);
    }
  }, [currentIndex, totalQuestions]);

  const handleJumpToQuestion = useCallback((idx: number) => {
    if (idx >= 0 && idx < totalQuestions) {
      setCurrentIndex(idx);
      setIsPaletteOpen(false); // close mobile drawer if open
    }
  }, [totalQuestions]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitModalOpen) return;

      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const numOptions = currentQuestion?.question_snapshot.options.length || 4;

      if (e.key >= '1' && e.key <= `${numOptions}`) {
        e.preventDefault();
        handleSelectOption(parseInt(e.key, 10));
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleSelectOption(1);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleSelectOption(2);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleSelectOption(3);
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleSelectOption(4);
      } else if (e.key === 'e' || e.key === 'E') {
        if (numOptions >= 5) {
          e.preventDefault();
          handleSelectOption(5);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMarkForReview();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleClearOption();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSubmitModalOpen,
    currentQuestion,
    handleSelectOption,
    handlePrevious,
    handleNext,
    handleToggleMarkForReview,
    handleClearOption,
  ]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Final Submission
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      const answersPayload = questions.map((q) => {
        const qid = q.question_id || q.id;
        const cur = answersState[qid] || {
          selectedOption: null,
          isMarkedForReview: false,
          timeSpentSeconds: 0,
        };
        return {
          question_id: qid,
          selected_option: cur.selectedOption,
          is_marked_for_review: cur.isMarkedForReview,
          time_spent_seconds: cur.timeSpentSeconds,
        };
      });

      await onSubmitAttempt(answersPayload);
    } catch (err) {
      console.error('Submission failed:', err);
      setIsSubmitting(false);
    }
  };

  // Prepare Palette Items
  const paletteItems: QuestionStatusItem[] = questions.map((q, idx) => {
    const qid = q.question_id || q.id;
    const cur = answersState[qid] || {
      selectedOption: null,
      isMarkedForReview: false,
      timeSpentSeconds: 0,
    };
    return {
      questionOrder: idx + 1,
      isAnswered: cur.selectedOption !== null && cur.selectedOption > 0,
      isMarkedForReview: cur.isMarkedForReview,
    };
  });

  const answeredCount = paletteItems.filter((i) => i.isAnswered).length;
  const markedCount = paletteItems.filter((i) => i.isMarkedForReview).length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
      {/* Top Navbar */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-base text-primary">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Quizora</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
          <h2 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs sm:max-w-md">
            {testTitle || attempt.test?.title || 'Practice Session'}
          </h2>
        </div>

        {/* Center Timer */}
        <div className="flex items-center gap-3">
          {attempt.remaining_seconds !== null && (
            <QuizTimer
              initialSeconds={attempt.remaining_seconds}
              onTimeUp={handleConfirmSubmit}
              mode="full"
              label="Remaining"
            />
          )}

          {/* Fullscreen Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="hidden sm:flex text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 p-2"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {/* Mobile Palette Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPaletteOpen((prev) => !prev)}
            className="sm:hidden flex items-center gap-1 text-xs"
            aria-label="Toggle Question Palette"
          >
            {isPaletteOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            Palette
          </Button>

          {/* Submit Test Button */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Test</span>
          </Button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left/Center: Active Question View */}
        {currentQuestion && (
          <QuizQuestionView
            questionNumber={currentIndex + 1}
            totalQuestions={totalQuestions}
            snapshot={currentQuestion.question_snapshot}
            selectedOption={currentAns.selectedOption}
            isMarkedForReview={currentAns.isMarkedForReview}
            onSelectOption={handleSelectOption}
            onClearOption={handleClearOption}
            onToggleMarkForReview={handleToggleMarkForReview}
            onPrevious={handlePrevious}
            onNext={handleNext}
            isFirst={currentIndex === 0}
            isLast={currentIndex === totalQuestions - 1}
          />
        )}

        {/* Right Desktop Palette Sidebar */}
        <aside className="hidden sm:block shrink-0 h-full">
          <QuestionPalette
            items={paletteItems}
            currentIndex={currentIndex}
            onSelectQuestion={handleJumpToQuestion}
          />
        </aside>

        {/* Mobile Palette Drawer Overlay */}
        {isPaletteOpen && (
          <div className="fixed inset-0 z-30 sm:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsPaletteOpen(false)}
            />
            <div className="relative ml-auto w-4/5 max-w-xs h-full bg-white dark:bg-slate-900 shadow-2xl z-40 flex flex-col">
              <div className="p-3 border-b flex justify-between items-center">
                <span className="font-semibold text-sm">Question Navigation</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPaletteOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <QuestionPalette
                  items={paletteItems}
                  currentIndex={currentIndex}
                  onSelectQuestion={handleJumpToQuestion}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      <QuizSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleConfirmSubmit}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        markedCount={markedCount}
        unansweredCount={unansweredCount}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
