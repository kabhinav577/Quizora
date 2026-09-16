'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookmarkedQuestionItem } from '@/services/dashboard';
import { StudentHeader } from '@/components/layout/StudentHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bookmark,
  BookmarkCheck,
  Search,
  Zap,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  Trash2,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { toggleBookmarkAction } from '@/app/tests/actions';
import { startBookmarksPracticeAction } from '@/app/dashboard/actions';
import { ImageLightbox } from '@/components/media/ImageLightbox';

interface BookmarksClientProps {
  initialBookmarks: BookmarkedQuestionItem[];
}

export function BookmarksClient({ initialBookmarks }: BookmarksClientProps) {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkedQuestionItem[]>(initialBookmarks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [isStartingPractice, setIsStartingPractice] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Distinct Exams in bookmarks
  const distinctExams = useMemo(() => {
    return Array.from(new Set(bookmarks.map((b) => b.examName)));
  }, [bookmarks]);

  // Filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      if (selectedExam !== 'all' && b.examName !== selectedExam) return false;
      if (
        searchQuery &&
        !b.question.question_text.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !b.topicName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [bookmarks, selectedExam, searchQuery]);

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  // Remove bookmark handler
  const handleRemoveBookmark = async (questionId: string) => {
    setRemovingId(questionId);
    try {
      await toggleBookmarkAction(questionId);
      setBookmarks((prev) => prev.filter((b) => b.questionId !== questionId));
    } catch (err) {
      console.error('Failed to remove bookmark', err);
    } finally {
      setRemovingId(null);
    }
  };

  // Launch practice with bookmarked questions
  const handleStartPractice = async () => {
    if (filteredBookmarks.length === 0) return;
    setIsStartingPractice(true);
    try {
      const qIds = filteredBookmarks.map((b) => b.questionId);
      const attempt = await startBookmarksPracticeAction(qIds);
      router.push(`/practice?attemptId=${attempt.id}`);
    } catch (err) {
      console.error('Failed to start bookmark practice', err);
      setIsStartingPractice(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <StudentHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header & Practice CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Bookmark className="w-5 h-5 fill-amber-500 text-amber-500" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Saved Questions
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Review your personal collection of difficult questions bookmarked during practice sessions
            </p>
          </div>

          <div className="shrink-0">
            <Button
              size="lg"
              disabled={filteredBookmarks.length === 0 || isStartingPractice}
              onClick={handleStartPractice}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {isStartingPractice ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Launching Practice...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-white fill-white" />
                  <span>Practice Saved Questions ({filteredBookmarks.length})</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by question text or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Exam Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedExam('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedExam === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Exams ({bookmarks.length})
            </button>
            {distinctExams.map((examName) => (
              <button
                key={examName}
                type="button"
                onClick={() => setSelectedExam(examName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedExam === examName
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {examName}
              </button>
            ))}
          </div>
        </div>

        {/* Bookmarked Questions List */}
        {filteredBookmarks.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="p-4 rounded-full bg-amber-50 dark:bg-amber-950/50 w-16 h-16 mx-auto flex items-center justify-center text-amber-500">
              <BookmarkCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                No Bookmarked Questions Found
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || selectedExam !== 'all'
                  ? 'No saved questions match your search filters.'
                  : 'You have not bookmarked any questions yet. While taking mock tests or practice drills, click the bookmark icon on tricky questions to save them here for quick revision.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/tests')}
              className="text-xs font-semibold"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Explore Mock Tests
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookmarks.map((item, index) => {
              const { question } = item;
              const isExpanded = expandedCardId === item.bookmarkId;
              const isRemoving = removingId === item.questionId;

              return (
                <Card
                  key={item.bookmarkId}
                  className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Header Row: Numbering, Taxonomies & Actions */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center">
                          #{index + 1}
                        </span>

                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200"
                        >
                          {item.examName}
                        </Badge>

                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200"
                        >
                          {item.topicName}
                        </Badge>

                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          +{question.marks} / -{question.negative_marks}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isRemoving}
                          onClick={() => handleRemoveBookmark(item.questionId)}
                          className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        >
                          {isRemoving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                          )}
                          <span>Remove</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpand(item.bookmarkId)}
                          className="h-8 text-xs font-semibold"
                        >
                          <span>{isExpanded ? 'Hide Solution' : 'View Solution'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 ml-1" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 ml-1" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Question Statement */}
                    <div className="space-y-3">
                      <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                        {question.question_text}
                      </p>

                      {/* Question Diagram if present */}
                      {question.question_image_path && (
                        <div className="relative inline-block border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-w-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={question.question_image_path}
                            alt="Question Diagram"
                            className="max-h-48 object-contain cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => setLightboxSrc(question.question_image_path)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Expanded Solution & Options View */}
                    {isExpanded && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        {/* Options List */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Options:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {question.options.map((opt, oIdx) => {
                              const optionNumber = oIdx + 1;
                              const isCorrect = optionNumber === question.correct_option;
                              const letter = String.fromCharCode(65 + oIdx);

                              return (
                                <div
                                  key={letter}
                                  className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-400/40'
                                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <div className="flex-1 space-y-1">
                                    {opt.text && <p>{opt.text}</p>}
                                    {opt.image_path && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={opt.image_path}
                                        alt={`Option ${letter}`}
                                        className="max-h-20 object-contain rounded border border-slate-200"
                                      />
                                    )}
                                  </div>
                                  {isCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Explanation Narrative */}
                        {question.explanation && (
                          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                              <Lightbulb className="w-4 h-4 text-amber-600" />
                              <span>Official Solution Narrative</span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                              {question.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox for diagrams */}
      <ImageLightbox
        isOpen={!!lightboxSrc}
        imagePath={lightboxSrc}
        alt="Enlarged Question Media"
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
