import {
  createTest,
  getTestById,
  updateTest,
  publishTest,
  archiveTest,
  listTests,
} from '../src/services/tests';
import { getExams } from '../src/services/exams';
import { listQuestions } from '../src/services/questions';

console.log('============================================================');
console.log('QUIZORA PHASE 4 VERIFICATION SUITE: TEST BUILDER');
console.log('============================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(name: string, condition: boolean, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${name} ${details ? `(${details})` : ''}`);
  }
}

async function runPhase4Tests() {
  const exams = await getExams();
  const examId = exams[0]?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const questionData = await listQuestions({ pageSize: 10 });
  const questionIds = questionData.questions.slice(0, 4).map((q) => q.id);

  if (questionIds.length < 3) {
    throw new Error('Need at least 3 questions in question bank for Phase 4 verification');
  }

  // 1. TEST 1: Create Practice Test with Per-Question Timer
  const practiceTest = await createTest({
    exam_id: examId,
    title: 'Operating Systems Practice Set 1',
    slug: 'os-practice-set-1',
    description: 'Rapid-fire practice with 30s question countdown',
    test_type: 'practice',
    duration_seconds: null,
    question_time_seconds: 30,
    marks_per_question: 1.0,
    negative_marks: 0.25,
    shuffle_questions: true,
    shuffle_options: false,
    show_result_immediately: true,
    show_explanations: true,
    status: 'draft',
    question_ids: [questionIds[0], questionIds[1]],
  });

  assert(
    'Test 1: Practice Test created with per-question timer',
    Boolean(
      practiceTest &&
        practiceTest.test_type === 'practice' &&
        practiceTest.question_time_seconds === 30 &&
        practiceTest.duration_seconds === null &&
        practiceTest.total_questions === 2
    )
  );

  // 2. TEST 2: Create Mock Test with Full Test Timer
  const mockTest = await createTest({
    exam_id: examId,
    title: 'Bihar STET CS Full Mock Test 2',
    slug: 'bihar-stet-cs-mock-2',
    description: 'Timed full-length mock simulation',
    test_type: 'mock_test',
    duration_seconds: 7200, // 120 minutes
    question_time_seconds: null,
    marks_per_question: 2.0,
    negative_marks: 0.5,
    shuffle_questions: true,
    shuffle_options: true,
    show_result_immediately: true,
    show_explanations: true,
    status: 'draft',
    question_ids: [questionIds[0], questionIds[1], questionIds[2]],
  });

  assert(
    'Test 2: Mock Test created with full test duration (7200s)',
    Boolean(
      mockTest &&
        mockTest.test_type === 'mock_test' &&
        mockTest.duration_seconds === 7200 &&
        mockTest.total_questions === 3
    )
  );

  // 3. TEST 3: Question Ordering Verification
  const fetchedMock = await getTestById(mockTest.id);
  const correctOrder =
    fetchedMock?.questions.length === 3 &&
    fetchedMock.questions[0].id === questionIds[0] &&
    fetchedMock.questions[0].question_order === 1 &&
    fetchedMock.questions[1].id === questionIds[1] &&
    fetchedMock.questions[1].question_order === 2 &&
    fetchedMock.questions[2].id === questionIds[2] &&
    fetchedMock.questions[2].question_order === 3;

  assert('Test 3: Questions mapped sequentially with question_order (1, 2, 3)', correctOrder);

  // 4. TEST 4: Question Reordering
  // Reverse the order: questionIds[2], questionIds[1], questionIds[0]
  const reorderedIds = [questionIds[2], questionIds[1], questionIds[0]];
  const reordered = await updateTest(mockTest.id, {
    question_ids: reorderedIds,
  });

  const reorderedCorrectly =
    reordered?.questions[0].id === questionIds[2] &&
    reordered?.questions[0].question_order === 1 &&
    reordered?.questions[2].id === questionIds[0] &&
    reordered?.questions[2].question_order === 3;

  assert('Test 4: Questions reordered successfully with updated order positions', Boolean(reorderedCorrectly));

  // 5. TEST 5: Publish Test Lifecycle
  const published = await publishTest(mockTest.id);
  const fetchedPublished = await getTestById(mockTest.id);
  assert(
    'Test 5: Test status changed from draft to published',
    Boolean(published && fetchedPublished?.status === 'published')
  );

  // 6. TEST 6: Archive Test Lifecycle
  const archived = await archiveTest(practiceTest.id);
  const fetchedArchived = await getTestById(practiceTest.id);
  assert(
    'Test 6: Test status transitioned to archived',
    Boolean(archived && fetchedArchived?.status === 'archived')
  );

  // 7. TEST 7: Filtering tests by status & type
  const publishedTests = await listTests({ status: 'published' });
  assert(
    'Test 7: listTests filters by status=published correctly',
    publishedTests.tests.every((t) => t.status === 'published')
  );

  console.log('\n============================================================');
  console.log(`PHASE 4 RESULTS: ${passedTests}/${totalTests} tests passed.`);
  console.log('============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error('Phase 4 verification error:', err);
  process.exit(1);
});
