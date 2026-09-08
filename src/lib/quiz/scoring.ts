import { QuestionSnapshot } from '@/types/database';

export interface ScoredQuestionResult {
  question_id?: string;
  selected_option: number | null;
  correct_option: number;
  is_answered: boolean;
  is_correct: boolean;
  marks_awarded: number;
  time_spent_seconds: number;
}

export interface AttemptScoreSummary {
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_questions: number;
  score: number;
  accuracy: number;
  total_time_seconds: number;
  question_results: ScoredQuestionResult[];
}

/**
 * Server-authoritative score calculation.
 * Evaluates student selected options against immutable QuestionSnapshots.
 * Score = sum(marks for correct) - sum(negative_marks for wrong)
 * Accuracy = (correct / answered) * 100
 */
export function calculateAttemptScore(
  questionsWithAnswers: {
    question_snapshot: QuestionSnapshot;
    selected_option: number | null;
    time_spent_seconds: number;
  }[]
): AttemptScoreSummary {
  const totalQuestions = questionsWithAnswers.length;
  let answeredQuestions = 0;

  let correctAnswers = 0;
  let wrongAnswers = 0;
  let skippedQuestions = 0;
  let rawScore = 0;
  let totalTime = 0;

  const questionResults: ScoredQuestionResult[] = [];

  for (const item of questionsWithAnswers) {
    const { question_snapshot, selected_option, time_spent_seconds } = item;
    totalTime += time_spent_seconds || 0;

    const correctOption = question_snapshot.correct_option;
    const marks = Number(question_snapshot.marks) || 1.0;
    const negativeMarks = Number(question_snapshot.negative_marks) || 0.0;

    if (selected_option === null || selected_option === undefined || selected_option === 0) {
      // Skipped question
      skippedQuestions++;
      questionResults.push({
        question_id: question_snapshot.question_id,
        selected_option: null,
        correct_option: correctOption,
        is_answered: false,
        is_correct: false,
        marks_awarded: 0,
        time_spent_seconds,
      });
    } else {
      answeredQuestions++;
      const isCorrect = Number(selected_option) === Number(correctOption);

      if (isCorrect) {
        correctAnswers++;
        rawScore += marks;
        questionResults.push({
          question_id: question_snapshot.question_id,
          selected_option,
          correct_option: correctOption,
          is_answered: true,
          is_correct: true,
          marks_awarded: marks,
          time_spent_seconds,
        });
      } else {
        wrongAnswers++;
        rawScore -= negativeMarks;
        questionResults.push({
          question_id: question_snapshot.question_id,
          selected_option,
          correct_option: correctOption,
          is_answered: true,
          is_correct: false,
          marks_awarded: -negativeMarks,
          time_spent_seconds,
        });
      }
    }
  }

  // Accuracy calculation: correct / answered * 100
  const accuracy =
    answeredQuestions > 0
      ? Number(((correctAnswers / answeredQuestions) * 100).toFixed(2))
      : 0.0;

  // Round final score to 2 decimal places
  const finalScore = Number(rawScore.toFixed(2));

  return {
    total_questions: totalQuestions,
    answered_questions: answeredQuestions,
    correct_answers: correctAnswers,
    wrong_answers: wrongAnswers,
    skipped_questions: skippedQuestions,
    score: finalScore,
    accuracy,
    total_time_seconds: totalTime,
    question_results: questionResults,
  };
}
