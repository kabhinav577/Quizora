import { Question } from '@/types/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { QuestionFormSchema, QuestionFormInput } from '@/schemas/question';
import { MOCK_QUESTIONS } from '@/services/mockData';
import { MOCK_TEST_QUESTIONS } from '@/services/tests';
import {
  getStoredQuestions,
  saveStoredQuestions,
  getStoredSubjects,
  getStoredTopics,
  getStoredExams,
  getStoredTestQuestions,
  saveStoredTestQuestions,
  getStoredBookmarks,
  saveStoredBookmarks,
  getStoredAttemptQuestions,
  saveStoredAttemptQuestions,
} from '@/lib/storage/diskStore';

export interface QuestionFilters {
  examId?: string;
  examIds?: string[];
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

/**
 * Enriches questions with subject_name, topic_name, and exam_names from stored taxonomies
 */
export function enrichQuestionTaxonomy(q: Question): Question {
  const subjects = getStoredSubjects();
  const topics = getStoredTopics();
  const exams = getStoredExams();

  const sub = subjects.find((s) => s.id === q.subject_id);
  const top = q.topic_id ? topics.find((t) => t.id === q.topic_id) : undefined;
  const examIds = q.exam_ids && q.exam_ids.length > 0 ? q.exam_ids : [q.exam_id];
  const examNames = examIds
    .map((id) => exams.find((e) => e.id === id)?.name)
    .filter((n): n is string => Boolean(n));

  return {
    ...q,
    exam_ids: examIds,
    exam_name: examNames[0] || undefined,
    exam_names: examNames.length > 0 ? examNames : undefined,
    subject_name: q.subject_name || sub?.name || 'General',
    topic_name: q.topic_name || top?.name || undefined,
  };
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

  const subjects = getStoredSubjects();
  const topics = getStoredTopics();
  const exams = getStoredExams();
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const topicMap = new Map(topics.map((t) => [t.id, t.name]));
  const examMap = new Map(exams.map((e) => [e.id, e.name]));

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from('questions').select('*', { count: 'exact' });

    if (examId) query = query.or(`exam_id.eq.${examId},exam_ids.cs.{${examId}}`);
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
      let filtered = (data as Question[]).map((q) => {
        const examIds = q.exam_ids && q.exam_ids.length > 0 ? q.exam_ids : [q.exam_id];
        const examNames = examIds.map((id) => examMap.get(id)).filter((n): n is string => Boolean(n));
        return {
          ...q,
          exam_ids: examIds,
          exam_names: examNames.length > 0 ? examNames : undefined,
          subject_name: subjectMap.get(q.subject_id) || q.subject_name || 'General',
          topic_name: (q.topic_id ? topicMap.get(q.topic_id) : undefined) || q.topic_name,
        };
      });

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
    // fallback to disk storage below
  }

  // Local persistent disk storage fallback
  const localQuestions = getStoredQuestions();
  const normalizedSearch = search?.trim().toLowerCase();

  let items = localQuestions.map((q) => {
    const examIds = q.exam_ids && q.exam_ids.length > 0 ? q.exam_ids : [q.exam_id];
    const examNames = examIds.map((id) => examMap.get(id)).filter((n): n is string => Boolean(n));
    return {
      ...q,
      exam_ids: examIds,
      exam_names: examNames.length > 0 ? examNames : undefined,
      subject_name: subjectMap.get(q.subject_id) || q.subject_name || 'General',
      topic_name: (q.topic_id ? topicMap.get(q.topic_id) : undefined) || q.topic_name,
    };
  });

  if (examId) {
    items = items.filter((q) => q.exam_id === examId || (Array.isArray(q.exam_ids) && q.exam_ids.includes(examId)));
  }
  if (subjectId) items = items.filter((q) => q.subject_id === subjectId);
  if (topicId) items = items.filter((q) => q.topic_id === topicId);
  if (difficulty) items = items.filter((q) => q.difficulty === difficulty);
  if (status) items = items.filter((q) => q.status === status);

