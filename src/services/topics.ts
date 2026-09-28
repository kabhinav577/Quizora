import { Topic } from '@/types/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStoredTopics, saveStoredTopics, getStoredQuestions } from '@/lib/storage/diskStore';

export async function getTopics(subjectId?: string): Promise<Topic[]> {
  const localTopics = getStoredTopics();
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from('topics').select('*').order('display_order');
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return subjectId ? localTopics.filter((t) => t.subject_id === subjectId) : localTopics;
    }
    return data as Topic[];
  } catch {
    return subjectId ? localTopics.filter((t) => t.subject_id === subjectId) : localTopics;
  }
}

export const listTopics = getTopics;

export async function getTopicById(id: string): Promise<Topic | null> {
  const localTopics = getStoredTopics();
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('topics').select('*').eq('id', id).single();
    if (!error && data) {
      return data as Topic;
    }
  } catch {
    // fallback
  }
  return localTopics.find((t) => t.id === id) || null;
}

export function sanitizeSlug(val: string): string {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function createTopic(input: Omit<Topic, 'id' | 'created_at' | 'updated_at'>): Promise<Topic> {
  const cleanName = input.name.trim();
  const cleanSlug = sanitizeSlug(input.slug || input.name);

  if (!cleanName) {
    throw new Error('Topic name cannot be empty.');
  }
  if (!cleanSlug) {
    throw new Error('Topic slug cannot be empty.');
  }

  const localTopics = getStoredTopics();

  // Check duplicate within the same subject
  const duplicate = localTopics.find(
    (t) =>
      t.subject_id === input.subject_id &&
      (t.name.trim().toLowerCase() === cleanName.toLowerCase() || t.slug === cleanSlug)
  );

  if (duplicate) {
    throw new Error(
      `A topic with name "${cleanName}" or slug "${cleanSlug}" already exists under this subject.`
    );
  }

  const newTopic: Topic = {
    ...input,
    name: cleanName,
    slug: cleanSlug,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('topics').insert(newTopic).select().single();
    if (!error && data) {
      const updated = [...localTopics, data as Topic];
      saveStoredTopics(updated);
      return data as Topic;
    }
  } catch {
    // fallback
  }

  const updated = [...localTopics, newTopic];
  saveStoredTopics(updated);
  return newTopic;
}

export async function updateTopic(id: string, input: Partial<Omit<Topic, 'id' | 'created_at' | 'updated_at'>>): Promise<Topic | null> {
  const localTopics = getStoredTopics();
  const existing = localTopics.find((t) => t.id === id);
  if (!existing) return null;

  const cleanName = input.name !== undefined ? input.name.trim() : existing.name;
  const cleanSlug = input.slug !== undefined ? sanitizeSlug(input.slug) : existing.slug;
  const subjectId = input.subject_id !== undefined ? input.subject_id : existing.subject_id;

  // Duplicate check
  const duplicate = localTopics.find(
    (t) =>
      t.id !== id &&
      t.subject_id === subjectId &&
      (t.name.trim().toLowerCase() === cleanName.toLowerCase() || t.slug === cleanSlug)
  );
  if (duplicate) {
    throw new Error(`Another topic with name "${cleanName}" or slug "${cleanSlug}" already exists under this subject.`);
  }

  const updatedTopic: Topic = {
    ...existing,
    ...input,
    name: cleanName,
    slug: cleanSlug,
    subject_id: subjectId,
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('topics')
      .update(updatedTopic)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      const updatedList = localTopics.map((t) => (t.id === id ? (data as Topic) : t));
      saveStoredTopics(updatedList);
      return data as Topic;
    }
  } catch {
    // fallback
  }

  const updatedList = localTopics.map((t) => (t.id === id ? updatedTopic : t));
  saveStoredTopics(updatedList);
  return updatedTopic;
}

export async function deleteTopic(id: string): Promise<boolean> {
  const questions = getStoredQuestions();
  const hasQuestions = questions.some((q) => q.topic_id === id);
  if (hasQuestions) {
    throw new Error('Cannot delete this topic because active questions are linked to it.');
  }

  const localTopics = getStoredTopics();
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from('topics').delete().eq('id', id);
  } catch {
    // fallback
  }

  const filtered = localTopics.filter((t) => t.id !== id);
  saveStoredTopics(filtered);
  return true;
}
