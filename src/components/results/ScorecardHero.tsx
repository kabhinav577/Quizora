'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AttemptWithDetails } from '@/types/quiz';
import { ScorecardAnalytics } from '@/lib/quiz/analytics';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { startMistakesPracticeAction } from '@/app/tests/actions';
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Percent,
  RotateCcw,
  ArrowDown,
  Layers,
  Flame,
  Check,
} from 'lucide-react';


interface ScorecardHeroProps {
  attempt: AttemptWithDetails;
  analytics: ScorecardAnalytics;
  onScrollToReview?: () => void;
}

export function ScorecardHero({
  attempt,
  analytics,
  onScrollToReview,
}: ScorecardHeroProps) {
  const router = useRouter();
  const [isStartingMistakes, setIsStartingMistakes] = useState(false);

  const durationMins = Math.floor(attempt.total_time_seconds / 60);
  const durationSecs = attempt.total_time_seconds % 60;
  const avgMins = Math.floor(analytics.averageTimeSeconds / 60);
  const avgSecs = analytics.averageTimeSeconds % 60;

  const handlePracticeMistakes = async () => {
    if (analytics.mistakesCount === 0) return;
    setIsStartingMistakes(true);
    try {
      await startMistakesPracticeAction(attempt.id);
      router.push('/practice');
    } catch (err) {

      alert(err instanceof Error ? err.message : 'Could not start mistakes practice');
      setIsStartingMistakes(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Performance Band */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${analytics.performanceBand.badgeColor}`}
            >
              {analytics.performanceBand.title}
            </span>
            <Badge variant="outline" className="text-xs">
              {attempt.test?.title || 'Practice Session'}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Attempt Performance Scorecard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
            {analytics.performanceBand.description}
          </p>
        </div>

        <div className="flex flex-col items-end shrink-0 sm:border-l sm:border-slate-200 sm:dark:border-slate-800 sm:pl-6">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Cutoff Likelihood
          </span>
          <span className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
            {analytics.performanceBand.cutoffProbability}
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-md overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-slate-100/50 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950">
        <CardContent className="p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {/* Net Score */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Net Score</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {attempt.score}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                out of {analytics.maxScore} marks
              </div>
            </div>

            {/* Accuracy */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                <Percent className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Accuracy</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {attempt.accuracy}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {attempt.correct_answers} correct / {attempt.answered_questions} attempted
              </div>
            </div>

            {/* Total Time */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Time Taken</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200 font-mono tracking-tight">
                {durationMins}m {durationSecs}s
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Avg: {avgMins > 0 ? `${avgMins}m ` : ''}{avgSecs}s / question
              </div>
            </div>

            {/* Total Questions */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Total Items</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">
                {attempt.total_questions}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {attempt.skipped_questions} unattempted
              </div>
            </div>
          </div>

          {/* Correct / Wrong / Skipped Pill Strip */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">Correct Answers</span>
              </div>
              <span className="text-lg sm:text-xl font-black">{attempt.correct_answers}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">Wrong Answers</span>
              </div>
              <span className="text-lg sm:text-xl font-black">{attempt.wrong_answers}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">Skipped</span>
              </div>
              <span className="text-lg sm:text-xl font-black">{attempt.skipped_questions}</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Primary Mistake Remediation CTA */}
            {analytics.mistakesCount > 0 ? (
              <Button
                type="button"
                size="lg"
                onClick={handlePracticeMistakes}
                isLoading={isStartingMistakes}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold shadow-md flex items-center gap-2"
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>Practice Missed Questions ({analytics.mistakesCount})</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                <Check className="w-5 h-5 text-emerald-600" />
                <span>Perfect Score! Zero missed questions.</span>
              </div>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onScrollToReview && (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={onScrollToReview}
                  className="w-full sm:w-auto flex items-center gap-1.5"
                >
                  <ArrowDown className="w-4 h-4" />
                  <span>Review Solutions</span>
                </Button>
              )}

              {attempt.test?.slug && (
                <Link href={`/tests/${attempt.test.slug}`} className="w-full sm:w-auto">
                  <Button variant="ghost" size="default" className="w-full sm:w-auto flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4" />
                    <span>Retake Test</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
