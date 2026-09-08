// ============================================================
// QUIZORA DATABASE & DOMAIN TYPES
// ============================================================

export type UserRole = 'student' | 'admin';
export type QuestionType = 'single_select';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type TestType = 'practice' | 'mock_test';
export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned' | 'expired';
export type ReportReason =
  | 'incorrect_answer'
  | 'wrong_explanation'
  | 'duplicate_question'
  | 'formatting_issue'
  | 'image_problem'
  | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'rejected';

/**
 * Single Answer Option inside the JSONB array.
 * Rule: At least one of text or image_path must be non-null and non-empty.
 */
export interface QuestionOption {
  text: string | null;
  image_path: string | null;
}

/**
 * Question options array: exactly 4 or 5 options.
 */
export type QuestionOptions =
  | [QuestionOption, QuestionOption, QuestionOption, QuestionOption]
  | [QuestionOption, QuestionOption, QuestionOption, QuestionOption, QuestionOption];

/**
 * 1-based index pointing to the correct option in options array:
 * 1 = A, 2 = B, 3 = C, 4 = D, 5 = E (if 5 options exist)
 */
export type CorrectOption = 1 | 2 | 3 | 4 | 5;

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  exam_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Questions Table Record
 * CRITICAL ARCHITECTURE RULE:
 * - Single row holds the complete question.
 * - question_text: complete text.
 * - question_image_path: storage path or null.
 * - options: JSONB array of 4 or 5 options.
 * - correct_option: 1-5 integer.
 * - NO separate question_options table.
 */
export interface Question {
  id: string;
  exam_id: string;
  subject_id: string;
  topic_id: string | null;
  question_type: QuestionType;
  question_text: string;
  question_image_path: string | null;
  options: QuestionOptions;
  correct_option: CorrectOption;
  explanation: string | null;
  difficulty: DifficultyLevel;
  default_time_seconds: number | null;
  marks: number;
  negative_marks: number;
  source_name: string | null;
  source_year: number | null;
  status: ContentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Test {
  id: string;
  exam_id: string;
  title: string;
  slug: string;
  description: string | null;
  test_type: TestType;
  duration_seconds: number | null;
  question_time_seconds: number | null;
  marks_per_question: number;
  negative_marks: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_result_immediately: boolean;
  show_explanations: boolean;
  total_questions: number;
  status: ContentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestQuestion {
  id: string;
  test_id: string;
  question_id: string;
  question_order: number;
  marks_override: number | null;
  negative_marks_override: number | null;
  time_override_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface Attempt {
  id: string;
  user_id: string;
  test_id: string | null;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_questions: number;
  score: number;
  accuracy: number;
  total_time_seconds: number;
  created_at: string;
  updated_at: string;
}

/**
 * Historical Question Snapshot saved inside attempt_questions.
 * Even if the question or images are edited later, this snapshot remains immutable.
 */
export interface QuestionSnapshot {
  question_id?: string;
  question_text: string;
  question_image_path: string | null;
  options: QuestionOptions;
  correct_option: CorrectOption;
  explanation: string | null;
  marks: number;
  negative_marks: number;
  time_seconds?: number | null;
}

export interface AttemptQuestion {
  id: string;
  attempt_id: string;
  question_id: string | null;
  question_order: number;
  question_snapshot: QuestionSnapshot;
  selected_option: number | null;
  is_answered: boolean;
  is_marked_for_review: boolean;
  is_correct: boolean | null;
  question_started_at: string | null;
  question_submitted_at: string | null;
  time_spent_seconds: number;
  marks_awarded: number;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  question_id: string;
  created_at: string;
}

export interface QuestionReport {
  id: string;
  user_id: string;
  question_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}
