import * as React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Layers,
  FileCheck,
  Flag,
  ArrowUpRight,
  Plus,
  ImageIcon,
} from 'lucide-react';
import { getExams } from '@/services/exams';
import { getSubjects } from '@/services/subjects';
import { listQuestions } from '@/services/questions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function AdminDashboardPage() {
  const [exams, subjects, questionData] = await Promise.all([
    getExams(false),
    getSubjects(),
    listQuestions({ pageSize: 5 }),
  ]);

  const { questions: recentQuestions, total: totalQuestions } = questionData;
  const publishedQuestions = recentQuestions.filter((q) => q.status === 'published').length;
  const diagramQuestions = recentQuestions.filter((q) => Boolean(q.question_image_path)).length;

  const statCards = [
    {
      title: 'Total Questions',
      value: totalQuestions,
      description: `${publishedQuestions} published (${diagramQuestions} with diagrams)`,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/admin/questions',
    },
    {
      title: 'Configured Exams',
      value: exams.length,
      description: `${subjects.length} subjects categorized`,
      icon: Layers,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      href: '/admin/exams',
    },
    {
      title: 'Active Mock Tests',
      value: 2,
      description: 'Practice & Full Test modes',
      icon: FileCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      href: '/admin/tests',
    },
    {
      title: 'Pending Reports',
      value: 0,
      description: 'Zero unresolved question flags',
      icon: Flag,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      href: '/admin/reports',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Admin Overview & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time examination statistics, question inventory, and content publishing workflow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/questions/new">
            <Button size="sm" className="text-xs gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              New Question
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="hover:border-slate-300 transition shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
                <Link
                  href={stat.href}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                >
                  Manage <ArrowUpRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Launch & Recent Questions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Questions in Bank */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Recently Created Questions
            </h3>
            <Link
              href="/admin/questions"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All Question Bank →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentQuestions.map((q) => (
              <div key={q.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {q.difficulty}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {q.options.length} Options
                    </Badge>
                    {q.question_image_path && (
                      <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Diagram
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                    {q.question_text}
                  </p>
                </div>

                <Link href={`/admin/questions/${q.id}/edit`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600">
                    Edit
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Exam Coverage Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Active Examinations
          </h3>
          <p className="text-xs text-slate-500">
            Targeted exam pipelines currently serving live practice questions:
          </p>

          <div className="space-y-3">
            {exams.map((ex) => (
              <div
                key={ex.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">{ex.name}</p>
                  <p className="text-[11px] text-slate-400">{ex.slug}</p>
                </div>
                <Badge variant="success" className="text-[10px]">
                  Live
                </Badge>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Link href="/admin/exams">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Configure New Syllabus
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
