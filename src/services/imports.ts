import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { BulkImportRowSchema, QuestionFormSchema, QuestionFormOutput } from '@/schemas/question';
import { createQuestion, listQuestions } from './questions';
import { getExams } from './exams';
import { getSubjects } from './subjects';
import { getTopics } from './topics';

export interface RawImportRow {
  question_id?: string;
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
  exam?: string;
  subject?: string;
  topic?: string;
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
  matchedQuestionId: string;
}

export interface ValidatedImportItem {
  rowIndex: number;
  parsedInput: QuestionFormOutput;
  referencedImages: string[];
  isDuplicate: boolean;
  duplicateQuestionId?: string;
}

export interface ValidationReport {
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  imagesFoundCount: number;
  items: ValidatedImportItem[];
  errors: ImportError[];
  duplicates: ImportDuplicate[];
}

/**
 * Normalizes option letters A, B, C, D, E to 1, 2, 3, 4, 5
 */
export function normalizeCorrectOption(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const trimmed = val.trim().toUpperCase();
    if (trimmed === 'A' || trimmed === '1') return 1;
    if (trimmed === 'B' || trimmed === '2') return 2;
    if (trimmed === 'C' || trimmed === '3') return 3;
    if (trimmed === 'D' || trimmed === '4') return 4;
    if (trimmed === 'E' || trimmed === '5') return 5;
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
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
          // Normalize key: get basename (e.g. "Q001.png")
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
 * Validates raw rows against database taxonomies and schema rules
 */
export async function validateImportData(
  rows: RawImportRow[],
  imagesMap: Map<string, Blob>
): Promise<ValidationReport> {
  const [exams, subjects, topics, existingQuestionData] = await Promise.all([
    getExams(false),
    getSubjects(),
    getTopics(),
    listQuestions({ pageSize: 1000 }),
  ]);

  const existingQuestions = existingQuestionData.questions;
  const errors: ImportError[] = [];
  const duplicates: ImportDuplicate[] = [];
  const items: ValidatedImportItem[] = [];

  // Helper map for normalizing strings
  const normalize = (s?: string | null) => s?.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || '';

  rows.forEach((raw, idx) => {
    const rowIndex = idx + 2; // Excel row numbering (row 1 is header)

    const toStringOrNull = (val: unknown): string | null => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s.length > 0 ? s : null;
    };

    // Basic required check
    const questionText = toStringOrNull(raw.question_text);
    if (!questionText) {
      errors.push({ rowIndex, field: 'question_text', message: 'Question text is empty.' });
      return;
    }

    // Match Exam
    const rawExamStr = toStringOrNull(raw.exam);
    const examMatch =
      exams.find(
        (e) =>
          normalize(e.name) === normalize(rawExamStr) ||
          normalize(e.slug) === normalize(rawExamStr)
      ) || (rawExamStr ? null : exams[0]);

    if (!examMatch) {
      errors.push({
        rowIndex,
        field: 'exam',
        message: `Exam "${raw.exam || ''}" could not be matched. Available: ${exams.map((e) => e.name).join(', ')}`,
      });
      return;
    }

    // Match Subject
    const rawSubStr = toStringOrNull(raw.subject);
    const availableSubs = subjects.filter((s) => s.exam_id === examMatch.id);
    const subjectMatch =
      availableSubs.find(
        (s) =>
          normalize(s.name) === normalize(rawSubStr) ||
          normalize(s.slug) === normalize(rawSubStr)
      ) ||
      subjects.find(
        (s) =>
          normalize(s.name) === normalize(rawSubStr) ||
          normalize(s.slug) === normalize(rawSubStr)
      ) ||
      (rawSubStr ? null : availableSubs[0]);

    if (!subjectMatch) {
      errors.push({
        rowIndex,
        field: 'subject',
        message: `Subject "${raw.subject || ''}" not found for exam "${examMatch.name}".`,
      });
      return;
    }

    // Match Topic (Optional)
    const rawTopicStr = toStringOrNull(raw.topic);
    const availableTopics = topics.filter((t) => t.subject_id === subjectMatch.id);
    const topicMatch = rawTopicStr
      ? availableTopics.find(
          (t) =>
            normalize(t.name) === normalize(rawTopicStr) ||
            normalize(t.slug) === normalize(rawTopicStr)
        )
      : null;

    // Normalizing correct option
    const correctOpt = normalizeCorrectOption(raw.correct_option);

    // Build row object for Zod validation
    const rowForZod = {
      question_text: questionText,
      question_image: toStringOrNull(raw.question_image),
      option_a: toStringOrNull(raw.option_a),
      option_a_image: toStringOrNull(raw.option_a_image),
      option_b: toStringOrNull(raw.option_b),
      option_b_image: toStringOrNull(raw.option_b_image),
      option_c: toStringOrNull(raw.option_c),
      option_c_image: toStringOrNull(raw.option_c_image),
      option_d: toStringOrNull(raw.option_d),
      option_d_image: toStringOrNull(raw.option_d_image),
      option_e: toStringOrNull(raw.option_e),
      option_e_image: toStringOrNull(raw.option_e_image),
      correct_option: correctOpt,
      explanation: toStringOrNull(raw.explanation),
      exam: examMatch.name,
      subject: subjectMatch.name,
      topic: topicMatch?.name || rawTopicStr,
      difficulty: normalizeDifficulty(raw.difficulty),
      default_time_seconds:
        raw.default_time_seconds && !isNaN(Number(raw.default_time_seconds))
          ? Number(raw.default_time_seconds)
          : null,
      marks:
        raw.marks && !isNaN(Number(raw.marks)) && Number(raw.marks) > 0
          ? Number(raw.marks)
          : 1.0,
      negative_marks:
        raw.negative_marks && !isNaN(Number(raw.negative_marks))
          ? Number(raw.negative_marks)
          : 0.0,
      source_name: toStringOrNull(raw.source_name),
      source_year:
        raw.source_year && !isNaN(Number(raw.source_year))
          ? Number(raw.source_year)
          : null,
    };

    const zodResult = BulkImportRowSchema.safeParse(rowForZod);
    if (!zodResult.success) {
      zodResult.error.issues.forEach((issue) => {
        errors.push({
          rowIndex,
          field: issue.path.join('.'),
          message: issue.message,
        });
      });
      return;
    }

    // Validate referenced images
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
            message: `Referenced image "${ref}" was not found in the uploaded ZIP archive.`,
          });
        }
      }
    };

    checkImage(rowForZod.question_image, 'question_image');
    checkImage(rowForZod.option_a_image, 'option_a_image');
    checkImage(rowForZod.option_b_image, 'option_b_image');
    checkImage(rowForZod.option_c_image, 'option_c_image');
    checkImage(rowForZod.option_d_image, 'option_d_image');
    checkImage(rowForZod.option_e_image, 'option_e_image');

    // If image validation failed for this row, stop here
    const hasImageError = errors.some((e) => e.rowIndex === rowIndex);
    if (hasImageError) return;

    // Construct Options JSONB array
    const optionsArray = [
      { text: rowForZod.option_a || null, image_path: rowForZod.option_a_image || null },
      { text: rowForZod.option_b || null, image_path: rowForZod.option_b_image || null },
      { text: rowForZod.option_c || null, image_path: rowForZod.option_c_image || null },
      { text: rowForZod.option_d || null, image_path: rowForZod.option_d_image || null },
    ];

    if (rowForZod.option_e || rowForZod.option_e_image) {
      optionsArray.push({
        text: rowForZod.option_e || null,
        image_path: rowForZod.option_e_image || null,
      });
    }

    // Check duplicate against existing questions
    const normText = normalize(rowForZod.question_text);
    const dup = existingQuestions.find((q) => normalize(q.question_text) === normText);
    const isDuplicate = Boolean(dup);

    if (dup) {
      duplicates.push({
        rowIndex,
        questionText: rowForZod.question_text,
        matchedQuestionId: dup.id,
      });
    }

    const parsedInput = QuestionFormSchema.parse({
      exam_id: examMatch.id,
      subject_id: subjectMatch.id,
      topic_id: topicMatch?.id || null,
      question_type: 'single_select',
      question_text: rowForZod.question_text,
      question_image_path: rowForZod.question_image || null,
      options: optionsArray,
      correct_option: correctOpt,
      explanation: rowForZod.explanation || null,
      difficulty: rowForZod.difficulty,
      default_time_seconds: rowForZod.default_time_seconds || null,
      marks: rowForZod.marks,
      negative_marks: rowForZod.negative_marks,
      source_name: rowForZod.source_name || null,
      source_year: rowForZod.source_year || null,
      status: 'published',
    });

    items.push({
      rowIndex,
      parsedInput,
      referencedImages,
      isDuplicate,
      duplicateQuestionId: dup?.id,
    });
  });

  return {
    totalRows: rows.length,
    validCount: items.length,
    errorCount: errors.length,
    duplicateCount: duplicates.length,
    imagesFoundCount: imagesMap.size,
    items,
    errors,
    duplicates,
  };
}

