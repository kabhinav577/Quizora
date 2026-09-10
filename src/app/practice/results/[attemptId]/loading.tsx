import React from 'react';

export default function PracticeResultsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Hero Card Skeleton */}
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-10 w-96 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
            <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
            <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
            <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          </div>
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
          <div className="h-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
        </div>

        {/* Review List Skeleton */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
          <div className="h-6 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
