import { z } from 'zod';

export const TestFormSchema = z.object({
  exam_id: z.string().uuid({ message: 'Select an exam.' }),
  title: z.string().trim().min(3, { message: 'Title must be at least 3 characters.' }),
  slug: z
    .string()
    .trim()
    .min(3)
    .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens.' }),
  description: z.string().trim().nullable().optional(),
  test_type: z.enum(['practice', 'mock_test']).default('practice'),
  duration_seconds: z.coerce.number().int().positive().nullable().optional(),
  question_time_seconds: z.coerce.number().int().positive().nullable().optional(),
  marks_per_question: z.coerce.number().positive().default(1.0),
  negative_marks: z.coerce.number().min(0).default(0.0),
  shuffle_questions: z.boolean().default(true),
  shuffle_options: z.boolean().default(false),
  show_result_immediately: z.boolean().default(true),
  show_explanations: z.boolean().default(true),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  question_ids: z.array(z.string().uuid()).min(1, { message: 'At least one question must be selected.' }),
});

export type TestFormInput = z.infer<typeof TestFormSchema>;

export const AttemptSubmitSchema = z.object({
  attempt_id: z.string().uuid(),
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      selected_option: z.number().int().min(1).max(5).nullable(),
      is_marked_for_review: z.boolean().default(false),
      time_spent_seconds: z.number().int().min(0).default(0),
    })
  ),
});

export type AttemptSubmitInput = z.infer<typeof AttemptSubmitSchema>;
