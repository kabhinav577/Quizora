import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTestBySlug } from '@/services/tests';
import { getExamById } from '@/services/exams';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  HelpCircle,
  Award,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';


interface TestPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TestInstructionsPage({ params }: TestPageProps) {
  const { slug } = await params;
  const test = await getTestBySlug(slug);

  if (!test || test.status === 'draft') {
    notFound();
  }

  const exam = await getExamById(test.exam_id);
  const durationMins = test.duration_seconds ? Math.round(test.duration_seconds / 60) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/tests" className="hover:text-primary transition-colors">
            Mock Tests
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-slate-200 font-medium truncate">
            {test.title}
          </span>
        </div>

        {/* Main Test Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {exam && <Badge variant="default">{exam.name}</Badge>}
              <Badge variant="outline" className="capitalize">
                {test.test_type.replace('_', ' ')}
              </Badge>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                Published
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {test.title}
            </h1>

            {test.description && (
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2 max-w-3xl leading-relaxed">
                {test.description}
              </p>
            )}
          </div>

          <CardContent className="p-6 sm:p-8 space-y-8">
            {/* Key Test Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  <span>Questions</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {test.total_questions}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Duration</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {durationMins ? `${durationMins}m` : 'Untimed'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Marks / Q</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  +{test.marks_per_question}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Negative Mark</span>
                </div>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  -{test.negative_marks}
                </p>
              </div>
            </div>

            {/* General Instructions */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Examination Instructions & Guidelines
              </h3>

              <div className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    Each question contains <strong>4 or 5 options</strong> with only one correct choice.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    For every correct answer, you will be awarded <strong>+{test.marks_per_question} marks</strong>.
                  </span>
                </div>
                {test.negative_marks > 0 && (
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>
                      For every incorrect answer, <strong>{test.negative_marks} marks</strong> will be deducted. Unattempted questions receive 0 marks.
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    You can flag questions using the <strong>Mark for Review</strong> button to return to them later via the Question Palette.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Autosave & Refresh Recovery:</strong> Your answers are saved continuously. If you refresh or lose connection, you can resume without losing saved responses.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    Keyboard shortcuts are enabled: Press numbers <strong>[1-5]</strong> or letters <strong>[A-E]</strong> to select options, <strong>[Arrow keys]</strong> to navigate, and <strong>[M]</strong> to mark for review.
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button Bar */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Clicking &quot;Start Test&quot; will initialize your countdown timer.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link href={`/tests/${test.slug}/attempt`} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-primary text-primary-foreground font-bold px-8 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <span>Start Test Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
