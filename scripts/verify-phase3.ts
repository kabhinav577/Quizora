import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {
  parseImportFile,
  validateImportData,
  commitBulkImport,
  normalizeCorrectOption,
} from '../src/services/imports';
import { getExams } from '../src/services/exams';
import { getSubjects } from '../src/services/subjects';
import { listQuestions } from '../src/services/questions';

console.log('============================================================');
console.log('QUIZORA PHASE 3 VERIFICATION SUITE: BULK IMPORT');
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

async function runPhase3Tests() {
  const exams = await getExams();
  const examName = exams[0]?.name || 'Bihar STET';
  const subjects = await getSubjects(exams[0]?.id);
  const subjectName = subjects[0]?.name || 'Computer Science';

  // 1. TEST 1: Option letter normalization
  assert('Test 1a: normalizeCorrectOption("A") === 1', normalizeCorrectOption('A') === 1);
  assert('Test 1b: normalizeCorrectOption("D") === 4', normalizeCorrectOption('D') === 4);
  assert('Test 1c: normalizeCorrectOption("E") === 5', normalizeCorrectOption('E') === 5);
  assert('Test 1d: normalizeCorrectOption(3) === 3', normalizeCorrectOption(3) === 3);

  // 2. TEST 2: Valid 4-option row in spreadsheet
  const validRows = [
    {
      question_text: 'What is the default subnet mask for Class C IPv4 address?',
      option_a: '255.0.0.0',
      option_b: '255.255.0.0',
      option_c: '255.255.255.0',
      option_d: '255.255.255.255',
      correct_option: 'C',
      exam: examName,
      subject: subjectName,
      difficulty: 'easy',
      marks: 1,
      negative_marks: 0.25,
    },
    // 3. TEST 3: Valid 5-option row
    {
      question_text: 'Which of the following sorting algorithms is stable?',
      option_a: 'Merge Sort',
      option_b: 'Quick Sort',
      option_c: 'Heap Sort',
      option_d: 'Selection Sort',
      option_e: 'None of the above',
      correct_option: 1,
      exam: examName,
      subject: subjectName,
      difficulty: 'medium',
      marks: 1,
      negative_marks: 0.25,
    },
  ];

  const report1 = await validateImportData(validRows, new Map());
  assert('Test 2: 4-option and 5-option spreadsheet rows validate successfully', report1.validCount === 2 && report1.errorCount === 0);

  // 4. TEST 4: Invalid Row - 4 options with correct_option = 5 (MUST FAIL)
  const invalidRow4Opt5 = [
    {
      question_text: 'Invalid 4 options with option 5 correct answer',
      option_a: 'Opt A',
      option_b: 'Opt B',
      option_c: 'Opt C',
      option_d: 'Opt D',
      correct_option: 5,
      exam: examName,
      subject: subjectName,
    },
  ];
  const report2 = await validateImportData(invalidRow4Opt5, new Map());
  assert('Test 4 (Rejection): 4 options with correct_option 5 fails validation', report2.errorCount > 0 && report2.validCount === 0);

  // 5. TEST 5: Invalid Row - Missing Option C text & image (MUST FAIL)
  const invalidRowMissingC = [
    {
      question_text: 'Invalid missing option C',
      option_a: 'Opt A',
      option_b: 'Opt B',
      option_c: '',
      option_c_image: '',
      option_d: 'Opt D',
      correct_option: 1,
      exam: examName,
      subject: subjectName,
    },
  ];
  const report3 = await validateImportData(invalidRowMissingC, new Map());
  assert('Test 5 (Rejection): Missing option text and image fails validation', report3.errorCount > 0);

  // 6. TEST 6: ZIP Import with matched images
  const zip = new JSZip();

  // Create mock questions workbook inside zip
  const wb = XLSX.utils.book_new();
  const wsData = [
    [
      'question_text',
      'question_image',
      'option_a',
      'option_a_image',
      'option_b',
      'option_b_image',
      'option_c',
      'option_c_image',
      'option_d',
      'option_d_image',
      'correct_option',
      'exam',
      'subject',
    ],
    [
      'Identify the circuit diagram in diagram_1.png',
      'images/diagram_1.png',
      'Inverter',
      'images/opt_a.png',
      'Buffer',
      '',
      'Relay',
      '',
      'None',
      '',
      '1',
      examName,
      subjectName,
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  zip.file('questions.xlsx', wbOut);
  zip.file('images/diagram_1.png', new Uint8Array([137, 80, 78, 71])); // PNG magic bytes
  zip.file('images/opt_a.png', new Uint8Array([137, 80, 78, 71]));

  const zipBlob = await zip.generateAsync({ type: 'nodebuffer' });
  const parsedZip = await parseImportFile(zipBlob, 'quizora-import.zip');

  assert('Test 6a: ZIP file parsed correctly', parsedZip.rows.length === 1 && parsedZip.imagesMap.size === 2);

  const reportZip = await validateImportData(parsedZip.rows, parsedZip.imagesMap);
  assert('Test 6b: ZIP question with matched diagram and option images validated', reportZip.validCount === 1 && reportZip.errorCount === 0);

  // 7. TEST 7: ZIP Import with MISSING image reference (MUST FAIL with descriptive error)
  const zipMissingImg = new JSZip();
  const wsDataMissing = [
    [
      'question_text',
      'question_image',
      'option_a',
      'option_b',
      'option_c',
      'option_d',
      'correct_option',
      'exam',
      'subject',
    ],
    [
      'Identify the diagram in ghost_file.png',
      'images/ghost_file.png', // does NOT exist in zip!
      'A',
      'B',
      'C',
      'D',
      '1',
      examName,
      subjectName,
    ],
  ];
  const wsMissing = XLSX.utils.aoa_to_sheet(wsDataMissing);
  const wbMissing = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbMissing, wsMissing, 'Questions');
  zipMissingImg.file('questions.xlsx', XLSX.write(wbMissing, { bookType: 'xlsx', type: 'array' }));

  const zipMissingBlob = await zipMissingImg.generateAsync({ type: 'nodebuffer' });
  const parsedMissingZip = await parseImportFile(zipMissingBlob, 'import-missing.zip');
  const reportMissingImg = await validateImportData(parsedMissingZip.rows, parsedMissingZip.imagesMap);

  const hasMissingImgError = reportMissingImg.errors.some((e) =>
    e.message.toLowerCase().includes('not found in the uploaded zip archive')
  );
  assert('Test 7 (Rejection): Missing ZIP image reference is rejected with row error', hasMissingImgError);

  // 8. TEST 8: Duplicate Detection
  const existingList = await listQuestions({ pageSize: 1 });
  const existingQuestion = existingList.questions[0];

  if (existingQuestion) {
    const dupRow = [
      {
        question_text: existingQuestion.question_text,
        option_a: 'Option A',
        option_b: 'Option B',
        option_c: 'Option C',
        option_d: 'Option D',
        correct_option: 1,
        exam: examName,
        subject: subjectName,
      },
    ];

    const reportDup = await validateImportData(dupRow, new Map());
    assert('Test 8: Potential duplicate question detected and flagged', reportDup.duplicateCount === 1 && reportDup.items[0]?.isDuplicate === true);
  }

  // 9. TEST 9: Commit bulk import
  const commitRes = await commitBulkImport(report1.items, false);
  assert('Test 9: commitBulkImport successfully persists questions into database', commitRes.importedCount === 2);

  console.log('\n============================================================');
  console.log(`PHASE 3 RESULTS: ${passedTests}/${totalTests} tests passed.`);
  console.log('============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error('Phase 3 verification error:', err);
  process.exit(1);
});