  // Subject-wise and content-wise smart search
  if (normalizedSearch) {
    items = items.filter((q) => {
      const textMatch = q.question_text.toLowerCase().includes(normalizedSearch);
      const subMatch = (q.subject_name || '').toLowerCase().includes(normalizedSearch);
      const topMatch = (q.topic_name || '').toLowerCase().includes(normalizedSearch);
      const explMatch = (q.explanation || '').toLowerCase().includes(normalizedSearch);
      const srcMatch = (q.source_name || '').toLowerCase().includes(normalizedSearch);
      return textMatch || subMatch || topMatch || explMatch || srcMatch;
    });
  }

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
  const localQuestions = getStoredQuestions();

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('questions').select('*').eq('id', id).single();
    if (!error && data) {
      return enrichQuestionTaxonomy(data as Question);
    }
  } catch {
    // fallback
  }

  const found = localQuestions.find((q) => q.id === id);
  return found ? enrichQuestionTaxonomy(found) : null;
}

export async function createQuestion(input: QuestionFormInput, createdBy?: string): Promise<Question> {
  // Validate schema before persisting
  const parsed = QuestionFormSchema.parse(input);

  const rawExamIds = (input as { exam_ids?: string[] }).exam_ids;
  const examIds = rawExamIds && rawExamIds.length > 0 ? Array.from(new Set(rawExamIds)) : [parsed.exam_id];
  const letterMap = ['A', 'B', 'C', 'D', 'E'] as const;
  const correctOptionNumber = parsed.correct_option as 1 | 2 | 3 | 4 | 5;
  const correctLetter = (parsed.correct_option_letter || letterMap[correctOptionNumber - 1] || 'A') as 'A' | 'B' | 'C' | 'D' | 'E';

  const newQuestion: Question = {
    ...parsed,
    id: crypto.randomUUID(),
    exam_id: examIds[0] || parsed.exam_id,
    exam_ids: examIds,
    topic_id: parsed.topic_id || null,
    question_image_path: parsed.question_image_path || null,
    code_language: parsed.code_language || null,
    code_content: parsed.code_content || null,
    explanation: parsed.explanation || null,
    default_time_seconds: parsed.default_time_seconds || null,
    source_name: parsed.source_name || null,
    source_year: parsed.source_year || null,
    created_by: createdBy || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    correct_option: correctOptionNumber,
    correct_option_letter: correctLetter,
    options: parsed.options as Question['options'],
  };

  const enriched = enrichQuestionTaxonomy(newQuestion);
  const localQuestions = getStoredQuestions();

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('questions').insert(newQuestion).select().single();
    if (!error && data) {
      const persisted = enrichQuestionTaxonomy(data as Question);
      const updated = [persisted, ...localQuestions.filter((q) => q.id !== persisted.id)];
      saveStoredQuestions(updated);
      return persisted;
    }
  } catch {
    // fallback
  }

  const updated = [enriched, ...localQuestions];
  saveStoredQuestions(updated);
  return enriched;
}

export async function updateQuestion(id: string, input: Partial<QuestionFormInput>): Promise<Question | null> {
  const existing = await getQuestionById(id);
  if (!existing) return null;

  const merged = {
    ...existing,
    ...input,
    updated_at: new Date().toISOString(),
  };

  const localQuestions = getStoredQuestions();

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('questions').update(merged).eq('id', id).select().single();
    if (!error && data) {
      const updatedItem = enrichQuestionTaxonomy(data as Question);
      const updated = localQuestions.map((q) => (q.id === id ? updatedItem : q));
      saveStoredQuestions(updated);
      return updatedItem;
    }
  } catch {
    // fallback
  }

  const updatedItem = enrichQuestionTaxonomy(merged as Question);
  const updated = localQuestions.map((q) => (q.id === id ? updatedItem : q));
  saveStoredQuestions(updated);
  return updatedItem;
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
    code_language: orig.code_language || null,
    code_content: orig.code_content || null,
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

/**
 * Permanently deletes a single question by ID.
 */
export async function deleteQuestion(id: string): Promise<boolean> {
  const res = await bulkDeleteQuestions([id]);
  return res.count > 0;
}

