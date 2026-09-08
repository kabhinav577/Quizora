import {
  calculateAttemptScore,
} from '../src/lib/quiz/scoring';

import {
  startAttempt,
  saveAnswer,
  submitAttempt,
  startPracticeSession,
  getAttemptById,
  calculateRemainingSeconds,
} from '../src/services/attempts';
import { QuestionSnapshot } from '../src/types/database';
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

async function runPhase5Tests() {
  console.log('\n==================================================');
  console.log('🧪 VERIFYING PHASE 5: QUIZ ENGINE & ATTEMPTS');
  console.log('==================================================\n');

  // TEST 1: Server-authoritative scoring calculation
  console.log('--- Test 1: Scoring Calculator Unit Tests ---');
  const dummySnapshot1: QuestionSnapshot = {
    question_text: 'What is 2+2?',
    question_image_path: null,
    options: [{ text: '3', image_path: null }, { text: '4', image_path: null }, { text: '5', image_path: null }, { text: '6', image_path: null }],
    correct_option: 2,
    explanation: 'Basic math',
    marks: 2.0,
    negative_marks: 0.5,
  };

  const dummySnapshot2: QuestionSnapshot = {
    question_text: 'What is capital of France?',
    question_image_path: null,
    options: [{ text: 'London', image_path: null }, { text: 'Berlin', image_path: null }, { text: 'Paris', image_path: null }, { text: 'Madrid', image_path: null }],
    correct_option: 3,
    explanation: 'Geography',
    marks: 1.0,
    negative_marks: 0.25,
  };

  const dummySnapshot3: QuestionSnapshot = {
    question_text: 'Unattempted question',
    question_image_path: null,
    options: [{ text: 'A', image_path: null }, { text: 'B', image_path: null }, { text: 'C', image_path: null }, { text: 'D', image_path: null }],
    correct_option: 1,
    explanation: null,
    marks: 1.0,
    negative_marks: 0.25,
  };

  const scoreResult = calculateAttemptScore([
    { question_snapshot: dummySnapshot1, selected_option: 2, time_spent_seconds: 20 }, // correct: +2.0
    { question_snapshot: dummySnapshot2, selected_option: 1, time_spent_seconds: 15 }, // wrong: -0.25
    { question_snapshot: dummySnapshot3, selected_option: null, time_spent_seconds: 5 }, // skipped: 0.0
  ]);

  assert(scoreResult.total_questions === 3, 'Total questions is 3');
  assert(scoreResult.answered_questions === 2, 'Answered questions is 2');
  assert(scoreResult.correct_answers === 1, 'Correct answers is 1');
  assert(scoreResult.wrong_answers === 1, 'Wrong answers is 1');
  assert(scoreResult.skipped_questions === 1, 'Skipped questions is 1');
  assert(scoreResult.score === 1.75, `Net score calculation is 1.75 (actual: ${scoreResult.score})`);
  assert(scoreResult.accuracy === 50.0, `Accuracy is 50.0% (actual: ${scoreResult.accuracy}%)`);
  assert(scoreResult.total_time_seconds === 40, `Total time is 40s (actual: ${scoreResult.total_time_seconds}s)`);

  // TEST 2: Server-authoritative countdown calculation
  console.log('\n--- Test 2: Server Time Countdown Calculation ---');
  const now = new Date();
  const past5Mins = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const past65Mins = new Date(now.getTime() - 65 * 60 * 1000).toISOString();

  // Test 1 hour duration started 5 mins ago => ~3300s remaining
  const countdown1 = calculateRemainingSeconds(past5Mins, 3600);
  assert(!countdown1.isExpired, 'Test with 55 mins remaining is not expired');
  assert(countdown1.remainingSeconds! >= 3290 && countdown1.remainingSeconds! <= 3310, 'Remaining time is approximately 3300 seconds');

  // Test 1 hour duration started 65 mins ago => 0 remaining, expired
  const countdown2 = calculateRemainingSeconds(past65Mins, 3600);
  assert(countdown2.isExpired, 'Test past duration is marked expired');
  assert(countdown2.remainingSeconds === 0, 'Expired test remaining seconds is 0');

  // TEST 3: Attempt Initialization & Snapshot Immutability
  console.log('\n--- Test 3: Attempt Initialization & Snapshot Immutability ---');
  const testUserId = '00000000-0000-0000-0000-000000000099';
  const testId = MOCK_TESTS[0].id;

  const attempt = await startAttempt(testUserId, testId, true);
  assert(attempt.status === 'in_progress', 'Attempt status is initialized as in_progress');
  assert(attempt.total_questions === attempt.questions.length, 'Total questions matches question snapshots length');
  assert(attempt.questions.length > 0, 'Attempt questions list is non-empty');

  const firstQ = attempt.questions[0];
  assert(!!firstQ.question_snapshot, 'Question snapshot exists');
  assert(typeof firstQ.question_snapshot.correct_option === 'number', 'Question snapshot has correct_option');
  assert(firstQ.question_snapshot.options.length >= 4, 'Question snapshot has at least 4 options');

  // TEST 4: Refresh Recovery / Resume Active Attempt
  console.log('\n--- Test 4: Refresh Recovery & Resume Active Attempt ---');
  const resumedAttempt = await startAttempt(testUserId, testId, false);
  assert(resumedAttempt.id === attempt.id, 'Resuming active attempt returns the same attempt ID without recreating');
  assert(resumedAttempt.status === 'in_progress', 'Resumed attempt remains in_progress');

  // TEST 5: Answer Saving during Test
  console.log('\n--- Test 5: Saving Answers During Active Attempt ---');
  const qidToAnswer = firstQ.question_id || firstQ.id;
  const saveSuccess = await saveAnswer(attempt.id, qidToAnswer, 2, true, 25);
  assert(saveSuccess === true, 'Saving answer succeeds');

  const reloadedAttempt = await getAttemptById(attempt.id);
  const updatedQ = reloadedAttempt?.questions.find((q) => (q.question_id || q.id) === qidToAnswer);
  assert(updatedQ?.selected_option === 2, 'Selected option correctly saved as 2');
  assert(updatedQ?.is_marked_for_review === true, 'Marked for review flag correctly saved');
  assert(updatedQ?.time_spent_seconds === 25, 'Time spent seconds correctly saved as 25');

  // TEST 6: Idempotent Submission & Scorecard Generation
  console.log('\n--- Test 6: Idempotent Submission & Evaluation ---');
  const submissionResult = await submitAttempt(attempt.id);
  assert(submissionResult.attempt.status === 'completed', 'Submitted attempt status is completed');
  assert(submissionResult.attempt.submitted_at !== null, 'Submitted attempt has submitted_at timestamp');
  assert(typeof submissionResult.summary.score === 'number', 'Summary score is numeric');
  assert(typeof submissionResult.summary.accuracy === 'number', 'Summary accuracy is numeric');

  // Submit again (idempotency check)
  const reSubmissionResult = await submitAttempt(attempt.id);
  assert(reSubmissionResult.attempt.status === 'completed', 'Re-submission maintains completed status');
  assert(reSubmissionResult.summary.score === submissionResult.summary.score, 'Re-submission returns identical score');

  // TEST 7: Dynamic Practice Session Generation
  console.log('\n--- Test 7: Dynamic Practice Session Generation ---');
  const practiceAttempt = await startPracticeSession(testUserId, {
    count: 3,
    timerSeconds: 45,
  });
  assert(practiceAttempt.test_id === null, 'Practice session has null test_id');
  assert(practiceAttempt.total_questions === 3, 'Practice session total questions is 3');
  assert(practiceAttempt.status === 'in_progress', 'Practice session status is in_progress');
  assert(practiceAttempt.remaining_seconds === 135, 'Practice total timer is 135s (3 * 45s)');

  console.log('\n==================================================');
  console.log(`📊 PHASE 5 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
