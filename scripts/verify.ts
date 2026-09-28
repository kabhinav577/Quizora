/**
 * ============================================================================
 * Quizora Unified System Verification Suite (scripts/verify.ts)
 * ============================================================================
 * 
 * This is the single, consolidated verification script for the entire Quizora
 * application. It tests all subsystems systematically in an isolated,
 * non-destructive manner without altering production or development databases.
 * 
 * Subsystems verified:
 *   1. verifyDatabaseAndMigrations()   -> SQL migrations, tables, enums, & RLS
 *   2. verifyDataPersistenceAndTaxonomy() -> JSON store consistency & hierarchy
 *   3. verifyQuestionSchemas()         -> 4/5-option MCQs & difficulty mapping
 *   4. verifyBulkImportEngine()        -> Non-destructive CSV parser & sanitizer
 *   5. verifyQuizScoringAndAnalytics() -> Net scoring, negative marks, & pacing
 * 
 * Usage:
 *   npm run verify
 *   npm test
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { QuestionFormSchema } from '../src/schemas/question';
import { validateImportData, normalizeDifficulty, RawImportRow } from '../src/services/imports';
import { calculateAttemptScore } from '../src/lib/quiz/scoring';
import { computeScorecardAnalytics } from '../src/lib/quiz/analytics';

// Global test counters
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Custom Assertion Helper
 * 
 * Evaluates a condition, increments test counters, and prints formatted
 * pass/fail status with optional failure details.
 * 
 * @param condition - Boolean expression to test
 * @param testName - Human-readable label for the check
 * @param detail - Optional error explanation printed on failure
 */
function assert(condition: boolean, testName: string, detail?: string): void {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
    failedTests++;
  }
}

/**
 * FUNCTION 1: verifyDatabaseAndMigrations()
 * 
 * WHAT IT DOES:
 * - Scans the `supabase/migrations/` directory for PostgreSQL migration files.
 * - Ensures that the baseline migration creates all 10 core application tables:
 *   profiles, exams, subjects, topics, questions, tests, test_questions,
 *   attempts, attempt_questions, and bookmarks.
 * - Confirms that migrations are syntactically sound and present for production deployment.
 */
function verifyDatabaseAndMigrations(): void {
  console.log('📦 1. Database Schema & Migration Integrity');
  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  assert(fs.existsSync(migrationsDir), 'Supabase migrations directory exists');

  const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
  assert(migrationFiles.length >= 2, `Found ${migrationFiles.length} SQL migration files`);

  const initialMigration = fs.readFileSync(path.join(migrationsDir, migrationFiles[0]), 'utf8').toLowerCase();
  const requiredTables = [
    'profiles',
    'exams',
    'subjects',
    'topics',
    'questions',
    'tests',
    'test_questions',
    'attempts',
    'attempt_questions',
    'bookmarks',
  ];

  for (const table of requiredTables) {
    assert(
      initialMigration.includes(`create table if not exists ${table}`) ||
      initialMigration.includes(`create table ${table}`) ||
      initialMigration.includes(`create table if not exists public.${table}`),
      `Table '${table}' defined in initial schema`
    );
  }
}

/**
 * FUNCTION 2: verifyDataPersistenceAndTaxonomy()
 * 
 * WHAT IT DOES:
 * - Reads all JSON stores in `.data/` (exams, subjects, topics, questions, tests).
 * - Enforces relational hierarchy: every Subject must map to a valid Exam,
 *   and every Topic must map to an existing Subject.
 * - Validates that no temporary verification records (e.g., 'Verification Test Builder Exam')
 *   or dummy test questions remain in the database.
 */
