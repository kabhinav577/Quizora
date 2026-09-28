import fs from 'fs';
import path from 'path';
import {
  Question,
  Subject,
  Topic,
  Exam,
  Test,
  TestQuestion,
  Attempt,
  AttemptQuestion,
  Bookmark,
} from '@/types/database';
import { MOCK_EXAMS, MOCK_SUBJECTS, MOCK_TOPICS, MOCK_QUESTIONS } from '@/services/mockData';
import { MOCK_TESTS, MOCK_TEST_QUESTIONS } from '@/services/tests';

const DATA_DIR = path.join(process.cwd(), '.data');

function ensureDataDir(): void {
  if (typeof window !== 'undefined') return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create .data directory:', err);
  }
}

function readJsonFile<T>(filename: string, fallbackData: T[]): T[] {
  if (typeof window !== 'undefined') return fallbackData;
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T[];
    }
    // File doesn't exist yet, seed with initial mock data
    writeJsonFile(filename, fallbackData);
    return fallbackData;
  } catch (err) {
    console.warn(`Could not read ${filename}, using fallback:`, err);
    return fallbackData;
  }
}

function writeJsonFile<T>(filename: string, data: T[]): void {
  if (typeof window !== 'undefined') return;
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const tempPath = `${filePath}.${Date.now()}.tmp`;

  try {
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, jsonStr, 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch {
    try {
      // Fallback direct write if rename fails
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`Failed to write ${filename}:`, e);
    }
  }
}

// Global cache to maintain speed across invocations in same node process
declare global {
  var __diskQuestions: Question[] | undefined;
  var __diskSubjects: Subject[] | undefined;
  var __diskTopics: Topic[] | undefined;
  var __diskExams: Exam[] | undefined;
  var __diskTests: Test[] | undefined;
  var __diskTestQuestions: TestQuestion[] | undefined;
  var __diskAttempts: Attempt[] | undefined;
  var __diskAttemptQuestions: AttemptQuestion[] | undefined;
  var __diskBookmarks: Bookmark[] | undefined;
}

// ----------------- TAXONOMY SANITIZER & MIGRATION -----------------
const CS_SUBJECT_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const CN_TOPIC_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a36';
const COMPILER_TOPIC_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a37';

let hasRunSanitizer = false;

export function sanitizeStoredTaxonomy(): void {
  if (typeof window !== 'undefined') return;
  if (hasRunSanitizer) return;
  hasRunSanitizer = true;

  try {
    ensureDataDir();
    const subjectsPath = path.join(DATA_DIR, 'subjects.json');
    const topicsPath = path.join(DATA_DIR, 'topics.json');
    const questionsPath = path.join(DATA_DIR, 'questions.json');

    if (!fs.existsSync(subjectsPath) && !fs.existsSync(topicsPath)) {
      return;
    }

    const rawSubjects: Subject[] = fs.existsSync(subjectsPath)
      ? JSON.parse(fs.readFileSync(subjectsPath, 'utf-8'))
      : [...MOCK_SUBJECTS];
    const rawTopics: Topic[] = fs.existsSync(topicsPath)
      ? JSON.parse(fs.readFileSync(topicsPath, 'utf-8'))
      : [...MOCK_TOPICS];
    const rawQuestions: Question[] = fs.existsSync(questionsPath)
      ? JSON.parse(fs.readFileSync(questionsPath, 'utf-8'))
      : [...MOCK_QUESTIONS];

    let subjectsChanged = false;
    let topicsChanged = false;
    let questionsChanged = false;

    // Detect erroneous subjects:
    // 1. Test names (e.g. "Compiler Design Test ...", containing "Test <digits>")
    // 2. "Computer Networks" which is a Topic under Computer Science, not a Subject
    const invalidSubjectIds = new Set<string>();
    const cnSubjectIds = new Set<string>();
    const compilerTestSubjectIds = new Set<string>();

    for (const sub of rawSubjects) {
      const isTestName = /test\s*\d+/i.test(sub.name) || /test-\d+/i.test(sub.slug) || sub.name.toLowerCase().startsWith('compiler design test');
      const isComputerNetworksSubject = sub.name.trim().toLowerCase() === 'computer networks' || sub.slug === 'computer-networks';

      if (isTestName) {
        invalidSubjectIds.add(sub.id);
        compilerTestSubjectIds.add(sub.id);
      } else if (isComputerNetworksSubject) {
        invalidSubjectIds.add(sub.id);
        cnSubjectIds.add(sub.id);
      }
    }

    // Topics that belonged to these invalid subjects
    const orphanedTopicIds = new Set<string>();
    for (const top of rawTopics) {
      if (invalidSubjectIds.has(top.subject_id)) {
        orphanedTopicIds.add(top.id);
      }
    }

    // Safely re-point any questions without deleting them
    for (const q of rawQuestions) {
      if (cnSubjectIds.has(q.subject_id) || (q.topic_id && orphanedTopicIds.has(q.topic_id) && cnSubjectIds.has(rawTopics.find(t => t.id === q.topic_id)?.subject_id || ''))) {
        q.subject_id = CS_SUBJECT_ID;
        q.topic_id = CN_TOPIC_ID;
        questionsChanged = true;
      } else if (compilerTestSubjectIds.has(q.subject_id) || (q.topic_id && orphanedTopicIds.has(q.topic_id) && compilerTestSubjectIds.has(rawTopics.find(t => t.id === q.topic_id)?.subject_id || ''))) {
        q.subject_id = CS_SUBJECT_ID;
        q.topic_id = COMPILER_TOPIC_ID;
        questionsChanged = true;
      }
    }

    // Clean subjects: remove invalid subjects
    const sanitizedSubjects = rawSubjects.filter((s) => !invalidSubjectIds.has(s.id));
    if (sanitizedSubjects.length !== rawSubjects.length) {
      subjectsChanged = true;
    }

    // Ensure Computer Science subject exists
    if (!sanitizedSubjects.some((s) => s.id === CS_SUBJECT_ID)) {
      const csMock = MOCK_SUBJECTS.find((s) => s.id === CS_SUBJECT_ID);
      if (csMock) {
        sanitizedSubjects.unshift(csMock);
        subjectsChanged = true;
      }
    }

    // Clean topics: ensure Computer Networks and Compiler Design exist under Computer Science
    const sanitizedTopics = rawTopics.filter((t) => !invalidSubjectIds.has(t.subject_id));

    // Ensure MOCK_TOPICS are all present in sanitizedTopics
    for (const mockTopic of MOCK_TOPICS) {
      const exists = sanitizedTopics.some(
        (t) => t.id === mockTopic.id || (t.subject_id === mockTopic.subject_id && t.slug === mockTopic.slug)
      );
      if (!exists) {
        sanitizedTopics.push(mockTopic);
        topicsChanged = true;
      }
    }

    if (sanitizedTopics.length !== rawTopics.length) {
      topicsChanged = true;
    }

    // Save changes if needed
    if (subjectsChanged) {
      writeJsonFile('subjects.json', sanitizedSubjects);
    }
    if (topicsChanged) {
      writeJsonFile('topics.json', sanitizedTopics);
    }
    if (questionsChanged) {
      writeJsonFile('questions.json', rawQuestions);
    }
  } catch (err) {
    console.error('Failed to run taxonomy sanitizer:', err);
  }
}

