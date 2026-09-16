import React from 'react';
import { getBookmarkedQuestionsAction } from '@/app/dashboard/actions';
import { BookmarksClient } from '@/components/bookmarks/BookmarksClient';

export const dynamic = 'force-dynamic';

export default async function BookmarksPage() {
  const bookmarks = await getBookmarkedQuestionsAction();

  return <BookmarksClient initialBookmarks={bookmarks} />;
}
