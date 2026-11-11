import { Question, Topic, Subject } from '@/types/database';

export interface TopicAvailability {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  totalCount: number;
}

export interface ExamTaxonomyStats {
  examId: string;
  totalQuestions: number;
  totalEasy: number;
  totalMedium: number;
  totalHard: number;
  topics: TopicAvailability[];
}

export interface TopicRule {
  topicId: string;
  count: number;
  difficultyBreakdown?: {
    easy?: number;
    medium?: number;
    hard?: number;
  };
}

export interface SmartValidationResult {
  isValid: boolean;
  totalRequested: number;
  totalAvailable: number;
  topicErrors: {
    topicId: string;
    topicName: string;
    requested: number;
    available: number;
    message: string;
  }[];
  difficultyWarnings: string[];
}

/**
 * Fisher-Yates array shuffle helper
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Checks whether a question belongs to a specific exam.
 * Supports both single exam_id and multi-exam association (exam_ids).
 */
export function questionBelongsToExam(q: Question, examId: string): boolean {
  if (q.exam_id === examId) return true;
  if (Array.isArray(q.exam_ids) && q.exam_ids.includes(examId)) return true;
  return false;
}

/**
 * Computes availability statistics for an exam across all its topics and difficulties.
 */
export function computeExamTaxonomyStats(
  examId: string,
  allQuestions: Question[],
  allTopics: Topic[],
  allSubjects: Subject[]
): ExamTaxonomyStats {
  const examQuestions = allQuestions.filter(
    (q) => questionBelongsToExam(q, examId) && q.status !== 'archived'
  );

  let totalEasy = 0;
  let totalMedium = 0;
  let totalHard = 0;

  const topicMap = new Map<string, { easy: number; medium: number; hard: number; total: number }>();

  for (const q of examQuestions) {
    if (q.difficulty === 'easy') totalEasy++;
    else if (q.difficulty === 'hard') totalHard++;
    else totalMedium++;

    if (q.topic_id) {
      let stats = topicMap.get(q.topic_id);
      if (!stats) {
        stats = { easy: 0, medium: 0, hard: 0, total: 0 };
        topicMap.set(q.topic_id, stats);
      }
      stats.total++;
      if (q.difficulty === 'easy') stats.easy++;
      else if (q.difficulty === 'hard') stats.hard++;
      else stats.medium++;
    }
  }

  // Build subject lookup
  const subjectNameMap = new Map<string, string>();
  for (const s of allSubjects) {
    subjectNameMap.set(s.id, s.name);
  }

  // Create topic entries for all topics that have questions or belong to subjects for this exam
  const topicAvailabilities: TopicAvailability[] = [];

  for (const t of allTopics) {
    const stats = topicMap.get(t.id) || { easy: 0, medium: 0, hard: 0, total: 0 };
    // Include topics that either have questions or belong to this exam's subjects
    const subName = subjectNameMap.get(t.subject_id) || 'General';

    topicAvailabilities.push({
      topicId: t.id,
      topicName: t.name,
      subjectId: t.subject_id,
      subjectName: subName,
      easyCount: stats.easy,
      mediumCount: stats.medium,
      hardCount: stats.hard,
      totalCount: stats.total,
    });
  }

  // Sort by Subject Name, then Topic Name
  topicAvailabilities.sort((a, b) => {
    const subCmp = a.subjectName.localeCompare(b.subjectName);
    if (subCmp !== 0) return subCmp;
    return a.topicName.localeCompare(b.topicName);
  });

  return {
    examId,
    totalQuestions: examQuestions.length,
    totalEasy,
    totalMedium,
    totalHard,
    topics: topicAvailabilities,
  };
}

/**
 * Validates requested question quotas against question availability in real time.
 */
