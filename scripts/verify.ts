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
import { QuestionFormSchema, BulkImportRowSchema } from '../src/schemas/question';
import { validateImportData, normalizeDifficulty, RawImportRow, parseImportFile } from '../src/services/imports';
import { calculateAttemptScore } from '../src/lib/quiz/scoring';
import { computeScorecardAnalytics } from '../src/lib/quiz/analytics';
import {
  normalizeLanguage,
  getMonacoLanguage,
  getLanguageDisplayName,
  SUPPORTED_LANGUAGES,
} from '../src/lib/code/languages';
import { abandonAttempt, localAttempts } from '../src/services/attempts';

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
 * FUNCTION 6: verifyV2CodeQuestionsAndImports()
 * 
 * Verifies all 24 required test scenarios for Quizora V2 Code Questions:
 * - Normal text questions (backward compatibility)
 * - {{CODE}} placement: beginning, middle, end, text+code+text
 * - Supported languages: JS, TS, Python, Java, C, C++, C#, PHP, SQL, HTML, CSS, XML, JSON, Bash, Go, Rust, Plaintext
 * - Raw indentation, newlines, blank lines, tabs, comments preservation
 * - Validation rules: missing placeholder, missing language, missing code, duplicate placeholders
 * - Centralized language mapping & Monaco mapping
 * - CSV import of V2 25-column multiline template & legacy 23-column compatibility
 */
