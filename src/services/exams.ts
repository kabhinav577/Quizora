import { Exam } from '@/types/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStoredExams, saveStoredExams, getStoredSubjects, getStoredQuestions } from '@/lib/storage/diskStore';

export function sanitizeSlug(val: string): string {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function getExams(onlyActive = true): Promise<Exam[]> {
  const localExams = getStoredExams();
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
  const localExams = getStoredExams();
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
  const cleanName = input.name.trim();
  const cleanSlug = sanitizeSlug(input.slug || input.name);

  if (!cleanName) {
    throw new Error('Exam name cannot be empty.');
  }
  if (!cleanSlug) {
    throw new Error('Exam slug cannot be empty.');
  }

  const localExams = getStoredExams();
  const duplicate = localExams.find(
    (e) => e.name.trim().toLowerCase() === cleanName.toLowerCase() || e.slug === cleanSlug
  );
  if (duplicate) {
    throw new Error(`An exam with name "${cleanName}" or slug "${cleanSlug}" already exists.`);
  }

  const newExam: Exam = {
    ...input,
    name: cleanName,
    slug: cleanSlug,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('exams').insert(newExam).select().single();
    if (!error && data) {
      const updated = [...localExams, data as Exam];
      saveStoredExams(updated);
      return data as Exam;
    }
  } catch {
    // fallback
  }

  const updated = [...localExams, newExam];
  saveStoredExams(updated);
  return newExam;
}

export async function updateExam(id: string, input: Partial<Exam>): Promise<Exam | null> {
  const localExams = getStoredExams();
  const existing = localExams.find((e) => e.id === id);
  if (!existing) return null;

  const cleanName = input.name !== undefined ? input.name.trim() : existing.name;
  const cleanSlug = input.slug !== undefined ? sanitizeSlug(input.slug) : existing.slug;

  const duplicate = localExams.find(
    (e) =>
      e.id !== id &&
      (e.name.trim().toLowerCase() === cleanName.toLowerCase() || e.slug === cleanSlug)
  );
  if (duplicate) {
    throw new Error(`Another exam with name "${cleanName}" or slug "${cleanSlug}" already exists.`);
  }

  const updatedExam: Exam = {
    ...existing,
    ...input,
    name: cleanName,
    slug: cleanSlug,
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('exams')
      .update(updatedExam)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      const updated = localExams.map((e) => (e.id === id ? (data as Exam) : e));
      saveStoredExams(updated);
      return data as Exam;
    }
  } catch {
    // fallback
  }

  const updated = localExams.map((e) => (e.id === id ? updatedExam : e));
  saveStoredExams(updated);
  return updatedExam;
}

export async function deleteExam(id: string): Promise<boolean> {
  const questions = getStoredQuestions();
  const hasQuestions = questions.some((q) => q.exam_id === id);
  if (hasQuestions) {
    throw new Error('Cannot delete this exam because active questions are linked to it.');
  }

  const subjects = getStoredSubjects();
  const hasSubjects = subjects.some((s) => s.exam_id === id);
  if (hasSubjects) {
    throw new Error('Cannot delete this exam because it has subjects. Remove its subjects first.');
  }

  const localExams = getStoredExams();
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from('exams').delete().eq('id', id);
  } catch {
    // fallback
  }

  const filtered = localExams.filter((e) => e.id !== id);
  saveStoredExams(filtered);
  return true;
}
