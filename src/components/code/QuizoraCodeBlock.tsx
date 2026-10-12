'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Copy, Check, Maximize2, Minimize2, Code2 } from 'lucide-react';
import { getLanguageDisplayName, getMonacoLanguage } from '@/lib/code/languages';

// Dynamic import of Monaco Editor with SSR disabled
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => null,
  }
);

interface QuizoraCodeBlockProps {
  code: string;
  language?: string | null;
  className?: string;
  maxHeight?: number | string;
}

export function QuizoraCodeBlock({
  code,
  language = 'plaintext',
  className = '',
  maxHeight,
}: QuizoraCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const displayName = getLanguageDisplayName(language);
  const monacoLanguage = getMonacoLanguage(language);

  // Detect theme (dark vs light)
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

  // Handle escape key in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Copy raw code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Calculate dynamic editor height based on line count
  const calculatedHeight = useMemo(() => {
    if (maxHeight) return maxHeight;
    const lineCount = (code || '').split('\n').length;
    // 22px per line + 24px padding, bounded between 80px and 420px
    const px = Math.min(Math.max(lineCount * 22 + 24, 80), 420);
    return `${px}px`;
  }, [code, maxHeight]);

  const monacoTheme = isDarkMode ? 'vs-dark' : 'light';

  // Common Monaco options for student read-only view
  const editorOptions = useMemo(
    () => ({
      readOnly: true,
      domReadOnly: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'off' as const,
      lineNumbers: 'on' as const,
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: true,
      fontSize: 13.5,
      fontFamily:
        'JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, "Courier New", monospace',
      lineHeight: 22,
      renderLineHighlight: 'none' as const,
      overviewRulerLanes: 0,
      contextmenu: false,
      cursorStyle: 'line' as const,
      cursorBlinking: 'solid' as const,
      hideCursorInOverviewRuler: true,
      automaticLayout: true,
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
    <>
      {/* Normal Embedded Code Block */}
      <div
        className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fffffe] dark:bg-[#1e1e1e] overflow-hidden shadow-sm transition-all ${className}`}
      >
        {/* Editor Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 select-none">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Code2 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono tracking-wide">
              {displayName}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="Copy code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="Expand to Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div style={{ height: calculatedHeight }} className="w-full relative">
          {isMounted ? (
            <MonacoEditor
              height="100%"
              language={monacoLanguage}
              value={code}
              theme={monacoTheme}
              options={editorOptions}
              loading={
                <pre className="p-4 font-mono text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre">
                  {code}
                </pre>
              }
            />
          ) : (
            <pre className="p-4 font-mono text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre">
              {code}
            </pre>
          )}
        </div>
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-white dark:bg-[#1e1e1e]">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Code2 className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {displayName}
                  </span>
                  <span className="text-xs text-slate-500 ml-2 font-mono">
                    ({(code || '').split('\n').length} lines)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  title="Close Fullscreen (Esc)"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Fullscreen Editor Body */}
            <div className="flex-1 w-full relative">
              <MonacoEditor
                height="100%"
                language={monacoLanguage}
                value={code}
                theme={monacoTheme}
                options={{
                  ...editorOptions,
                  fontSize: 14,
                  lineHeight: 24,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