/**
 * Permanently bulk deletes multiple questions by their IDs.
 * Cleans up references in questions, test_questions, attempt_questions, and bookmarks.
 */
export async function bulkDeleteQuestions(ids: string[]): Promise<{ count: number; success: boolean }> {
  if (!ids || ids.length === 0) return { count: 0, success: true };

  const idSet = new Set(ids);

  // 1. Supabase deletion (if connected)
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from('test_questions').delete().in('question_id', ids);
    await supabase.from('attempt_questions').delete().in('question_id', ids);
    await supabase.from('bookmarks').delete().in('question_id', ids);
    await supabase.from('questions').delete().in('id', ids);
  } catch {
    // fallback to disk store
  }

  // 2. Disk store deletion
  const localQuestions = getStoredQuestions();
  const initialCount = localQuestions.length;
  const filteredQuestions = localQuestions.filter((q) => !idSet.has(q.id));
  const deletedCount = initialCount - filteredQuestions.length;

  saveStoredQuestions(filteredQuestions);

  // Clean cascading records from disk
  const localTestQuestions = getStoredTestQuestions();
  saveStoredTestQuestions(localTestQuestions.filter((tq) => !idSet.has(tq.question_id)));

  const localBookmarks = getStoredBookmarks();
  saveStoredBookmarks(localBookmarks.filter((bm) => !idSet.has(bm.question_id)));

  const localAttemptQuestions = getStoredAttemptQuestions();
  saveStoredAttemptQuestions(
    localAttemptQuestions.filter((aq) => !aq.question_id || !idSet.has(aq.question_id))
  );

  return { count: deletedCount, success: true };
}

/**
 * Bulk deletes all questions belonging to a specific source/batch name.
 */
export async function bulkDeleteQuestionsBySource(sourceName: string): Promise<{ count: number; success: boolean }> {
  const localQuestions = getStoredQuestions();
  const targetIds = localQuestions
    .filter((q) => q.source_name === sourceName)
    .map((q) => q.id);

  if (targetIds.length === 0) {
    return { count: 0, success: true };
  }

  return bulkDeleteQuestions(targetIds);
}

/**
 * Returns a summary of question sources and their counts for bulk management.
 */
export async function getQuestionSources(): Promise<{ source_name: string; count: number }[]> {
  const localQuestions = getStoredQuestions();
  const map: Record<string, number> = {};
  for (const q of localQuestions) {
    const src = q.source_name || 'Unspecified / Manual Entry';
    map[src] = (map[src] || 0) + 1;
  }
  return Object.entries(map).map(([source_name, count]) => ({ source_name, count }));
}

/**
 * Resets questions to only the 5 clean sample questions (MOCK_QUESTIONS),
 * cleaning up orphan test questions, attempts, and bookmarks.
 */
export async function resetQuestionsToSample(): Promise<{ count: number; success: boolean }> {
  // 1. Reset questions
  saveStoredQuestions(MOCK_QUESTIONS);

  // 2. Reset test questions
  const sampleQuestionIds = new Set(MOCK_QUESTIONS.map((q) => q.id));
  const validTestQuestions = MOCK_TEST_QUESTIONS.filter((tq) => sampleQuestionIds.has(tq.question_id));
  saveStoredTestQuestions(validTestQuestions);

  // 3. Clean bookmarks
  const localBookmarks = getStoredBookmarks();
  saveStoredBookmarks(localBookmarks.filter((bm) => sampleQuestionIds.has(bm.question_id)));

  // 4. Invalidate global memory cache
  if (typeof globalThis !== 'undefined') {
    globalThis.__diskQuestions = [...MOCK_QUESTIONS];
    globalThis.__diskTestQuestions = [...validTestQuestions];
  }

  // 5. Supabase attempt if configured
  try {
    const supabase = await createServerSupabaseClient();
    const allSampleIds = MOCK_QUESTIONS.map((q) => q.id);
    await supabase.from('questions').delete().not('id', 'in', `(${allSampleIds.join(',')})`);
  } catch {
    // fallback
  }

  return { count: MOCK_QUESTIONS.length, success: true };
}
