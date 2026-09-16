import {
  Attempt,
  AttemptQuestion,
  Question,
  QuestionSnapshot,
  AttemptStatus,
} from '@/types/database';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  localAttempts,
  localAttemptQuestions,
} from './attempts';
import { localBookmarks } from './bookmarks';
import { MOCK_EXAMS, MOCK_SUBJECTS, MOCK_TOPICS, MOCK_QUESTIONS } from './mockData';
import { MOCK_TESTS } from './tests';
import { AttemptWithDetails } from '@/types/quiz';

export interface StudentDashboardStats {
  totalTestsTaken: number;
  totalQuestionsPracticed: number;
  overallAccuracy: number;
  totalStudyTimeSeconds: number;
  currentStreakDays: number;
}

export interface TopicWeakness {
  topicId: string;
  topicName: string;
  subjectName: string;
  examName: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
}

export interface DailyPracticeRecommendation {
  topicId: string | null;
  topicName: string;
  examName: string;
  reason: string;
  questionCount: number;
  timerSeconds: number;
}

export interface RecentAttemptSummary {
  id: string;
  testTitle: string;
  testSlug: string | null;
  testType: 'mock_test' | 'practice';
  status: AttemptStatus;
  score: number;
  maxScore: number;
  accuracy: number;
  totalQuestions: number;
  answeredQuestions: number;
  date: string;
}

export interface StudentDashboardData {
  stats: StudentDashboardStats;
  weakestTopics: TopicWeakness[];
  dailyRecommendation: DailyPracticeRecommendation;
  recentAttempts: RecentAttemptSummary[];
}

export interface MistakeQuestionItem {
  id: string;
  questionId: string;
  snapshot: QuestionSnapshot;
  examName: string;
  subjectName: string;
  topicName: string;
  lastAnsweredAt: string;
  lastSelectedOption: number | null;
  isSkipped: boolean;
  timesAttempted: number;
  timesIncorrect: number;
}

export interface BookmarkedQuestionItem {
  bookmarkId: string;
  questionId: string;
  question: Question;
  examName: string;
  subjectName: string;
  topicName: string;
  bookmarkedAt: string;
}

export interface AttemptHistoryItem {
  id: string;
  testTitle: string;
  testSlug: string | null;
  testType: 'mock_test' | 'practice';
  status: AttemptStatus;
  score: number;
  maxScore: number;
  accuracy: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalTimeSeconds: number;
  createdAt: string;
  submittedAt: string | null;
}

/**
 * Helper to calculate consecutive day streak from a list of dates
 */
