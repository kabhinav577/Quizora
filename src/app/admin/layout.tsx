import * as React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Layers,
  GraduationCap,
  UploadCloud,
  FileCheck,
  Flag,
  LayoutDashboard,
  ExternalLink,
} from 'lucide-react';

export const metadata = {
  title: 'Quizora Admin — Question & Exam Management',
  description: 'Manage exams, subjects, topics, questions, and tests for Quizora',
};

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Question Bank', href: '/admin/questions', icon: BookOpen },
  { label: 'Exams & Topics', href: '/admin/exams', icon: Layers },
  { label: 'Bulk Import', href: '/admin/imports', icon: UploadCloud },
  { label: 'Test Builder', href: '/admin/tests', icon: FileCheck },
  { label: 'Reports', href: '/admin/reports', icon: Flag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0 border-r border-slate-200 bg-white md:min-h-screen flex flex-col">
        {/* Brand */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-blue-500/30">
              Q
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-950">Quizora</span>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-blue-600">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <Icon className="h-4 w-4 text-slate-500" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom student portal link */}
        <div className="p-4 border-t border-slate-100">
          <Link
            href="/dashboard"
            className="flex items-center justify-between rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            <span className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              Student View
            </span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden p-6 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
