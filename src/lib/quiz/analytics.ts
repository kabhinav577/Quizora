import { AttemptWithDetails } from '@/types/quiz';
import { MOCK_TOPICS } from '@/services/mockData';

export interface PerformanceBand {
  title: string;
  badgeColor: string;
  description: string;
  cutoffProbability: string;
}

export interface TopicPerformance {
  topic_id: string;
  topic_name: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  score: number;
}

export interface DifficultyPerformance {
  difficulty: 'easy' | 'medium' | 'hard';
  label: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
}

export interface PacingSummary {
  fastAndCorrect: number; // Answered in <= 30s & correct
  fastAndWrong: number;   // Answered in <= 30s & wrong (Careless errors!)
  slowAndCorrect: number; // Answered in > 60s & correct
  slowAndWrong: number;   // Answered in > 60s & wrong (Time traps!)
}

export interface ScorecardAnalytics {
  maxScore: number;
  averageTimeSeconds: number;
  performanceBand: PerformanceBand;
  topicBreakdown: TopicPerformance[];
  difficultyBreakdown: DifficultyPerformance[];
  pacing: PacingSummary;
  mistakesCount: number;
  mistakeQuestionIds: string[];
}

export function computeScorecardAnalytics(attempt: AttemptWithDetails): ScorecardAnalytics {
  const questions = attempt.questions;
  let maxScore = 0;
  const mistakeQuestionIds: string[] = [];

  const topicMap: Record<
    string,
    {
      topic_id: string;
      topic_name: string;
      total: number;
      correct: number;
      wrong: number;
      skipped: number;
      score: number;
    }
  > = {};

  const diffMap: Record<
    'easy' | 'medium' | 'hard',
    { total: number; correct: number; wrong: number; skipped: number }
  > = {
    easy: { total: 0, correct: 0, wrong: 0, skipped: 0 },
    medium: { total: 0, correct: 0, wrong: 0, skipped: 0 },
    hard: { total: 0, correct: 0, wrong: 0, skipped: 0 },
  };

  const pacing: PacingSummary = {
    fastAndCorrect: 0,
    fastAndWrong: 0,
    slowAndCorrect: 0,
    slowAndWrong: 0,
  };

  for (const q of questions) {
    const marks = Number(q.question_snapshot.marks) || 1.0;
    maxScore += marks;

    const isAnswered = q.selected_option !== null && q.selected_option > 0;
    const isCorrect = q.is_correct === true;
    const isWrong = isAnswered && !isCorrect;


    const qid = q.question_id || q.id;
    if (!isCorrect) {
      mistakeQuestionIds.push(qid);
    }

    // Topic aggregation
    const topicId = q.question_snapshot.topic_id || 'general';
    const foundTopic = MOCK_TOPICS.find((t) => t.id === topicId);
    const topicName = q.question_snapshot.topic_name || foundTopic?.name || 'General Computer Science';

    if (!topicMap[topicId]) {
      topicMap[topicId] = {
        topic_id: topicId,
        topic_name: topicName,
        total: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        score: 0,
      };
    }

    topicMap[topicId].total += 1;
    if (isCorrect) {
      topicMap[topicId].correct += 1;
      topicMap[topicId].score += marks;
    } else if (isWrong) {
      topicMap[topicId].wrong += 1;
      topicMap[topicId].score -= Number(q.question_snapshot.negative_marks) || 0;
    } else {
      topicMap[topicId].skipped += 1;
    }

    // Difficulty aggregation
    const diff = (q.question_snapshot.difficulty as 'easy' | 'medium' | 'hard') || 'medium';
    if (diffMap[diff]) {
      diffMap[diff].total += 1;
      if (isCorrect) diffMap[diff].correct += 1;
      else if (isWrong) diffMap[diff].wrong += 1;
      else diffMap[diff].skipped += 1;
    }

    // Pacing aggregation
    const timeSpent = q.time_spent_seconds || 0;
    if (timeSpent <= 30) {
      if (isCorrect) pacing.fastAndCorrect += 1;
      else if (isWrong) pacing.fastAndWrong += 1;
    } else if (timeSpent > 60) {
      if (isCorrect) pacing.slowAndCorrect += 1;
      else if (isWrong) pacing.slowAndWrong += 1;
    }
  }

  // Topic breakdown list
  const topicBreakdown: TopicPerformance[] = Object.values(topicMap).map((t) => ({
    ...t,
    score: Number(t.score.toFixed(2)),
    accuracy: t.correct + t.wrong > 0 ? Number(((t.correct / (t.correct + t.wrong)) * 100).toFixed(1)) : 0,
  }));

  // Difficulty breakdown list
  const difficultyBreakdown: DifficultyPerformance[] = (['easy', 'medium', 'hard'] as const).map((d) => {
    const data = diffMap[d];
    const attempted = data.correct + data.wrong;
    return {
      difficulty: d,
      label: d.charAt(0).toUpperCase() + d.slice(1),
      total: data.total,
      correct: data.correct,
      wrong: data.wrong,
      skipped: data.skipped,
      accuracy: attempted > 0 ? Number(((data.correct / attempted) * 100).toFixed(1)) : 0,
    };
  });

  const averageTimeSeconds =
    questions.length > 0 ? Math.round(attempt.total_time_seconds / questions.length) : 0;

  // Calculate Performance Band
  const scorePercent = maxScore > 0 ? (attempt.score / maxScore) * 100 : 0;
  let performanceBand: PerformanceBand;

  if (scorePercent >= 85) {
    performanceBand = {
      title: 'Outstanding Performance',
      badgeColor: 'bg-emerald-500 text-white',
      description: 'Exceptional mastery across concepts. High selection probability for top ranks.',
      cutoffProbability: 'Very High (95%+)',
    };
  } else if (scorePercent >= 70) {
    performanceBand = {
      title: 'Good / Competitive',
      badgeColor: 'bg-indigo-500 text-white',
      description: 'Solid performance within competitive clearing range. Minor revision of weak topics recommended.',
      cutoffProbability: 'High (80%+)',
    };
  } else if (scorePercent >= 50) {
    performanceBand = {
      title: 'Moderate / Developing',
      badgeColor: 'bg-amber-500 text-white',
      description: 'Above average foundation. Eliminate negative marking penalties and focus on high-yield topics.',
      cutoffProbability: 'Borderline (50-60%)',
    };
  } else {
    performanceBand = {
      title: 'Needs Focused Revision',
      badgeColor: 'bg-rose-500 text-white',
      description: 'Significant scope for score growth. Re-attempt incorrect questions to reinforce fundamental concepts.',
      cutoffProbability: 'Low (< 40%)',
    };
  }

  return {
    maxScore: Number(maxScore.toFixed(2)),
    averageTimeSeconds,
    performanceBand,
    topicBreakdown,
    difficultyBreakdown,
    pacing,
    mistakesCount: mistakeQuestionIds.length,
    mistakeQuestionIds,
  };
}
