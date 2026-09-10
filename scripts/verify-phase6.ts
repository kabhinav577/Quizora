import { computeScorecardAnalytics } from '../src/lib/quiz/analytics';
import {
  startAttempt,
  saveAnswer,
  submitAttempt,
  startMistakesPractice,
} from '../src/services/attempts';

import {
  toggleBookmark,
  isQuestionBookmarked,
  getUserBookmarks,
} from '../src/services/bookmarks';
import {
  submitQuestionReport,
  listQuestionReports,
} from '../src/services/reports';
import { MOCK_TESTS } from '../src/services/tests';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runPhase6Tests() {
  console.log('\n==================================================');
  console.log('🧪 VERIFYING PHASE 6: RESULTS, ANALYTICS & REVIEW');
  console.log('==================================================\n');

  const testUserId = '00000000-0000-0000-0000-000000000077';
  const testId = MOCK_TESTS[0].id;

  // 1. Create and submit an attempt with known answers
  console.log('--- Test 1: Generate Scored Attempt for Analytics ---');
  const attempt = await startAttempt(testUserId, testId, true);
  assert(attempt.questions.length >= 4, 'Test has at least 4 questions');

  // Answer Q1 Correct (20s)
  const q1 = attempt.questions[0];
  await saveAnswer(attempt.id, q1.question_id || q1.id, q1.question_snapshot.correct_option, false, 20);

  // Answer Q2 Wrong (15s) -> Careless error (<= 30s & wrong)
  const q2 = attempt.questions[1];
  const wrongOption = (q2.question_snapshot.correct_option % q2.question_snapshot.options.length) + 1;
  await saveAnswer(attempt.id, q2.question_id || q2.id, wrongOption, false, 15);

  // Answer Q3 Wrong (75s) -> Time trap (> 60s & wrong)
  const q3 = attempt.questions[2];
  const wrongOption3 = (q3.question_snapshot.correct_option % q3.question_snapshot.options.length) + 1;
  await saveAnswer(attempt.id, q3.question_id || q3.id, wrongOption3, true, 75);

  // Q4 Skipped (0s)
  // Submit attempt
  const submission = await submitAttempt(attempt.id);
  assert(submission.attempt.status === 'completed', 'Attempt status is completed');

  // 2. Test Scorecard Analytics Calculation
  console.log('\n--- Test 2: Analytics & Performance Band Computation ---');
  const analytics = computeScorecardAnalytics(submission.attempt);

  assert(analytics.maxScore > 0, `Max score calculated (${analytics.maxScore})`);
  assert(analytics.averageTimeSeconds > 0, `Average time per question calculated (${analytics.averageTimeSeconds}s)`);
  assert(typeof analytics.performanceBand.title === 'string', `Performance band assigned: ${analytics.performanceBand.title}`);
  assert(analytics.topicBreakdown.length > 0, `Topic breakdown generated with ${analytics.topicBreakdown.length} topics`);
  assert(analytics.difficultyBreakdown.length === 3, 'Difficulty breakdown generated for Easy, Medium, and Hard');

  // Pacing diagnostics check
  assert(analytics.pacing.fastAndCorrect >= 1, 'Pacing detected at least 1 Fast & Accurate response');
  assert(analytics.pacing.fastAndWrong >= 1, 'Pacing detected at least 1 Careless Error (Fast & Wrong)');
  assert(analytics.pacing.slowAndWrong >= 1, 'Pacing detected at least 1 Time Trap (Slow & Wrong)');

  // Mistakes identification check
  assert(analytics.mistakesCount >= 2, `Mistakes correctly identified (${analytics.mistakesCount} missed questions)`);
  assert(analytics.mistakeQuestionIds.length === analytics.mistakesCount, 'Mistake question IDs array matches count');

  // 3. Test "Practice Missed Questions" Flow
  console.log('\n--- Test 3: "Practice Missed Questions" Remediation Flow ---');
  const mistakeSession = await startMistakesPractice(testUserId, attempt.id);
  assert(mistakeSession.status === 'in_progress', 'Mistakes practice session started with in_progress status');
  assert(mistakeSession.total_questions === analytics.mistakesCount, `Practice session question count matches mistakes (${mistakeSession.total_questions})`);
  assert(mistakeSession.test_id === null, 'Practice session is untethered (null test_id)');

  // Verify all questions in mistake session are unattempted
  const allUnanswered = mistakeSession.questions.every((q) => q.selected_option === null && q.is_answered === false);
  assert(allUnanswered, 'All questions in the remediation session are initialized fresh with null selections');

  // 4. Test Bookmarks Service
  console.log('\n--- Test 4: Question Bookmarks System ---');
  const testQId = q1.question_id || q1.id;

  // Toggle on
  const bmResult1 = await toggleBookmark(testUserId, testQId);
  assert(bmResult1.bookmarked === true, 'Toggling bookmark on unbookmarked question returns bookmarked: true');

  const isBm = await isQuestionBookmarked(testUserId, testQId);
  assert(isBm === true, 'isQuestionBookmarked returns true');

  const userBookmarks = await getUserBookmarks(testUserId);
  assert(userBookmarks.some((b) => b.question_id === testQId), 'getUserBookmarks includes the bookmarked question');

  // Toggle off
  const bmResult2 = await toggleBookmark(testUserId, testQId);
  assert(bmResult2.bookmarked === false, 'Toggling bookmark again removes it and returns bookmarked: false');

  const isBmAfter = await isQuestionBookmarked(testUserId, testQId);
  assert(isBmAfter === false, 'isQuestionBookmarked returns false after toggle off');

  // 5. Test Question Reports Service
  console.log('\n--- Test 5: Question Reports & Issue Flagging ---');
  const report = await submitQuestionReport(testUserId, {
    questionId: testQId,
    reason: 'incorrect_answer',
    description: 'Option B should be accepted as alternate answer according to latest circular.',
  });

  assert(!!report.id, 'Question report created with valid UUID');
  assert(report.reason === 'incorrect_answer', 'Report reason recorded accurately');
  assert(report.status === 'pending', 'Report initial status is pending');

  const reportsList = await listQuestionReports('pending');
  assert(reportsList.some((r) => r.id === report.id), 'listQuestionReports includes the submitted report');

  console.log('\n==================================================');
  console.log(`📊 PHASE 6 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
