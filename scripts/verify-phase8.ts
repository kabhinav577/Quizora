import fs from 'fs';
import path from 'path';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: unknown) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} (detail: ${JSON.stringify(detail)})`);
    testsFailed++;
  }
}

async function runPhase8Verification() {
  console.log('==================================================');
  console.log('🧪 VERIFYING PHASE 8: FINAL QUALITY, SECURITY & MOBILE POLISH');
  console.log('==================================================\n');

  // ----------------------------------------------------
  // Test 1: Comprehensive RLS Policy Audit
  // ----------------------------------------------------
  console.log('--- Test 1: PostgreSQL Row Level Security (RLS) Policy Audit ---');
  const rlsMigrationPath = path.join(__dirname, '../supabase/migrations/20260908000002_storage_and_rls.sql');
  const rlsContent = fs.readFileSync(rlsMigrationPath, 'utf8');

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
    'question_reports',
  ];

  for (const table of requiredTables) {
    assert(
      rlsContent.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
      `RLS is enabled on public.${table}`
    );
  }

  assert(
    rlsContent.includes('CREATE OR REPLACE FUNCTION public.is_admin()'),
    'Security Definer function public.is_admin() is defined'
  );

  assert(
    rlsContent.includes('CREATE OR REPLACE FUNCTION public.handle_new_user()'),
    'Security Definer function public.handle_new_user() for auto profile provisioning is defined'
  );

  // Check attempt isolation policies
  assert(
    rlsContent.includes('auth.uid() = user_id') && rlsContent.includes('Users can view own attempts'),
    'Attempts table enforces strict student isolation (auth.uid() = user_id)'
  );

  assert(
    rlsContent.includes('Users can view own attempt questions') && rlsContent.includes('attempts.user_id = auth.uid()'),
    'Attempt_questions table enforces attempt owner validation'
  );

  // Check questions status policy
  assert(
    rlsContent.includes("status = 'published' OR public.is_admin()"),
    'Questions table enforces published-only visibility for regular students'
  );

  // ----------------------------------------------------
  // Test 2: Storage Bucket Security & MIME Constraints
  // ----------------------------------------------------
  console.log('\n--- Test 2: Storage Bucket Security & File Size Constraints ---');
  assert(
    rlsContent.includes("'quizora-media'"),
    "Storage bucket 'quizora-media' is configured"
  );
  assert(
    rlsContent.includes('5242880'),
    'Storage file size limit strictly set to 5MB (5242880 bytes)'
  );
  assert(
    rlsContent.includes("'image/jpeg'") &&
      rlsContent.includes("'image/png'") &&
      rlsContent.includes("'image/webp'"),
    'Storage bucket restricts MIME types to image/jpeg, image/png, and image/webp'
  );
  assert(
    rlsContent.includes('CREATE POLICY "Public media access"') &&
      rlsContent.includes('CREATE POLICY "Admins can upload media"') &&
      rlsContent.includes('CREATE POLICY "Admins can delete media"'),
    'Storage policies enforce public read with admin-only upload and deletion'
  );

  // ----------------------------------------------------
  // Test 3: Single-Record Question Architecture Audit
  // ----------------------------------------------------
  console.log('\n--- Test 3: Single-Record Question Architecture & Anti-Pattern Audit ---');
  const initialSchemaPath = path.join(__dirname, '../supabase/migrations/20260908000001_initial_schema.sql');
  const schemaContent = fs.readFileSync(initialSchemaPath, 'utf8');

  // Verify NO question_options table was created
  assert(
    !schemaContent.includes('CREATE TABLE public.question_options') &&
      !schemaContent.includes('CREATE TABLE question_options'),
    'Prohibited table question_options is NOT present'
  );

  // Verify NO option_a..option_e columns are defined as table columns
  const hasOptionColumns = /\boption_[a-e]\s+(TEXT|VARCHAR|JSONB|INTEGER)/i.test(schemaContent);
  assert(
    !hasOptionColumns,
    'Prohibited columns option_a..option_e are NOT present in table definitions'
  );

  // Verify JSONB options and check constraint
  assert(
    schemaContent.includes('options JSONB NOT NULL') && schemaContent.includes('correct_option INTEGER NOT NULL'),
    'Single-record JSONB options array and integer correct_option enforced in schema'
  );

  assert(
    schemaContent.includes('validate_question_options(options, correct_option)'),
    'Database integrity function validate_question_options() constraint attached to questions table'
  );

  assert(
    schemaContent.includes('question_snapshot JSONB NOT NULL'),
    'Immutable question_snapshot JSONB column present in attempt_questions table'
  );

  // ----------------------------------------------------
  // Test 4: Mobile & Responsive Layout Audit
  // ----------------------------------------------------
  console.log('\n--- Test 4: Mobile & Responsive Design Tokens Audit ---');

  // Check StudentHeader has mobile hamburger drawer
  const headerPath = path.join(__dirname, '../src/components/layout/StudentHeader.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');
  assert(
    headerContent.includes('mobileMenuOpen') && headerContent.includes('md:hidden'),
    'StudentHeader includes mobile responsive drawer toggle'
  );

  // Check QuizEngine has mobile palette drawer
  const quizEnginePath = path.join(__dirname, '../src/components/quiz/QuizEngine.tsx');
  const quizContent = fs.readFileSync(quizEnginePath, 'utf8');
  assert(
    quizContent.includes('isPaletteOpen') && quizContent.includes('sm:hidden'),
    'QuizEngine includes mobile responsive Question Palette drawer'
  );

  // Check Recharts has ResponsiveContainer
  const analyticsPath = path.join(__dirname, '../src/components/results/AnalyticsCharts.tsx');
  const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
  assert(
    analyticsContent.includes('ResponsiveContainer'),
    'AnalyticsCharts wraps visualizations in ResponsiveContainer for mobile fluid resizing'
  );

  // Check Root layout has antialiased and viewport font configuration
  const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(
    layoutContent.includes('antialiased') && layoutContent.includes('min-h-full'),
    'RootLayout configures antialiased and responsive full-height wrapper'
  );

  console.log('\n==================================================');
  console.log(`📊 PHASE 8 RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('==================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase8Verification().catch((err) => {
  console.error('Fatal error in Phase 8 verification:', err);
  process.exit(1);
});
