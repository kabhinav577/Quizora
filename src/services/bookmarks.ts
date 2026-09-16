import { Bookmark } from '@/types/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

declare global {
  var __localBookmarks: Bookmark[] | undefined;
}

export const localBookmarks: Bookmark[] =
  globalThis.__localBookmarks ?? (globalThis.__localBookmarks = []);

/**
 * Checks whether a question is bookmarked by user
 */
export async function isQuestionBookmarked(userId: string, questionId: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (!error && data) return true;
  } catch {
    // fallback
  }

  return localBookmarks.some((b) => b.user_id === userId && b.question_id === questionId);
}

/**
 * Toggles a bookmark for a user and question
 */
export async function toggleBookmark(
  userId: string,
  questionId: string
): Promise<{ bookmarked: boolean }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: existing } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (existing) {
      await supabase.from('bookmarks').delete().eq('id', existing.id);
      const localIdx = localBookmarks.findIndex(
        (b) => b.user_id === userId && b.question_id === questionId
      );
      if (localIdx !== -1) localBookmarks.splice(localIdx, 1);
      return { bookmarked: false };
    } else {
      const newBm: Bookmark = {
        id: crypto.randomUUID(),
        user_id: userId,
        question_id: questionId,
        created_at: new Date().toISOString(),
      };
      await supabase.from('bookmarks').insert(newBm);
      localBookmarks.push(newBm);
      return { bookmarked: true };
    }
  } catch {
    // fallback
  }

  const localIdx = localBookmarks.findIndex(
    (b) => b.user_id === userId && b.question_id === questionId
  );
  if (localIdx !== -1) {
    localBookmarks.splice(localIdx, 1);
    return { bookmarked: false };
  } else {
    const newBm: Bookmark = {
      id: crypto.randomUUID(),
      user_id: userId,
      question_id: questionId,
      created_at: new Date().toISOString(),
    };
    localBookmarks.push(newBm);
    return { bookmarked: true };
  }
}

/**
 * Retrieves all bookmarks for a user
 */
export async function getUserBookmarks(userId: string): Promise<Bookmark[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) return data as Bookmark[];
  } catch {
    // fallback
  }

  return localBookmarks.filter((b) => b.user_id === userId);
}
