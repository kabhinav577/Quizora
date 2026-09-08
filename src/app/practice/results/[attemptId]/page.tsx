import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAttemptById } from '@/services/attempts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Percent,
  RotateCcw,
  ArrowRight,
  ListOrdered,
} from 'lucide-react';

interface PracticeResultsPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function PracticeResultsPage({ params }: PracticeResultsPageProps) {
  const { attemptId } = await params;
  const attempt = await getAttemptById(attemptId);

  if (!attempt) {
    notFound();
  }

  const durationMins = Math.floor(attempt.total_time_seconds / 60);
  const durationSecs = attempt.total_time_seconds % 60;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">
            Practice Complete
          </Badge>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Practice Session Scorecard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Adaptive Question Practice Performance
          </p>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-md overflow-hidden bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <Award className="w-4 h-4 text-primary" />
                  <span>Score</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-primary">
                  {attempt.score}
                </div>
                <div className="text-[11px] text-slate-400">Points</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <Percent className="w-4 h-4 text-indigo-600" />
                  <span>Accuracy</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">
                  {attempt.accuracy}%
                </div>
                <div className="text-[11px] text-slate-400">Correct / Attempted</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Time Taken</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200 font-mono">
                  {durationMins}m {durationSecs}s
                </div>
                <div className="text-[11px] text-slate-400">Total duration</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <ListOrdered className="w-4 h-4 text-slate-600" />
                  <span>Questions</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200">
                  {attempt.total_questions}
                </div>
                <div className="text-[11px] text-slate-400">Practice items</div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs sm:text-sm font-semibold">Correct</span>
                </div>
                <span className="text-lg font-bold">{attempt.correct_answers}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-xs sm:text-sm font-semibold">Wrong</span>
                </div>
                <span className="text-lg font-bold">{attempt.wrong_answers}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  <span className="text-xs sm:text-sm font-semibold">Skipped</span>
                </div>
                <span className="text-lg font-bold">{attempt.skipped_questions}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <Link href="/practice">
            <Button variant="outline" className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>Practice More Questions</span>
            </Button>
          </Link>

          <Link href="/tests">
            <Button variant="default" className="flex items-center gap-2">
              <span>Try a Full Mock Test</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