// ----------------- QUESTIONS -----------------
export function getStoredQuestions(): Question[] {
  sanitizeStoredTaxonomy();
  return readJsonFile<Question>('questions.json', MOCK_QUESTIONS);
}

export function saveStoredQuestions(questions: Question[]): void {
  writeJsonFile('questions.json', questions);
}

// ----------------- SUBJECTS -----------------
export function getStoredSubjects(): Subject[] {
  sanitizeStoredTaxonomy();
  return readJsonFile<Subject>('subjects.json', MOCK_SUBJECTS);
}

export function saveStoredSubjects(subjects: Subject[]): void {
  writeJsonFile('subjects.json', subjects);
}

// ----------------- TOPICS -----------------
export function getStoredTopics(): Topic[] {
  sanitizeStoredTaxonomy();
  return readJsonFile<Topic>('topics.json', MOCK_TOPICS);
}

export function saveStoredTopics(topics: Topic[]): void {
  writeJsonFile('topics.json', topics);
}

// ----------------- EXAMS -----------------
export function getStoredExams(): Exam[] {
  return readJsonFile<Exam>('exams.json', MOCK_EXAMS);
}

export function saveStoredExams(exams: Exam[]): void {
  writeJsonFile('exams.json', exams);
}

// ----------------- TESTS -----------------
export function getStoredTests(): Test[] {
  return readJsonFile<Test>('tests.json', MOCK_TESTS);
}

export function saveStoredTests(tests: Test[]): void {
  writeJsonFile('tests.json', tests);
}

// ----------------- TEST QUESTIONS -----------------
export function getStoredTestQuestions(): TestQuestion[] {
  return readJsonFile<TestQuestion>('test_questions.json', MOCK_TEST_QUESTIONS);
}

export function saveStoredTestQuestions(testQuestions: TestQuestion[]): void {
  writeJsonFile('test_questions.json', testQuestions);
}

// ----------------- ATTEMPTS -----------------
export function getStoredAttempts(): Attempt[] {
  return readJsonFile<Attempt>('attempts.json', []);
}

export function saveStoredAttempts(attempts: Attempt[]): void {
  writeJsonFile('attempts.json', attempts);
}

// ----------------- ATTEMPT QUESTIONS -----------------
export function getStoredAttemptQuestions(): AttemptQuestion[] {
  return readJsonFile<AttemptQuestion>('attempt_questions.json', []);
}

export function saveStoredAttemptQuestions(attemptQuestions: AttemptQuestion[]): void {
  writeJsonFile('attempt_questions.json', attemptQuestions);
}

// ----------------- BOOKMARKS -----------------
export function getStoredBookmarks(): Bookmark[] {
  return readJsonFile<Bookmark>('bookmarks.json', []);
}

export function saveStoredBookmarks(bookmarks: Bookmark[]): void {
  writeJsonFile('bookmarks.json', bookmarks);
}

