'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  getTestBySlugAction,
  startTestAttemptAction,
  saveAnswerAction,
  submitAttemptAction,
} from '@/app/tests/actions';
import type { AttemptWithDetails } from '@/types/quiz';
import { QuizEngine } from '@/components/quiz/QuizEngine';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


interface AttemptPageProps {
  params: Promise<{ slug: string }>;
}

export default function TestAttemptPage({ params }: AttemptPageProps) {
  const { slug } = use(params);
  const router = useRouter();

  const [attempt, setAttempt] = useState<AttemptWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initAttempt() {
      setLoading(true);
      setError(null);
      try {
        const test = await getTestBySlugAction(slug);
        if (!test) {

          throw new Error('Test not found');
        }

        // Start or resume existing in-progress attempt
        const attemptData = await startTestAttemptAction(test.id);
        if (!isMounted) return;

        if (attemptData.status === 'completed') {
          // If already completed, redirect directly to results
          router.push(`/tests/${slug}/results/${attemptData.id}`);
          return;
        }

        setAttempt(attemptData);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to initialize test');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAttempt();

    return () => {
      isMounted = false;
    };
  }, [slug, router]);

  const handleSaveAnswer = async (
    questionId: string,
    selectedOption: number | null,
    isMarkedForReview: boolean,
    timeSpentSeconds: number
  ) => {
    if (!attempt) return false;
    return await saveAnswerAction(
      attempt.id,
      questionId,
      selectedOption,
      isMarkedForReview,
      timeSpentSeconds
    );
  };

  const handleSubmitAttempt = async (
    finalAnswers: Array<{
      question_id: string;
      selected_option: number | null;
      is_marked_for_review: boolean;
      time_spent_seconds: number;
    }>
  ) => {
    if (!attempt) return;
    try {
      const res = await submitAttemptAction(attempt.id, finalAnswers);
      // Navigate to results page (Phase 6)
      router.push(`/tests/${slug}/results/${res.attempt.id}`);
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Failed to submit test. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Preparing examination environment...
        </p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Unable to start test
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {error || 'An unexpected error occurred while loading this exam.'}
          </p>
          <div className="pt-2">
            <Link href={`/tests/${slug}`}>
              <Button variant="outline">Back to Test Overview</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QuizEngine
      attempt={attempt}
      onSaveAnswer={handleSaveAnswer}
      onSubmitAttempt={handleSubmitAttempt}
      testTitle={attempt.test?.title}
    />
  );
}
