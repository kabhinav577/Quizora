'use client';

import React from 'react';
import { ScorecardAnalytics } from '@/lib/quiz/analytics';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Gauge,
  Timer,
  Zap,
  AlertOctagon,
  CheckCircle,
} from 'lucide-react';


interface AnalyticsChartsProps {
  analytics: ScorecardAnalytics;
}

const DIFFICULTY_COLORS = {
  Easy: '#10b981', // emerald-500
  Medium: '#6366f1', // indigo-500
  Hard: '#f43f5e', // rose-500
};

export function AnalyticsCharts({ analytics }: AnalyticsChartsProps) {
  const { topicBreakdown, difficultyBreakdown, pacing } = analytics;

  const topicChartData = topicBreakdown.map((t) => ({
    name: t.topic_name.length > 18 ? `${t.topic_name.slice(0, 16)}…` : t.topic_name,
    fullName: t.topic_name,
    accuracy: t.accuracy,
    score: t.score,
    total: t.total,
    correct: t.correct,
  }));

  const diffChartData = difficultyBreakdown.map((d) => ({
    name: d.label,
    accuracy: d.accuracy,
    total: d.total,
    correct: d.correct,
    wrong: d.wrong,
    color: DIFFICULTY_COLORS[d.label as keyof typeof DIFFICULTY_COLORS] || '#6366f1',
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Mastery Bar Chart */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Topic-Wise Accuracy (%)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Accuracy distribution across syllabus topics in this examination.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topicChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value: unknown) => [`${value}%`, 'Accuracy']}
                    labelFormatter={(label, payload) => {

                      const item = payload?.[0]?.payload;
                      return item ? `${item.fullName} (${item.correct}/${item.total} correct)` : label;
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="accuracy" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                    {topicChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.accuracy >= 75
                            ? '#10b981'
                            : entry.accuracy >= 50
                            ? '#6366f1'
                            : '#f43f5e'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>&ge; 75% High</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                <span>50-74% Medium</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>&lt; 50% Weak</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Difficulty Breakdown Chart */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Performance by Question Difficulty</span>
            </CardTitle>
            <CardDescription className="text-xs">
              How accurately you solved Easy, Medium, and Hard tier questions.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={diffChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value: unknown) => [`${value}%`, 'Accuracy']}
                    labelFormatter={(label, payload) => {

                      const item = payload?.[0]?.payload;
                      return item
                        ? `${item.name} (${item.correct} correct, ${item.wrong} wrong of ${item.total})`
                        : label;
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                    {diffChartData.map((entry, index) => (
                      <Cell key={`cell-diff-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {difficultyBreakdown.map((d) => (
                <div
                  key={d.difficulty}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60"
                >
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">
                    {d.label}
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                    {d.correct} / {d.total}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pacing & Time Traps Analysis */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-500" />
            <span>Time Management & Pacing Diagnostics</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Identify time efficiency, quick wins, and costly time traps.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fast & Correct */}
            <div className="p-4 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 mb-1">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Fast & Accurate</span>
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {pacing.fastAndCorrect}
              </div>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 mt-1 font-medium leading-relaxed">
                Answered in &le; 30s correctly. High concept automaticity!
              </p>
            </div>

            {/* Fast & Wrong (Careless Errors) */}
            <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 mb-1">
                <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Careless Errors</span>
              </div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-300">
                {pacing.fastAndWrong}
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 font-medium leading-relaxed">
                Answered in &le; 30s but wrong. Slow down and re-read carefully!
              </p>
            </div>

            {/* Slow & Correct */}
            <div className="p-4 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 mb-1">
                <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Deep Solving</span>
              </div>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                {pacing.slowAndCorrect}
              </div>
              <p className="text-xs text-indigo-800/90 dark:text-indigo-300/90 mt-1 font-medium leading-relaxed">
                Took &gt; 60s but got it right. Work on speed shortcuts.
              </p>
            </div>

            {/* Slow & Wrong (Time Traps) */}
            <div className="p-4 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 mb-1">
                <Timer className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Time Traps</span>
              </div>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-300">
                {pacing.slowAndWrong}
              </div>
              <p className="text-xs text-rose-800/90 dark:text-rose-300/90 mt-1 font-medium leading-relaxed">
                Spent &gt; 60s and marked wrong. Learn to skip early!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
