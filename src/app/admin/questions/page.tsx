import * as React from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
} from 'lucide-react';
import { listQuestions, getQuestionSources } from '@/services/questions';
import { getExams } from '@/services/exams';
import { getSubjects } from '@/services/subjects';
import { getTopics } from '@/services/topics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModernPagination } from '@/components/admin/ModernPagination';
import { QuestionBankTable } from '@/components/admin/QuestionBankTable';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    examId?: string;
    subjectId?: string;
    topicId?: string;
    difficulty?: string;
    status?: string;
    hasImage?: string;
    hasOptionImage?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function AdminQuestionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || '';
  const examId = params.examId || '';
  const subjectId = params.subjectId || '';
  const topicId = params.topicId || '';
  const difficulty = params.difficulty || '';
  const status = params.status || '';
  const hasImage = params.hasImage === 'true' ? true : params.hasImage === 'false' ? false : undefined;
  const hasOptionImage = params.hasOptionImage === 'true' ? true : params.hasOptionImage === 'false' ? false : undefined;
  const page = Math.max(1, Number(params.page || '1'));
  const pageSize = [10, 15, 25, 50, 100].includes(Number(params.pageSize))
    ? Number(params.pageSize)
    : 15;

  const [exams, subjects, topics, questionData, sources] = await Promise.all([
    getExams(false),
    getSubjects(),
    getTopics(subjectId || undefined),
    listQuestions({
      search,
      examId,
      subjectId,
      topicId,
      difficulty,
      status,
      hasImage,
      hasOptionImage,
      page,
      pageSize,
    }),
    getQuestionSources(),
  ]);

  const { questions, total, totalPages } = questionData;

  // Filter subjects for the selected exam if examId is provided (supports shared subjects)
  const availableSubjects = examId
    ? subjects.filter((s) => s.exam_id === examId || (Array.isArray(s.exam_ids) && s.exam_ids.includes(examId)))
    : subjects;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Question Bank</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, edit, and categorize all MCQ questions subject-wise across exams.
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
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2 lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              name="search"
              defaultValue={search}
              placeholder="Search question text, subject, topic..."
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

          {/* Subject Filter */}
          <div>
            <select
              name="subjectId"
              defaultValue={subjectId}
              className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">All Subjects</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Filter */}
          <div>
            <select
              name="topicId"
              defaultValue={topicId}
              className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Topics</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
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

          <input type="hidden" name="pageSize" value={pageSize} />

          <div className="sm:col-span-2 lg:col-span-7 flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs gap-3">
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

      {/* Interactive Question Bank Table with Checkbox Multi-selection & Bulk Delete */}
      <QuestionBankTable
        questions={questions}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        subjectFilterName={availableSubjects.find((s) => s.id === subjectId)?.name}
        sources={sources}
      />

      {/* Modern Pagination Controls */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <ModernPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          pageSizeOptions={[10, 15, 25, 50, 100]}
          itemLabel="questions"
        />
      </div>
    </div>
  );
}