export function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const dayStrings = Array.from(new Set(dates.map(toDateStr))).sort().reverse();
  if (dayStrings.length === 0) return 0;

  const now = new Date();
  const today = toDateStr(now);
  const yesterday = toDateStr(new Date(now.getTime() - 86400000));

  // If student practiced neither today nor yesterday, streak is 0
  if (dayStrings[0] !== today && dayStrings[0] !== yesterday) {
    return 0;
  }

  let streak = 0;
  const [year, month, day] = dayStrings[0].split('-').map(Number);
  let checkDate = new Date(year, month - 1, day);

  for (const dayStr of dayStrings) {
    const expectedStr = toDateStr(checkDate);
    if (dayStr === expectedStr) {
      streak += 1;
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Retrieves comprehensive Dashboard data for a student
 */
export async function getStudentDashboardData(userId: string): Promise<StudentDashboardData> {
  // Fetch user attempts
  let userAttempts: Attempt[] = [];
  let userAttemptQuestions: AttemptQuestion[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: attemptsData } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (attemptsData && attemptsData.length > 0) {
        userAttempts = attemptsData as Attempt[];
        const attemptIds = userAttempts.map((a) => a.id);
        const { data: aqData } = await supabase
          .from('attempt_questions')
          .select('*')
          .in('attempt_id', attemptIds);
        if (aqData) {
          userAttemptQuestions = aqData as AttemptQuestion[];
        }
      }
    } catch {
      // fallback
    }
  }

  if (userAttempts.length === 0) {
    userAttempts = localAttempts.filter((a) => a.user_id === userId);
    const attemptIds = new Set(userAttempts.map((a) => a.id));
    userAttemptQuestions = localAttemptQuestions.filter((aq) => attemptIds.has(aq.attempt_id));
  }

  // Calculate high-level stats
  const completedAttempts = userAttempts.filter((a) => a.status === 'completed');
  const totalTestsTaken = userAttempts.length;
  const totalQuestionsPracticed = completedAttempts.reduce(
    (acc, a) => acc + (a.answered_questions || 0),
    0
  );
  const totalCorrect = completedAttempts.reduce(
    (acc, a) => acc + (a.correct_answers || 0),
    0
  );
  const overallAccuracy =
    totalQuestionsPracticed > 0
      ? Math.round((totalCorrect / totalQuestionsPracticed) * 1000) / 10
      : 0;

  const totalStudyTimeSeconds = completedAttempts.reduce(
    (acc, a) => acc + (a.total_time_seconds || 0),
    0
  );

  const attemptDates = userAttempts.map((a) => new Date(a.created_at));
  const currentStreakDays = calculateStreak(attemptDates);

  // Group questions by Topic to find Weakest Topics
  const topicMap = new Map<
    string,
    {
      topicId: string;
      topicName: string;
      total: number;
      correct: number;
      wrong: number;
    }
  >();

  for (const aq of userAttemptQuestions) {
    const snap = aq.question_snapshot;
    if (!snap) continue;

    const topicId = snap.topic_id || 'unknown-topic';
    const topicName = snap.topic_name || 'General Concepts';

    const cur = topicMap.get(topicId) || {
      topicId,
      topicName,
      total: 0,
      correct: 0,
      wrong: 0,
    };

    if (aq.selected_option !== null) {
      cur.total += 1;
      if (aq.is_correct === true) {
        cur.correct += 1;
      } else {
        cur.wrong += 1;
      }
    }
    topicMap.set(topicId, cur);
  }

  // Resolve Subject and Exam names for topics
  const weakestTopics: TopicWeakness[] = Array.from(topicMap.values())
    .filter((t) => t.total >= 1)
    .map((t) => {
      const topicObj = MOCK_TOPICS.find((mt) => mt.id === t.topicId || mt.name === t.topicName);
      const subjectObj = topicObj ? MOCK_SUBJECTS.find((ms) => ms.id === topicObj.subject_id) : null;
      const examObj = subjectObj ? MOCK_EXAMS.find((me) => me.id === subjectObj.exam_id) : null;

      const accuracy = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;

      return {
        topicId: t.topicId,
        topicName: t.topicName,
        subjectName: subjectObj ? subjectObj.name : 'Computer Science',
        examName: examObj ? examObj.name : 'Bihar STET',
        totalQuestions: t.total,
        correctAnswers: t.correct,
        wrongAnswers: t.wrong,
        accuracy,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy); // Lowest accuracy first

  // Determine Daily Practice Recommendation
  let dailyRecommendation: DailyPracticeRecommendation;

  if (weakestTopics.length > 0 && weakestTopics[0].accuracy < 70) {
    const topWeak = weakestTopics[0];
    dailyRecommendation = {
      topicId: topWeak.topicId !== 'unknown-topic' ? topWeak.topicId : null,
      topicName: topWeak.topicName,
      examName: topWeak.examName,
      reason: `Accuracy is currently ${topWeak.accuracy}%. Practice high-yield questions to achieve 80%+ mastery!`,
      questionCount: 10,
      timerSeconds: 45,
    };
  } else {
    // Default foundational topic recommendation
    dailyRecommendation = {
      topicId: MOCK_TOPICS[0]?.id || null,
      topicName: MOCK_TOPICS[0]?.name || 'Operating Systems: CPU Scheduling & Process Sync',
      examName: 'Bihar STET / Competitive CBT',
      reason: 'High-frequency core syllabus topic for rapid speed & precision building.',
      questionCount: 10,
      timerSeconds: 30,
    };
  }

  // Map Recent Attempts
  const recentAttempts: RecentAttemptSummary[] = userAttempts.slice(0, 5).map((a) => {
    let title = 'Rapid Practice Session';
    let slug: string | null = null;
    let type: 'mock_test' | 'practice' = 'practice';

    if (a.test_id) {
      const matchedTest = MOCK_TESTS.find((t) => t.id === a.test_id);
      if (matchedTest) {
        title = matchedTest.title;
        slug = matchedTest.slug;
        type = matchedTest.test_type;
      } else {
        title = 'Competitive Mock Test';
        type = 'mock_test';
      }
    }

    // Estimate max score (e.g. total_questions * 1)
    const maxScore = a.total_questions * 1;

    return {
      id: a.id,
      testTitle: title,
      testSlug: slug,
      testType: type,
      status: a.status,
      score: a.score,
      maxScore,
      accuracy: a.accuracy,
      totalQuestions: a.total_questions,
      answeredQuestions: a.answered_questions,
      date: a.created_at,
    };
  });

  return {
    stats: {
      totalTestsTaken,
      totalQuestionsPracticed,
      overallAccuracy,
      totalStudyTimeSeconds,
      currentStreakDays,
    },
    weakestTopics,
    dailyRecommendation,
    recentAttempts,
  };
}

/**
 * Retrieves all mistakes (incorrect or skipped questions) made by student across past attempts
 */
export async function getStudentMistakes(
  userId: string,
  filters?: { examId?: string; subjectId?: string; topicId?: string; search?: string }
): Promise<MistakeQuestionItem[]> {
  // Fetch attempts and attempt_questions
  let attempts: Attempt[] = [];
  let attemptQuestions: AttemptQuestion[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: aData } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed');
      if (aData) attempts = aData as Attempt[];

      if (attempts.length > 0) {
        const attemptIds = attempts.map((a) => a.id);
        const { data: aqData } = await supabase
          .from('attempt_questions')
          .select('*')
          .in('attempt_id', attemptIds);
        if (aqData) attemptQuestions = aqData as AttemptQuestion[];
      }
    } catch {
      // fallback
    }
  }

  if (attempts.length === 0) {
    attempts = localAttempts.filter((a) => a.user_id === userId && a.status === 'completed');
    const attemptIds = new Set(attempts.map((a) => a.id));
    attemptQuestions = localAttemptQuestions.filter((aq) => attemptIds.has(aq.attempt_id));
  }

  // Filter only wrong or skipped questions
  const mistakeAQs = attemptQuestions.filter(
    (aq) => aq.is_correct === false || (aq.selected_option === null && aq.is_correct !== true)
  );

  // Group by question_id to deduplicate and aggregate frequency
  const grouped = new Map<
    string,
    {
      latestAQ: AttemptQuestion;
      timesAttempted: number;
      timesIncorrect: number;
    }
  >();

  for (const aq of mistakeAQs) {
    const qid = aq.question_id || aq.question_snapshot?.question_id || aq.id;
    const cur = grouped.get(qid) || {
      latestAQ: aq,
      timesAttempted: 0,
      timesIncorrect: 0,
    };

    cur.timesAttempted += 1;
    if (aq.is_correct === false) {
      cur.timesIncorrect += 1;
    }

    // Keep the latest timestamp
    if (new Date(aq.created_at) > new Date(cur.latestAQ.created_at)) {
      cur.latestAQ = aq;
    }
    grouped.set(qid, cur);
  }

  const results: MistakeQuestionItem[] = [];

  for (const [qid, item] of grouped.entries()) {
    const aq = item.latestAQ;
    const snap = aq.question_snapshot;
    if (!snap) continue;

    // Resolve taxonomy
    const topicObj = MOCK_TOPICS.find(
      (mt) => mt.id === snap.topic_id || mt.name === snap.topic_name
    );
    const subjectObj = topicObj ? MOCK_SUBJECTS.find((ms) => ms.id === topicObj.subject_id) : null;
    const examObj = subjectObj ? MOCK_EXAMS.find((me) => me.id === subjectObj.exam_id) : null;

    const examId = examObj?.id || '';
    const subjectId = subjectObj?.id || '';
    const topicId = topicObj?.id || snap.topic_id || '';

    // Apply filters
    if (filters?.examId && filters.examId !== 'all' && examId !== filters.examId) continue;
    if (filters?.subjectId && filters.subjectId !== 'all' && subjectId !== filters.subjectId) continue;
    if (filters?.topicId && filters.topicId !== 'all' && topicId !== filters.topicId) continue;
    if (
      filters?.search &&
      !snap.question_text.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      continue;
    }

    results.push({
      id: aq.id,
      questionId: qid,
      snapshot: snap,
      examName: examObj ? examObj.name : 'Bihar STET',
      subjectName: subjectObj ? subjectObj.name : 'Computer Science',
      topicName: snap.topic_name || (topicObj ? topicObj.name : 'General Concepts'),
      lastAnsweredAt: aq.created_at,
      lastSelectedOption: aq.selected_option,
      isSkipped: aq.selected_option === null,
      timesAttempted: item.timesAttempted,
      timesIncorrect: item.timesIncorrect,
    });
  }

  // Sort by latest mistake date desc
  return results.sort(
    (a, b) => new Date(b.lastAnsweredAt).getTime() - new Date(a.lastAnsweredAt).getTime()
  );
}

