-- ============================================================
-- QUIZORA DATABASE SCHEMA MIGRATION 01: INITIAL SCHEMA
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE question_type_enum AS ENUM ('single_select');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE test_type_enum AS ENUM ('practice', 'mock_test');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE attempt_status AS ENUM ('in_progress', 'completed', 'abandoned', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM (
    'incorrect_answer',
    'wrong_explanation',
    'duplicate_question',
    'formatting_issue',
    'image_problem',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT NULL,
  role user_role NOT NULL DEFAULT 'student',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. EXAMS TABLE
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subjects_exam_slug UNIQUE (exam_id, slug)
);

-- 5. TOPICS TABLE
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_topics_subject_slug UNIQUE (subject_id, slug)
);

-- 6. QUESTION OPTIONS VALIDATION FUNCTION
-- Enforces:
-- 1. options is a JSONB array
-- 2. Array length is exactly 4 or 5
-- 3. correct_option is between 1 and options.length
-- 4. Each option has at least one of non-empty text or non-empty image_path
CREATE OR REPLACE FUNCTION validate_question_options(options JSONB, correct_option INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  len INTEGER;
  i INTEGER;
  opt JSONB;
  has_text BOOLEAN;
  has_img BOOLEAN;
BEGIN
  IF jsonb_typeof(options) <> 'array' THEN
    RETURN FALSE;
  END IF;

  len := jsonb_array_length(options);
  IF len NOT IN (4, 5) THEN
    RETURN FALSE;
  END IF;

  IF correct_option < 1 OR correct_option > len THEN
    RETURN FALSE;
  END IF;

  FOR i IN 0..(len - 1) LOOP
    opt := options -> i;
    IF jsonb_typeof(opt) <> 'object' THEN
      RETURN FALSE;
    END IF;

    has_text := (opt ? 'text') AND (opt ->> 'text' IS NOT NULL) AND (trim(opt ->> 'text') <> '');
    has_img := (opt ? 'image_path') AND (opt ->> 'image_path' IS NOT NULL) AND (trim(opt ->> 'image_path') <> '');

    IF NOT (has_text OR has_img) THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. QUESTIONS TABLE
-- CRITICAL ARCHITECTURE RULE:
-- No separate question_options table.
-- No separate option_a...e columns.
-- Question is stored with question_text, question_image_path, options JSONB, correct_option INTEGER.
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  topic_id UUID NULL REFERENCES topics(id) ON DELETE SET NULL,
  question_type question_type_enum NOT NULL DEFAULT 'single_select',
  question_text TEXT NOT NULL,
  question_image_path TEXT NULL,
  options JSONB NOT NULL,
  correct_option INTEGER NOT NULL,
  explanation TEXT NULL,
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  default_time_seconds INTEGER NULL CHECK (default_time_seconds IS NULL OR default_time_seconds > 0),
  marks DECIMAL(6,2) NOT NULL DEFAULT 1.00 CHECK (marks > 0),
  negative_marks DECIMAL(6,2) NOT NULL DEFAULT 0.00 CHECK (negative_marks >= 0),
  source_name TEXT NULL,
  source_year INTEGER NULL CHECK (source_year IS NULL OR (source_year >= 1950 AND source_year <= 2100)),
  status content_status NOT NULL DEFAULT 'draft',
  created_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_question_options_valid CHECK (validate_question_options(options, correct_option))
);

-- 8. TESTS TABLE
CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NULL,
  test_type test_type_enum NOT NULL DEFAULT 'practice',
  duration_seconds INTEGER NULL CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  question_time_seconds INTEGER NULL CHECK (question_time_seconds IS NULL OR question_time_seconds > 0),
  marks_per_question DECIMAL(6,2) NOT NULL DEFAULT 1.00 CHECK (marks_per_question > 0),
  negative_marks DECIMAL(6,2) NOT NULL DEFAULT 0.00 CHECK (negative_marks >= 0),
  shuffle_questions BOOLEAN NOT NULL DEFAULT true,
  shuffle_options BOOLEAN NOT NULL DEFAULT false,
  show_result_immediately BOOLEAN NOT NULL DEFAULT true,
  show_explanations BOOLEAN NOT NULL DEFAULT true,
  total_questions INTEGER NOT NULL DEFAULT 0 CHECK (total_questions >= 0),
  status content_status NOT NULL DEFAULT 'draft',
  created_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. TEST_QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  question_order INTEGER NOT NULL CHECK (question_order >= 1),
  marks_override DECIMAL(6,2) NULL CHECK (marks_override IS NULL OR marks_override > 0),
  negative_marks_override DECIMAL(6,2) NULL CHECK (negative_marks_override IS NULL OR negative_marks_override >= 0),
  time_override_seconds INTEGER NULL CHECK (time_override_seconds IS NULL OR time_override_seconds > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_test_questions_test_question UNIQUE (test_id, question_id),
  CONSTRAINT uq_test_questions_test_order UNIQUE (test_id, question_order)
);

-- 10. ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_id UUID NULL REFERENCES tests(id) ON DELETE SET NULL,
  status attempt_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  answered_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  wrong_answers INTEGER NOT NULL DEFAULT 0,
  skipped_questions INTEGER NOT NULL DEFAULT 0,
  score DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  accuracy DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (accuracy >= 0 AND accuracy <= 100),
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. ATTEMPT_QUESTIONS TABLE (Historical Snapshot)
CREATE TABLE IF NOT EXISTS attempt_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id UUID NULL REFERENCES questions(id) ON DELETE SET NULL,
  question_order INTEGER NOT NULL CHECK (question_order >= 1),
  question_snapshot JSONB NOT NULL,
  selected_option INTEGER NULL CHECK (selected_option IS NULL OR (selected_option >= 1 AND selected_option <= 5)),
  is_answered BOOLEAN NOT NULL DEFAULT false,
  is_marked_for_review BOOLEAN NOT NULL DEFAULT false,
  is_correct BOOLEAN NULL,
  question_started_at TIMESTAMPTZ NULL,
  question_submitted_at TIMESTAMPTZ NULL,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  marks_awarded DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_attempt_questions_attempt_question UNIQUE (attempt_id, question_id),
  CONSTRAINT uq_attempt_questions_attempt_order UNIQUE (attempt_id, question_order)
);

-- 12. BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_bookmarks_user_question UNIQUE (user_id, question_id)
);

-- 13. QUESTION_REPORTS TABLE
CREATE TABLE IF NOT EXISTS question_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  reason report_reason NOT NULL,
  description TEXT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

CREATE INDEX IF NOT EXISTS idx_tests_exam_id ON tests(exam_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);

CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_id ON test_questions(question_id);

CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON attempts(status);
CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON attempts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attempt_questions_attempt_id ON attempt_questions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_questions_question_id ON attempt_questions(question_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_question_id ON bookmarks(question_id);

CREATE INDEX IF NOT EXISTS idx_question_reports_status ON question_reports(status);
CREATE INDEX IF NOT EXISTS idx_question_reports_question_id ON question_reports(question_id);
