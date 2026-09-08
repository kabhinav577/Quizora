import { Attempt, AttemptQuestion, Test } from './database';


export interface AttemptWithDetails extends Attempt {
  test: Test | null;
  questions: AttemptQuestion[];
  remaining_seconds: number | null;
  is_expired: boolean;
}

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
