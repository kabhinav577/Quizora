import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { QuestionFormSchema, QuestionFormOutput } from '@/schemas/question';
import { createQuestion, listQuestions } from './questions';
import { getExams, createExam } from './exams';
import { getSubjects, createSubject } from './subjects';
import { getTopics, createTopic } from './topics';
import { saveStoredSubjects } from '@/lib/storage/diskStore';

export interface RawImportRow {
  exam?: string;
  subject?: string;
  topic?: string;
  question_text?: string;
  question_image?: string;
  option_a?: string;
  option_a_image?: string;
  option_b?: string;
  option_b_image?: string;
  option_c?: string;
  option_c_image?: string;
  option_d?: string;
  option_d_image?: string;
  option_e?: string;
  option_e_image?: string;
  correct_option?: string | number;
  explanation?: string;
  difficulty?: string;
  default_time_seconds?: string | number;
  marks?: string | number;
  negative_marks?: string | number;
  source_name?: string;
  source_year?: string | number;
}

export interface ImportError {
  rowIndex: number;
  field?: string;
  message: string;
}

export interface ImportDuplicate {
  rowIndex: number;
  questionText: string;
  matchedQuestionId?: string;
  isInternal?: boolean;
}

export interface ValidatedImportItem {
  rowIndex: number;
  parsedInput: QuestionFormOutput;
  referencedImages: string[];
  isDuplicate: boolean;
  duplicateQuestionId?: string;
  examId: string;
  examIds: string[];
  examName: string;
  examNames: string[];
  subjectName: string;
  subjectSlug: string;
  isSubjectNew: boolean;
  topicName: string;
  topicSlug: string;
  isTopicNew: boolean;
  correctOptionLetter?: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface DetectedExam {
  name: string;
  slug: string;
  id: string;
  rowCount: number;
}

export interface DetectedSubject {
  name: string;
  examName: string;
  isNew: boolean;
  rowCount: number;
}

export interface DetectedTopic {
  name: string;
  subjectName: string;
  examName: string;
  isNew: boolean;
  rowCount: number;
}

export interface ValidationReport {
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  imagesFoundCount: number;
  examsDetected: DetectedExam[];
  subjectsDetected: DetectedSubject[];
  topicsDetected: DetectedTopic[];
  items: ValidatedImportItem[];
  errors: ImportError[];
  duplicates: ImportDuplicate[];
}

/**
 * Normalizes option letters A, B, C, D, E to 1, 2, 3, 4, 5
 */
export function normalizeCorrectOption(val: unknown): number {
  if (typeof val === 'number') {
    if (val >= 1 && val <= 5) return val;
    return 0;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim().toUpperCase();
    if (trimmed === 'A' || trimmed === '1') return 1;
    if (trimmed === 'B' || trimmed === '2') return 2;
    if (trimmed === 'C' || trimmed === '3') return 3;
    if (trimmed === 'D' || trimmed === '4') return 4;
    if (trimmed === 'E' || trimmed === '5') return 5;
  }
  return 0;
}

/**
 * Normalizes correct option value to uppercase letter 'A' | 'B' | 'C' | 'D' | 'E'
 */
export function normalizeCorrectOptionLetter(val: unknown): 'A' | 'B' | 'C' | 'D' | 'E' | null {
  const num = normalizeCorrectOption(val);
  const letterMap = ['A', 'B', 'C', 'D', 'E'] as const;
  return num >= 1 && num <= 5 ? letterMap[num - 1] : null;
}

/**
 * Normalizes varied difficulty labels to 'easy', 'medium', or 'hard'
 */
export function normalizeDifficulty(val: unknown): 'easy' | 'medium' | 'hard' {
  if (!val) return 'medium';
  const s = String(val).trim().toLowerCase();
  if (['easy', 'basic', 'beginner', 'simple', 'low', '1'].includes(s)) return 'easy';
  if (['hard', 'expert', 'advanced', 'difficult', 'high', 'complex', '3'].includes(s)) return 'hard';
  return 'medium';
}

function sanitizeRows(rawRows: Record<string, unknown>[]): RawImportRow[] {
  return rawRows.map((row) => {
    const plain: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.replace(/^\uFEFF/, '').trim();
      if (!cleanKey) continue;

      if (value === null || value === undefined) {
        plain[cleanKey] = '';
      } else if (typeof value === 'object') {
        plain[cleanKey] = String(value);
      } else {
        plain[cleanKey] = value as string | number;
      }
    }
    return plain as RawImportRow;
  });
}