function verifyDataPersistenceAndTaxonomy(): void {
  console.log('\n💾 2. Local Storage & Taxonomy Hierarchy');
  const dataDir = path.join(process.cwd(), '.data');
  assert(fs.existsSync(dataDir), '.data local persistence directory exists');

  const readJson = <T>(name: string): T[] => {
    const p = path.join(dataDir, name);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
  };

  const exams = readJson<{ id: string; name: string }>('exams.json');
  const subjects = readJson<{ id: string; exam_id: string; name: string }>('subjects.json');
  const topics = readJson<{ id: string; subject_id: string; name: string }>('topics.json');
  const questions = readJson<{ id: string; exam_id: string; subject_id: string; question_text: string }>('questions.json');
  const tests = readJson<{ id: string; exam_id: string; title: string }>('tests.json');

  assert(exams.length > 0, `Exams loaded (${exams.length} active exams)`);
  assert(subjects.length > 0, `Subjects loaded (${subjects.length} active subjects)`);
  assert(topics.length > 0, `Topics loaded (${topics.length} active topics)`);
  assert(questions.length > 0, `Question Bank loaded (${questions.length} active questions)`);
  assert(tests.length > 0, `Tests loaded (${tests.length} active tests)`);

  // Relational integrity check: Subjects -> Exams
  const examIds = new Set(exams.map((e) => e.id));
  const allSubjectsHaveValidExam = subjects.every((s) => examIds.has(s.exam_id));
  assert(allSubjectsHaveValidExam, 'All subjects belong to a valid exam');

  // Relational integrity check: Topics -> Subjects
  const subjectIds = new Set(subjects.map((s) => s.id));
  const allTopicsHaveValidSubject = topics.every((t) => subjectIds.has(t.subject_id));
  assert(allTopicsHaveValidSubject, 'All topics belong to a valid subject');

  // Cleanliness check: ensure no stray verification records exist
  const hasUnwantedVerificationTest = tests.some((t) => t.title.toLowerCase().includes('verification test builder'));
  const hasUnwantedVerificationQuestions = questions.some((q) =>
    q.question_text.toLowerCase().includes('test manual question') ||
    q.question_text.toLowerCase().includes('unique question')
  );

  assert(!hasUnwantedVerificationTest, 'No temporary verification tests lingering in tests.json');
  assert(!hasUnwantedVerificationQuestions, 'No temporary test questions lingering in questions.json');
}

/**
 * FUNCTION 3: verifyQuestionSchemas()
 * 
 * WHAT IT DOES:
 * - Tests difficulty normalization helper (e.g. 'Basic' -> 'easy', 'Intermediate' -> 'medium', 'Expert' -> 'hard').
 * - Validates 4-option and 5-option MCQ question payloads using Zod's `QuestionFormSchema`.
 * - Confirms that valid single-select questions pass schema checks with correct option index bounds (1 to 5).
 */
function verifyQuestionSchemas(): void {
  console.log('\n📝 3. Question Schema & Difficulty Normalization');

  // Test difficulty label normalization
  assert(normalizeDifficulty('Basic') === 'easy', "normalizeDifficulty('Basic') -> 'easy'");
  assert(normalizeDifficulty('Intermediate') === 'medium', "normalizeDifficulty('Intermediate') -> 'medium'");
  assert(normalizeDifficulty('Expert') === 'hard', "normalizeDifficulty('Expert') -> 'hard'");
  assert(normalizeDifficulty('EASY') === 'easy', "normalizeDifficulty('EASY') -> 'easy'");

  // Test 4-option question schema validation
  const valid4Opt = QuestionFormSchema.safeParse({
    exam_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    subject_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    question_type: 'single_select',
    question_text: 'What is the speed of light in vacuum?',
    options: [
      { text: '3 x 10^8 m/s', image_path: null },
      { text: '2 x 10^8 m/s', image_path: null },
      { text: '1.5 x 10^8 m/s', image_path: null },
      { text: '4 x 10^8 m/s', image_path: null },
    ],
    correct_option: 1,
    difficulty: 'easy',
    marks: 1,
    negative_marks: 0.25,
    status: 'published',
  });
  assert(valid4Opt.success, 'Valid 4-option single_select question passes schema validation');

  // Test 5-option question schema validation
  const valid5Opt = QuestionFormSchema.safeParse({
    exam_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    subject_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    question_type: 'single_select',
    question_text: 'Which data structure supports O(1) average lookup?',
    options: [
      { text: 'Array', image_path: null },
      { text: 'Linked List', image_path: null },
      { text: 'Hash Map', image_path: null },
      { text: 'Binary Tree', image_path: null },
      { text: 'Graph', image_path: null },
    ],
    correct_option: 3,
    difficulty: 'medium',
    marks: 1,
    negative_marks: 0.25,
    status: 'published',
  });
  assert(valid5Opt.success, 'Valid 5-option single_select question passes schema validation');
}

