'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Layers,
  GraduationCap,
  UploadCloud,
  FileCheck,
  LayoutDashboard,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Question Bank', href: '/admin/questions', icon: BookOpen },
  { label: 'Exams & Topics', href: '/admin/exams', icon: Layers },
  { label: 'Bulk Import', href: '/admin/imports', icon: UploadCloud },
  { label: 'Test Builder', href: '/admin/tests', icon: FileCheck },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:min-h-screen flex flex-col transition-colors">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3 group select-none">
          <Image
            src="/logo.svg"
            alt="Quizora Logo"
            width={36}
            height={36}
            priority
            unoptimized
            className="w-9 h-9 shrink-0 object-contain"
          />
          <div>
            <span className="font-brand font-black tracking-tight text-xl bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent block leading-none">
              Quizora
            </span>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-indigo-400 mt-1">
              Admin Console
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs border border-indigo-200/70 dark:border-indigo-800/80'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Student Portal Link */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <Link
          href="/tests"
          className="flex items-center justify-between rounded-lg bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          <span className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Student View
          </span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        </Link>
      </div>
    </aside>
  );
}
