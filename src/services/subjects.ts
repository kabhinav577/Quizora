import { Subject } from '@/types/database';
import { MOCK_SUBJECTS } from './mockData';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const localSubjects: Subject[] = [...MOCK_SUBJECTS];

export async function getSubjects(examId?: string): Promise<Subject[]> {
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from('subjects').select('*').order('display_order');
    if (examId) {
      query = query.eq('exam_id', examId);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return examId ? localSubjects.filter((s) => s.exam_id === examId) : localSubjects;
    }
    return data as Subject[];
  } catch {
    return examId ? localSubjects.filter((s) => s.exam_id === examId) : localSubjects;
  }
}

export const listSubjects = getSubjects;


export async function createSubject(input: Omit<Subject, 'id' | 'created_at' | 'updated_at'>): Promise<Subject> {
  const newSub: Subject = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('subjects').insert(newSub).select().single();
    if (!error && data) {
      localSubjects.push(data as Subject);
      return data as Subject;
    }
  } catch {
    // fallback
  }

  localSubjects.push(newSub);
  return newSub;
}
