'use client';

import React from 'react';
import Link from 'next/link';
import { StudentDashboardData } from '@/services/dashboard';
import { StudentHeader } from '@/components/layout/StudentHeader';
import { DashboardHero } from './DashboardHero';
import { DashboardStatsCards } from './DashboardStatsCards';
import { TopicWeaknessList } from './TopicWeaknessList';
import { RecentAttemptsCard } from './RecentAttemptsCard';
import { Card, CardContent } from '@/components/ui/card';
import { FileCheck, Zap, AlertOctagon, Bookmark, ArrowRight } from 'lucide-react';

interface DashboardClientProps {
  initialData: StudentDashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const { stats, weakestTopics, dailyRecommendation, recentAttempts } = initialData;

  const quickActions = [
    {
      title: 'Full Mock Tests',
      description: 'Exam-pattern timed mock tests with NTA scoring',
      icon: FileCheck,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
      borderColor: 'hover:border-indigo-300 dark:hover:border-indigo-800',
      href: '/tests',
    },
    {
      title: 'Daily Practice Mode',
      description: 'Targeted topic drills with rapid timer options',
      icon: Zap,
      iconColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
      borderColor: 'hover:border-amber-300 dark:hover:border-amber-800',
      href: '/practice',
    },
    {
      title: 'My Mistakes Hub',
      description: 'Review & re-attempt all past incorrect questions',
      icon: AlertOctagon,
      iconColor: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/50',
      borderColor: 'hover:border-rose-300 dark:hover:border-rose-800',
      href: '/mistakes',
    },
    {
      title: 'Saved Bookmarks',
      description: 'Revisit difficult questions marked during tests',
      icon: Bookmark,
      iconColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/50',
      borderColor: 'hover:border-purple-300 dark:hover:border-purple-800',
      href: '/bookmarks',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <StudentHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section: Recommendation & Streak */}
        <DashboardHero
          recommendation={dailyRecommendation}
          streakDays={stats.currentStreakDays}
        />

        {/* 4 Key Metric Cards */}
        <DashboardStatsCards stats={stats} />

        {/* Quick Access Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href} className="group">
                <Card
                  className={`h-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-all ${action.borderColor} group-hover:-translate-y-0.5`}
                >
                  <CardContent className="p-4 flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl ${action.bgColor} shrink-0`}>
                      <Icon className={`w-5 h-5 ${action.iconColor}`} />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {action.title}
                        </h3>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {action.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* 2-Column Analytics & History Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Priority Improvement Areas */}
          <TopicWeaknessList topics={weakestTopics} />

          {/* Recent Attempt History */}
          <RecentAttemptsCard attempts={recentAttempts} />
        </div>
      </main>
    </div>
  );
}