/**
 * Commits the valid rows to the database
 */
export async function commitBulkImport(
  items: ValidatedImportItem[],
  skipDuplicates = false
): Promise<{ importedCount: number; skippedCount: number }> {
  let importedCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    if (skipDuplicates && item.isDuplicate) {
      skippedCount++;
      continue;
    }

    await createQuestion(item.parsedInput);
    importedCount++;
  }

  return { importedCount, skippedCount };
}

/**
 * Generates sample CSV string for admin download
 */
export function generateSampleCsv(): string {
  const headers = [
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
    'exam',
    'subject',
    'topic',
    'difficulty',
    'default_time_seconds',
    'marks',
    'negative_marks',
    'source_name',
    'source_year',
  ];

  const sampleRows = [
    [
      '"Which CPU scheduling algorithm gives minimal average turnaround time?"',
      '""',
      '"First Come First Served (FCFS)"',
      '""',
      '"Shortest Job First (SJF)"',
      '""',
      '"Round Robin (RR)"',
      '""',
      '"Priority Scheduling"',
      '""',
      '""',
      '""',
      '2',
      '"SJF is provably optimal for minimizing average waiting and turnaround time."',
      '"Bihar STET"',
      '"Computer Science"',
      '"Operating Systems"',
      '"medium"',
      '45',
      '1.0',
      '0.25',
      '"Bihar STET"',
      '2024',
    ],
    [
      '"Identify the logic gate corresponding to the diagram in Q002.png"',
      '"images/Q002.png"',
      '"NAND Gate"',
      '""',
      '"NOR Gate"',
      '""',
      '"XOR Gate"',
      '""',
      '"XNOR Gate"',
      '""',
      '"None of the above"',
      '""',
      '1',
      '"An AND gate followed by an inversion bubble represents a NAND gate."',
      '"Bihar STET"',
      '"Computer Science"',
      '"Computer Fundamentals"',
      '"easy"',
      '30',
      '1.0',
      '0.25',
      '"Bihar STET"',
      '2024',
    ],
    [
      '"Which circuit diagram represents an operational amplifier comparator?"',
      '""',
      '""',
      '"images/opamp_a.png"',
      '""',
      '"images/opamp_b.png"',
      '""',
      '"images/opamp_c.png"',
      '""',
      '"images/opamp_d.png"',
      '""',
      '""',
      '3',
      '"Option C shows open-loop op-amp configuration without negative feedback."',
      '"Bihar STET"',
      '"Computer Science"',
      '"Computer Fundamentals"',
      '"hard"',
      '60',
      '1.0',
      '0.25',
      '"GATE"',
      '2023',
    ],
  ];

  return [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
}
