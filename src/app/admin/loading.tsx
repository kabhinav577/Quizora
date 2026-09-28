import * as React from 'react';

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-9 w-32 bg-indigo-200/50 dark:bg-indigo-950/60 rounded-lg" />
        </div>
      </div>

      {/* Filter / Action Bar Skeleton */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 h-10 bg-slate-100 dark:bg-slate-800/80 rounded-lg" />
          <div className="h-10 bg-slate-100 dark:bg-slate-800/80 rounded-lg" />
          <div className="h-10 bg-slate-100 dark:bg-slate-800/80 rounded-lg" />
          <div className="h-10 bg-slate-100 dark:bg-slate-800/80 rounded-lg" />
        </div>
      </div>

      {/* Content Table / Cards Skeleton */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700/60 rounded" />
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700/60 rounded" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800/50 rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="flex items-center gap-3">
                <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800/60 rounded" />
                <div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
                <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