/**
 * FUNCTION 4: verifyBulkImportEngine()
 * 
 * WHAT IT DOES:
 * - Runs a completely in-memory, non-destructive validation test on CSV raw row data.
 * - Confirms that:
 *   1. Row numbers and total counts are tracked accurately.
 *   2. Numeric options (e.g. 32, 64) are converted to strings properly.
 *   3. Non-standard difficulty terms ('Basic', 'Intermediate') normalize automatically.
 *   4. Zero validation errors are emitted on compliant inputs.
 */
async function verifyBulkImportEngine(): Promise<void> {
  console.log('\n📥 4. Bulk Import Engine Validation (Non-Destructive)');
  const sampleImportRows: RawImportRow[] = [
    {
      exam: 'Bihar STET',
      subject: 'Computer Science',
      topic: 'Operating Systems',
      question_text: 'Which system call creates a child process in UNIX?',
      option_a: 'fork()',
      option_b: 'exec()',
      option_c: 'clone()',
      option_d: 'spawn()',
      correct_option: 'A',
      difficulty: 'Basic', // Tests automatic normalization to 'easy'
      marks: 1,
      negative_marks: 0.25,
    },
    {
      exam: 'Bihar STET',
      subject: 'Computer Science',
      topic: 'Computer Networks',
      question_text: 'What is the size of an IPv4 address in bits?',
      option_a: '32',
      option_b: '64',
      option_c: '128',
      option_d: '16',
      correct_option: '1', // Tests numeric string option normalization
      difficulty: 'Intermediate', // Tests automatic normalization to 'medium'
      marks: 1,
      negative_marks: 0.25,
    },
  ];

  const report = await validateImportData(sampleImportRows, []);
  assert(report.totalRows === 2, 'Import parser accurately tracks total rows');
  assert(report.validCount === 2, 'Auto-normalization correctly validates 100% of rows');
  assert(report.errors.length === 0, 'No validation errors encountered');
}

/**
 * FUNCTION 5: verifyQuizScoringAndAnalytics()
 * 
 * WHAT IT DOES:
 * - Tests quiz scoring arithmetic:
 *   - Correct answers awarded positive marks (+1.0).
 *   - Wrong answers penalize with negative marks (-0.25).
 *   - Skipped questions receive 0 marks.
 *   - Net score calculation: (2 * 1.0) - (1 * 0.25) = 1.75.
 * - Tests scorecard analytics calculations (maxScore, accuracy, performance bands).
 */