export function validateSmartTestQuotas(
  examStats: ExamTaxonomyStats,
  topicRules: TopicRule[]
): SmartValidationResult {
  const topicErrors: SmartValidationResult['topicErrors'] = [];
  const difficultyWarnings: string[] = [];
  let totalRequested = 0;

  const topicLookup = new Map<string, TopicAvailability>();
  for (const t of examStats.topics) {
    topicLookup.set(t.topicId, t);
  }

  for (const rule of topicRules) {
    if (rule.count <= 0) continue;
    totalRequested += rule.count;

    const topicStat = topicLookup.get(rule.topicId);
    const topicName = topicStat?.topicName || rule.topicId;
    const available = topicStat?.totalCount || 0;

    if (rule.count > available) {
      topicErrors.push({
        topicId: rule.topicId,
        topicName,
        requested: rule.count,
        available,
        message: `Topic "${topicName}" requests ${rule.count} questions, but only ${available} exist in question bank.`,
      });
    }

    // Check specific difficulty breakdown if specified
    if (rule.difficultyBreakdown && topicStat) {
      const { easy = 0, medium = 0, hard = 0 } = rule.difficultyBreakdown;
      const sum = easy + medium + hard;
      if (sum !== rule.count) {
        topicErrors.push({
          topicId: rule.topicId,
          topicName,
          requested: rule.count,
          available,
          message: `Difficulty breakdown sum (${sum}) must equal requested count (${rule.count}) for "${topicName}".`,
        });
      }

      if (easy > topicStat.easyCount) {
        difficultyWarnings.push(
          `"${topicName}": Requested ${easy} Easy questions, only ${topicStat.easyCount} available.`
        );
      }
      if (medium > topicStat.mediumCount) {
        difficultyWarnings.push(
          `"${topicName}": Requested ${medium} Medium questions, only ${topicStat.mediumCount} available.`
        );
      }
      if (hard > topicStat.hardCount) {
        difficultyWarnings.push(
          `"${topicName}": Requested ${hard} Hard questions, only ${topicStat.hardCount} available.`
        );
      }
    }
  }

  return {
    isValid: topicErrors.length === 0,
    totalRequested,
    totalAvailable: examStats.totalQuestions,
    topicErrors,
    difficultyWarnings,
  };
}

/**
 * Automatically selects questions based on topic quotas and difficulty targets.
 * Guarantees zero duplicate questions and exact quota fulfillment when available.
 */
