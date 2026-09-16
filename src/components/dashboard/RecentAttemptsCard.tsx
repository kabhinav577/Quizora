'use client';

import React from 'react';
import Link from 'next/link';
import { RecentAttemptSummary } from '@/services/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, ArrowRight, Play, Eye, Calendar, Award } from 'lucide-react';

interface RecentAttemptsCardProps {
  attempts: RecentAttemptSummary[];
}

export function RecentAttemptsCard({ attempts }: RecentAttemptsCardProps) {
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Recent Test Attempts</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Review your recent performance reports and active sessions
          </CardDescription>
        </div>

        <Link href="/history">
          <Button variant="ghost" size="sm" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="pt-4">
        {attempts.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm font-medium text-slate-500">No recent test attempts found.</p>
            <Link href="/tests">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                Take Your First Mock Test
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((a) => {
              const isCompleted = a.status === 'completed';
              const isInProgress = a.status === 'in_progress';

              const resultsUrl = a.testSlug
                ? `/tests/${a.testSlug}/results/${a.id}`
                : `/practice/results/${a.id}`;

              const resumeUrl = a.testSlug
                ? `/tests/${a.testSlug}/attempt`
                : `/practice?attemptId=${a.id}`;

              return (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase ${
                          a.testType === 'mock_test'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {a.testType === 'mock_test' ? 'Mock Test' : 'Rapid Practice'}
                      </Badge>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </Badge>

                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(a.date)}
                      </span>
                    </div>

                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {a.testTitle}
                    </h4>

                    {isCompleted && (
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                          <Award className="w-3.5 h-3.5" />
                          Score: {a.score} / {a.maxScore}
                        </span>
                        <span>•</span>
                        <span>
                          Accuracy:{' '}
                          <strong className="text-slate-700 dark:text-slate-200">
                            {a.accuracy}%
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          {a.answeredQuestions} / {a.totalQuestions} Qs
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isCompleted ? (
                      <Link href={resultsUrl}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>Scorecard</span>
                        </Button>
                      </Link>
                    ) : isInProgress ? (
                      <Link href={resumeUrl}>
                        <Button
                          size="sm"
                          className="w-full sm:w-auto text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Play className="w-3.5 h-3.5 mr-1 fill-white" />
                          <span>Resume</span>
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
