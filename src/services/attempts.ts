import { Attempt, AttemptQuestion, QuestionSnapshot, Test } from '@/types/database';
import { AttemptWithDetails } from '@/types/quiz';
export type { AttemptWithDetails };

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTestById } from './tests';
import { listQuestions } from './questions';
import { calculateAttemptScore, AttemptScoreSummary } from '@/lib/quiz/scoring';


// In-memory fallback store attached to globalThis to persist across Next.js dev server/turbopack contexts
declare global {
  // eslint-disable-next-line no-var
  var __localAttempts: Attempt[] | undefined;
  // eslint-disable-next-line no-var
  var __localAttemptQuestions: AttemptQuestion[] | undefined;
}

export const localAttempts: Attempt[] =
  globalThis.__localAttempts ?? (globalThis.__localAttempts = []);
export const localAttemptQuestions: AttemptQuestion[] =
  globalThis.__localAttemptQuestions ?? (globalThis.__localAttemptQuestions = []);

/**
 * Fisher-Yates array shuffle helper
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffles options for a question while preserving correct answer correctness
 */
function shuffleQuestionOptions(
  options: { text: string | null; image_path: string | null }[],
  correctOption: number
) {
  const indices = options.map((_, i) => i);
  const shuffledIndices = shuffleArray(indices);
  const shuffledOptions = shuffledIndices.map((i) => options[i]) as unknown as import('@/types/database').QuestionOptions;
  const newCorrectIndex = shuffledIndices.indexOf(correctOption - 1);
  const newCorrectOption = ((newCorrectIndex !== -1 ? newCorrectIndex + 1 : 1)) as 1 | 2 | 3 | 4 | 5;
  return {
    options: shuffledOptions,
    correct_option: newCorrectOption,
  };
}


/**
 * Calculate remaining time for an attempt
 */
export function calculateRemainingSeconds(startedAt: string, durationSeconds: number | null): {
  remainingSeconds: number | null;
  isExpired: boolean;
} {
  if (!durationSeconds || durationSeconds <= 0) {
    return { remainingSeconds: null, isExpired: false };
  }

  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - startTime) / 1000);
  const remaining = durationSeconds - elapsedSeconds;

  if (remaining <= 0) {
    return { remainingSeconds: 0, isExpired: true };
  }

  return { remainingSeconds: remaining, isExpired: false };
}

/**
 * Starts or resumes a test attempt for a user.
 * Refresh Recovery: If an in-progress attempt already exists and time hasn't expired, resumes it.
 */
export async function startAttempt(
  userId: string,
  testId: string,
  forceNew = false
): Promise<AttemptWithDetails> {
  const test = await getTestById(testId);
  if (!test) {
    throw new Error(`Test with ID ${testId} not found`);
  }

  // 1. Check for existing in_progress attempt
  if (!forceNew) {
    const existing = await findActiveAttempt(userId, testId);
    if (existing) {
      const { remainingSeconds, isExpired } = calculateRemainingSeconds(
        existing.started_at,
        test.duration_seconds
      );

      if (!isExpired) {
        // Resume existing active attempt
        return {
          ...existing,
          test,
          remaining_seconds: remainingSeconds,
          is_expired: false,
        };
      } else {
        // Time expired while user was away: auto-submit it
        await submitAttempt(existing.id);
      }
    }
  }

  // 2. Prepare questions with shuffling and immutable snapshot creation
  let testQuestions = [...test.questions];
  if (test.shuffle_questions) {
    testQuestions = shuffleArray(testQuestions);
  }

  const attemptId = crypto.randomUUID();
  const nowStr = new Date().toISOString();

  const attemptQuestions: AttemptQuestion[] = testQuestions.map((q, idx) => {
    let finalOptions = [...q.options];
    let finalCorrectOption = q.correct_option;

    if (test.shuffle_options) {
      const shuffled = shuffleQuestionOptions(q.options, q.correct_option);
      finalOptions = shuffled.options;
      finalCorrectOption = shuffled.correct_option;
    }

    const snapshot: QuestionSnapshot = {
      question_id: q.id,
      question_text: q.question_text,
      question_image_path: q.question_image_path,
      options: finalOptions as import('@/types/database').QuestionOptions,
      correct_option: finalCorrectOption,
      explanation: q.explanation,
      marks: test.marks_per_question ?? q.marks ?? 1.0,
      negative_marks: test.negative_marks ?? q.negative_marks ?? 0.0,
      time_seconds: test.question_time_seconds ?? q.default_time_seconds ?? null,
      difficulty: q.difficulty || null,
      topic_id: q.topic_id || null,
    };



    return {
      id: crypto.randomUUID(),
      attempt_id: attemptId,
      question_id: q.id,
      question_order: idx + 1,
      question_snapshot: snapshot,
      selected_option: null,
      is_answered: false,
      is_marked_for_review: false,
      is_correct: null,
      question_started_at: null,
      question_submitted_at: null,
      time_spent_seconds: 0,
      marks_awarded: 0,
      created_at: nowStr,
      updated_at: nowStr,
    };
  });

  const newAttempt: Attempt = {
    id: attemptId,
    user_id: userId,
    test_id: testId,
    status: 'in_progress',
    started_at: nowStr,
    submitted_at: null,
    total_questions: attemptQuestions.length,
    answered_questions: 0,
    correct_answers: 0,
    wrong_answers: 0,
    skipped_questions: 0,
    score: 0,
    accuracy: 0,
    total_time_seconds: 0,
    created_at: nowStr,
    updated_at: nowStr,
  };

  // Persist to Supabase or fallback
  try {
    const supabase = await createServerSupabaseClient();
    const { error: attemptErr } = await supabase.from('attempts').insert(newAttempt);
    if (!attemptErr) {
      await supabase.from('attempt_questions').insert(attemptQuestions);
    }
  } catch {
    // fallback to local
  }

  localAttempts.unshift(newAttempt);
  localAttemptQuestions.push(...attemptQuestions);

  return {
    ...newAttempt,
    test,
    questions: attemptQuestions,
    remaining_seconds: test.duration_seconds,
    is_expired: false,
  };
}

