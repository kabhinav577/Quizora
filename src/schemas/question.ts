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
    subject_id: z.string().uuid({ message: 'Valid Subject selection is required.' }),
    topic_id: z.string().uuid().nullable().optional(),
    question_type: z.literal('single_select').optional().default('single_select'),
    question_text: z.string().trim().min(3, { message: 'Question text must be at least 3 characters.' }),
    question_image_path: z.string().trim().nullable().optional(),
    options: QuestionOptionsSchema,
    correct_option: z.coerce
      .number()
      .int()
      .min(1, { message: 'Correct option must be at least 1 (A).' })
      .max(5, { message: 'Correct option cannot exceed 5 (E).' }),
    explanation: z.string().trim().nullable().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
    default_time_seconds: z.coerce.number().int().positive().nullable().optional(),
    marks: z.coerce.number().positive().optional().default(1.0),
    negative_marks: z.coerce.number().min(0).optional().default(0.0),
    source_name: z.string().trim().nullable().optional(),
    source_year: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
    status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
  })
  .refine((data) => data.correct_option <= data.options.length, {
    message: 'Correct option cannot exceed the number of available options.',
    path: ['correct_option'],
  });

export type QuestionFormInput = z.input<typeof QuestionFormSchema>;
export type QuestionFormOutput = z.output<typeof QuestionFormSchema>;

/**
 * Bulk Import Row Schema (for CSV / Excel)
 */
export const BulkImportRowSchema = z
  .object({
    question_text: z.string().trim().min(1, { message: 'Question text is required.' }),
    question_image: z.string().trim().nullable().optional(),
    option_a: z.string().trim().nullable().optional(),
    option_a_image: z.string().trim().nullable().optional(),
    option_b: z.string().trim().nullable().optional(),
    option_b_image: z.string().trim().nullable().optional(),
    option_c: z.string().trim().nullable().optional(),
    option_c_image: z.string().trim().nullable().optional(),
    option_d: z.string().trim().nullable().optional(),
    option_d_image: z.string().trim().nullable().optional(),
    option_e: z.string().trim().nullable().optional(),
    option_e_image: z.string().trim().nullable().optional(),
    correct_option: z.coerce.number().int().min(1).max(5),
    explanation: z.string().trim().nullable().optional(),
    exam: z.string().trim().min(1, { message: 'Exam name or slug is required.' }),
    subject: z.string().trim().min(1, { message: 'Subject name or slug is required.' }),
    topic: z.string().trim().nullable().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    default_time_seconds: z.coerce.number().int().positive().nullable().optional(),
    marks: z.coerce.number().positive().default(1.0),
    negative_marks: z.coerce.number().min(0).default(0.0),
    source_name: z.string().trim().nullable().optional(),
    source_year: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate Option A
    if (!data.option_a && !data.option_a_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option A must contain text or an image.',
        path: ['option_a'],
      });
    }
    // Validate Option B
    if (!data.option_b && !data.option_b_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option B must contain text or an image.',
        path: ['option_b'],
      });
    }
    // Validate Option C
    if (!data.option_c && !data.option_c_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option C must contain text or an image.',
        path: ['option_c'],
      });
    }
    // Validate Option D
    if (!data.option_d && !data.option_d_image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option D must contain text or an image.',
        path: ['option_d'],
      });
    }

    const hasOptionE = Boolean(data.option_e || data.option_e_image);
    const totalOptions = hasOptionE ? 5 : 4;

    if (data.correct_option > totalOptions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Correct option is ${data.correct_option}, but only ${totalOptions} options are defined.`,
        path: ['correct_option'],
      });
    }
  });

export type BulkImportRow = z.infer<typeof BulkImportRowSchema>;