/**
 * Retrieves full question details for all bookmarked questions of a user
 */
export async function getStudentBookmarksWithDetails(
  userId: string,
  filters?: { examId?: string; subjectId?: string; topicId?: string; search?: string }
): Promise<BookmarkedQuestionItem[]> {
  let userBookmarks = localBookmarks.filter((b) => b.user_id === userId);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        userBookmarks = data;
      }
    } catch {
      // fallback
    }
  }

  const results: BookmarkedQuestionItem[] = [];

  for (const b of userBookmarks) {
    // Find matching question in mock bank or build from snapshot
    let question = MOCK_QUESTIONS.find((q) => q.id === b.question_id);

    if (!question) {
      // Look in attempt questions snapshots
      const foundAQ = localAttemptQuestions.find(
        (aq) => aq.question_id === b.question_id && aq.question_snapshot
      );
      if (foundAQ && foundAQ.question_snapshot) {
        const snap = foundAQ.question_snapshot;
        question = {
          id: b.question_id,
          exam_id: MOCK_EXAMS[0].id,
          subject_id: MOCK_SUBJECTS[0].id,
          topic_id: snap.topic_id || MOCK_TOPICS[0].id,
          question_text: snap.question_text,
          question_image_path: snap.question_image_path,
          question_type: 'single_select',
          options: snap.options,
          correct_option: snap.correct_option,
          explanation: snap.explanation,
          difficulty: snap.difficulty || 'medium',
          marks: snap.marks || 1,
          negative_marks: snap.negative_marks || 0.25,
          default_time_seconds: snap.time_seconds || null,
          source_name: null,
          source_year: null,
          status: 'published',
          created_by: null,
          created_at: b.created_at,
          updated_at: b.created_at,
        };
      }
    }

    if (!question) continue;

    // Resolve taxonomy
    const examObj = MOCK_EXAMS.find((e) => e.id === question?.exam_id);
    const subjectObj = MOCK_SUBJECTS.find((s) => s.id === question?.subject_id);
    const topicObj = MOCK_TOPICS.find((t) => t.id === question?.topic_id);

    // Apply filters
    if (filters?.examId && filters.examId !== 'all' && question.exam_id !== filters.examId) continue;
    if (filters?.subjectId && filters.subjectId !== 'all' && question.subject_id !== filters.subjectId) continue;
    if (filters?.topicId && filters.topicId !== 'all' && question.topic_id !== filters.topicId) continue;
    if (
      filters?.search &&
      !question.question_text.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      continue;
    }

    results.push({
      bookmarkId: b.id,
      questionId: b.question_id,
      question,
      examName: examObj ? examObj.name : 'Bihar STET',
      subjectName: subjectObj ? subjectObj.name : 'Computer Science',
      topicName: topicObj ? topicObj.name : 'General Concepts',
      bookmarkedAt: b.created_at,
    });
  }

  return results.sort(
    (a, b) => new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime()
  );
}

