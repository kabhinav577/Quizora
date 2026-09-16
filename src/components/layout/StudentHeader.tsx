'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileCheck,
  Zap,
  AlertOctagon,
  Bookmark,
  History,
  Shield,
  Menu,
  X,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tests', label: 'Mock Tests', icon: FileCheck },
  { href: '/practice', label: 'Practice', icon: Zap },
  { href: '/mistakes', label: 'My Mistakes', icon: AlertOctagon },
  { href: '/bookmarks', label: 'Saved', icon: Bookmark },
  { href: '/history', label: 'History', icon: History },
];

export function StudentHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-xl text-slate-100 shadow-md shadow-black/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand: Constant Logo + Separate Gradient Text */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 sm:gap-2 group select-none py-1"
          >
            <Image
              src="/logo.svg"
              alt="Quizora Logo"
              width={36}
              height={36}
              priority
              unoptimized
              className="w-8 h-8 sm:w-8 sm:h-8 md:w-9 md:h-9 shrink-0 object-contain"
            />
            <span className="font-brand font-black tracking-tight text-lg sm:text-xl md:text-2xl bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent leading-none">
              Quizora
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isActive
                    ? 'bg-indigo-950/70 text-indigo-300 font-bold border border-indigo-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all shadow-xs"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Admin</span>
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/80 bg-slate-950/98 backdrop-blur-2xl px-4 pt-3 pb-5 space-y-1.5 shadow-2xl">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive
                  ? 'bg-indigo-950/70 text-indigo-300 font-bold border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className="pt-2.5 border-t border-slate-800/80">
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-900/80"
            >
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Admin Console</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
