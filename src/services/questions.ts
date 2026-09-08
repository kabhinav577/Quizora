import { Question } from '@/types/database';
import { MOCK_QUESTIONS } from './mockData';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { QuestionFormSchema, QuestionFormInput } from '@/schemas/question';

const localQuestions: Question[] = [...MOCK_QUESTIONS];

export interface QuestionFilters {
  examId?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: string;
  status?: string;
  search?: string;
  hasImage?: boolean;
  hasOptionImage?: boolean;
  page?: number;
  pageSize?: number;
}

export interface QuestionListResponse {
  questions: Question[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listQuestions(filters: QuestionFilters = {}): Promise<QuestionListResponse> {
  const {
    examId,
    subjectId,
    topicId,
    difficulty,
    status,
    search,
    hasImage,
    hasOptionImage,
    page = 1,
    pageSize = 10,
  } = filters;

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from('questions').select('*', { count: 'exact' });

    if (examId) query = query.eq('exam_id', examId);
    if (subjectId) query = query.eq('subject_id', subjectId);
    if (topicId) query = query.eq('topic_id', topicId);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('question_text', `%${search}%`);
    if (hasImage === true) query = query.not('question_image_path', 'is', null);
    if (hasImage === false) query = query.is('question_image_path', null);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data && count !== null) {
      let filtered = data as Question[];
      if (hasOptionImage !== undefined) {
        filtered = filtered.filter((q) =>
          hasOptionImage
            ? q.options.some((opt) => Boolean(opt.image_path))
            : q.options.every((opt) => !opt.image_path)
        );
      }
      return {
        questions: filtered,
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      };
    }
  } catch {
    // fallback to localQuestions below
  }

  // Local fallback
  let items = [...localQuestions];
  if (examId) items = items.filter((q) => q.exam_id === examId);
  if (subjectId) items = items.filter((q) => q.subject_id === subjectId);
  if (topicId) items = items.filter((q) => q.topic_id === topicId);
  if (difficulty) items = items.filter((q) => q.difficulty === difficulty);
  if (status) items = items.filter((q) => q.status === status);
  if (search) items = items.filter((q) => q.question_text.toLowerCase().includes(search.toLowerCase()));
  if (hasImage === true) items = items.filter((q) => Boolean(q.question_image_path));
  if (hasImage === false) items = items.filter((q) => !q.question_image_path);
  if (hasOptionImage === true) items = items.filter((q) => q.options.some((opt) => Boolean(opt.image_path)));
  if (hasOptionImage === false) items = items.filter((q) => q.options.every((opt) => !opt.image_path));

  const total = items.length;
  const from = (page - 1) * pageSize;
  const paged = items.slice(from, from + pageSize);

  return {
    questions: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getQuestionById(id: string): Promise<Question | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('questions').select('*').eq('id', id).single();
    if (!error && data) {
      return data as Question;
    }
  } catch {
    // fallback
  }
  return localQuestions.find((q) => q.id === id) || null;
}

export async function createQuestion(input: QuestionFormInput, createdBy?: string): Promise<Question> {
  // Validate schema before persisting
  const parsed = QuestionFormSchema.parse(input);

  const newQuestion: Question = {
    ...parsed,
    id: crypto.randomUUID(),
    topic_id: parsed.topic_id || null,
    question_image_path: parsed.question_image_path || null,
    explanation: parsed.explanation || null,
    default_time_seconds: parsed.default_time_seconds || null,
    source_name: parsed.source_name || null,
    source_year: parsed.source_year || null,
    created_by: createdBy || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    correct_option: parsed.correct_option as 1 | 2 | 3 | 4 | 5,
    options: parsed.options as Question['options'],
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('questions').insert(newQuestion).select().single();
    if (!error && data) {
      localQuestions.unshift(data as Question);
      return data as Question;
    }
  } catch {
    // fallback
  }

  localQuestions.unshift(newQuestion);
  return newQuestion;
}

export async function updateQuestion(id: string, input: Partial<QuestionFormInput>): Promise<Question | null> {
  const existing = await getQuestionById(id);
  if (!existing) return null;

  const merged = {
    ...existing,
    ...input,
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('questions').update(merged).eq('id', id).select().single();
    if (!error && data) {
      const idx = localQuestions.findIndex((q) => q.id === id);
      if (idx !== -1) localQuestions[idx] = data as Question;
      return data as Question;
    }
  } catch {
    // fallback
  }

  const idx = localQuestions.findIndex((q) => q.id === id);
  if (idx !== -1) {
    localQuestions[idx] = merged as Question;
    return localQuestions[idx];
  }
  return null;
}

export async function archiveQuestion(id: string): Promise<boolean> {
  return (await updateQuestion(id, { status: 'archived' })) !== null;
}

export async function duplicateQuestion(id: string): Promise<Question | null> {
  const orig = await getQuestionById(id);
  if (!orig) return null;

  return createQuestion({
    exam_id: orig.exam_id,
    subject_id: orig.subject_id,
    topic_id: orig.topic_id,
    question_type: orig.question_type,
    question_text: `${orig.question_text} (Copy)`,
    question_image_path: orig.question_image_path,
    options: orig.options,
    correct_option: orig.correct_option,
    explanation: orig.explanation,
    difficulty: orig.difficulty,
    default_time_seconds: orig.default_time_seconds,
    marks: orig.marks,
    negative_marks: orig.negative_marks,
    source_name: orig.source_name,
    source_year: orig.source_year,
    status: 'draft',
  });
}
