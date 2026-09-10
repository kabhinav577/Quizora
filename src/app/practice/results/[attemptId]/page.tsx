import React from 'react';
import { notFound } from 'next/navigation';
import { getAttemptById } from '@/services/attempts';
import { getUserBookmarksAction } from '@/app/tests/actions';
import { TestResultsView } from '@/components/results/TestResultsView';

interface PracticeResultsPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function PracticeResultsPage({ params }: PracticeResultsPageProps) {
  const { attemptId } = await params;
  const [attempt, userBookmarks] = await Promise.all([
    getAttemptById(attemptId),
    getUserBookmarksAction(),
  ]);

  if (!attempt) {
    notFound();
  }

  const bookmarkedIds = userBookmarks.map((b) => b.question_id);

  return (
    <TestResultsView
      attempt={attempt}
      initialBookmarkedIds={bookmarkedIds}
    />
  );
}
