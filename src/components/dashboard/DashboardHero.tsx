'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DailyPracticeRecommendation } from '@/services/dashboard';
import { Flame, Sparkles, ArrowRight, Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startWeakTopicPracticeAction } from '@/app/dashboard/actions';

interface DashboardHeroProps {
  recommendation: DailyPracticeRecommendation;
  streakDays: number;
}

export function DashboardHero({ recommendation, streakDays }: DashboardHeroProps) {
  const router = useRouter();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleStartRecommendation = async () => {
    setIsLaunching(true);
    try {
      const attempt = await startWeakTopicPracticeAction({
        topicId: recommendation.topicId || undefined,
        count: recommendation.questionCount,
        timerSeconds: recommendation.timerSeconds,
      });
      router.push(`/practice?attemptId=${attempt.id}`);
    } catch (err) {
      console.error('Failed to launch recommended practice', err);
      setIsLaunching(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-lg">
      {/* Background Decorative Rings */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left Column: Greeting & Recommendation */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Recommended For You Today</span>
            </span>

            {/* Streak Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{streakDays} Day Streak</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            What should I practice today?
          </h1>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Target className="w-3.5 h-3.5" />
              <span>{recommendation.examName}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {recommendation.topicName}
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/80 leading-relaxed">
              {recommendation.reason}
            </p>
          </div>
        </div>

        {/* Right Column: 1-Click Practice CTA */}
        <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
          <Button
            size="lg"
            onClick={handleStartRecommendation}
            disabled={isLaunching}
            className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-6 py-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLaunching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Preparing Session...</span>
              </>
            ) : (
              <>
                <span>Practice Topic Now</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>

          <div className="text-[11px] text-indigo-200/60 text-center">
            {recommendation.questionCount} Questions • {recommendation.timerSeconds}s per question
          </div>
        </div>
      </div>
    </div>
  );
}
