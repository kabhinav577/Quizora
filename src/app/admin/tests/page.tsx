import * as React from 'react';
import Link from 'next/link';
import {
  Plus,
  Clock,
  Archive,
  CheckCircle2,
  Edit,
} from 'lucide-react';
import { listTests, archiveTest, publishTest } from '@/services/tests';
import { getExams } from '@/services/exams';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { revalidatePath } from 'next/cache';

interface PageProps {
  searchParams: Promise<{
    examId?: string;
    testType?: string;
    status?: string;
  }>;
}

export default async function AdminTestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const examId = params.examId || '';
  const testType = params.testType || '';
  const status = params.status || '';

  const [exams, testsData] = await Promise.all([
    getExams(false),
    listTests({ examId, testType, status, pageSize: 20 }),
  ]);

  const { tests, total } = testsData;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Test Builder & Mocks</h1>
          <p className="text-xs text-slate-500 mt-1">
            Build and publish timed full-length mock examinations and topic practice sets.
          </p>
        </div>

        <Link href="/admin/tests/new">
          <Button size="sm" className="text-xs gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Create New Test
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <select
              name="examId"
              defaultValue={examId}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800"
            >
              <option value="">All Examinations</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              name="testType"
              defaultValue={testType}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800"
            >
              <option value="">All Test Types</option>
              <option value="practice">Practice Mode</option>
              <option value="mock_test">Mock Test</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              name="status"
              defaultValue={status}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800"
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <Button type="submit" size="sm" className="h-9 text-xs">
              Filter
            </Button>
          </div>
        </form>
      </div>

      {/* Tests Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Total Tests: {total}
          </span>
        </div>

        {tests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No tests found. Click &ldquo;Create New Test&rdquo; to build your first mock examination.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tests.map((test) => {
              const examName = exams.find((e) => e.id === test.exam_id)?.name || 'Competitive Exam';
              const totalMarks = test.total_questions * test.marks_per_question;

              return (
                <div
                  key={test.id}
                  className="p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          test.status === 'published'
                            ? 'success'
                            : test.status === 'draft'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {test.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {test.test_type === 'mock_test' ? 'Mock Test' : 'Practice Set'}
                      </Badge>
                      <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                        {examName}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{test.title}</h3>
                    {test.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{test.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                      <span>
                        Questions: <strong>{test.total_questions}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Marks: <strong>{totalMarks}</strong> (+{test.marks_per_question}/-{test.negative_marks})
                      </span>
                      {test.duration_seconds && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-700">
                            <Clock className="h-3.5 w-3.5 text-emerald-600" />
                            {Math.round(test.duration_seconds / 60)} Mins Duration
                          </span>
                        </>
                      )}
                      {test.question_time_seconds && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-700">
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            {test.question_time_seconds}s per Question
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/admin/tests/${test.id}/edit`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                        <Edit className="h-3.5 w-3.5 text-slate-500" />
                        Edit
                      </Button>
                    </Link>

                    {test.status === 'draft' && (
                      <form
                        action={async () => {
                          'use server';
                          await publishTest(test.id);
                          revalidatePath('/admin/tests');
                        }}
                      >
                        <Button
                          type="submit"
                          size="sm"
                          className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Publish
                        </Button>
                      </form>
                    )}

                    {test.status !== 'archived' && (
                      <form
                        action={async () => {
                          'use server';
                          await archiveTest(test.id);
                          revalidatePath('/admin/tests');
                        }}
                      >
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                          title="Archive Test"
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
