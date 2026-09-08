import { Topic } from '@/types/database';
import { MOCK_TOPICS } from './mockData';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const localTopics: Topic[] = [...MOCK_TOPICS];

export async function getTopics(subjectId?: string): Promise<Topic[]> {
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


export async function createTopic(input: Omit<Topic, 'id' | 'created_at' | 'updated_at'>): Promise<Topic> {
  const newTopic: Topic = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('topics').insert(newTopic).select().single();
    if (!error && data) {
      localTopics.push(data as Topic);
      return data as Topic;
    }
  } catch {
    // fallback
  }

  localTopics.push(newTopic);
  return newTopic;
}
