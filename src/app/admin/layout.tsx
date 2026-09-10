import * as React from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const metadata = {
  title: 'Quizora Admin — Question & Exam Management',
  description: 'Manage exams, subjects, topics, questions, and tests for Quizora',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden p-6 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
