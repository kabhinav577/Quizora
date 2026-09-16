'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopicWeakness } from '@/services/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, CheckCircle2, Zap, Loader2 } from 'lucide-react';
import { startWeakTopicPracticeAction } from '@/app/dashboard/actions';

interface TopicWeaknessListProps {
  topics: TopicWeakness[];
}

export function TopicWeaknessList({ topics }: TopicWeaknessListProps) {
  const router = useRouter();
  const [launchingTopicId, setLaunchingTopicId] = useState<string | null>(null);

  const handlePracticeTopic = async (topicId: string) => {
    setLaunchingTopicId(topicId);
    try {
      const attempt = await startWeakTopicPracticeAction({
        topicId: topicId !== 'unknown-topic' ? topicId : undefined,
        count: 10,
        timerSeconds: 45,
      });
      router.push(`/practice?attemptId=${attempt.id}`);
    } catch (err) {
      console.error('Failed to start topic practice', err);
      setLaunchingTopicId(null);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Priority Improvement Areas</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Topics requiring immediate revision based on your test accuracy
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {topics.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
              High Mastery Across All Topics!
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You do not have any topics below 70% accuracy. Keep taking full mock tests to maintain your competitive edge.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topics.slice(0, 5).map((t) => {
              const isLow = t.accuracy < 50;
              const isMid = t.accuracy >= 50 && t.accuracy < 75;
              const isLaunching = launchingTopicId === t.topicId;

              return (
                <div
                  key={t.topicId}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {t.subjectName}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t.wrongAnswers} wrong / {t.totalQuestions} questions
                      </span>
                    </div>

                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {t.topicName}
                    </h4>

                    {/* Accuracy Progress Bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isLow
                              ? 'bg-rose-500'
                              : isMid
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(5, t.accuracy)}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-black shrink-0 ${
                          isLow
                            ? 'text-rose-600 dark:text-rose-400'
                            : isMid
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {t.accuracy}% Accuracy
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLaunching}
                      onClick={() => handlePracticeTopic(t.topicId)}
                      className="w-full sm:w-auto text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 transition-colors"
                    >
                      {isLaunching ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          <span>Starting...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-500 mr-1" />
                          <span>Practice</span>
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </>
                      )}
                    </Button>
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