/**
 * Creates an on-the-fly practice session for student custom practice
 */
export async function startPracticeSession(
  userId: string,
  options: {
    examId?: string;
    subjectId?: string;
    topicId?: string;
    count?: number;
    timerSeconds?: number;
  }
): Promise<AttemptWithDetails> {
  const { examId, subjectId, topicId, count = 10, timerSeconds } = options;

  const result = await listQuestions({
    examId,
    subjectId,
    topicId,
    status: 'published',
    pageSize: 100,
  });

  if (!result.questions || result.questions.length === 0) {
    throw new Error('No published questions found for the selected criteria');
  }

  const shuffledQuestions = shuffleArray(result.questions).slice(0, count);
  const attemptId = crypto.randomUUID();
  const nowStr = new Date().toISOString();

  const attemptQuestions: AttemptQuestion[] = shuffledQuestions.map((q, idx) => {
    const snapshot: QuestionSnapshot = {
      question_id: q.id,
      question_text: q.question_text,
      question_image_path: q.question_image_path,
      options: [...q.options],
      correct_option: q.correct_option,
      explanation: q.explanation,
      marks: q.marks || 1.0,
      negative_marks: q.negative_marks || 0.25,
      time_seconds: timerSeconds ?? q.default_time_seconds ?? null,
      difficulty: q.difficulty || null,
      topic_id: q.topic_id || null,
    };


    return {
      id: crypto.randomUUID(),
      attempt_id: attemptId,
      question_id: q.id,
      question_order: idx + 1,
      question_snapshot: snapshot,
      selected_option: null,
      is_answered: false,
      is_marked_for_review: false,
      is_correct: null,
      question_started_at: null,
      question_submitted_at: null,
      time_spent_seconds: 0,
      marks_awarded: 0,
      created_at: nowStr,
      updated_at: nowStr,
    };
  });

  const durationSeconds = timerSeconds ? timerSeconds * shuffledQuestions.length : null;

  const newAttempt: Attempt = {
    id: attemptId,
    user_id: userId,
    test_id: null,
    status: 'in_progress',
    started_at: nowStr,
    submitted_at: null,
    total_questions: attemptQuestions.length,
    answered_questions: 0,
    correct_answers: 0,
    wrong_answers: 0,
    skipped_questions: 0,
    score: 0,
    accuracy: 0,
    total_time_seconds: 0,
    created_at: nowStr,
    updated_at: nowStr,
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('attempts').insert(newAttempt);
    if (!error) {
      await supabase.from('attempt_questions').insert(attemptQuestions);
    }
  } catch {
    // fallback
  }

  localAttempts.unshift(newAttempt);
  localAttemptQuestions.push(...attemptQuestions);

  return {
    ...newAttempt,
    test: null,
    questions: attemptQuestions,
    remaining_seconds: durationSeconds,
    is_expired: false,
  };
}

/**
 * Find active in-progress attempt for a user and test
 */