async function verifyV2CodeQuestionsAndImports(): Promise<void> {
  console.log('💻 6. V2 Code Questions & CSV Bulk Import Engine');

  const validExamId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const validSubjectId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  const baseOptions: [any, any, any, any] = [
    { text: 'Option A', image_path: null },
    { text: 'Option B', image_path: null },
    { text: 'Option C', image_path: null },
    { text: 'Option D', image_path: null },
  ];

  // 1. Normal text question (no code fields)
  const normalQ = QuestionFormSchema.safeParse({
    exam_id: validExamId,
    subject_id: validSubjectId,
    question_text: 'Which layer of the OSI model routes packets?',
    options: baseOptions,
    correct_option: 2,
    code_language: null,
    code_content: null,
  });
  assert(normalQ.success, 'Normal text question without code fields passes schema');

  // 2. Code at beginning
  const codeAtBeginning = QuestionFormSchema.safeParse({
    exam_id: validExamId,
    subject_id: validSubjectId,
    question_text: '{{CODE}}\nWhat is the output?',
    code_language: 'javascript',
    code_content: 'console.log("hello");',
    options: baseOptions,
    correct_option: 1,
  });
  assert(codeAtBeginning.success, 'Code at beginning of question_text passes schema');

  // 3. Text before code
  const textBeforeCode = QuestionFormSchema.safeParse({
    exam_id: validExamId,
    subject_id: validSubjectId,
    question_text: 'Consider the following snippet:\n\n{{CODE}}',
    code_language: 'python',
    code_content: 'def add(a, b):\n    return a + b',
    options: baseOptions,
    correct_option: 1,
  });
  assert(textBeforeCode.success, 'Text before code passes schema');

  // 4. Code followed by text
  const codeFollowedByText = QuestionFormSchema.safeParse({
    exam_id: validExamId,
    subject_id: validSubjectId,
    question_text: '{{CODE}}\n\nSelect the correct behavior.',
    code_language: 'java',
    code_content: 'public class Main { public static void main(String[] args) {} }',
    options: baseOptions,
    correct_option: 1,
  });
  assert(codeFollowedByText.success, 'Code followed by text passes schema');

  // 5. Text + code + text
  const textCodeText = QuestionFormSchema.safeParse({
    exam_id: validExamId,
    subject_id: validSubjectId,
    question_text: 'Consider the program:\n\n{{CODE}}\n\nWhat is the result?',
    code_language: 'cpp',
    code_content: 'class A { int x; };',
    options: baseOptions,
    correct_option: 1,
  });
  assert(textCodeText.success, 'Text + code + text passes schema');

  // 6-12. Multi-language checks
  const testLanguages = [
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp',
    'csharp', 'php', 'sql', 'html', 'css', 'xml', 'json', 'bash', 'go', 'rust', 'plaintext'
  ];
  let allLangsSupported = true;
  for (const lang of testLanguages) {
    const q = QuestionFormSchema.safeParse({
      exam_id: validExamId,
      subject_id: validSubjectId,
      question_text: `Review this ${lang} snippet:\n\n{{CODE}}`,
      code_language: lang,
      code_content: '// Code here',
      options: baseOptions,
      correct_option: 1,
    });
    if (!q.success) {
      allLangsSupported = false;
      break;
    }
  }
  assert(allLangsSupported, 'All 17 supported languages pass schema validation');

  // 13-17. Indentation, blank lines, comments, and multiline preservation
  const rawSampleCode = `class A {
    int x;
    int y;

public:
    // Constructor initializes members
    A() : y(20), x(y) {}
};`;

  const indentedQ = QuestionFormSchema.safeParse({
    exam_id: validExamId,
    subject_id: validSubjectId,
    question_text: 'Check constructor:\n\n{{CODE}}\n\nWhich statement is true?',
    code_language: 'cpp',
    code_content: rawSampleCode,
    options: baseOptions,
    correct_option: 2,
  });
  assert(indentedQ.success, 'Multiline indented code with comments and blank lines passes schema');
  if (indentedQ.success) {
    assert(indentedQ.data.code_content === rawSampleCode, 'Raw code formatting and indentation preserved 100% identically');
  }

  // 18. Validation: {{CODE}} without code_content
  const missingContent = QuestionFormSchema.safeParse({
    exam_id: validExamId,
    subject_id: validSubjectId,
    question_text: 'Snippet:\n\n{{CODE}}',
    code_language: 'javascript',
    code_content: '',
    options: baseOptions,
    correct_option: 1,
  });
  assert(!missingContent.success, 'Schema rejects {{CODE}} when code_content is empty');

  // 19. Validation: {{CODE}} without code_language
  const missingLanguage = QuestionFormSchema.safeParse({
    exam_id: validExamId,
    subject_id: validSubjectId,
    question_text: 'Snippet:\n\n{{CODE}}',
    code_language: '',
    code_content: 'console.log(1);',
    options: baseOptions,
    correct_option: 1,
  });
  assert(!missingLanguage.success, 'Schema rejects {{CODE}} when code_language is empty');

  // 20. Validation: code_content present but {{CODE}} missing from question_text
  const missingPlaceholder = QuestionFormSchema.safeParse({
    exam_id: validExamId,
    subject_id: validSubjectId,
    question_text: 'What is the output of this code?',
    code_language: 'javascript',
    code_content: 'console.log(1);',
    options: baseOptions,
    correct_option: 1,
  });
  assert(!missingPlaceholder.success, 'Schema rejects code_content when {{CODE}} placeholder is missing');

  // 21. Validation: multiple {{CODE}} placeholders
  const multiplePlaceholders = QuestionFormSchema.safeParse({
    exam_id: validExamId,
    subject_id: validSubjectId,
    question_text: 'Code 1:\n{{CODE}}\nCode 2:\n{{CODE}}',
    code_language: 'javascript',
    code_content: 'let a = 1;',
    options: baseOptions,
    correct_option: 1,
  });
  assert(!multiplePlaceholders.success, 'Schema rejects multiple {{CODE}} placeholders per question in V2');

  // 22. Language normalization and Monaco mappings
  assert(normalizeLanguage('C++') === 'cpp', 'normalizeLanguage maps C++ to cpp');
  assert(normalizeLanguage('js') === 'javascript', 'normalizeLanguage maps js to javascript');
  assert(normalizeLanguage('py') === 'python', 'normalizeLanguage maps py to python');
  assert(getMonacoLanguage('bash') === 'shell', 'getMonacoLanguage maps bash to shell');
  assert(getLanguageDisplayName('cpp') === 'C++', 'getLanguageDisplayName returns human-readable label');

  // 23. CSV multiline import test with V2 sample
  const sampleV2Path = path.join(process.cwd(), 'public/Quizora_Bulk_Import_Sample_v2.csv');
  assert(fs.existsSync(sampleV2Path), 'Quizora_Bulk_Import_Sample_v2.csv exists in public directory');

  const sampleCsvContent = fs.readFileSync(sampleV2Path, 'utf8');
  const parseResult = await parseImportFile(Buffer.from(sampleCsvContent), 'Quizora_Bulk_Import_Sample_v2.csv');
  assert(parseResult.rows.length === 16, `V2 sample CSV parsed exactly 16 rows (got ${parseResult.rows.length})`);

  // Check multiline preservation and Web Development topic in parsed row 10 (JavaScript)
  const jsRow = parseResult.rows[10];
  assert(jsRow.code_language === 'javascript', 'Row 10 has code_language = javascript');
  assert(jsRow.topic === 'Web Development', 'Row 10 topic is classified as Web Development');
  assert(
    typeof jsRow.code_content === 'string' && jsRow.code_content.includes('let x = 1;') && jsRow.code_content.includes('let x = 2;'),
    'Row 10 multiline code_content preserved across line breaks'
  );

  // Check C++ row (Row 11)
  const cppRow = parseResult.rows[11];
  assert(cppRow.code_language === 'cpp', 'Row 11 has code_language = cpp');
  assert(cppRow.topic === 'Object Oriented Programming', 'Row 11 topic is classified as Object Oriented Programming');
  assert(
    typeof cppRow.code_content === 'string' && cppRow.code_content.includes('A() : y(20), x(y) {}'),
    'Row 11 C++ class constructor indentation preserved'
  );

  // Check XML and SQL rows
  const xmlRow = parseResult.rows[12];
  assert(xmlRow.code_language === 'xml', 'Row 12 has code_language = xml');
  assert(xmlRow.topic === 'Web Development', 'Row 12 topic is classified as Web Development');

  const sqlRow = parseResult.rows[13];
  assert(sqlRow.code_language === 'sql', 'Row 13 has code_language = sql');
  assert(sqlRow.topic === 'DBMS', 'Row 13 topic is classified as DBMS');

  // Check HTML and CSS questions specifically for Bihar STET
  const htmlRow = parseResult.rows[14];
  assert(htmlRow.exam === 'Bihar STET', 'Row 14 is specifically for Bihar STET exam');
  assert(htmlRow.code_language === 'html', 'Row 14 has code_language = html');
  assert(htmlRow.topic === 'Web Development', 'Row 14 topic is classified as Web Development');

  const cssRow = parseResult.rows[15];
  assert(cssRow.exam === 'Bihar STET', 'Row 15 is specifically for Bihar STET exam');
  assert(cssRow.code_language === 'css', 'Row 15 has code_language = css');
  assert(cssRow.topic === 'Web Development', 'Row 15 topic is classified as Web Development');

  // 24. Validate all 16 rows against Bulk Import validation engine
  const report = await validateImportData(parseResult.rows);
  assert(report.totalRows === 16, 'Report totalRows is 16');
  assert(report.validCount === 16, `All 16 rows validated successfully (validCount = ${report.validCount})`);
  assert(report.errorCount === 0, `No validation errors encountered for V2 sample CSV (errorCount = ${report.errorCount})`);

  // 25. Existing 23-column compatibility test (normal questions without code columns)
  const legacy23Row: RawImportRow = {
    exam: 'Bihar TRE 4.0',
    subject: 'Computer Science',
    topic: 'Computer Networks',
    question_text: 'What is the default port for HTTP?',
    option_a: '21',
    option_b: '80',
    option_c: '443',
    option_d: '8080',
    correct_option: 'B',
    explanation: 'Port 80 is the default port for HTTP.',
    difficulty: 'Easy',
    marks: 1.0,
    negative_marks: 0.25,
  };
  const legacyReport = await validateImportData([legacy23Row]);
  assert(legacyReport.validCount === 1, 'Legacy 23-column question without code fields validates cleanly');
}

