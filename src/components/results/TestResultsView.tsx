'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { AttemptWithDetails } from '@/types/quiz';
import { computeScorecardAnalytics } from '@/lib/quiz/analytics';
import { ScorecardHero } from './ScorecardHero';
import { AnalyticsCharts } from './AnalyticsCharts';
import { QuestionReviewList } from './QuestionReviewList';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Sparkles,
  ArrowRight,
  BookOpen,
} from 'lucide-react';


interface TestResultsViewProps {
  attempt: AttemptWithDetails;
  initialBookmarkedIds?: string[];
}

export function TestResultsView({
  attempt,
  initialBookmarkedIds = [],
}: TestResultsViewProps) {
  const reviewSectionRef = useRef<HTMLDivElement>(null);
  const analytics = computeScorecardAnalytics(attempt);

  const scrollToReview = () => {
    reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          {attempt.test?.slug ? (
            <>
              <Link href="/tests" className="hover:text-primary transition-colors">
                Mock Tests
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href={`/tests/${attempt.test.slug}`} className="hover:text-primary transition-colors truncate max-w-xs">
                {attempt.test.title}
              </Link>
            </>
          ) : (
            <Link href="/practice" className="hover:text-primary transition-colors">
              Practice Mode
            </Link>
          )}
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-900 dark:text-slate-200">
            Results &amp; Analytics
          </span>
        </div>

        {/* Hero Section */}
        <ScorecardHero
          attempt={attempt}
          analytics={analytics}
          onScrollToReview={scrollToReview}
        />

        {/* Visual Performance Analytics */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Performance Analytics &amp; Mastery</span>
            </h2>
          </div>

          <AnalyticsCharts analytics={analytics} />
        </div>

        {/* Question-By-Question Detailed Review */}
        <div ref={reviewSectionRef} className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span>Detailed Question Solutions &amp; Explanations</span>
            </h2>
          </div>

          <QuestionReviewList
            questions={attempt.questions}
            initialBookmarkedIds={initialBookmarkedIds}
          />
        </div>

        {/* Footer Navigation CTAs */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Ready for your next practice target?
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Consistent daily question practice under timed constraints is the key to exam selection.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/practice" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                Custom Topic Practice
              </Button>
            </Link>

            <Link href="/tests" className="w-full sm:w-auto">
              <Button variant="default" className="w-full sm:w-auto flex items-center gap-2">
                <span>Browse All Tests</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
