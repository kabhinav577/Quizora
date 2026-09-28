import { Subject } from '@/types/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStoredSubjects, saveStoredSubjects, getStoredTopics, getStoredQuestions } from '@/lib/storage/diskStore';

export async function getSubjects(examId?: string): Promise<Subject[]> {
  const localSubjects = getStoredSubjects();
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from('subjects').select('*').order('display_order');
    if (examId) {
      query = query.eq('exam_id', examId);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return examId
        ? localSubjects.filter((s) => s.exam_id === examId || (Array.isArray(s.exam_ids) && s.exam_ids.includes(examId)))
        : localSubjects;
    }
    return data as Subject[];
  } catch {
    return examId
      ? localSubjects.filter((s) => s.exam_id === examId || (Array.isArray(s.exam_ids) && s.exam_ids.includes(examId)))
      : localSubjects;
  }
}

export const listSubjects = getSubjects;

export async function getSubjectById(id: string): Promise<Subject | null> {
  const localSubjects = getStoredSubjects();
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single();
    if (!error && data) {
      return data as Subject;
    }
  } catch {
    // fallback
  }
  return localSubjects.find((s) => s.id === id) || null;
}

export function sanitizeSlug(val: string): string {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function createSubject(input: Omit<Subject, 'id' | 'created_at' | 'updated_at'>): Promise<Subject> {
  const cleanName = input.name.trim();
  const cleanSlug = sanitizeSlug(input.slug || input.name);

  if (!cleanName) {
    throw new Error('Subject name cannot be empty.');
  }
  if (!cleanSlug) {
    throw new Error('Subject slug cannot be empty.');
  }

  const localSubjects = getStoredSubjects();

  // Check duplicate within the same exam
  const duplicate = localSubjects.find(
    (s) =>
      s.exam_id === input.exam_id &&
      (s.name.trim().toLowerCase() === cleanName.toLowerCase() || s.slug === cleanSlug)
  );

  if (duplicate) {
    throw new Error(
      `A subject with name "${cleanName}" or slug "${cleanSlug}" already exists under this exam.`
    );
  }

  const newSub: Subject = {
    ...input,
    name: cleanName,
    slug: cleanSlug,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('subjects').insert(newSub).select().single();
    if (!error && data) {
      const updated = [...localSubjects, data as Subject];
      saveStoredSubjects(updated);
      return data as Subject;
    }
  } catch {
    // fallback
  }

  const updated = [...localSubjects, newSub];
  saveStoredSubjects(updated);
  return newSub;
}

export async function updateSubject(id: string, input: Partial<Omit<Subject, 'id' | 'created_at' | 'updated_at'>>): Promise<Subject | null> {
  const localSubjects = getStoredSubjects();
  const existing = localSubjects.find((s) => s.id === id);
  if (!existing) return null;

  const cleanName = input.name !== undefined ? input.name.trim() : existing.name;
  const cleanSlug = input.slug !== undefined ? sanitizeSlug(input.slug) : existing.slug;
  const examId = input.exam_id !== undefined ? input.exam_id : existing.exam_id;

  // Duplicate check
  const duplicate = localSubjects.find(
    (s) =>
      s.id !== id &&
      s.exam_id === examId &&
      (s.name.trim().toLowerCase() === cleanName.toLowerCase() || s.slug === cleanSlug)
  );
  if (duplicate) {
    throw new Error(`Another subject with name "${cleanName}" or slug "${cleanSlug}" already exists under this exam.`);
  }

  const updatedSub: Subject = {
    ...existing,
    ...input,
    name: cleanName,
    slug: cleanSlug,
    exam_id: examId,
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('subjects')
      .update(updatedSub)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      const updatedList = localSubjects.map((s) => (s.id === id ? (data as Subject) : s));
      saveStoredSubjects(updatedList);
      return data as Subject;
    }
  } catch {
    // fallback
  }

  const updatedList = localSubjects.map((s) => (s.id === id ? updatedSub : s));
  saveStoredSubjects(updatedList);
  return updatedSub;
}

export async function deleteSubject(id: string): Promise<boolean> {
  const questions = getStoredQuestions();
  const hasQuestions = questions.some((q) => q.subject_id === id);
  if (hasQuestions) {
    throw new Error('Cannot delete this subject because active questions are linked to it.');
  }

  const topics = getStoredTopics();
  const hasTopics = topics.some((t) => t.subject_id === id);
  if (hasTopics) {
    throw new Error('Cannot delete this subject because it contains topics. Delete or reassign its topics first.');
  }

  const localSubjects = getStoredSubjects();
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from('subjects').delete().eq('id', id);
  } catch {
    // fallback
  }

  const filtered = localSubjects.filter((s) => s.id !== id);
  saveStoredSubjects(filtered);
  return true;
}