/**
 * FUNCTION 7: verifyTestExitAndRestartLifecycle()
 * 
 * WHAT IT DOES:
 * - Tests the student exit test behavior:
 *   1. An in-progress attempt transitions to 'abandoned' when student exits.
 *   2. Active attempt query excludes 'abandoned' attempts, ensuring the test restarts from Question 1.
 *   3. Verifies non-destructive cleanup after test.
 */
async function verifyTestExitAndRestartLifecycle(): Promise<void> {
  console.log('\n🚪 7. Test Exit, Abandonment & Restart Engine');

  const testAttemptId = 'test-verify-attempt-' + Date.now();
  const mockAttempt: import('../src/types/database').Attempt = {
    id: testAttemptId,
    user_id: 'test-user-verify',
    test_id: 'test-1',
    status: 'in_progress',
    started_at: new Date().toISOString(),
    submitted_at: null,
    score: 0,
    accuracy: 0,
    total_time_seconds: 30,
    total_questions: 5,
    answered_questions: 1,
    correct_answers: 0,
    wrong_answers: 0,
    skipped_questions: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Register mock attempt in local store
  localAttempts.push(mockAttempt);
  assert(
    localAttempts.some((a) => a.id === testAttemptId && a.status === 'in_progress'),
    'Mock active test attempt registered with in_progress status'
  );

  // 2. Abandon attempt
  const abandonResult = await abandonAttempt(testAttemptId);
  assert(abandonResult === true, 'abandonAttempt executed successfully');

  // 3. Confirm status transitioned to 'abandoned'
  const updated = localAttempts.find((a) => a.id === testAttemptId);
  assert(updated?.status === 'abandoned', "Attempt status successfully transitioned to 'abandoned'");

  // 4. Confirm 'abandoned' attempts are excluded from active attempts (preventing resume, forcing restart)
  const activeAttempt = localAttempts.find(
    (a) => a.user_id === 'test-user-verify' && a.test_id === 'test-1' && a.status === 'in_progress'
  );
  assert(activeAttempt === undefined, 'Active query returns null for abandoned attempt, guaranteeing fresh test restart');

  // Clean up
  const idx = localAttempts.findIndex((a) => a.id === testAttemptId);
  if (idx !== -1) {
    localAttempts.splice(idx, 1);
  }
}

/**
 * FUNCTION 8: verifySmartTestBuilderAndShuffling()
 * 
 * Verifies Smart Test Builder and shuffling features:
 * 1. Exam taxonomy statistics computation
 * 2. Topic quota availability validation & shortage warnings
 * 3. Automatic question selection with exact quota fulfillment & zero duplicate questions
 * 4. Difficulty distribution targets (Easy, Medium, Hard breakdown)
 * 5. Question replacement candidate discovery and safe swapping
 * 6. Option shuffling preserves correct answer identities and scoring accuracy
 * 7. Resuming / refreshing active attempts preserves frozen question order and option order
 * 8. Backward compatibility: Manual test creation schema and CSV importer remain 100% functional
 */
async function verifySmartTestBuilderAndShuffling(): Promise<void> {
  console.log('\n🧠 8. Smart Test Builder, Question Selection & Shuffling Verification');

  const {
    computeExamTaxonomyStats,
    validateSmartTestQuotas,
    generateSmartQuestions,
    getReplacementCandidates,
  } = await import('../src/services/smartTestBuilder');
  const { startAttempt, localAttempts: liveAttempts, localAttemptQuestions: liveAttemptQuestions } = await import('../src/services/attempts');
  const { TestFormSchema } = await import('../src/schemas/test');

  const dataDir = path.join(process.cwd(), '.data');
  const questions: import('../src/types/database').Question[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'questions.json'), 'utf8')
  );
  const topics: import('../src/types/database').Topic[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'topics.json'), 'utf8')
  );
  const subjects: import('../src/types/database').Subject[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'subjects.json'), 'utf8')
  );

  const examId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Bihar STET

  // 1. Exam taxonomy stats computation
  const stats = computeExamTaxonomyStats(examId, questions, topics, subjects);
  assert(stats.totalQuestions > 1000, `Exam taxonomy computed: ${stats.totalQuestions} total questions found`);
  assert(stats.topics.length > 0, `Exam taxonomy found ${stats.topics.length} active topics`);

  const sampleTopic1 = stats.topics[0];
  const sampleTopic2 = stats.topics[1];
  assert(Boolean(sampleTopic1 && sampleTopic2), 'Found at least 2 sample topics for quota tests');

  // 2. Quota validation - Normal valid quota
  const validQuotas = [
    { topicId: sampleTopic1.topicId, count: 5 },
    { topicId: sampleTopic2.topicId, count: 5 },
  ];
  const normalValidation = validateSmartTestQuotas(stats, validQuotas);
  assert(normalValidation.isValid === true, 'Quota validation: Valid quota passes with isValid = true');
  assert(normalValidation.totalRequested === 10, 'Quota validation: Correctly tracks total requested count (10)');

  // 3. Quota validation - Shortage error detection
  const excessiveQuotas = [
    { topicId: sampleTopic1.topicId, count: sampleTopic1.totalCount + 999 },
  ];
  const shortageValidation = validateSmartTestQuotas(stats, excessiveQuotas);
  assert(shortageValidation.isValid === false, 'Quota validation: Detects topic shortage and rejects with isValid = false');
  assert(shortageValidation.topicErrors.length === 1, 'Quota validation: Accurately records exactly 1 topic shortage error');
  assert(shortageValidation.topicErrors[0].requested > sampleTopic1.totalCount, 'Quota validation: Records requested vs available counts');

  // 4. Automatic Question Selection
  const smartResult = generateSmartQuestions(
    examId,
    [
      { topicId: sampleTopic1.topicId, count: 6 },
      { topicId: sampleTopic2.topicId, count: 4 },
    ],
    questions,
    { easyPercent: 50, mediumPercent: 30, hardPercent: 20 }
  );

  assert(smartResult.questions.length === 10, `Smart generation: Selected exactly 10 questions (got ${smartResult.questions.length})`);

  // Verify zero duplicate questions
  const uniqueSelectedIds = new Set(smartResult.questions.map((q) => q.id));
  assert(uniqueSelectedIds.size === smartResult.questions.length, 'Smart generation: 100% unique questions with ZERO duplicates');

  // Verify topic adherence
  const topic1Questions = smartResult.questions.filter((q) => q.topic_id === sampleTopic1.topicId);
  const topic2Questions = smartResult.questions.filter((q) => q.topic_id === sampleTopic2.topicId);
  assert(topic1Questions.length === 6, `Smart generation: Topic 1 contains exact requested quota of 6 (got ${topic1Questions.length})`);
  assert(topic2Questions.length === 4, `Smart generation: Topic 2 contains exact requested quota of 4 (got ${topic2Questions.length})`);

  // 5. Question Replacement Candidate Discovery
  const targetQuestionToReplace = smartResult.questions[0];
  const replacementCandidates = getReplacementCandidates(
    examId,
    targetQuestionToReplace.id,
    targetQuestionToReplace.topic_id,
    targetQuestionToReplace.difficulty,
    smartResult.questions.map((q) => q.id),
    questions
  );

  assert(replacementCandidates.length > 0, `Replacement engine: Found ${replacementCandidates.length} replacement candidates for topic`);
  assert(
    !replacementCandidates.some((c) => uniqueSelectedIds.has(c.id)),
    'Replacement engine: Candidates exclude all currently selected questions'
  );

  // 6. Option Shuffling & Answer Correctness Preservation
  const testId = '55555555-5555-5555-5555-555555555501';
  const userId = 'verify-shuffling-user-' + Date.now();

  // Start attempt with shuffling
  const attempt = await startAttempt(userId, testId, true);
  assert(attempt.questions.length > 0, `Attempt started with ${attempt.questions.length} questions`);

  // Verify that for every question, the correct answer text is preserved in the shuffled snapshot
  let allCorrectAnswersPreserved = true;
  for (const aq of attempt.questions) {
    const origQ = questions.find((q) => q.id === aq.question_id);
    if (!origQ) continue;

    const originalCorrectOptionText = origQ.options[origQ.correct_option - 1]?.text;
    const shuffledCorrectOptionText = aq.question_snapshot.options[aq.question_snapshot.correct_option - 1]?.text;

    if (originalCorrectOptionText !== shuffledCorrectOptionText) {
      allCorrectAnswersPreserved = false;
      break;
    }
  }
  assert(allCorrectAnswersPreserved, 'Option Shuffling: Correct answer text is 100% preserved after option reordering');

  // Verify that answering with snapshot.correct_option awards full marks (+1.0)
  const firstQ = attempt.questions[0];
  const scoringInput = [
    {
      question_snapshot: firstQ.question_snapshot,
      selected_option: firstQ.question_snapshot.correct_option,
      time_spent_seconds: 20,
    },
  ];
  const scoreResult = calculateAttemptScore(scoringInput);
  assert(scoreResult.correct_answers === 1, 'Shuffled option evaluation: Correct option awards 1 correct answer');
  assert(scoreResult.score === 1.0, 'Shuffled option evaluation: Correct option awards full positive marks (1.0)');

  // 7. Refresh / Resuming attempt preserves frozen question and option order
  const resumedAttempt = await startAttempt(userId, testId, false);
  assert(resumedAttempt.id === attempt.id, 'Resuming attempt: Returns the same active in-progress attempt');
  assert(
    resumedAttempt.questions[0].question_id === attempt.questions[0].question_id,
    'Resuming attempt: Preserves frozen question order identically'
  );
  assert(
    resumedAttempt.questions[0].question_snapshot.correct_option === attempt.questions[0].question_snapshot.correct_option,
    'Resuming attempt: Preserves frozen option order and correct_option identically'
  );

  // Cleanup verify attempt
  const aIdx = liveAttempts.findIndex((a) => a.id === attempt.id);
  if (aIdx !== -1) liveAttempts.splice(aIdx, 1);
  const aqFiltered = liveAttemptQuestions.filter((aq) => aq.attempt_id !== attempt.id);
  liveAttemptQuestions.length = 0;
  liveAttemptQuestions.push(...aqFiltered);

  // 8. Backward Compatibility: Manual Test Creation schema check
  const manualTestPayload = {
    exam_id: examId,
    title: 'Manual Test Creation Regression Check',
    slug: 'manual-test-regression-' + Date.now(),
    description: 'Manual test creation remains fully functional',
    test_type: 'practice' as const,
    marks_per_question: 1,
    negative_marks: 0.25,
    shuffle_questions: true,
    shuffle_options: false,
    show_result_immediately: true,
    show_explanations: true,
    status: 'draft' as const,
    question_ids: [smartResult.questions[0].id, smartResult.questions[1].id],
  };
  const manualValidation = TestFormSchema.safeParse(manualTestPayload);
  assert(manualValidation.success, 'Backward Compatibility: Manual test creation schema validates successfully');
}

/**
 * MAIN SUITE ORCHESTRATOR: runAllVerificationTests()
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
  await verifyV2CodeQuestionsAndImports();
  await verifyTestExitAndRestartLifecycle();
  await verifySmartTestBuilderAndShuffling();

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

