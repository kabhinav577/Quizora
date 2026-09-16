import React from 'react';
import Link from 'next/link';
import { listTests } from '@/services/tests';
import { listExams } from '@/services/exams';
import { Exam } from '@/types/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { StudentHeader } from '@/components/layout/StudentHeader';

interface TestsPageProps {
  searchParams: Promise<{ examId?: string }>;
}

export default async function TestsDirectoryPage({ searchParams }: TestsPageProps) {
  const { examId } = await searchParams;

  const exams: Exam[] = await listExams();

  const { tests } = await listTests({
    examId,
    status: 'published',
    pageSize: 50,
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <StudentHeader />
      <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Full Mock Exams & Practice Sets
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Mock Test Series
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Timed, authentic examination patterns simulating real computer-based tests (CBT).
            </p>
          </div>

          <Link href="/practice">
            <Button variant="outline" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Practice by Topic</span>
            </Button>
          </Link>
        </div>

        {/* Exam Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Link href="/tests">
            <Badge
              variant={!examId ? 'default' : 'outline'}
              className="cursor-pointer py-1.5 px-3 text-xs"
            >
              All Examinations
            </Badge>
          </Link>
          {exams.map((ex) => (
            <Link key={ex.id} href={`/tests?examId=${ex.id}`}>
              <Badge
                variant={examId === ex.id ? 'default' : 'outline'}
                className="cursor-pointer py-1.5 px-3 text-xs whitespace-nowrap"
              >
                {ex.name}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Tests Grid */}
        {tests.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              No published tests found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Check back soon or try selecting a different examination filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => {
              const exam = exams.find((e) => e.id === test.exam_id);
              const durationMins = test.duration_seconds
                ? Math.round(test.duration_seconds / 60)
                : null;

              return (
                <Card
                  key={test.id}
                  className="flex flex-col justify-between border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow group"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {exam && (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {exam.name}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {test.test_type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {test.title}
                    </CardTitle>

                    {test.description && (
                      <CardDescription className="line-clamp-2 text-xs mt-1 leading-relaxed text-slate-500 dark:text-slate-400">
                        {test.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex flex-col items-center justify-center p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">Questions</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {test.total_questions}
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">Duration</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {durationMins ? `${durationMins}m` : 'Untimed'}
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">Marks</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{test.marks_per_question}
                        </span>
                      </div>
                    </div>

                    <Link href={`/tests/${test.slug}`} className="block">
                      <Button
                        variant="default"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        <span>Take Test</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
