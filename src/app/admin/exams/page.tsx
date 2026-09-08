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
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Exams, Subjects & Topics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Define examination taxonomies, syllabus breakdowns, and topic hierarchies.
        </p>
      </div>

      {/* Grid of 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Exams */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" />
              Exams ({exams.length})
            </span>
          </div>

          <div className="p-4 border-b border-slate-100 bg-blue-50/30">
            <form action={handleAddExam} className="space-y-2.5">
              <p className="text-xs font-bold text-slate-800">Add New Exam</p>
              <Input name="name" placeholder="e.g. UPSC CSE / GATE" required className="h-8 text-xs bg-white" />
              <Input name="slug" placeholder="slug e.g. upsc-cse" required className="h-8 text-xs bg-white" />
              <Button type="submit" size="sm" className="w-full h-8 text-xs gap-1">
                <Plus className="h-3 w-3" /> Add Exam
              </Button>
            </form>
          </div>

          <div className="divide-y divide-slate-100 p-2 flex-1 overflow-y-auto max-h-[500px]">
            {exams.map((ex) => (
              <div key={ex.id} className="p-3 rounded-lg hover:bg-slate-50 transition">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900">{ex.name}</p>
                  <Badge variant={ex.is_active ? 'success' : 'secondary'} className="text-[10px]">
                    {ex.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{ex.slug}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Subjects */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              Subjects ({subjects.length})
            </span>
          </div>

          <div className="p-4 border-b border-slate-100 bg-emerald-50/30">
            <form action={handleAddSubject} className="space-y-2.5">
              <p className="text-xs font-bold text-slate-800">Add Subject to Exam</p>
              <select
                name="exam_id"
                required
                className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800"
              >
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <Input name="name" placeholder="Subject name" required className="h-8 text-xs bg-white" />
              <Input name="slug" placeholder="slug" required className="h-8 text-xs bg-white" />
              <Button type="submit" variant="success" size="sm" className="w-full h-8 text-xs gap-1">
                <Plus className="h-3 w-3" /> Add Subject
              </Button>
            </form>
          </div>

          <div className="divide-y divide-slate-100 p-2 flex-1 overflow-y-auto max-h-[500px]">
            {subjects.map((sub) => {
              const examName = exams.find((e) => e.id === sub.exam_id)?.name || 'Exam';
              return (
                <div key={sub.id} className="p-3 rounded-lg hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">{sub.name}</p>
                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                      {examName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{sub.slug}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Topics */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-purple-600" />
              Topics ({topics.length})
            </span>
          </div>

          <div className="p-4 border-b border-slate-100 bg-purple-50/30">
            <form action={handleAddTopic} className="space-y-2.5">
              <p className="text-xs font-bold text-slate-800">Add Topic to Subject</p>
              <select
                name="subject_id"
                required
                className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Input name="name" placeholder="Topic name" required className="h-8 text-xs bg-white" />
              <Input name="slug" placeholder="slug" required className="h-8 text-xs bg-white" />
              <Button type="submit" variant="default" size="sm" className="w-full h-8 text-xs gap-1 bg-purple-600 hover:bg-purple-700">
                <Plus className="h-3 w-3" /> Add Topic
              </Button>
            </form>
          </div>

          <div className="divide-y divide-slate-100 p-2 flex-1 overflow-y-auto max-h-[500px]">
            {topics.map((top) => {
              const subName = subjects.find((s) => s.id === top.subject_id)?.name || 'Subject';
              return (
                <div key={top.id} className="p-3 rounded-lg hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">{top.name}</p>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      {subName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{top.slug}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