/**
 * Retrieves chronological test attempt history for a student
 */
export async function getStudentAttemptsHistory(
  userId: string,
  filters?: { testType?: 'mock_test' | 'practice'; status?: AttemptStatus; examId?: string; search?: string }
): Promise<AttemptHistoryItem[]> {
  let userAttempts: Attempt[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      let query = supabase.from('attempts').select('*').eq('user_id', userId);
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      const { data } = await query.order('created_at', { ascending: false });
      if (data && data.length > 0) {
        userAttempts = data as Attempt[];
      }
    } catch {
      // fallback
    }
  }

  if (userAttempts.length === 0) {
    userAttempts = localAttempts.filter((a) => {
      if (a.user_id !== userId) return false;
      if (filters?.status && a.status !== filters.status) return false;
      return true;
    });
  }

  const history: AttemptHistoryItem[] = [];

  for (const a of userAttempts) {
    let title = 'Rapid Practice Session';
    let slug: string | null = null;
    let type: 'mock_test' | 'practice' = 'practice';
    let examId: string | null = null;

    if (a.test_id) {
      const matchedTest = MOCK_TESTS.find((t) => t.id === a.test_id);
      if (matchedTest) {
        title = matchedTest.title;
        slug = matchedTest.slug;
        type = matchedTest.test_type;
        examId = matchedTest.exam_id;
      } else {
        title = 'Competitive Mock Test';
        type = 'mock_test';
      }
    }

    // Filter by testType if requested
    if (filters?.testType && filters.testType !== type) {
      continue;
    }

    // Filter by examId if requested
    if (filters?.examId && filters.examId !== 'all' && examId && examId !== filters.examId) {
      continue;
    }

    // Filter by search title
    if (filters?.search && !title.toLowerCase().includes(filters.search.toLowerCase())) {
      continue;
    }

    const maxScore = a.total_questions * 1;

    history.push({
      id: a.id,
      testTitle: title,
      testSlug: slug,
      testType: type,
      status: a.status,
      score: a.score,
      maxScore,
      accuracy: a.accuracy,
      totalQuestions: a.total_questions,
      answeredQuestions: a.answered_questions,
      correctAnswers: a.correct_answers,
      wrongAnswers: a.wrong_answers,
      totalTimeSeconds: a.total_time_seconds,
      createdAt: a.created_at,
      submittedAt: a.submitted_at,
    });
  }

  return history.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Spawns a practice session from a list of bookmarked question IDs
 */
