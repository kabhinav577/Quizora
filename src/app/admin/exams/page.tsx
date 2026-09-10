import * as React from 'react';
import { getExams, createExam } from '@/services/exams';
import { getSubjects, createSubject } from '@/services/subjects';
import { getTopics, createTopic } from '@/services/topics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Layers, Plus, BookOpen, Tag } from 'lucide-react';
import { revalidatePath } from 'next/cache';

export default async function AdminExamsPage() {
  const [exams, subjects, topics] = await Promise.all([
    getExams(false),
    getSubjects(),
    getTopics(),
  ]);

  async function handleAddExam(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = (formData.get('description') as string) || null;
    if (!name || !slug) return;

    await createExam({
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      description,
      is_active: true,
    });
    revalidatePath('/admin/exams');
  }

  async function handleAddSubject(formData: FormData) {
    'use server';
    const exam_id = formData.get('exam_id') as string;
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = (formData.get('description') as string) || null;
    if (!exam_id || !name || !slug) return;

    await createSubject({
      exam_id,
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      description,
      display_order: 1,
      is_active: true,
    });
    revalidatePath('/admin/exams');
  }

  async function handleAddTopic(formData: FormData) {
    'use server';
    const subject_id = formData.get('subject_id') as string;
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = (formData.get('description') as string) || null;
    if (!subject_id || !name || !slug) return;

    await createTopic({
      subject_id,
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      description,
      display_order: 1,
      is_active: true,
    });
    revalidatePath('/admin/exams');
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Exams, Subjects & Topics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Define examination taxonomies, syllabus breakdowns, and topic hierarchies.
        </p>
      </div>

      {/* Grid of 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Exams */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Exams ({exams.length})
            </span>
          </div>

          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/20 dark:bg-indigo-950/20">
            <form action={handleAddExam} className="space-y-2.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Add New Exam</p>
              <Input
                name="name"
                placeholder="e.g. UPSC CSE / GATE"
                required
                className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
              <Input
                name="slug"
                placeholder="slug e.g. upsc-cse"
                required
                className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
              <Button
                type="submit"
                size="sm"
                className="w-full h-8 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Exam
              </Button>
            </form>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/70 p-2 flex-1 overflow-y-auto max-h-[500px]">
            {exams.map((ex) => (
              <div
                key={ex.id}
                className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{ex.name}</p>
                  <Badge variant={ex.is_active ? 'success' : 'secondary'} className="text-[10px]">
                    {ex.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                  {ex.slug}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Subjects */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Subjects ({subjects.length})
            </span>
          </div>

          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/20 dark:bg-indigo-950/20">
            <form action={handleAddSubject} className="space-y-2.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Add Subject to Exam
              </p>
              <select
                name="exam_id"
                required
                className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <Input
                name="name"
                placeholder="Subject name"
                required
                className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
              <Input
                name="slug"
                placeholder="slug"
                required
                className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
              <Button
                type="submit"
                size="sm"
                className="w-full h-8 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Subject
              </Button>
            </form>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/70 p-2 flex-1 overflow-y-auto max-h-[500px]">
            {subjects.map((sub) => {
              const examName = exams.find((e) => e.id === sub.exam_id)?.name || 'Exam';
              return (
                <div
                  key={sub.id}
                  className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {sub.name}
                    </p>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/50 px-2 py-0.5 rounded-md">
                      {examName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                    {sub.slug}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Topics */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Topics ({topics.length})
            </span>
          </div>

          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/20 dark:bg-indigo-950/20">
            <form action={handleAddTopic} className="space-y-2.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Add Topic to Subject
              </p>
              <select
                name="subject_id"
                required
                className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Input
                name="name"
                placeholder="Topic name"
                required
                className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
              <Input
                name="slug"
                placeholder="slug"
                required
                className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
              <Button
                type="submit"
                size="sm"
                className="w-full h-8 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Topic
              </Button>
            </form>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/70 p-2 flex-1 overflow-y-auto max-h-[500px]">
            {topics.map((top) => {
              const subName = subjects.find((s) => s.id === top.subject_id)?.name || 'Subject';
              return (
                <div
                  key={top.id}
                  className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {top.name}
                    </p>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/50 px-2 py-0.5 rounded-md">
                      {subName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                    {top.slug}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