async function findActiveAttempt(userId: string, testId: string): Promise<AttemptWithDetails | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: attemptData, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('test_id', testId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && attemptData) {
      const { data: qData } = await supabase
        .from('attempt_questions')
        .select('*')
        .eq('attempt_id', attemptData.id)
        .order('question_order');

      return {
        ...(attemptData as Attempt),
        test: null,
        questions: (qData as AttemptQuestion[]) || [],
        remaining_seconds: null,
        is_expired: false,
      };
    }
  } catch {
    // fallback
  }

  const local = localAttempts.find(
    (a) => a.user_id === userId && a.test_id === testId && a.status === 'in_progress'
  );
  if (!local) return null;

  const questions = localAttemptQuestions
    .filter((aq) => aq.attempt_id === local.id)
    .sort((a, b) => a.question_order - b.question_order);

  return {
    ...local,
    test: null,
    questions,
    remaining_seconds: null,
    is_expired: false,
  };
}

/**
 * Retrieves an attempt by ID, including its snapshot questions and server time calculations
 */
export async function getAttemptById(attemptId: string): Promise<AttemptWithDetails | null> {
  let attempt: Attempt | null = null;
  let questions: AttemptQuestion[] = [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data: aData, error: aErr } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (!aErr && aData) {
      attempt = aData as Attempt;
      const { data: qData } = await supabase
        .from('attempt_questions')
        .select('*')
        .eq('attempt_id', attemptId)
        .order('question_order');
      questions = (qData as AttemptQuestion[]) || [];
    }
  } catch {
    // fallback
  }

  if (!attempt) {
    const local = localAttempts.find((a) => a.id === attemptId);
    if (!local) return null;
    attempt = local;
    questions = localAttemptQuestions
      .filter((aq) => aq.attempt_id === attemptId)
      .sort((a, b) => a.question_order - b.question_order);
  }

  let test: Test | null = null;
  if (attempt.test_id) {
    test = await getTestById(attempt.test_id);
  }

  const { remainingSeconds, isExpired } = calculateRemainingSeconds(
    attempt.started_at,
    test ? test.duration_seconds : null
  );

  return {
    ...attempt,
    test,
    questions,
    remaining_seconds: remainingSeconds,
    is_expired: attempt.status === 'in_progress' ? isExpired : false,
  };
}

/**
 * Saves answer and metadata for a specific question during an active attempt
 */
export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selectedOption: number | null,
  isMarkedForReview = false,
  timeSpentSeconds = 0
): Promise<boolean> {
  const isAnswered = selectedOption !== null && selectedOption > 0;
  const nowStr = new Date().toISOString();

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('attempt_questions')
      .update({
        selected_option: selectedOption,
        is_answered: isAnswered,
        is_marked_for_review: isMarkedForReview,
        time_spent_seconds: Math.max(0, timeSpentSeconds),
        updated_at: nowStr,
      })
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId);

    if (!error) return true;
  } catch {
    // fallback
  }

  const found = localAttemptQuestions.find(
    (aq) => aq.attempt_id === attemptId && (aq.question_id === questionId || aq.id === questionId)
  );
  if (found) {
    found.selected_option = selectedOption;
    found.is_answered = isAnswered;
    found.is_marked_for_review = isMarkedForReview;
    found.time_spent_seconds = Math.max(0, timeSpentSeconds);
    found.updated_at = nowStr;
    return true;
  }

  return false;
}

/**
 * Submits an attempt, evaluates all answers against immutable question snapshots,
 * and updates status to completed.
 * Idempotent: Subsequent calls return already completed results.
 */
