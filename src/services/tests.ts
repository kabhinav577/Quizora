import { Test, TestQuestion, Question } from '@/types/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TestFormInput, TestFormSchema } from '@/schemas/test';
import { getQuestionById } from './questions';

export interface TestWithQuestions extends Test {
  questions: (Question & { question_order: number })[];
}

export const MOCK_TESTS: Test[] = [
  {
    id: '55555555-5555-5555-5555-555555555501',
    exam_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    title: 'Bihar STET Computer Science Full Mock Test 1',
    slug: 'bihar-stet-cs-mock-1',
    description: 'Comprehensive full mock exam simulating real Bihar STET pattern with timed countdown.',
    test_type: 'mock_test',
    duration_seconds: 3600, // 60 mins
    question_time_seconds: null,
    marks_per_question: 1.0,
    negative_marks: 0.25,
    shuffle_questions: true,
    shuffle_options: false,
    show_result_immediately: true,
    show_explanations: true,
    total_questions: 5,
    status: 'published',
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '55555555-5555-5555-5555-555555555502',
    exam_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    title: 'Operating Systems Rapid Practice',
    slug: 'os-rapid-practice',
    description: 'Rapid-fire practice with per-question 30-second timer.',
    test_type: 'practice',
    duration_seconds: null,
    question_time_seconds: 30, // 30s per question
    marks_per_question: 1.0,
    negative_marks: 0.25,
    shuffle_questions: true,
    shuffle_options: false,
    show_result_immediately: true,
    show_explanations: true,
    total_questions: 5,
    status: 'published',
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const MOCK_TEST_QUESTIONS: TestQuestion[] = [
  {
    id: '66666666-6666-6666-6666-666666666601',
    test_id: '55555555-5555-5555-5555-555555555501',
    question_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41',
    question_order: 1,
    marks_override: null,
    negative_marks_override: null,
    time_override_seconds: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666602',
    test_id: '55555555-5555-5555-5555-555555555501',
    question_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42',
    question_order: 2,
    marks_override: null,
    negative_marks_override: null,
    time_override_seconds: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666603',
    test_id: '55555555-5555-5555-5555-555555555501',
    question_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a43',
    question_order: 3,
    marks_override: null,
    negative_marks_override: null,
    time_override_seconds: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666604',
    test_id: '55555555-5555-5555-5555-555555555501',
    question_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    question_order: 4,
    marks_override: null,
    negative_marks_override: null,
    time_override_seconds: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666605',
    test_id: '55555555-5555-5555-5555-555555555501',
    question_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a45',
    question_order: 5,
    marks_override: null,
    negative_marks_override: null,
    time_override_seconds: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const localTests: Test[] = [...MOCK_TESTS];
const localTestQuestions: TestQuestion[] = [...MOCK_TEST_QUESTIONS];

export interface TestFilters {
  examId?: string;
  status?: string;
  testType?: string;
  page?: number;
  pageSize?: number;
}

export async function listTests(filters: TestFilters = {}): Promise<{
  tests: Test[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { examId, status, testType, page = 1, pageSize = 10 } = filters;

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from('tests').select('*', { count: 'exact' });

    if (examId) query = query.eq('exam_id', examId);
    if (status) query = query.eq('status', status);
    if (testType) query = query.eq('test_type', testType);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data && count !== null) {
      return {
        tests: data as Test[],
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      };
    }
  } catch {
    // fallback
  }

  let items = [...localTests];
  if (examId) items = items.filter((t) => t.exam_id === examId);
  if (status) items = items.filter((t) => t.status === status);
  if (testType) items = items.filter((t) => t.test_type === testType);

  const total = items.length;
  const from = (page - 1) * pageSize;
  const paged = items.slice(from, from + pageSize);

  return {
    tests: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getTestById(id: string): Promise<TestWithQuestions | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', id)
      .single();

    if (!testError && testData) {
      const { data: mappings } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', id)
        .order('question_order');

      const questionsList: (Question & { question_order: number })[] = [];
      if (mappings) {
        for (const m of mappings) {
          const q = await getQuestionById(m.question_id);
          if (q) {
            questionsList.push({ ...q, question_order: m.question_order });
          }
        }
      }
      return { ...(testData as Test), questions: questionsList };
    }
  } catch {
    // fallback
  }

  const found = localTests.find((t) => t.id === id);
  if (!found) return null;

  const mappings = localTestQuestions
    .filter((tq) => tq.test_id === id)
    .sort((a, b) => a.question_order - b.question_order);

  const questionsList: (Question & { question_order: number })[] = [];
  for (const m of mappings) {
    const q = await getQuestionById(m.question_id);
    if (q) {
      questionsList.push({ ...q, question_order: m.question_order });
    }
  }

  return { ...found, questions: questionsList };
}

export async function getTestBySlug(slug: string): Promise<TestWithQuestions | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!testError && testData) {
      return getTestById(testData.id);
    }
  } catch {
    // fallback
  }

  const found = localTests.find((t) => t.slug === slug);
  if (!found) return null;
  return getTestById(found.id);
}


