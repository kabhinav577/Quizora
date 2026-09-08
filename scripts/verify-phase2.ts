import {
  createQuestion,
  getQuestionById,
  updateQuestion,
  archiveQuestion,
  duplicateQuestion,
  listQuestions,
} from '../src/services/questions';
import { getExams } from '../src/services/exams';
import { getSubjects } from '../src/services/subjects';

console.log('============================================================');
console.log('QUIZORA PHASE 2 VERIFICATION SUITE');
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

async function runPhase2Tests() {
  const exams = await getExams();
  const examId = exams[0]?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const subjects = await getSubjects(examId);
  const subjectId = subjects[0]?.id || 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  // 1. COMBINATION 1: Text question + 4 text options
  const q1 = await createQuestion({
    exam_id: examId,
    subject_id: subjectId,
    question_type: 'single_select',
    question_text: 'Which data structure follows FIFO (First In First Out)?',
    question_image_path: null,
    options: [
      { text: 'Queue', image_path: null },
      { text: 'Stack', image_path: null },
      { text: 'Tree', image_path: null },
      { text: 'Graph', image_path: null },
    ],
    correct_option: 1,
    explanation: 'A Queue operates on a First-In-First-Out (FIFO) discipline.',
    difficulty: 'easy',
    default_time_seconds: 30,
    marks: 1,
    negative_marks: 0.25,
    status: 'published',
  });
  assert('Combination 1: Text question + 4 text options created', Boolean(q1 && q1.id && q1.options.length === 4));

  // 2. COMBINATION 2: Image question + 5 text options
  const q2 = await createQuestion({
    exam_id: examId,
    subject_id: subjectId,
    question_type: 'single_select',
    question_text: 'Identify the state transition pattern shown in the diagram below:',
    question_image_path: 'questions/q2/state-machine.webp',
    options: [
      { text: 'Mealy Machine', image_path: null },
      { text: 'Moore Machine', image_path: null },
      { text: 'Turing Machine', image_path: null },
      { text: 'Pushdown Automaton', image_path: null },
      { text: 'None of the above', image_path: null },
    ],
    correct_option: 2,
    explanation: 'Outputs are associated with states in Moore machines.',
    difficulty: 'hard',
    default_time_seconds: 60,
    marks: 1,
    negative_marks: 0.25,
    status: 'published',
  });
  assert('Combination 2: Image question + 5 text options created', Boolean(q2 && q2.question_image_path && q2.options.length === 5));

  // 3. COMBINATION 3: Text question + 4 image options
  const q3 = await createQuestion({
    exam_id: examId,
    subject_id: subjectId,
    question_type: 'single_select',
    question_text: 'Which circuit diagram represents an exclusive-OR (XOR) gate?',
    question_image_path: null,
    options: [
      { text: null, image_path: 'questions/q3/opt_a.webp' },
      { text: null, image_path: 'questions/q3/opt_b.webp' },
      { text: null, image_path: 'questions/q3/opt_c.webp' },
      { text: null, image_path: 'questions/q3/opt_d.webp' },
    ],
    correct_option: 3,
    explanation: 'Option C shows standard IEEE curved input lines with separated input curve.',
    difficulty: 'medium',
    default_time_seconds: 45,
    marks: 1,
    negative_marks: 0.25,
    status: 'published',
  });
  assert('Combination 3: Text question + 4 image options created', Boolean(q3 && !q3.question_image_path && q3.options.every((o) => o.image_path)));

  // 4. COMBINATION 4: Image question + 4 image options
  const q4 = await createQuestion({
    exam_id: examId,
    subject_id: subjectId,
    question_type: 'single_select',
    question_text: 'Which of the following subnet masks is equivalent to the highlighted CIDR notation /26?',
    question_image_path: 'questions/q4/cidr-diagram.webp',
    options: [
      { text: null, image_path: 'questions/q4/mask_192.webp' },
      { text: null, image_path: 'questions/q4/mask_224.webp' },
      { text: null, image_path: 'questions/q4/mask_240.webp' },
      { text: null, image_path: 'questions/q4/mask_248.webp' },
    ],
    correct_option: 1,
    explanation: '/26 corresponds to 255.255.255.192.',
    difficulty: 'medium',
    default_time_seconds: 45,
    marks: 1,
    negative_marks: 0.25,
    status: 'published',
  });
  assert('Combination 4: Image question + 4 image options created', Boolean(q4 && q4.question_image_path && q4.options.every((o) => o.image_path)));

  // 5. COMBINATION 5: Mixed text/image options (with 5 options)
  const q5 = await createQuestion({
    exam_id: examId,
    subject_id: subjectId,
    question_type: 'single_select',
    question_text: 'Select the graph traversal order for Breadth First Search (BFS):',
    question_image_path: 'questions/q5/graph.webp',
    options: [
      { text: 'A -> B -> C -> D', image_path: 'questions/q5/bfs_order.webp' },
      { text: 'A -> C -> D -> B', image_path: null },
      { text: null, image_path: 'questions/q5/dfs_order.webp' },
      { text: 'More than one valid BFS ordering', image_path: null },
      { text: 'None of the above', image_path: null },
    ],
    correct_option: 4,
    explanation: 'Depending on adjacency list order, multiple valid BFS sequences exist.',
    difficulty: 'hard',
    default_time_seconds: 60,
    marks: 1,
    negative_marks: 0.25,
    status: 'published',
  });
  assert('Combination 5: Mixed text/image options (5 options) created', Boolean(q5 && q5.options.length === 5));

  // 6. CRUD: Get question by id
  const fetched = await getQuestionById(q1.id);
  assert('CRUD: getQuestionById retrieved exact question record', fetched?.id === q1.id);

  // 7. CRUD: Update question
  const updated = await updateQuestion(q1.id, {
    question_text: 'Updated Question: Which data structure follows FIFO?',
    marks: 2.0,
  });
  assert(
    'CRUD: updateQuestion updated question text and marks',
    Boolean(updated?.question_text.startsWith('Updated') && updated?.marks === 2.0)
  );

  // 8. CRUD: Duplicate question
  const duplicate = await duplicateQuestion(q2.id);
  assert('CRUD: duplicateQuestion created independent clone in draft status', Boolean(duplicate && duplicate.id !== q2.id && duplicate.status === 'draft'));

  // 9. CRUD: Archive question
  const archived = await archiveQuestion(q3.id);
  const fetchedArchived = await getQuestionById(q3.id);
  assert('CRUD: archiveQuestion set status to archived', Boolean(archived && fetchedArchived?.status === 'archived'));

  // 10. FILTERING: Filter by hasImage = true
  const imageFiltered = await listQuestions({ hasImage: true });
  assert('Filtering: hasImage=true returns only questions with diagram paths', imageFiltered.questions.every((q) => Boolean(q.question_image_path)));

  // 11. FILTERING: Filter by hasOptionImage = true
  const optImgFiltered = await listQuestions({ hasOptionImage: true });
  assert('Filtering: hasOptionImage=true returns only questions with image options', optImgFiltered.questions.every((q) => q.options.some((o) => Boolean(o.image_path))));

  // 12. FILTERING: Filter by difficulty = hard
  const hardFiltered = await listQuestions({ difficulty: 'hard' });
  assert('Filtering: difficulty=hard filter works accurately', hardFiltered.questions.every((q) => q.difficulty === 'hard'));

  console.log('\n============================================================');
  console.log(`PHASE 2 RESULTS: ${passedTests}/${totalTests} tests passed.`);
  console.log('============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error('Phase 2 verification error:', err);
  process.exit(1);
});
