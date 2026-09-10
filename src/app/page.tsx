import React from 'react';
import Link from 'next/link';
import { listExams } from '@/services/exams';
import { listTests } from '@/services/tests';
import { Exam } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';


export default async function HomePage() {
  const exams: Exam[] = await listExams();
  const { tests } = await listTests({ status: 'published', pageSize: 6 });


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2 font-black text-xl text-primary tracking-tight">
          <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>QUIZORA</span>
        </div>

        <nav className="flex items-center gap-3">
          <Link href="/tests">
            <Button variant="ghost" size="sm" className="font-medium text-slate-700 dark:text-slate-300">
              Mock Tests
            </Button>
          </Link>
          <Link href="/practice">
            <Button variant="ghost" size="sm" className="font-medium text-slate-700 dark:text-slate-300">
              Practice Mode
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline" size="sm">
              Admin Portal
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Competitive Examination MCQ Practice Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            Master Competitive Exams with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-primary to-purple-600">
              Realistic CBT Practice
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Designed for Bihar STET, CTET, SSC, Railway, Banking, UPSC, and Computer Science aspirants.
            Practice daily MCQs under authentic timed conditions with negative marking.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/tests">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-base shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <span>Take a Mock Test</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <Link href="/practice">
              <Button
                variant="outline"
                size="lg"
                className="font-semibold px-8 py-6 text-base flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>Targeted Practice</span>
              </Button>
            </Link>
          </div>
        </section>

        {/* Target Exams Section */}
        <section className="py-12 bg-white dark:bg-slate-900/80 border-y border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Covered Competitive Examinations
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Choose an exam to view tailored mock test series and topic-wise questions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {exams.map((exam) => (
                <Link key={exam.id} href={`/tests?examId=${exam.id}`} className="group">
                  <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {exam.name}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    {exam.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {exam.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Mock Tests Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Featured Mock Tests
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Authentic full-length practice tests with instant scorecard evaluation.
              </p>
            </div>

            <Link href="/tests">
              <Button variant="ghost" size="sm" className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                <span>View All Tests</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => {
              const exam = exams.find((e) => e.id === test.exam_id);
              const durationMins = test.duration_seconds
                ? Math.round(test.duration_seconds / 60)
                : null;

              return (
                <Card
                  key={test.id}
                  className="flex flex-col justify-between border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow group"
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

                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
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
                        <span>Start Test</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 px-4 sm:px-8 text-center text-xs text-slate-500">
        Quizora Competitive Examination MCQ Practice Platform &bull; Built with Next.js 16, TypeScript &amp; Supabase
      </footer>
    </div>
  );
}
