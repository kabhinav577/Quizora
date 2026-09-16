'use client';

import React from 'react';
import { StudentDashboardStats } from '@/services/dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Award, BookOpen, Target, Clock } from 'lucide-react';

interface DashboardStatsCardsProps {
  stats: StudentDashboardStats;
}

export function DashboardStatsCards({ stats }: DashboardStatsCardsProps) {
  // Format study time nicely (e.g., 2h 15m or 45m)
  const formatStudyTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const statItems = [
    {
      title: 'Tests Attempted',
      value: stats.totalTestsTaken,
      subtitle: 'Mock tests & practice',
      icon: BookOpen,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
    },
    {
      title: 'Questions Practiced',
      value: stats.totalQuestionsPracticed,
      subtitle: 'Completed items',
      icon: Target,
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      title: 'Overall Accuracy',
      value: `${stats.overallAccuracy}%`,
      subtitle: 'Precision index',
      icon: Award,
      iconColor:
        stats.overallAccuracy >= 75
          ? 'text-emerald-600 dark:text-emerald-400'
          : stats.overallAccuracy >= 50
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-amber-600 dark:text-amber-400',
      bgColor:
        stats.overallAccuracy >= 75
          ? 'bg-emerald-50 dark:bg-emerald-950/40'
          : stats.overallAccuracy >= 50
          ? 'bg-indigo-50 dark:bg-indigo-950/40'
          : 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      title: 'Total Study Time',
      value: formatStudyTime(stats.totalStudyTimeSeconds),
      subtitle: 'Time under CBT timer',
      icon: Clock,
      iconColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.title}
            className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {item.title}
                </p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {item.value}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {item.subtitle}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${item.bgColor} shrink-0`}>
                <Icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