export async function submitAttempt(
  attemptId: string,
  finalAnswers?: {
    question_id: string;
    selected_option: number | null;
    is_marked_for_review?: boolean;
    time_spent_seconds?: number;
  }[]
): Promise<{
  attempt: AttemptWithDetails;
  summary: AttemptScoreSummary;
}> {
  const existing = await getAttemptById(attemptId);
  if (!existing) {
    throw new Error(`Attempt ${attemptId} not found`);
  }

  // Idempotency check: if already completed, compute and return cached summary
  if (existing.status === 'completed') {
    const scoringInput = existing.questions.map((aq) => ({
      question_snapshot: aq.question_snapshot,
      selected_option: aq.selected_option,
      time_spent_seconds: aq.time_spent_seconds,
    }));
    const summary = calculateAttemptScore(scoringInput);
    return { attempt: existing, summary };
  }

  // If final answers payload was supplied, update questions first
  if (finalAnswers && finalAnswers.length > 0) {
    await Promise.all(
      finalAnswers.map((ans) =>
        saveAnswer(
          attemptId,
          ans.question_id,
          ans.selected_option,
          ans.is_marked_for_review ?? false,
          ans.time_spent_seconds ?? 0
        )
      )
    );
  }

  // Reload fresh questions
  const refreshed = await getAttemptById(attemptId);
  if (!refreshed) throw new Error('Attempt lost during submission');

  const scoringInput = refreshed.questions.map((aq) => ({
    question_snapshot: aq.question_snapshot,
    selected_option: aq.selected_option,
    time_spent_seconds: aq.time_spent_seconds,
  }));

  const summary = calculateAttemptScore(scoringInput);
  const nowStr = new Date().toISOString();

  // Update attempt records explicitly conforming to Attempt table columns
  const updatedAttempt: Attempt = {
    id: refreshed.id,
    user_id: refreshed.user_id,
    test_id: refreshed.test_id,
    status: 'completed',
    started_at: refreshed.started_at,
    submitted_at: nowStr,
    total_questions: refreshed.total_questions,
    answered_questions: summary.answered_questions,
    correct_answers: summary.correct_answers,
    wrong_answers: summary.wrong_answers,
    skipped_questions: summary.skipped_questions,
    score: summary.score,
    accuracy: summary.accuracy,
    total_time_seconds: summary.total_time_seconds,
    created_at: refreshed.created_at,
    updated_at: nowStr,
  };

  // Update question-level marks and correctness
  const updatedQuestions = refreshed.questions.map((aq, idx) => {
    const scoredItem = summary.question_results[idx];
    return {
      ...aq,
      is_correct: scoredItem?.is_correct ?? false,
      marks_awarded: scoredItem?.marks_awarded ?? 0,
      updated_at: nowStr,
    };
  });

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from('attempts').update(updatedAttempt).eq('id', attemptId);

    await Promise.all(
      updatedQuestions.map((uq) =>
        supabase
          .from('attempt_questions')
          .update({
            is_correct: uq.is_correct,
            marks_awarded: uq.marks_awarded,
            updated_at: nowStr,
          })
          .eq('id', uq.id)
      )
    );
  } catch {
    // fallback
  }

  const localIdx = localAttempts.findIndex((a) => a.id === attemptId);
  if (localIdx !== -1) {
    localAttempts[localIdx] = updatedAttempt;
  }

  for (const uq of updatedQuestions) {
    const qIdx = localAttemptQuestions.findIndex(
      (q) => q.id === uq.id || (q.attempt_id === attemptId && q.question_id === uq.question_id)
    );
    if (qIdx !== -1) {
      localAttemptQuestions[qIdx] = uq;
    }
  }

  const finalAttemptWithDetails: AttemptWithDetails = {
    ...updatedAttempt,
    test: refreshed.test,
    questions: updatedQuestions,
    remaining_seconds: 0,
    is_expired: false,
  };

  return {
    attempt: finalAttemptWithDetails,
    summary,
  };
}

/**
 * Creates a targeted remediation practice session containing only the questions
 * the user answered incorrectly or skipped in an earlier attempt.
 */
export async function startMistakesPractice(
  userId: string,
  originalAttemptId: string
): Promise<AttemptWithDetails> {
  const original = await getAttemptById(originalAttemptId);
  if (!original) {
    throw new Error('Original attempt not found');
  }

  const mistakeQuestions = original.questions.filter((q) => q.is_correct !== true);

  if (mistakeQuestions.length === 0) {
    throw new Error('Congratulations! You scored 100% on this test with no mistakes to practice.');
  }

  const attemptId = crypto.randomUUID();
  const nowStr = new Date().toISOString();

  const newAttemptQuestions: AttemptQuestion[] = mistakeQuestions.map((mq, idx) => ({
    id: crypto.randomUUID(),
    attempt_id: attemptId,
    question_id: mq.question_id,
    question_order: idx + 1,
    question_snapshot: mq.question_snapshot,
    selected_option: null,
    is_answered: false,
    is_marked_for_review: false,
    is_correct: null,
    question_started_at: null,
    question_submitted_at: null,
    time_spent_seconds: 0,
    marks_awarded: 0,
    created_at: nowStr,
    updated_at: nowStr,
  }));

  const newAttempt: Attempt = {
    id: attemptId,
    user_id: userId,
    test_id: null,
    status: 'in_progress',
    started_at: nowStr,
    submitted_at: null,
    total_questions: newAttemptQuestions.length,
    answered_questions: 0,
    correct_answers: 0,
    wrong_answers: 0,
    skipped_questions: 0,
    score: 0,
    accuracy: 0,
    total_time_seconds: 0,
    created_at: nowStr,
    updated_at: nowStr,
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('attempts').insert(newAttempt);
    if (!error) {
      await supabase.from('attempt_questions').insert(newAttemptQuestions);
    }
  } catch {
    // fallback
  }

  localAttempts.unshift(newAttempt);
  localAttemptQuestions.push(...newAttemptQuestions);

  return {
    ...newAttempt,
    test: null,
    questions: newAttemptQuestions,
    remaining_seconds: null,
    is_expired: false,
  };
}

