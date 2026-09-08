import { QuestionFormSchema, BulkImportRowSchema } from '../src/schemas/question';
import { TestFormSchema, AttemptSubmitSchema } from '../src/schemas/test';

console.log('============================================================');
console.log('QUIZORA PHASE 1 VERIFICATION SUITE');
console.log('============================================================\n');

let passedTests = 0;
let totalTests = 0;

function assertTest(name: string, condition: boolean, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${name} ${details ? `(${details})` : ''}`);
  }
}

const EXAM_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const SUBJECT_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

// 1. TEST 1: Four text options
const test1 = QuestionFormSchema.safeParse({
  exam_id: EXAM_ID,
  subject_id: SUBJECT_ID,
  question_text: 'Which CPU scheduling algorithm may cause starvation?',
  question_image_path: null,
  options: [
    { text: 'FCFS', image_path: null },
    { text: 'Round Robin', image_path: null },
    { text: 'SJF', image_path: null },
    { text: 'Priority Scheduling', image_path: null },
  ],
  correct_option: 3,
  marks: 1,
  negative_marks: 0.25,
});
assertTest('Test 1: 4 text options validation', test1.success);

// 2. TEST 2: Five text options
const test2 = QuestionFormSchema.safeParse({
  exam_id: EXAM_ID,
  subject_id: SUBJECT_ID,
  question_text: 'Which normal form eliminates transitive dependency?',
  question_image_path: null,
  options: [
    { text: '1NF', image_path: null },
    { text: '2NF', image_path: null },
    { text: '3NF', image_path: null },
    { text: 'BCNF', image_path: null },
    { text: 'None of the above', image_path: null },
  ],
  correct_option: 5,
  marks: 1,
  negative_marks: 0.25,
});
assertTest('Test 2: 5 text options with correct_option 5', test2.success);

// 3. TEST 3: Question image + 4 text options
const test3 = QuestionFormSchema.safeParse({
  exam_id: EXAM_ID,
  subject_id: SUBJECT_ID,
  question_text: 'Identify the circuit component displayed below:',
  question_image_path: 'questions/circuit-123.webp',
  options: [
    { text: 'Resistor', image_path: null },
    { text: 'Capacitor', image_path: null },
    { text: 'Inductor', image_path: null },
    { text: 'Diode', image_path: null },
  ],
  correct_option: 2,
  marks: 1,
  negative_marks: 0.25,
});
assertTest('Test 3: Question image + 4 text options', test3.success);

// 4. TEST 4: Question image + 5 text options
const test4 = QuestionFormSchema.safeParse({
  exam_id: EXAM_ID,
  subject_id: SUBJECT_ID,
  question_text: 'Study the following diagram and identify which UML diagrams represent dynamic system workflows.',
  question_image_path: 'questions/uml-workflow-diagram.webp',
  options: [
    { text: 'Activity diagram', image_path: null },
    { text: 'State diagram', image_path: null },
    { text: 'Both (A) and (B)', image_path: null },
    { text: 'More than one of the above', image_path: null },
    { text: 'None of the above', image_path: null },
  ],
  correct_option: 3,
  marks: 1,
  negative_marks: 0.25,
});
assertTest('Test 4: Question image + 5 text options', test4.success);

// 5. TEST 5: Text question + 4 image options
const test5 = QuestionFormSchema.safeParse({
  exam_id: EXAM_ID,
  subject_id: SUBJECT_ID,
  question_text: 'Which logic gate represents an AND gate?',
  question_image_path: null,
  options: [
    { text: null, image_path: 'questions/gates/and.webp' },
    { text: null, image_path: 'questions/gates/or.webp' },
    { text: null, image_path: 'questions/gates/nand.webp' },
    { text: null, image_path: 'questions/gates/xor.webp' },
  ],
  correct_option: 1,
  marks: 1,
  negative_marks: 0.25,
});
assertTest('Test 5: Text question + 4 image options', test5.success);

// 6. TEST 6: Mixed text/image options
const test6 = QuestionFormSchema.safeParse({
  exam_id: EXAM_ID,
  subject_id: SUBJECT_ID,
  question_text: 'Which of the following represents an AVL Tree?',
  question_image_path: 'questions/trees/prompt.webp',
  options: [
    { text: 'Configuration A', image_path: 'questions/trees/tree-a.webp' },
    { text: 'Configuration B', image_path: 'questions/trees/tree-b.webp' },
    { text: 'Both configurations above', image_path: null },
    { text: 'None of the above', image_path: null },
  ],
  correct_option: 2,
  marks: 1,
  negative_marks: 0.25,
});
assertTest('Test 6: Mixed text/image options', test6.success);

// 7. INVALID TEST: 4 options + correct_option = 5 (MUST FAIL)
const test7 = QuestionFormSchema.safeParse({
  exam_id: EXAM_ID,
  subject_id: SUBJECT_ID,
  question_text: 'Invalid 4 options with option 5 correct',
  question_image_path: null,
  options: [
    { text: 'A', image_path: null },
    { text: 'B', image_path: null },
    { text: 'C', image_path: null },
    { text: 'D', image_path: null },
  ],
  correct_option: 5,
  marks: 1,
  negative_marks: 0,
});
assertTest('Test 7 (Invalid rejection): 4 options with correct_option 5 rejected', !test7.success);

// 8. INVALID TEST: 3 options (MUST FAIL)
const test8 = QuestionFormSchema.safeParse({
  exam_id: EXAM_ID,
  subject_id: SUBJECT_ID,
  question_text: 'Invalid 3 options',
  question_image_path: null,
  options: [
    { text: 'A', image_path: null },
    { text: 'B', image_path: null },
    { text: 'C', image_path: null },
  ],
  correct_option: 1,
  marks: 1,
  negative_marks: 0,
});
assertTest('Test 8 (Invalid rejection): 3 options rejected', !test8.success);

// 9. INVALID TEST: Option with neither text nor image (MUST FAIL)
const test9 = QuestionFormSchema.safeParse({
  exam_id: EXAM_ID,
  subject_id: SUBJECT_ID,
  question_text: 'Invalid empty option',
  question_image_path: null,
  options: [
    { text: 'A', image_path: null },
    { text: 'B', image_path: null },
    { text: null, image_path: null },
    { text: 'D', image_path: null },
  ],
  correct_option: 1,
  marks: 1,
  negative_marks: 0,
});
assertTest('Test 9 (Invalid rejection): Option with neither text nor image rejected', !test9.success);

// 10. BULK IMPORT VALIDATION TEST
const test10 = BulkImportRowSchema.safeParse({
  question_text: 'Sample bulk import question',
  option_a: 'Option A text',
  option_b: 'Option B text',
  option_c: 'Option C text',
  option_d: 'Option D text',
  correct_option: 2,
  exam: 'Bihar STET',
  subject: 'Computer Science',
  difficulty: 'medium',
  marks: 1,
  negative_marks: 0.25,
});
assertTest('Test 10: Bulk import valid 4-option row', test10.success);

// 11. BULK IMPORT INVALID ROW: 4 options with correct_option 5
const test11 = BulkImportRowSchema.safeParse({
  question_text: 'Sample bulk import question',
  option_a: 'Option A text',
  option_b: 'Option B text',
  option_c: 'Option C text',
  option_d: 'Option D text',
  correct_option: 5,
  exam: 'Bihar STET',
  subject: 'Computer Science',
});
assertTest('Test 11 (Invalid rejection): Bulk import row with 4 options + correct 5 rejected', !test11.success);

// 12. TEST 12: Test Form Schema validation
const test12 = TestFormSchema.safeParse({
  exam_id: EXAM_ID,
  title: 'Sample Practice Test',
  slug: 'sample-practice-test',
  description: 'Test description',
  test_type: 'practice',
  marks_per_question: 1,
  negative_marks: 0.25,
  shuffle_questions: true,
  shuffle_options: false,
  question_ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'],
});
assertTest('Test 12: TestFormSchema validation', test12.success);

// 13. TEST 13: Attempt Submit Schema validation
const test13 = AttemptSubmitSchema.safeParse({
  attempt_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  answers: [
    {
      question_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      selected_option: 2,
      is_marked_for_review: false,
      time_spent_seconds: 24,
    },
  ],
});
assertTest('Test 13: AttemptSubmitSchema validation', test13.success);

console.log('\n============================================================');
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log('============================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