export async function createTest(input: TestFormInput, createdBy?: string): Promise<TestWithQuestions> {
  const parsed = TestFormSchema.parse(input);

  const newTest: Test = {
    id: crypto.randomUUID(),
    exam_id: parsed.exam_id,
    title: parsed.title,
    slug: parsed.slug,
    description: parsed.description || null,
    test_type: parsed.test_type,
    duration_seconds: parsed.duration_seconds || null,
    question_time_seconds: parsed.question_time_seconds || null,
    marks_per_question: parsed.marks_per_question,
    negative_marks: parsed.negative_marks,
    shuffle_questions: parsed.shuffle_questions,
    shuffle_options: parsed.shuffle_options,
    show_result_immediately: parsed.show_result_immediately,
    show_explanations: parsed.show_explanations,
    total_questions: parsed.question_ids.length,
    status: parsed.status,
    created_by: createdBy || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data: createdTest, error } = await supabase
      .from('tests')
      .insert(newTest)
      .select()
      .single();

    if (!error && createdTest) {
      const mappings = parsed.question_ids.map((qid, idx) => ({
        id: crypto.randomUUID(),
        test_id: createdTest.id,
        question_id: qid,
        question_order: idx + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('test_questions').insert(mappings);
    }
  } catch {
    // fallback
  }

  localTests.unshift(newTest);

  const populatedQuestions: (Question & { question_order: number })[] = [];
  parsed.question_ids.forEach(async (qid, idx) => {
    const mapping: TestQuestion = {
      id: crypto.randomUUID(),
      test_id: newTest.id,
      question_id: qid,
      question_order: idx + 1,
      marks_override: null,
      negative_marks_override: null,
      time_override_seconds: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localTestQuestions.push(mapping);
    const q = await getQuestionById(qid);
    if (q) populatedQuestions.push({ ...q, question_order: idx + 1 });
  });

  return { ...newTest, questions: populatedQuestions };
}

export async function updateTest(id: string, input: Partial<TestFormInput>): Promise<TestWithQuestions | null> {
  const existing = await getTestById(id);
  if (!existing) return null;

  const mergedTest: Test = {
    ...existing,
    ...input,
    total_questions: input.question_ids ? input.question_ids.length : existing.total_questions,
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from('tests').update(mergedTest).eq('id', id);

    if (input.question_ids) {
      // Refresh mappings
      await supabase.from('test_questions').delete().eq('test_id', id);
      const mappings = input.question_ids.map((qid, idx) => ({
        id: crypto.randomUUID(),
        test_id: id,
        question_id: qid,
        question_order: idx + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('test_questions').insert(mappings);
    }
  } catch {
    // fallback
  }

  const idx = localTests.findIndex((t) => t.id === id);
  if (idx !== -1) localTests[idx] = mergedTest;

  if (input.question_ids) {
    // Remove old mappings from local
    for (let i = localTestQuestions.length - 1; i >= 0; i--) {
      if (localTestQuestions[i].test_id === id) {
        localTestQuestions.splice(i, 1);
      }
    }
    input.question_ids.forEach((qid, qIdx) => {
      localTestQuestions.push({
        id: crypto.randomUUID(),
        test_id: id,
        question_id: qid,
        question_order: qIdx + 1,
        marks_override: null,
        negative_marks_override: null,
        time_override_seconds: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
  }

  return getTestById(id);
}

export async function archiveTest(id: string): Promise<boolean> {
  return (await updateTest(id, { status: 'archived' })) !== null;
}

export async function publishTest(id: string): Promise<boolean> {
  return (await updateTest(id, { status: 'published' })) !== null;
}