export async function startBookmarksPracticeSession(
  userId: string,
  questionIds?: string[]
): Promise<AttemptWithDetails> {
  const bookmarks = await getStudentBookmarksWithDetails(userId);
  let targetQuestions = bookmarks.map((b) => b.question);

  if (questionIds && questionIds.length > 0) {
    const idSet = new Set(questionIds);
    targetQuestions = targetQuestions.filter((q) => idSet.has(q.id));
  }

  if (targetQuestions.length === 0) {
    throw new Error('No bookmarked questions available to practice');
  }

  const nowStr = new Date().toISOString();
  const attemptId = `practice-bookmarks-${Date.now()}`;

  const attempt: Attempt = {
    id: attemptId,
    user_id: userId,
    test_id: null,
    status: 'in_progress',
    started_at: nowStr,
    submitted_at: null,
    total_questions: targetQuestions.length,
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

  const attemptQuestions: AttemptQuestion[] = targetQuestions.map((q, idx) => {
    const topicObj = MOCK_TOPICS.find((t) => t.id === q.topic_id);
    const snapshot: QuestionSnapshot = {
      question_id: q.id,
      question_text: q.question_text,
      question_image_path: q.question_image_path,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation,
      marks: q.marks,
      negative_marks: q.negative_marks,
      difficulty: q.difficulty,
      topic_id: q.topic_id,
      topic_name: topicObj ? topicObj.name : null,
    };

    return {
      id: `aq-bookmark-${idx + 1}-${Date.now()}`,
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

  localAttempts.push(attempt);
  localAttemptQuestions.push(...attemptQuestions);

  return {
    ...attempt,
    test: null,
    questions: attemptQuestions,
    remaining_seconds: targetQuestions.length * 60,
    is_expired: false,
  };
}

/**
 * Spawns a practice session from a list of mistake questions
 */
export async function startMistakesHubPracticeSession(
  userId: string,
  questionIds?: string[]
): Promise<AttemptWithDetails> {
  const mistakes = await getStudentMistakes(userId);
  let targetMistakes = mistakes;

  if (questionIds && questionIds.length > 0) {
    const idSet = new Set(questionIds);
    targetMistakes = targetMistakes.filter((m) => idSet.has(m.questionId));
  }

  if (targetMistakes.length === 0) {
    throw new Error('No mistake questions available to practice');
  }

  const nowStr = new Date().toISOString();
  const attemptId = `practice-mistakes-${Date.now()}`;

  const attempt: Attempt = {
    id: attemptId,
    user_id: userId,
    test_id: null,
    status: 'in_progress',
    started_at: nowStr,
    submitted_at: null,
    total_questions: targetMistakes.length,
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

  const attemptQuestions: AttemptQuestion[] = targetMistakes.map((m, idx) => ({
    id: `aq-mistake-hub-${idx + 1}-${Date.now()}`,
    attempt_id: attemptId,
    question_id: m.questionId,
    question_order: idx + 1,
    question_snapshot: m.snapshot,
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

  localAttempts.push(attempt);
  localAttemptQuestions.push(...attemptQuestions);

  return {
    ...attempt,
    test: null,
    questions: attemptQuestions,
    remaining_seconds: targetMistakes.length * 60,
    is_expired: false,
  };
}
