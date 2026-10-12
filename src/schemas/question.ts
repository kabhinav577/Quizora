import { z } from 'zod';

/**
 * Validates a single answer option.
 * Requirement: At least one of text or image_path must be non-empty. Both may be provided.
 */
export const QuestionOptionSchema = z
  .object({
    text: z.string().trim().nullable().transform((val) => (val && val.length > 0 ? val : null)),
    image_path: z.string().trim().nullable().transform((val) => (val && val.length > 0 ? val : null)),
  })
  .refine(
    (data) => (data.text !== null && data.text.trim().length > 0) || (data.image_path !== null && data.image_path.trim().length > 0),
    {
      message: 'Each option must contain at least text or an image.',
    }
  );

/**
 * Validates the options array:
 * Requirement: Exactly 4 or 5 options.
 */
export const QuestionOptionsSchema = z
  .array(QuestionOptionSchema)
  .min(4, { message: 'A question must have at least 4 options (A, B, C, D).' })
  .max(5, { message: 'A question can have at most 5 options (A, B, C, D, E).' })
  .refine(
    (options) => {
      // Check for duplicate text among text-only options
      const textOptions = options
        .filter((opt) => opt.text && !opt.image_path)
        .map((opt) => opt.text!.trim().toLowerCase());
      const uniqueTexts = new Set(textOptions);
      return uniqueTexts.size === textOptions.length;
    },
    {
      message: 'Text-only options cannot have duplicate values.',
    }
  );

/**
 * Question Schema for creation and editing
 */
export const QuestionFormSchema = z
  .object({
    exam_id: z.string().uuid({ message: 'Valid Exam selection is required.' }),
    exam_ids: z.array(z.string().uuid()).optional(),
    subject_id: z.string().uuid({ message: 'Valid Subject selection is required.' }),
    topic_id: z.string().uuid().nullable().optional(),
    question_type: z.literal('single_select').optional().default('single_select'),
    question_text: z.string().trim().min(3, { message: 'Question text must be at least 3 characters.' }),
    question_image_path: z.string().trim().nullable().optional(),
    code_language: z.string().trim().nullable().optional(),
    code_content: z.string().nullable().optional(),
    options: QuestionOptionsSchema,
    correct_option: z.coerce
      .number()
      .int()
      .min(1, { message: 'Correct option must be at least 1 (A).' })
      .max(5, { message: 'Correct option cannot exceed 5 (E).' }),
    correct_option_letter: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
    explanation: z.string().trim().nullable().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
    default_time_seconds: z.coerce.number().int().positive().nullable().optional(),
    marks: z.coerce.number().positive().optional().default(1.0),
    negative_marks: z.coerce.number().min(0).optional().default(0.0),
    source_name: z.string().trim().nullable().optional(),
    source_year: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
    status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
  })
  .superRefine((data, ctx) => {
    if (data.correct_option > data.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Correct option cannot exceed the number of available options.',
        path: ['correct_option'],
      });
    }
    validateCodeQuestionRules(data, ctx);
  });

export type QuestionFormInput = z.input<typeof QuestionFormSchema>;
export type QuestionFormOutput = z.output<typeof QuestionFormSchema>;

const coerceText = z.preprocess((val) => {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}, z.string().nullable().optional());

const coerceCodeContent = z.preprocess((val) => {
  if (val === null || val === undefined) return null;
  const s = String(val);
  return s.trim().length > 0 ? s : null;
}, z.string().nullable().optional());

function validateCodeQuestionRules(
  data: { question_text?: string; code_language?: string | null; code_content?: string | null },
  ctx: z.RefinementCtx
) {
  const text = data.question_text || '';
  const placeholderCount = (text.match(/\{\{CODE\}\}/g) || []).length;
  if (placeholderCount > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Only one {{CODE}} placeholder is supported per question in V2.',
      path: ['question_text'],
    });
  }

  const hasCodeContent = Boolean(data.code_content && data.code_content.trim().length > 0);
  const hasCodeLanguage = Boolean(data.code_language && data.code_language.trim().length > 0);

  if (placeholderCount === 1) {
    if (!hasCodeLanguage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'code_language is required when {{CODE}} placeholder is used.',
        path: ['code_language'],
      });
    }
    if (!hasCodeContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'code_content is required when {{CODE}} placeholder is used.',
        path: ['code_content'],
      });
    }
  }

  if (hasCodeContent) {
    if (placeholderCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Code content exists but {{CODE}} placeholder is missing from question_text.',
        path: ['question_text'],
      });
    }
    if (!hasCodeLanguage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'code_content is present but code_language is empty.',
        path: ['code_language'],
      });
    }
  }

  if (hasCodeLanguage && !hasCodeContent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'code_language is present but code_content is empty.',
      path: ['code_content'],
    });
  }
}

const coerceRequiredText = (fieldName: string) =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  }, z.string().min(1, { message: `${fieldName} is required.` }));