export function generateSmartQuestions(
  examId: string,
  topicRules: TopicRule[],
  allQuestions: Question[],
  overallDifficultyTarget?: {
    easyPercent: number;
    mediumPercent: number;
    hardPercent: number;
  }
): {
  questions: Question[];
  stats: {
    totalQuestions: number;
    easyCount: number;
    mediumCount: number;
    hardCount: number;
    topicDistribution: { topicId: string; topicName: string; count: number }[];
  };
} {
  const examPool = allQuestions.filter(
    (q) => questionBelongsToExam(q, examId) && q.status !== 'archived'
  );

  const selectedQuestions: Question[] = [];
  const selectedIds = new Set<string>();

  for (const rule of topicRules) {
    if (rule.count <= 0) continue;

    // Get candidate questions for this topic
    const topicCandidates = examPool.filter(
      (q) => q.topic_id === rule.topicId && !selectedIds.has(q.id)
    );

    const easyCandidates = shuffleArray(topicCandidates.filter((q) => q.difficulty === 'easy'));
    const mediumCandidates = shuffleArray(topicCandidates.filter((q) => q.difficulty === 'medium'));
    const hardCandidates = shuffleArray(topicCandidates.filter((q) => q.difficulty === 'hard'));

    const topicPicked: Question[] = [];

    if (rule.difficultyBreakdown) {
      // Pick explicit difficulty breakdown
      const reqEasy = rule.difficultyBreakdown.easy || 0;
      const reqMedium = rule.difficultyBreakdown.medium || 0;
      const reqHard = rule.difficultyBreakdown.hard || 0;

      const pickedEasy = easyCandidates.slice(0, reqEasy);
      const pickedMedium = mediumCandidates.slice(0, reqMedium);
      const pickedHard = hardCandidates.slice(0, reqHard);

      topicPicked.push(...pickedEasy, ...pickedMedium, ...pickedHard);

      // If any difficulty was short, backfill from remaining topic candidates
      if (topicPicked.length < rule.count) {
        const remainingTopicCandidates = topicCandidates.filter(
          (q) => !topicPicked.some((p) => p.id === q.id)
        );
        const backfill = shuffleArray(remainingTopicCandidates).slice(
          0,
          rule.count - topicPicked.length
        );
        topicPicked.push(...backfill);
      }
    } else if (overallDifficultyTarget) {
      // Apply overall difficulty target ratio to this topic's quota
      const { easyPercent, mediumPercent, hardPercent } = overallDifficultyTarget;
      const totalP = easyPercent + mediumPercent + hardPercent || 100;
      let targetEasy = Math.round((easyPercent / totalP) * rule.count);
      let targetHard = Math.round((hardPercent / totalP) * rule.count);
      let targetMedium = rule.count - targetEasy - targetHard;
      if (targetMedium < 0) {
        targetMedium = 0;
        targetEasy = rule.count - targetHard;
      }

      const pickedEasy = easyCandidates.slice(0, targetEasy);
      const pickedMedium = mediumCandidates.slice(0, targetMedium);
      const pickedHard = hardCandidates.slice(0, targetHard);

      topicPicked.push(...pickedEasy, ...pickedMedium, ...pickedHard);

      // Backfill from remaining if exact difficulty counts were unavailable
      if (topicPicked.length < rule.count) {
        const remaining = topicCandidates.filter((q) => !topicPicked.some((p) => p.id === q.id));
        const backfill = shuffleArray(remaining).slice(0, rule.count - topicPicked.length);
        topicPicked.push(...backfill);
      }
    } else {
      // Balanced default: pick evenly across difficulties
      const pool = shuffleArray(topicCandidates);
      topicPicked.push(...pool.slice(0, rule.count));
    }

    // Register picked questions
    for (const q of topicPicked) {
      selectedIds.add(q.id);
      selectedQuestions.push(q);
    }
  }

  // Calculate resulting metrics
  let easyCount = 0;
  let mediumCount = 0;
  let hardCount = 0;
  const topicCountMap = new Map<string, { topicName: string; count: number }>();

  for (const q of selectedQuestions) {
    if (q.difficulty === 'easy') easyCount++;
    else if (q.difficulty === 'hard') hardCount++;
    else mediumCount++;

    const tid = q.topic_id || 'unknown';
    const entry = topicCountMap.get(tid) || {
      topicName: q.topic_name || tid,
      count: 0,
    };
    entry.count++;
    topicCountMap.set(tid, entry);
  }

  const topicDistribution = Array.from(topicCountMap.entries()).map(([topicId, val]) => ({
    topicId,
    topicName: val.topicName,
    count: val.count,
  }));

  return {
    questions: selectedQuestions,
    stats: {
      totalQuestions: selectedQuestions.length,
      easyCount,
      mediumCount,
      hardCount,
      topicDistribution,
    },
  };
}

/**
 * Finds replacement candidates for a question, prioritizing same topic and difficulty.
 */
export function getReplacementCandidates(
  examId: string,
  currentQuestionId: string,
  topicId: string | null | undefined,
  difficulty: string | undefined,
  currentSelectedIds: string[],
  allQuestions: Question[]
): Question[] {
  const selectedSet = new Set(currentSelectedIds);
  selectedSet.delete(currentQuestionId); // Current question can be replaced

  const candidates = allQuestions.filter((q) => {
    if (q.id === currentQuestionId) return false;
    if (selectedSet.has(q.id)) return false;
    if (!questionBelongsToExam(q, examId)) return false;
    if (q.status === 'archived') return false;
    if (topicId && q.topic_id !== topicId) return false;
    return true;
  });

  // Sort candidates so that same difficulty appears first
  if (difficulty) {
    candidates.sort((a, b) => {
      if (a.difficulty === difficulty && b.difficulty !== difficulty) return -1;
      if (b.difficulty === difficulty && a.difficulty !== difficulty) return 1;
      return 0;
    });
  }

  return candidates;
}
