import {
  calculateStreak,
  getStudentDashboardData,
  getStudentMistakes,
  getStudentBookmarksWithDetails,
  getStudentAttemptsHistory,
  startBookmarksPracticeSession,
  startMistakesHubPracticeSession,
} from '../src/services/dashboard';
import { startAttempt, saveAnswer, submitAttempt } from '../src/services/attempts';
import { toggleBookmark } from '../src/services/bookmarks';
import { MOCK_TESTS } from '../src/services/tests';
import { MOCK_QUESTIONS } from '../src/services/mockData';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, actual?: unknown) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} (actual: ${JSON.stringify(actual)})`);
    testsFailed++;
  }
}

async function runPhase7Verification() {
  console.log('==================================================');
  console.log('🧪 VERIFYING PHASE 7: STUDENT FEATURES & DASHBOARD');
  console.log('==================================================\n');

  const testUserId = `test-user-p7-${Date.now()}`;

  // ----------------------------------------------------
  // Test 1: Streak Calculation Algorithm
  // ----------------------------------------------------
  console.log('--- Test 1: Streak Calculation Algorithm ---');
  {
    assert(calculateStreak([]) === 0, 'Empty dates array returns 0 streak');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const twoDaysAgo = new Date(today.getTime() - 86400000 * 2);
    const threeDaysAgo = new Date(today.getTime() - 86400000 * 3);

    const active3DayStreak = [today, yesterday, twoDaysAgo];
    assert(calculateStreak(active3DayStreak) === 3, 'Consecutive 3-day active streak returns 3', calculateStreak(active3DayStreak));

    const brokenStreak = [threeDaysAgo, new Date(today.getTime() - 86400000 * 4)];
    assert(calculateStreak(brokenStreak) === 0, 'Inactive streak (no practice today or yesterday) returns 0', calculateStreak(brokenStreak));

    const yesterdayActiveStreak = [yesterday, twoDaysAgo];
    assert(calculateStreak(yesterdayActiveStreak) === 2, 'Practiced yesterday maintains active 2-day streak', calculateStreak(yesterdayActiveStreak));
  }

  // ----------------------------------------------------
  // Test 2: Seed Scored Attempt & Generate Dashboard Data
  // ----------------------------------------------------
  console.log('\n--- Test 2: Dashboard Statistics & Recommendation ---');
  const mockTest = MOCK_TESTS[0];
  const attempt = await startAttempt(testUserId, mockTest.id);

  // Mark first question wrong, second correct, leave rest skipped
  const q1 = attempt.questions[0];
  const q2 = attempt.questions[1];
  const q1WrongOpt = q1.question_snapshot.correct_option === 1 ? 2 : 1;
  const q2CorrectOpt = q2.question_snapshot.correct_option;

  await saveAnswer(attempt.id, q1.question_id || q1.id, q1WrongOpt, false, 15);
  await saveAnswer(attempt.id, q2.question_id || q2.id, q2CorrectOpt, false, 25);
  await submitAttempt(attempt.id);

  const dashboardData = await getStudentDashboardData(testUserId);

  assert(dashboardData.stats.totalTestsTaken >= 1, 'Total tests taken recorded', dashboardData.stats.totalTestsTaken);
  assert(dashboardData.stats.totalQuestionsPracticed === 2, 'Questions practiced is 2', dashboardData.stats.totalQuestionsPracticed);
  assert(dashboardData.stats.overallAccuracy === 50, 'Overall accuracy calculated accurately at 50%', dashboardData.stats.overallAccuracy);
  assert(dashboardData.stats.totalStudyTimeSeconds === 40, 'Total study time recorded at 40s', dashboardData.stats.totalStudyTimeSeconds);
  assert(dashboardData.stats.currentStreakDays >= 1, 'Current streak days computed', dashboardData.stats.currentStreakDays);
  assert(dashboardData.recentAttempts.length >= 1, 'Recent attempts list populated', dashboardData.recentAttempts.length);
  assert(dashboardData.recentAttempts[0].testTitle === mockTest.title, 'Recent attempt matches test title', dashboardData.recentAttempts[0].testTitle);

  // Verify Recommendation Engine
  assert(dashboardData.weakestTopics.length >= 1, 'Weakest topics identified from errors', dashboardData.weakestTopics.length);
  assert(dashboardData.dailyRecommendation.topicName !== '', 'Daily recommendation provides clear topic', dashboardData.dailyRecommendation.topicName);
  assert(dashboardData.dailyRecommendation.reason.length > 10, 'Daily recommendation includes actionable rationale');

  // ----------------------------------------------------
  // Test 3: Mistakes Hub Retrieval & Deduplication
  // ----------------------------------------------------
  console.log('\n--- Test 3: Mistakes Hub Retrieval & Deduplication ---');
  const mistakes = await getStudentMistakes(testUserId);

  assert(mistakes.length >= 1, 'Mistakes hub retrieved failed/skipped questions', mistakes.length);
  const foundQ1Mistake = mistakes.find((m) => m.questionId === (q1.question_id || q1.id));
  assert(!!foundQ1Mistake, 'Specific incorrect question found in mistakes repository');
  assert(foundQ1Mistake?.lastSelectedOption === q1WrongOpt, 'Recorded last selected wrong option matches student choice', foundQ1Mistake?.lastSelectedOption);
  assert((foundQ1Mistake?.timesIncorrect ?? 0) >= 1, 'Error frequency counter tracked accurately', foundQ1Mistake?.timesIncorrect);

  // Test filter by search text
  const searchMatch = await getStudentMistakes(testUserId, {
    search: q1.question_snapshot.question_text.slice(0, 10),
  });
  assert(searchMatch.length >= 1, 'Search filter matches mistake question text');

  const searchMismatch = await getStudentMistakes(testUserId, {
    search: 'XYZNonExistentStatement12345',
  });
  assert(searchMismatch.length === 0, 'Non-matching search returns 0 results');

  // ----------------------------------------------------
  // Test 4: Bookmarks Hub with Full Question Details
  // ----------------------------------------------------
  console.log('\n--- Test 4: Bookmarks Hub with Details ---');
  const bookmarkedQ = MOCK_QUESTIONS[0];
  await toggleBookmark(testUserId, bookmarkedQ.id);

  const userBookmarks = await getStudentBookmarksWithDetails(testUserId);
  assert(userBookmarks.length >= 1, 'Bookmarks hub returned saved questions', userBookmarks.length);
  const foundBookmark = userBookmarks.find((b) => b.questionId === bookmarkedQ.id);
  assert(!!foundBookmark, 'Found bookmarked question in details list');
  assert((foundBookmark?.question.options.length ?? 0) >= 4, 'Bookmarked question preserves complete options list');
  assert(foundBookmark?.examName !== '', 'Bookmarked question taxonomy resolved (exam name)', foundBookmark?.examName);

  // ----------------------------------------------------
  // Test 5: Attempt History Chronological Log
  // ----------------------------------------------------
  console.log('\n--- Test 5: Attempt History Chronological Log ---');
  const history = await getStudentAttemptsHistory(testUserId);
  assert(history.length >= 1, 'History returned test attempts list', history.length);
  assert(history[0].id === attempt.id, 'Newest attempt is first in chronological order');
  assert(history[0].status === 'completed', 'Completed status indicated in history');

  const mockHistoryOnly = await getStudentAttemptsHistory(testUserId, { testType: 'mock_test' });
  assert(mockHistoryOnly.length >= 1, 'Filtered history by testType mock_test works');

  // ----------------------------------------------------
  // Test 6: 1-Click Targeted Practice Generation
  // ----------------------------------------------------
  console.log('\n--- Test 6: 1-Click Targeted Practice Generation ---');

  // Launch Bookmarks practice
  const bookmarksPractice = await startBookmarksPracticeSession(testUserId, [bookmarkedQ.id]);
  assert(bookmarksPractice.status === 'in_progress', 'Bookmarks practice session initialized as in_progress');
  assert(bookmarksPractice.total_questions === 1, 'Bookmarks practice contains exactly selected question', bookmarksPractice.total_questions);
  assert(bookmarksPractice.test === null, 'Bookmarks practice is dynamic (null test_id)');

  // Launch Mistakes practice
  const mistakeQId = q1.question_id || q1.id;
  const mistakesPractice = await startMistakesHubPracticeSession(testUserId, [mistakeQId]);
  assert(mistakesPractice.status === 'in_progress', 'Mistakes practice session initialized as in_progress');
  assert(mistakesPractice.total_questions === 1, 'Mistakes practice contains exactly selected mistake question');
  assert(mistakesPractice.questions[0].selected_option === null, 'Mistakes practice resets option to null for clean re-attempt');

  console.log('\n==================================================');
  console.log(`📊 PHASE 7 RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('==================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase7Verification().catch((err) => {
  console.error('Fatal error in Phase 7 verification:', err);
  process.exit(1);
});
