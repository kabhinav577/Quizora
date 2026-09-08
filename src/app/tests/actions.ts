'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  startAttempt,
  saveAnswer,
  submitAttempt,
  startPracticeSession,
  getAttemptById,
} from '@/services/attempts';
import { getTestBySlug } from '@/services/tests';
import { listExams } from '@/services/exams';
import { listSubjects } from '@/services/subjects';
import { listTopics } from '@/services/topics';


const DEFAULT_DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

async function getEffectiveUserId(): Promise<string> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) {
      return data.user.id;
    }
  } catch {
    // fallback
  }
  return DEFAULT_DEV_USER_ID;
}

export async function startTestAttemptAction(testId: string, forceNew = false) {
  const userId = await getEffectiveUserId();
  const attempt = await startAttempt(userId, testId, forceNew);
  return attempt;
}

export async function saveAnswerAction(
  attemptId: string,
  questionId: string,
  selectedOption: number | null,
  isMarkedForReview = false,
  timeSpentSeconds = 0
) {
  return await saveAnswer(attemptId, questionId, selectedOption, isMarkedForReview, timeSpentSeconds);
}

export async function submitAttemptAction(
  attemptId: string,
  finalAnswers?: {
    question_id: string;
    selected_option: number | null;
    is_marked_for_review?: boolean;
    time_spent_seconds?: number;
  }[]
) {
  return await submitAttempt(attemptId, finalAnswers);
}

export async function startPracticeSessionAction(options: {
  examId?: string;
  subjectId?: string;
  topicId?: string;
  count?: number;
  timerSeconds?: number;
}) {
  const userId = await getEffectiveUserId();
  const attempt = await startPracticeSession(userId, options);
  return attempt;
}

export async function getAttemptDetailsAction(attemptId: string) {
  return await getAttemptById(attemptId);
}

export async function getTestBySlugAction(slug: string) {
  return await getTestBySlug(slug);
}

export async function listExamsAction() {
  return await listExams();
}

export async function listSubjectsAction(examId?: string) {
  return await listSubjects(examId);
}

export async function listTopicsAction(subjectId?: string) {
  return await listTopics(subjectId);
}

