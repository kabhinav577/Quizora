import * as React from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  ImageIcon,
  Copy,
  Edit,
  Archive,
  Layers,
} from 'lucide-react';
import { listQuestions } from '@/services/questions';
import { getExams } from '@/services/exams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    examId?: string;
    difficulty?: string;
    status?: string;
    hasImage?: string;
    hasOptionImage?: string;
    page?: string;
  }>;
}

export default async function AdminQuestionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || '';
  const examId = params.examId || '';
  const difficulty = params.difficulty || '';
  const status = params.status || '';
  const hasImage = params.hasImage === 'true' ? true : params.hasImage === 'false' ? false : undefined;
  const hasOptionImage = params.hasOptionImage === 'true' ? true : params.hasOptionImage === 'false' ? false : undefined;
  const page = Number(params.page || '1');

  const [exams, questionData] = await Promise.all([
    getExams(false),
    listQuestions({
      search,
      examId,
      difficulty,
      status,
      hasImage,
      hasOptionImage,
      page,
      pageSize: 15,
    }),
  ]);

  const { questions, total, totalPages } = questionData;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Question Bank</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, edit, and manage all MCQ questions across exams and topics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/imports">
            <Button variant="outline" size="sm" className="text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200">
              Bulk Import
            </Button>
          </Link>
          <Link href="/admin/questions/new">
            <Button size="sm" className="text-xs gap-1.5 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              <Plus className="h-4 w-4" />
              Create Question
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              name="search"
              defaultValue={search}
              placeholder="Search question text..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Exam Filter */}
          <div>
            <select
              name="examId"
              defaultValue={examId}
              className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Exams</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              name="difficulty"
              defaultValue={difficulty}
              className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              name="status"
              defaultValue={status}
              className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="lg:col-span-5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="checkbox"
                  name="hasImage"
                  value="true"
                  defaultChecked={params.hasImage === 'true'}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Has Diagram
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="checkbox"
                  name="hasOptionImage"
                  value="true"
                  defaultChecked={params.hasOptionImage === 'true'}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Has Option Images
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/admin/questions">
                <Button type="button" variant="ghost" size="sm" className="text-xs h-8 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                  Reset
                </Button>
              </Link>
              <Button type="submit" size="sm" className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs">
                Apply Filters
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Question List Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Total Questions Found: {total}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages || 1}
          </span>
        </div>

        {questions.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No questions found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your search criteria or create your first question.
            </p>
            <Link href="/admin/questions/new" className="inline-block mt-4">
              <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                Create Question
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {questions.map((q) => {
              const hasDiag = Boolean(q.question_image_path);
              const hasOptImg = q.options.some((o) => Boolean(o.image_path));
              const optCount = q.options.length;

              return (
                <div
                  key={q.id}
                  className="p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          q.status === 'published'
                            ? 'success'
                            : q.status === 'draft'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {q.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {q.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {optCount} Options
                      </Badge>

                      {hasDiag && (
                        <Badge variant="purple" className="text-[10px] gap-1">
                          <ImageIcon className="h-3 w-3" />
                          Diagram
                        </Badge>
                      )}

                      {hasOptImg && (
                        <Badge variant="default" className="text-[10px] gap-1">
                          <ImageIcon className="h-3 w-3" />
                          Option Images
                        </Badge>
                      )}

                      {q.source_name && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          {q.source_name} {q.source_year ? `'${q.source_year.toString().slice(-2)}` : ''}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                      {q.question_text}
                    </p>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                      <span>Correct: Option {String.fromCharCode(64 + q.correct_option)}</span>
                      <span>•</span>
                      <span>Marks: +{q.marks}</span>
                      {q.negative_marks > 0 && <span>(-{q.negative_marks})</span>}
                      {q.default_time_seconds && (
                        <>
                          <span>•</span>
                          <span>Time: {q.default_time_seconds}s</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/admin/questions/${q.id}/edit`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                        <Edit className="h-3.5 w-3.5 text-slate-500" />
                        Edit
                      </Button>
                    </Link>

                    <form
                      action={async () => {
                        'use server';
                        const { duplicateQuestion } = await import('@/services/questions');
                        await duplicateQuestion(q.id);
                      }}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1 text-slate-600"
                        title="Duplicate Question"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </form>

                    {q.status !== 'archived' && (
                      <form
                        action={async () => {
                          'use server';
                          const { archiveQuestion } = await import('@/services/questions');
                          await archiveQuestion(q.id);
                        }}
                      >
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                          title="Archive Question"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