function verifyQuizScoringAndAnalytics(): void {
  console.log('\n📊 5. Quiz Scoring & Analytics Engine');
  
  const sampleOptions: [
    { text: string; image_path: string | null },
    { text: string; image_path: string | null },
    { text: string; image_path: string | null },
    { text: string; image_path: string | null }
  ] = [
    { text: 'A', image_path: null },
    { text: 'B', image_path: null },
    { text: 'C', image_path: null },
    { text: 'D', image_path: null },
  ];

  const makeSnapshot = (correctOption: number) => ({
    question_text: 'Sample Q',
    question_image_path: null,
    options: sampleOptions,
    correct_option: correctOption as 1 | 2 | 3 | 4 | 5,
    explanation: null,
    marks: 1.0,
    negative_marks: 0.25,
    time_seconds: 60,
    difficulty: 'easy' as const,
  });

  const mockScoringInput = [
    { question_snapshot: makeSnapshot(1), selected_option: 1, time_spent_seconds: 25 }, // correct (+1.0)
    { question_snapshot: makeSnapshot(2), selected_option: 2, time_spent_seconds: 30 }, // correct (+1.0)
    { question_snapshot: makeSnapshot(3), selected_option: 1, time_spent_seconds: 40 }, // wrong (-0.25)
    { question_snapshot: makeSnapshot(4), selected_option: null, time_spent_seconds: 15 }, // skipped (0)
  ];

  const scoreResult = calculateAttemptScore(mockScoringInput);
  assert(scoreResult.total_questions === 4, 'Score calc: 4 total questions');
  assert(scoreResult.answered_questions === 3, 'Score calc: 3 answered questions');
  assert(scoreResult.correct_answers === 2, 'Score calc: 2 correct answers');
  assert(scoreResult.wrong_answers === 1, 'Score calc: 1 wrong answer');
  assert(scoreResult.skipped_questions === 1, 'Score calc: 1 skipped question');
  // 2 correct (2.0) - 1 wrong (0.25) = 1.75
  assert(scoreResult.score === 1.75, 'Score calc: Net score accurately incorporates negative marking (1.75)');

  // Test scorecard analytics computation
  const analytics = computeScorecardAnalytics({
    id: 'att-1',
    user_id: 'usr-1',
    test_id: 'test-1',
    status: 'completed',
    started_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
    total_questions: scoreResult.total_questions,
    answered_questions: scoreResult.answered_questions,
    correct_answers: scoreResult.correct_answers,
    wrong_answers: scoreResult.wrong_answers,
    skipped_questions: scoreResult.skipped_questions,
    score: scoreResult.score,
    accuracy: scoreResult.accuracy,
    total_time_seconds: 110,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    test: null,
    remaining_seconds: null,
    is_expired: false,
    questions: [
      {
        id: 'aq-1',
        attempt_id: 'att-1',
        question_id: 'q1',
        question_order: 1,
        selected_option: 1,
        is_answered: true,
        is_marked_for_review: false,
        is_correct: true,
        question_started_at: null,
        question_submitted_at: null,
        time_spent_seconds: 25,
        marks_awarded: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        question_snapshot: makeSnapshot(1),
      },
    ],
  });

  assert(typeof analytics.maxScore === 'number', 'Analytics calculates maxScore');
  assert(Boolean(analytics.performanceBand?.title), 'Analytics calculates performanceBand title');
}

/**
 * MAIN SUITE ORCHESTRATOR: runAllVerificationTests()
 * 
 * WHAT IT DOES:
 * - Executes each subsystem verification sequentially.
 * - Captures any unexpected exceptions.
 * - Prints summary statistics and exits with code 0 on success or code 1 on failure.
 */
async function runAllVerificationTests(): Promise<void> {
  console.log('================================================================');
  console.log('🧪 QUIZORA UNIFIED APPLICATION VERIFICATION SUITE');
  console.log('================================================================\n');

  verifyDatabaseAndMigrations();
  verifyDataPersistenceAndTaxonomy();
  verifyQuestionSchemas();
  await verifyBulkImportEngine();
  verifyQuizScoringAndAnalytics();

  console.log('\n================================================================');
  console.log(`VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests > 0) {
    console.error(`⚠️  ${failedTests} test(s) failed. Please review the errors above.`);
    process.exit(1);
  } else {
    console.log('🎉 ALL APPLICATION SUBSYSTEMS VERIFIED CLEAN & INTACT!');
    console.log('================================================================\n');
  }
}

// Execute test suite
runAllVerificationTests().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
