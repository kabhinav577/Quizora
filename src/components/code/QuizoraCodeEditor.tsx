'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Code2, ChevronDown } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  getLanguageDisplayName,
  getMonacoLanguage,
} from '@/lib/code/languages';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-xs font-mono text-slate-500">
        Loading Code Editor...
      </div>
    ),
  }
);

interface QuizoraCodeEditorProps {
  value: string;
  language?: string | null;
  onChange: (value: string) => void;
  onLanguageChange?: (language: string) => void;
  height?: string | number;
  className?: string;
  placeholder?: string;
}

export function QuizoraCodeEditor({
  value,
  language = 'javascript',
  onChange,
  onLanguageChange,
  height = '240px',
  className = '',
}: QuizoraCodeEditorProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const monacoLanguage = getMonacoLanguage(language);

  // Theme detection
  useEffect(() => {
    setIsMounted(true);
    const checkDark = () => {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };

    checkDark();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => checkDark();
    mediaQuery.addEventListener('change', handleMediaChange);

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      observer.disconnect();
    };
  }, []);

  const monacoTheme = isDarkMode ? 'vs-dark' : 'light';

  // Monaco options for Admin editing
  const editorOptions = useMemo(
    () => ({
      readOnly: false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'off' as const,
      lineNumbers: 'on' as const,
      lineNumbersMinChars: 3,
      folding: true,
      fontSize: 13.5,
      fontFamily:
        'JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, "Courier New", monospace',
      lineHeight: 22,
      renderLineHighlight: 'line' as const,
      overviewRulerLanes: 0,
      contextmenu: true,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: false,
      formatOnType: false,
      scrollbar: {
        vertical: 'auto' as const,
        horizontal: 'auto' as const,
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    }),
    []
  );

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e1e1e] overflow-hidden shadow-xs ${className}`}
    >
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Code2 className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Code Editor
          </span>
        </div>

        {/* Language selector in header if onLanguageChange is provided */}
        {onLanguageChange && (
          <div className="relative inline-block">
            <select
              value={language || 'javascript'}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="text-xs font-mono font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-2.5 pr-7 py-1 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        )}
      </div>

      {/* Editor Body */}
      <div style={{ height }} className="w-full relative">
        {isMounted ? (
          <MonacoEditor
            height="100%"
            language={monacoLanguage}
            value={value}
            theme={monacoTheme}
            onChange={(val) => onChange(val ?? '')}
            options={editorOptions}
          />
        ) : (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ height }}
            className="w-full p-4 font-mono text-xs bg-transparent text-slate-900 dark:text-slate-100 resize-none focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