export const DifficultySchema = z.preprocess((val) => {
  if (!val || String(val).trim() === '') return 'medium';
  const s = String(val).trim().toLowerCase();
  if (['easy', 'basic', 'beginner', 'simple', 'low', '1'].includes(s)) return 'easy';
  if (['medium', 'intermediate', 'moderate', 'normal', '2'].includes(s)) return 'medium';
  if (['hard', 'expert', 'advanced', 'difficult', 'high', 'complex', '3'].includes(s)) return 'hard';
  return s; // keep invalid string so z.enum rejects it with validation error
}, z.enum(['easy', 'medium', 'hard'], {
  message: 'Invalid difficulty. Must be easy, medium, or hard.',
}));

const coercePositiveNumber = (fieldName: string, defaultVal: number) =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return defaultVal;
    const n = Number(val);
    return isNaN(n) ? val : n;
  }, z.number({ message: `${fieldName} must be a valid number.` }).positive({ message: `${fieldName} must be a positive number.` }).default(defaultVal));

const coerceNonNegativeNumber = (fieldName: string, defaultVal: number) =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return defaultVal;
    const n = Number(val);
    return isNaN(n) ? val : n;
  }, z.number({ message: `${fieldName} must be a valid number.` }).min(0, { message: `${fieldName} cannot be negative.` }).default(defaultVal));

const coerceOptionalPositiveInt = (fieldName: string) =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? val : Math.round(n);
  }, z.number({ message: `${fieldName} must be a valid number.` }).int().positive({ message: `${fieldName} must be a positive integer.` }).nullable().optional());

const coerceOptionalYear = () =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? val : Math.round(n);
  }, z.number({ message: 'Source year must be a valid number.' }).int().min(1950, { message: 'Source year must be between 1950 and 2100.' }).max(2100, { message: 'Source year must be between 1950 and 2100.' }).nullable().optional());

export const OptionLetterSchema = z.preprocess((val) => {
  if (val === null || val === undefined) return '';
  const trimmed = String(val).trim().toUpperCase();
  if (trimmed === '1') return 'A';
  if (trimmed === '2') return 'B';
  if (trimmed === '3') return 'C';
  if (trimmed === '4') return 'D';
  if (trimmed === '5') return 'E';
  return trimmed;
}, z.enum(['A', 'B', 'C', 'D', 'E'], {
  message: 'Correct option must be one of A, B, C, D, or E.',
}));

/**
 * Bulk Import Row Schema (for CSV / Excel)
 */
export const BulkImportRowSchema = z
  .object({
    question_text: coerceRequiredText('Question text'),
    question_image: coerceText,
    code_language: coerceText,
    code_content: coerceCodeContent,
    option_a: coerceText,
    option_a_image: coerceText,
    option_b: coerceText,
    option_b_image: coerceText,
    option_c: coerceText,
    option_c_image: coerceText,
    option_d: coerceText,
    option_d_image: coerceText,
    option_e: coerceText,
    option_e_image: coerceText,
    correct_option: OptionLetterSchema,
    explanation: coerceText,
    exam: coerceRequiredText('Exam'),
    subject: coerceRequiredText('Subject'),
    topic: coerceRequiredText('Topic'),
    difficulty: DifficultySchema,
    default_time_seconds: coerceOptionalPositiveInt('Default time seconds'),
    marks: coercePositiveNumber('Marks', 1.0),
    negative_marks: coerceNonNegativeNumber('Negative marks', 0.0),
    source_name: coerceText,
    source_year: coerceOptionalYear(),
  })
  .superRefine((data, ctx) => {
    // Validate Code Question Rules
    validateCodeQuestionRules(data, ctx);

    // Validate Option A (required)
    if (!data.option_a && !data.option_a_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option A must contain text or an image.',
        path: ['option_a'],
      });
    }
    // Validate Option B (required)
    if (!data.option_b && !data.option_b_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option B must contain text or an image.',
        path: ['option_b'],
      });
    }
    // Validate Option C (required)
    if (!data.option_c && !data.option_c_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option C must contain text or an image.',
        path: ['option_c'],
      });
    }
    // Validate Option D (required)
    if (!data.option_d && !data.option_d_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option D must contain text or an image.',
        path: ['option_d'],
      });
    }

    // Validate that correct_option matches a non-empty option
    const letter = data.correct_option;
    if (letter === 'A' && !data.option_a && !data.option_a_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correct_option is A, but option_a is empty.',
        path: ['correct_option'],
      });
    } else if (letter === 'B' && !data.option_b && !data.option_b_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correct_option is B, but option_b is empty.',
        path: ['correct_option'],
      });
    } else if (letter === 'C' && !data.option_c && !data.option_c_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correct_option is C, but option_c is empty.',
        path: ['correct_option'],
      });
    } else if (letter === 'D' && !data.option_d && !data.option_d_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correct_option is D, but option_d is empty.',
        path: ['correct_option'],
      });
    } else if (letter === 'E' && !data.option_e && !data.option_e_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correct_option is E, but option_e is empty.',
        path: ['correct_option'],
      });
    }
  });

export type BulkImportRow = z.infer<typeof BulkImportRowSchema>;