/**
 * Parses CSV, XLSX, or ZIP files into raw rows and in-memory image map
 */
export async function parseImportFile(
  file: File | Blob | ArrayBuffer | Uint8Array,
  fileName: string
): Promise<{
  rows: RawImportRow[];
  imagesMap: Map<string, Blob>;
  error?: string;
}> {
  const isZip = fileName.endsWith('.zip');
  const imagesMap = new Map<string, Blob>();

  if (isZip) {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      let spreadsheetEntry: JSZip.JSZipObject | null = null;
      const imagePromises: Promise<void>[] = [];

      zipContent.forEach((relativePath, entry) => {
        const lower = relativePath.toLowerCase();
        if (
          !entry.dir &&
          (lower.endsWith('.xlsx') || lower.endsWith('.csv') || lower.endsWith('.xls')) &&
          !lower.includes('__macosx')
        ) {
          spreadsheetEntry = entry;
        }

        // Collect images
        if (
          !entry.dir &&
          (lower.endsWith('.png') ||
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.webp')) &&
          !lower.includes('__macosx')
        ) {
          const baseName = relativePath.split('/').pop() || relativePath;
          imagePromises.push(
            entry.async('blob').then((blob) => {
              imagesMap.set(baseName.toLowerCase(), blob);
            })
          );
        }
      });

      await Promise.all(imagePromises);

      if (!spreadsheetEntry) {
        return {
          rows: [],
          imagesMap,
          error: 'No Excel (.xlsx) or CSV file found inside the uploaded ZIP archive.',
        };
      }

      const fileBuffer = await (spreadsheetEntry as JSZip.JSZipObject).async('arraybuffer');
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const rows = sanitizeRows(rawRows);

      return { rows, imagesMap };
    } catch (err: unknown) {
      return {
        rows: [],
        imagesMap,
        error: `Failed to unpack ZIP archive: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  } else {
    // Single CSV or XLSX
    try {
      let arrayBuffer: ArrayBuffer;
      if (file instanceof ArrayBuffer) {
        arrayBuffer = file;
      } else if (file instanceof Uint8Array) {
        arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
      } else {
        arrayBuffer = await file.arrayBuffer();
      }
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const rows = sanitizeRows(rawRows);

      return { rows, imagesMap };
    } catch (err: unknown) {
      return {
        rows: [],
        imagesMap,
        error: `Failed to parse spreadsheet: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Validates raw rows against database taxonomies and schema rules (READ-ONLY PREVIEW)
 * Never mutates or auto-inserts subjects/topics into the database during validation.
 */
export async function validateImportData(
  rows: RawImportRow[],
  imagesInput: Map<string, Blob> | string[] | Set<string> = new Map()
): Promise<ValidationReport> {
  const imagesMap: Map<string, unknown> = imagesInput instanceof Map
    ? imagesInput
    : new Map((Array.isArray(imagesInput) ? imagesInput : Array.from(imagesInput)).map((k) => [k.toLowerCase(), true]));

  const [exams, subjects, topics, existingQuestionData] = await Promise.all([
    getExams(false),
    getSubjects(),
    getTopics(),
    listQuestions({ pageSize: 5000 }),
  ]);

  const existingQuestions = existingQuestionData.questions;
  const errors: ImportError[] = [];
  const duplicates: ImportDuplicate[] = [];
  const items: ValidatedImportItem[] = [];

  // Helper map for normalizing strings
  const normalize = (s?: string | null) => s?.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || '';
  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Tracking detected taxonomies and row counts
  const examMap = new Map<string, DetectedExam>();
  const subjectMap = new Map<string, DetectedSubject>();
  const topicMap = new Map<string, DetectedTopic>();

  // In-memory staging registries
  const stagedExams = new Map<string, { id: string; name: string; slug: string; isNew: boolean }>();
  const stagedSubjects = new Map<string, { id: string; name: string; slug: string; examIds: string[]; isNew: boolean }>();
  const stagedTopics = new Map<string, { id: string; name: string; slug: string; subjectId: string; isNew: boolean }>();

  // Intra-file duplicate detector: maps normalized question text to row index
  const fileSeenQuestions = new Map<string, number>();

  for (let idx = 0; idx < rows.length; idx++) {
    const raw = rows[idx];
    const rowIndex = idx + 2; // Excel row numbering (row 1 is header)

    const toStringOrNull = (val: unknown): string | null => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s.length > 0 ? s : null;
    };

    // 1. Basic Question Text Validation
    const questionText = toStringOrNull(raw.question_text);
    if (!questionText) {
      errors.push({ rowIndex, field: 'question_text', message: 'Question text is required.' });
      continue;
    }

    // 2. Exam Validation (Support single exam or multiple delimited by "|")
    const rawExamStr = toStringOrNull(raw.exam);
    if (!rawExamStr) {
      errors.push({ rowIndex, field: 'exam', message: 'Exam is required.' });
      continue;
    }

    const examTokens = rawExamStr
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    const uniqueExamTokens = Array.from(new Set(examTokens));
    if (uniqueExamTokens.length === 0) {
      errors.push({ rowIndex, field: 'exam', message: 'Exam is required.' });
      continue;
    }

    const matchedExams: { id: string; name: string; slug: string; isNew?: boolean }[] = [];

    for (const token of uniqueExamTokens) {
      const norm = normalize(token);
      let match = exams.find(
        (e) => e.id === token || normalize(e.slug) === norm || normalize(e.name) === norm
      );

      if (!match) {
        let staged = stagedExams.get(norm);
        if (!staged) {
          staged = {
            id: crypto.randomUUID(),
            name: token,
            slug: slugify(token),
            isNew: true,
          };
          stagedExams.set(norm, staged);
        }
        match = staged as unknown as typeof exams[0];
      }

      matchedExams.push(match);

      if (!examMap.has(match.id)) {
        examMap.set(match.id, {
          name: match.name,
          slug: match.slug,
          id: match.id,
          rowCount: 1,
        });
      } else {
        examMap.get(match.id)!.rowCount++;
      }
    }

    // 3. Subject Validation (Reusable across exams)
    const rawSubStr = toStringOrNull(raw.subject);
    if (!rawSubStr) {
      errors.push({ rowIndex, field: 'subject', message: 'Subject is required.' });
      continue;
    }

    const normSub = normalize(rawSubStr);
    let resolvedSubject = stagedSubjects.get(normSub);

    if (!resolvedSubject) {
      const existingSub = subjects.find(
        (s) => s.id === rawSubStr || normalize(s.slug) === normSub || normalize(s.name) === normSub
      );

      if (existingSub) {
        resolvedSubject = {
          id: existingSub.id,
          name: existingSub.name,
          slug: existingSub.slug,
          examIds: Array.from(
            new Set([...(existingSub.exam_ids || [existingSub.exam_id]), ...matchedExams.map((e) => e.id)])
          ),
          isNew: false,
        };
      } else {
        resolvedSubject = {
          id: crypto.randomUUID(),
          name: rawSubStr,
          slug: slugify(rawSubStr),
          examIds: matchedExams.map((e) => e.id),
          isNew: true,
        };
      }
      stagedSubjects.set(normSub, resolvedSubject);
    } else {
      resolvedSubject.examIds = Array.from(
        new Set([...(resolvedSubject.examIds || []), ...matchedExams.map((e) => e.id)])
      );
    }

    const subjectDetectKey = resolvedSubject.name;
    if (!subjectMap.has(subjectDetectKey)) {
      subjectMap.set(subjectDetectKey, {
        name: resolvedSubject.name,
        examName: matchedExams.map((e) => e.name).join(' | '),
        isNew: resolvedSubject.isNew,
        rowCount: 1,
      });
    } else {
      subjectMap.get(subjectDetectKey)!.rowCount++;
    }

    // 4. Topic Validation (Reusable under Subject)
    const rawTopicStr = toStringOrNull(raw.topic);
    if (!rawTopicStr) {
      errors.push({ rowIndex, field: 'topic', message: 'Topic is required.' });
      continue;
    }

    const normTopic = normalize(rawTopicStr);
    const topicStageKey = `${resolvedSubject.id}:${normTopic}`;
    let resolvedTopic = stagedTopics.get(topicStageKey);

    if (!resolvedTopic) {
      const existingTopic = topics.find(
        (t) =>
          t.subject_id === resolvedSubject!.id &&
          (t.id === rawTopicStr || normalize(t.slug) === normTopic || normalize(t.name) === normTopic)
      );

      if (existingTopic) {
        resolvedTopic = {
          id: existingTopic.id,
          name: existingTopic.name,
          slug: existingTopic.slug,
          subjectId: resolvedSubject.id,
          isNew: false,
        };
      } else {
        resolvedTopic = {
          id: crypto.randomUUID(),
          name: rawTopicStr,
          slug: slugify(rawTopicStr),
          subjectId: resolvedSubject.id,
          isNew: true,
        };
      }
      stagedTopics.set(topicStageKey, resolvedTopic);
    }

    const topicDetectKey = `${resolvedSubject.id}:${resolvedTopic.name}`;
    if (!topicMap.has(topicDetectKey)) {
      topicMap.set(topicDetectKey, {
        name: resolvedTopic.name,
        subjectName: resolvedSubject.name,
        examName: matchedExams.map((e) => e.name).join(' | '),
        isNew: resolvedTopic.isNew,
        rowCount: 1,
      });
    } else {
      topicMap.get(topicDetectKey)!.rowCount++;
    }

    // 5. Correct Option & Answer Options Validation
    const rawCorrectOptionStr = toStringOrNull(raw.correct_option);
    const correctLetter = normalizeCorrectOptionLetter(rawCorrectOptionStr);
    const correctOptNum = normalizeCorrectOption(rawCorrectOptionStr);

    let hasCorrectOptError = false;
    if (!correctLetter || correctOptNum < 1 || correctOptNum > 5) {
      errors.push({
        rowIndex,
        field: 'correct_option',
        message: 'Correct option must be one of A, B, C, D, or E.',
      });
      hasCorrectOptError = true;
    }

    const optA = toStringOrNull(raw.option_a);
    const optAImg = toStringOrNull(raw.option_a_image);
    const optB = toStringOrNull(raw.option_b);
    const optBImg = toStringOrNull(raw.option_b_image);
    const optC = toStringOrNull(raw.option_c);
    const optCImg = toStringOrNull(raw.option_c_image);
    const optD = toStringOrNull(raw.option_d);
    const optDImg = toStringOrNull(raw.option_d_image);
    const optE = toStringOrNull(raw.option_e);
    const optEImg = toStringOrNull(raw.option_e_image);

    const hasOptA = Boolean(optA || optAImg);
    const hasOptB = Boolean(optB || optBImg);
    const hasOptC = Boolean(optC || optCImg);
    const hasOptD = Boolean(optD || optDImg);
    const hasOptE = Boolean(optE || optEImg);

    if (!hasOptA) {
      errors.push({ rowIndex, field: 'option_a', message: 'Option A must contain text or an image.' });
    }
    if (!hasOptB) {
      errors.push({ rowIndex, field: 'option_b', message: 'Option B must contain text or an image.' });
    }
    if (!hasOptC) {
      errors.push({ rowIndex, field: 'option_c', message: 'Option C must contain text or an image.' });
    }
    if (!hasOptD) {
      errors.push({ rowIndex, field: 'option_d', message: 'Option D must contain text or an image.' });
    }

    // Validate that correct_option identifies a non-empty option
    if (correctLetter && !hasCorrectOptError) {
      if (correctLetter === 'A' && !hasOptA) {
        errors.push({ rowIndex, field: 'correct_option', message: 'correct_option is A, but option_a is empty.' });
      } else if (correctLetter === 'B' && !hasOptB) {
        errors.push({ rowIndex, field: 'correct_option', message: 'correct_option is B, but option_b is empty.' });
      } else if (correctLetter === 'C' && !hasOptC) {
        errors.push({ rowIndex, field: 'correct_option', message: 'correct_option is C, but option_c is empty.' });
      } else if (correctLetter === 'D' && !hasOptD) {
        errors.push({ rowIndex, field: 'correct_option', message: 'correct_option is D, but option_d is empty.' });
      } else if (correctLetter === 'E' && !hasOptE) {
        errors.push({ rowIndex, field: 'correct_option', message: 'correct_option is E, but option_e is empty.' });
      }
    }

    // 6. Difficulty Validation
    const rawDiff = toStringOrNull(raw.difficulty);
    let normDiff: 'easy' | 'medium' | 'hard' = 'medium';
    if (rawDiff) {
      const dLower = rawDiff.toLowerCase();
      if (['easy', 'basic', 'beginner', 'simple', 'low', '1'].includes(dLower)) {
        normDiff = 'easy';
      } else if (['medium', 'intermediate', 'moderate', 'normal', '2'].includes(dLower)) {
        normDiff = 'medium';
      } else if (['hard', 'expert', 'advanced', 'difficult', 'high', 'complex', '3'].includes(dLower)) {
        normDiff = 'hard';
      } else {
        errors.push({
          rowIndex,
          field: 'difficulty',
          message: 'Invalid difficulty. Must be easy, medium, or hard.',
        });
      }
    }

    // 7. Numbers Validation
    let defaultTimeSeconds: number | null = null;
    if (raw.default_time_seconds !== undefined && raw.default_time_seconds !== null && String(raw.default_time_seconds).trim() !== '') {
      const n = Number(raw.default_time_seconds);
      if (isNaN(n) || n <= 0) {
        errors.push({ rowIndex, field: 'default_time_seconds', message: 'Default time seconds must be a positive number.' });
      } else {
        defaultTimeSeconds = Math.round(n);
      }
    }

    let marks = 1.0;
    if (raw.marks !== undefined && raw.marks !== null && String(raw.marks).trim() !== '') {
      const n = Number(raw.marks);
      if (isNaN(n) || n <= 0) {
        errors.push({ rowIndex, field: 'marks', message: 'Marks must be a positive number.' });
      } else {
        marks = n;
      }
    }

    let negativeMarks = 0.0;
    if (raw.negative_marks !== undefined && raw.negative_marks !== null && String(raw.negative_marks).trim() !== '') {
      const n = Number(raw.negative_marks);
      if (isNaN(n) || n < 0) {
        errors.push({ rowIndex, field: 'negative_marks', message: 'Negative marks cannot be negative.' });
      } else {
        negativeMarks = n;
      }
    }

    let sourceYear: number | null = null;
    if (raw.source_year !== undefined && raw.source_year !== null && String(raw.source_year).trim() !== '') {
      const n = Number(raw.source_year);
      if (isNaN(n) || n < 1950 || n > 2100) {
        errors.push({ rowIndex, field: 'source_year', message: 'Source year must be between 1950 and 2100.' });
      } else {
        sourceYear = Math.round(n);
      }
    }

    // 8. Validate referenced images against image package
    const referencedImages: string[] = [];
    const checkImage = (imageRef?: string | null, fieldName?: string) => {
      if (!imageRef) return;
      const ref = imageRef.trim();
      if (!ref) return;
      referencedImages.push(ref);

      const isExternalUrl = ref.startsWith('http://') || ref.startsWith('https://');
      if (!isExternalUrl) {
        const base = (ref.split('/').pop() || ref).toLowerCase();
        if (!imagesMap.has(base)) {
          errors.push({
            rowIndex,
            field: fieldName,
            message: `Referenced image "${ref}" was not found in the uploaded archive.`,
          });
        }
      }
    };

    checkImage(toStringOrNull(raw.question_image), 'question_image');
    checkImage(optAImg, 'option_a_image');
    checkImage(optBImg, 'option_b_image');
    checkImage(optCImg, 'option_c_image');
    checkImage(optDImg, 'option_d_image');
    checkImage(optEImg, 'option_e_image');

    const hasAnyError = errors.some((e) => e.rowIndex === rowIndex);
    if (hasAnyError) continue;

    // 9. Construct Options JSON array (4 or 5 options)
    const optionsArray: QuestionFormOutput['options'] = [
      { text: optA || null, image_path: optAImg || null },
      { text: optB || null, image_path: optBImg || null },
      { text: optC || null, image_path: optCImg || null },
      { text: optD || null, image_path: optDImg || null },
    ];

    if (hasOptE) {
      optionsArray.push({
        text: optE || null,
        image_path: optEImg || null,
      });
    }

    // 10. Duplicate Detection (Intra-file + Database)
    const normText = normalize(questionText);
    const dbDuplicate = existingQuestions.find((q) => normalize(q.question_text) === normText);
    const fileDuplicateRow = fileSeenQuestions.get(normText);

    let isDuplicate = false;
    let dupMatchedId: string | undefined;

    if (dbDuplicate) {
      isDuplicate = true;
      dupMatchedId = dbDuplicate.id;
      duplicates.push({
        rowIndex,
        questionText,
        matchedQuestionId: dbDuplicate.id,
        isInternal: false,
      });
    } else if (fileDuplicateRow !== undefined) {
      isDuplicate = true;
      duplicates.push({
        rowIndex,
        questionText,
        matchedQuestionId: `Row ${fileDuplicateRow}`,
        isInternal: true,
      });
    } else {
      fileSeenQuestions.set(normText, rowIndex);
    }

    // 11. Form Output Object
    const parsedInput = QuestionFormSchema.parse({
      exam_id: matchedExams[0].id,
      exam_ids: matchedExams.map((e) => e.id),
      subject_id: resolvedSubject.id,
      topic_id: resolvedTopic.id,
      question_type: 'single_select',
      question_text: questionText,
      question_image_path: toStringOrNull(raw.question_image) || null,
      options: optionsArray,
      correct_option: correctOptNum || 1,
      correct_option_letter: correctLetter || 'A',
      explanation: toStringOrNull(raw.explanation) || null,
      difficulty: normDiff,
      default_time_seconds: defaultTimeSeconds,
      marks,
      negative_marks: negativeMarks,
      source_name: toStringOrNull(raw.source_name) || null,
      source_year: sourceYear,
      status: 'published',
    });

    items.push({
      rowIndex,
      parsedInput,
      referencedImages,
      isDuplicate,
      duplicateQuestionId: dupMatchedId,
      examId: matchedExams[0].id,
      examIds: matchedExams.map((e) => e.id),
      examName: matchedExams.map((e) => e.name).join(' | '),
      examNames: matchedExams.map((e) => e.name),
      subjectName: resolvedSubject.name,
      subjectSlug: resolvedSubject.slug,
      isSubjectNew: resolvedSubject.isNew,
      topicName: resolvedTopic.name,
      topicSlug: resolvedTopic.slug,
      isTopicNew: resolvedTopic.isNew,
      correctOptionLetter: correctLetter || 'A',
    });
  }

  return {
    totalRows: rows.length,
    validCount: items.length,
    errorCount: errors.length,
    duplicateCount: duplicates.length,
    imagesFoundCount: imagesMap.size,
    examsDetected: Array.from(examMap.values()),
    subjectsDetected: Array.from(subjectMap.values()),
    topicsDetected: Array.from(topicMap.values()),
    items,
    errors,
    duplicates,
  };
}

/**
 * Commits the valid rows to the database.
 * Auto-creates new subjects and topics under their parents if they were marked as new.
 * Reuses questions across multiple exams without duplicating records.
 */
export async function commitBulkImport(
  items: ValidatedImportItem[],
  skipDuplicates = false
): Promise<{ importedCount: number; skippedCount: number }> {
  let importedCount = 0;
  let skippedCount = 0;

  // Filter items
  const itemsToImport = items.filter((item) => {
    if (skipDuplicates && item.isDuplicate) {
      skippedCount++;
      return false;
    }
    return true;
  });

  if (itemsToImport.length === 0) {
    return { importedCount: 0, skippedCount };
  }

  // Load latest exams, subjects, and topics
  const [existingExams, existingSubjects, existingTopics] = await Promise.all([
    getExams(false),
    getSubjects(),
    getTopics(),
  ]);

  const normalize = (s?: string | null) => s?.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || '';
  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // 1. Ensure all exams exist
  const resolvedExamIds = new Map<string, string>();
  for (const item of itemsToImport) {
    for (let i = 0; i < item.examNames.length; i++) {
      const examName = item.examNames[i];
      const normExam = normalize(examName);
      if (!resolvedExamIds.has(normExam)) {
        const match = existingExams.find(
          (e) => normalize(e.name) === normExam || normalize(e.slug) === normExam
        );
        if (match) {
          resolvedExamIds.set(normExam, match.id);
        } else {
          const created = await createExam({
            name: examName,
            slug: slugify(examName),
            description: `Imported exam: ${examName}`,
            is_active: true,
          });
          existingExams.push(created);
          resolvedExamIds.set(normExam, created.id);
        }
      }
    }
  }

  // 2. Ensure subjects exist and are associated with all exams
  const resolvedSubjectIds = new Map<string, string>();
  for (const item of itemsToImport) {
    const normSub = normalize(item.subjectName);
    const itemExamIds = item.examNames
      .map((name) => resolvedExamIds.get(normalize(name)))
      .filter((id): id is string => Boolean(id));

    if (!resolvedSubjectIds.has(normSub)) {
      const match = existingSubjects.find(
        (s) => normalize(s.name) === normSub || normalize(s.slug) === normalize(item.subjectSlug)
      );

      if (match) {
        resolvedSubjectIds.set(normSub, match.id);
        const currentExamIds = Array.isArray(match.exam_ids) ? match.exam_ids : [match.exam_id];
        const mergedExamIds = Array.from(new Set([...currentExamIds, ...itemExamIds]));
        match.exam_ids = mergedExamIds;
        saveStoredSubjects(existingSubjects);
      } else {
        const created = await createSubject({
          exam_id: itemExamIds[0] || item.examId,
          name: item.subjectName,
          slug: item.subjectSlug,
          description: `Imported with ${item.examNames.join(' | ')}`,
          display_order: 1,
          is_active: true,
        });
        created.exam_ids = itemExamIds;
        existingSubjects.push(created);
        saveStoredSubjects(existingSubjects);
        resolvedSubjectIds.set(normSub, created.id);
      }
    }
  }

  // 3. Ensure topics exist under subjects
  const resolvedTopicIds = new Map<string, string>();
  for (const item of itemsToImport) {
    const normSub = normalize(item.subjectName);
    const actualSubjectId = resolvedSubjectIds.get(normSub) || item.parsedInput.subject_id;
    const topicKey = `${actualSubjectId}:${normalize(item.topicName)}`;

    if (!resolvedTopicIds.has(topicKey)) {
      const match = existingTopics.find(
        (t) =>
          t.subject_id === actualSubjectId &&
          (normalize(t.name) === normalize(item.topicName) || normalize(t.slug) === normalize(item.topicSlug))
      );

      if (match) {
        resolvedTopicIds.set(topicKey, match.id);
      } else {
        const created = await createTopic({
          subject_id: actualSubjectId,
          name: item.topicName,
          slug: item.topicSlug,
          description: `Imported topic for ${item.subjectName}`,
          display_order: 1,
          is_active: true,
        });
        existingTopics.push(created);
        resolvedTopicIds.set(topicKey, created.id);
      }
    }
  }

  // 4. Create Questions (Single question record associated with all specified exams!)
  for (const item of itemsToImport) {
    const normSub = normalize(item.subjectName);
    const actualSubjectId = resolvedSubjectIds.get(normSub) || item.parsedInput.subject_id;
    const topicKey = `${actualSubjectId}:${normalize(item.topicName)}`;
    const actualTopicId = resolvedTopicIds.get(topicKey) || item.parsedInput.topic_id;

    const itemExamIds = item.examNames
      .map((name) => resolvedExamIds.get(normalize(name)))
      .filter((id): id is string => Boolean(id));

    const finalExamIds = itemExamIds.length > 0 ? itemExamIds : item.examIds;

    const finalInput: QuestionFormOutput = {
      ...item.parsedInput,
      exam_id: finalExamIds[0],
      exam_ids: finalExamIds,
      subject_id: actualSubjectId,
      topic_id: actualTopicId,
    };

    await createQuestion(finalInput);
    importedCount++;
  }

  return { importedCount, skippedCount };
}

/**
 * Generates sample CSV string for admin download
 * Exactly ordered 23 columns supporting Bihar STET|Bihar TRE 4.0 and A/B/C/D/E correct_option
 */
export function generateSampleCsv(): string {
  const headers = [
    'exam',
    'subject',
    'topic',
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
    'option_e',
    'option_e_image',
    'correct_option',
    'explanation',
    'difficulty',
    'default_time_seconds',
    'marks',
    'negative_marks',
    'source_name',
    'source_year',
  ];

  const sampleRows = [
    [
      '"Bihar STET|Bihar TRE 4.0"',
      '"Computer Science"',
      '"Computer Networks"',
      '"Which layer of the OSI model is responsible for routing packets?"',
      '""',
      '"Application"',
      '""',
      '"Network"',
      '""',
      '"Transport"',
      '""',
      '"Data Link"',
      '""',
      '"Physical"',
      '""',
      '"B"',
      '"The Network Layer provides logical addressing and routing between networks."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026',
    ],
    [
      '"Bihar STET|Bihar TRE 4.0"',
      '"Computer Science"',
      '"Computer Networks"',
      '"Which protocol is connection-oriented?"',
      '""',
      '"UDP"',
      '""',
      '"TCP"',
      '""',
      '"IP"',
      '""',
      '"ICMP"',
      '""',
      '""',
      '""',
      '"B"',
      '"TCP establishes a connection before data transfer."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026',
    ],
    [
      '"Bihar TRE 4.0"',
      '"Computer Science"',
      '"Computer Networks"',
      '"Which technique divides an IP network into smaller logical networks?"',
      '""',
      '"Multiplexing"',
      '""',
      '"Fragmentation"',
      '""',
      '"Subnetting"',
      '""',
      '"Encapsulation"',
      '""',
      '"Switching"',
      '""',
      '"C"',
      '"Subnetting divides a network into smaller subnetworks."',
      '"Medium"',
      '45',
      '1.0',
      '0.25',
      '"Practice"',
      '2026',
    ],
    [
      '"Bihar STET"',
      '"Computer Science"',
      '"Data Structures"',
      '"Which data structure follows the FIFO principle?"',
      '""',
      '"Stack"',
      '""',
      '"Queue"',
      '""',
      '"Tree"',
      '""',
      '"Graph"',
      '""',
      '""',
      '""',
      '"B"',
      '"A queue follows First In First Out (FIFO)."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026',
    ],
    [
      '"Bihar STET|Bihar TRE 4.0"',
      '"Computer Science"',
      '"Operating Systems"',
      '"Which scheduling algorithm uses a fixed time quantum?"',
      '""',
      '"FCFS"',
      '""',
      '"SJF"',
      '""',
      '"Round Robin"',
      '""',
      '"Priority"',
      '""',
      '""',
      '""',
      '"C"',
      '"Round Robin scheduling assigns processes a fixed time quantum."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026',
    ],
    [
      '"Bihar TRE 4.0"',
      '"Computer Science"',
      '"Compiler Design"',
      '"Which compiler phase converts a character stream into tokens?"',
      '""',
      '"Syntax Analysis"',
      '""',
      '"Lexical Analysis"',
      '""',
      '"Semantic Analysis"',
      '""',
      '"Code Generation"',
      '""',
      '""',
      '""',
      '"B"',
      '"Lexical analysis groups characters into tokens."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026',
    ],
    [
      '"Bihar STET|Bihar TRE 4.0"',
      '"Computer Science"',
      '"DBMS"',
      '"Which normal form removes partial functional dependency?"',
      '""',
      '"1NF"',
      '""',
      '"2NF"',
      '""',
      '"3NF"',
      '""',
      '"BCNF"',
      '""',
      '""',
      '""',
      '"B"',
      '"Second Normal Form removes partial dependency on a composite candidate key."',
      '"Medium"',
      '45',
      '1.0',
      '0.25',
      '"Practice"',
      '2026',
    ],
    [
      '"Bihar TRE 4.0"',
      '"Computer Science"',
      '"Algorithms"',
      '"Which algorithm uses divide-and-conquer and has average-case O(n log n) time?"',
      '""',
      '"Bubble Sort"',
      '""',
      '"Selection Sort"',
      '""',
      '"Merge Sort"',
      '""',
      '"Linear Search"',
      '""',
      '""',
      '""',
      '"C"',
      '"Merge Sort uses divide-and-conquer and runs in O(n log n) time."',
      '"Medium"',
      '45',
      '1.0',
      '0.25',
      '"Practice"',
      '2026',
    ],
    [
      '"Bihar STET"',
      '"Computer Science"',
      '"Digital Logic"',
      '"Which gate is known as a universal gate?"',
      '""',
      '"AND"',
      '""',
      '"OR"',
      '""',
      '"XOR"',
      '""',
      '"NAND"',
      '""',
      '""',
      '""',
      '"D"',
      '"NAND and NOR are universal gates. NAND is one of them."',
      '"Easy"',
      '30',
      '1.0',
      '0.25',
      '"Practice"',
      '2026',
    ],
    [
      '"Bihar TRE 4.0"',
      '"Computer Science"',
      '"Computer Networks"',
      '"Which protocol is commonly used to securely transfer files over an SSH connection?"',
      '""',
      '"FTP"',
      '""',
      '"TFTP"',
      '""',
      '"SFTP"',
      '""',
      '"HTTP"',
      '""',
      '"HTTPS"',
      '""',
      '"C"',
      '"SFTP provides secure file transfer over SSH."',
      '"Medium"',
      '45',
      '1.0',
      '0.25',
      '"Practice"',
      '2026',
    ],
  ];

  return [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
}
