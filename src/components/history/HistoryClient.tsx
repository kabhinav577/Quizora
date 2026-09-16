'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AttemptHistoryItem } from '@/services/dashboard';
import { StudentHeader } from '@/components/layout/StudentHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  History,
  Search,
  Eye,
  Play,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  FileCheck,
} from 'lucide-react';

interface HistoryClientProps {
  initialHistory: AttemptHistoryItem[];
}

export function HistoryClient({ initialHistory }: HistoryClientProps) {
  const [history] = useState<AttemptHistoryItem[]>(initialHistory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'mock_test' | 'practice'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (selectedType !== 'all' && item.testType !== selectedType) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (
        searchQuery &&
        !item.testTitle.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [history, selectedType, selectedStatus, searchQuery]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    if (mins > 0) {
      return `${mins}m ${s}s`;
    }
    return `${s}s`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <StudentHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Test Attempt History
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Chronological audit log of all completed mock tests, practice sessions, and remediation drills
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by test name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Type tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  selectedType === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All ({history.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('mock_test')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  selectedType === 'mock_test'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                }`}
              >
                Mock Tests ({history.filter((h) => h.testType === 'mock_test').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('practice')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  selectedType === 'practice'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                }`}
              >
                Practice ({history.filter((h) => h.testType === 'practice').length})
              </button>
            </div>

            {/* Status selector */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
        </div>

        {/* History Cards List */}
        {filteredHistory.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/50 w-16 h-16 mx-auto flex items-center justify-center text-indigo-600">
              <FileCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                No Test Attempts Found
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
                  ? 'No attempts match your search filters.'
                  : 'You have not taken any mock tests or practice sessions yet. Start today to track your growth!'}
              </p>
            </div>
            <Link href="/tests">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                Browse Mock Tests
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => {
              const isCompleted = item.status === 'completed';
              const isInProgress = item.status === 'in_progress';

              const resultsUrl = item.testSlug
                ? `/tests/${item.testSlug}/results/${item.id}`
                : `/practice/results/${item.id}`;

              const resumeUrl = item.testSlug
                ? `/tests/${item.testSlug}/attempt`
                : `/practice?attemptId=${item.id}`;

              return (
                <Card
                  key={item.id}
                  className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
                >
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${
                            item.testType === 'mock_test'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {item.testType === 'mock_test' ? 'Mock Test' : 'Rapid Practice'}
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

                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.createdAt)}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                        {item.testTitle}
                      </h3>

                      {isCompleted && (
                        <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                            <Award className="w-3.5 h-3.5" />
                            Score: {item.score} / {item.maxScore}
                          </span>

                          <span>•</span>

                          <span>
                            Accuracy:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {item.accuracy}%
                            </strong>
                          </span>

                          <span>•</span>

                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            {item.correctAnswers} Correct
                          </span>

                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                            <XCircle className="w-3 h-3" />
                            {item.wrongAnswers} Wrong
                          </span>

                          {item.totalTimeSeconds > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formatSeconds(item.totalTimeSeconds)}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isCompleted ? (
                        <Link href={resultsUrl}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            <span>View Scorecard</span>
                          </Button>
                        </Link>
                      ) : isInProgress ? (
                        <Link href={resumeUrl}>
                          <Button
                            size="sm"
                            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            <Play className="w-3.5 h-3.5 mr-1 fill-white" />
                            <span>Resume Test</span>
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
