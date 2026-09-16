'use server';

import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  getStudentDashboardData,
  getStudentMistakes,
  getStudentBookmarksWithDetails,
  getStudentAttemptsHistory,
  startBookmarksPracticeSession,
  startMistakesHubPracticeSession,
} from '@/services/dashboard';
import { startPracticeSession } from '@/services/attempts';
import { AttemptStatus } from '@/types/database';

const DEFAULT_DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

async function getEffectiveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_DEV_USER_ID;
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || DEFAULT_DEV_USER_ID;
  } catch {
    return DEFAULT_DEV_USER_ID;
  }
}

export async function getStudentDashboardAction() {
  const userId = await getEffectiveUserId();
  return await getStudentDashboardData(userId);
}

export async function getStudentMistakesAction(filters?: {
  examId?: string;
  subjectId?: string;
  topicId?: string;
  search?: string;
}) {
  const userId = await getEffectiveUserId();
  return await getStudentMistakes(userId, filters);
}

export async function getBookmarkedQuestionsAction(filters?: {
  examId?: string;
  subjectId?: string;
  topicId?: string;
  search?: string;
}) {
  const userId = await getEffectiveUserId();
  return await getStudentBookmarksWithDetails(userId, filters);
}

export async function getStudentHistoryAction(filters?: {
  testType?: 'mock_test' | 'practice';
  status?: AttemptStatus;
  examId?: string;
  search?: string;
}) {
  const userId = await getEffectiveUserId();
  return await getStudentAttemptsHistory(userId, filters);
}

export async function startWeakTopicPracticeAction(options: {
  topicId?: string;
  examId?: string;
  count?: number;
  timerSeconds?: number;
}) {
  const userId = await getEffectiveUserId();
  return await startPracticeSession(userId, {
    topicId: options.topicId,
    examId: options.examId,
    count: options.count || 10,
    timerSeconds: options.timerSeconds || 45,
  });
}

export async function startBookmarksPracticeAction(questionIds?: string[]) {
  const userId = await getEffectiveUserId();
  return await startBookmarksPracticeSession(userId, questionIds);
}

export async function startMistakesHubPracticeAction(questionIds?: string[]) {
  const userId = await getEffectiveUserId();
  return await startMistakesHubPracticeSession(userId, questionIds);
}
