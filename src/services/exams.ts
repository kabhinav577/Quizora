import { Exam } from '@/types/database';
import { MOCK_EXAMS } from './mockData';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const localExams: Exam[] = [...MOCK_EXAMS];

export async function getExams(onlyActive = true): Promise<Exam[]> {
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from('exams').select('*').order('name');
    if (onlyActive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return onlyActive ? localExams.filter((e) => e.is_active) : localExams;
    }
    return data as Exam[];
  } catch {
    return onlyActive ? localExams.filter((e) => e.is_active) : localExams;
  }
}

export const listExams = getExams;


export async function getExamById(id: string): Promise<Exam | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('exams').select('*').eq('id', id).single();
    if (error || !data) {
      return localExams.find((e) => e.id === id) || null;
    }
    return data as Exam;
  } catch {
    return localExams.find((e) => e.id === id) || null;
  }
}

export async function createExam(input: Omit<Exam, 'id' | 'created_at' | 'updated_at'>): Promise<Exam> {
  const newExam: Exam = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('exams').insert(newExam).select().single();
    if (!error && data) {
      localExams.push(data as Exam);
      return data as Exam;
    }
  } catch {
    // fallback
  }

  localExams.push(newExam);
  return newExam;
}

export async function updateExam(id: string, input: Partial<Exam>): Promise<Exam | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('exams')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      const idx = localExams.findIndex((e) => e.id === id);
      if (idx !== -1) localExams[idx] = data as Exam;
      return data as Exam;
    }
  } catch {
    // fallback
  }

  const idx = localExams.findIndex((e) => e.id === id);
  if (idx !== -1) {
    localExams[idx] = { ...localExams[idx], ...input, updated_at: new Date().toISOString() };
    return localExams[idx];
  }
  return null;
}
