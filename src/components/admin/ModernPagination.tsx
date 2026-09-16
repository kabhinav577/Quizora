'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ModernPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export function ModernPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 15, 25, 50, 100],
  itemLabel = 'questions',
}: ModernPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [jumpPage, setJumpPage] = React.useState('');

  // Calculate slice range for display
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Navigate helper maintaining current URL search query params
  const navigateTo = React.useCallback(
    (page: number, newPageSize?: number) => {
      const params = new URLSearchParams(searchParams.toString());
      const targetPage = Math.max(1, Math.min(page, totalPages || 1));
      params.set('page', targetPage.toString());

      if (newPageSize) {
        params.set('pageSize', newPageSize.toString());
        // Always reset to page 1 when pageSize changes
        params.set('page', '1');
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, totalPages]
  );

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      navigateTo(pageNum);
      setJumpPage('');
    }
  };

  // Generate pagination range with sibling indicators and ellipses
  const paginationRange = React.useMemo(() => {
    const siblingCount = 1;
    const totalPageNumbers = siblingCount * 2 + 5;

    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, 'dots-end' as const, totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [1, 'dots-start' as const, ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, 'dots-start' as const, ...middleRange, 'dots-end' as const, totalPages];
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [currentPage, totalPages]);

  if (totalItems === 0) return null;

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 px-4 py-3.5 sm:px-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: Total & Page Size */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Showing <strong className="font-semibold text-slate-900 dark:text-slate-100">{startItem}</strong> to{' '}
            <strong className="font-semibold text-slate-900 dark:text-slate-100">{endItem}</strong> of{' '}
            <strong className="font-semibold text-slate-900 dark:text-slate-100">{totalItems}</strong> {itemLabel}
          </span>

          <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">•</span>

          <div className="flex items-center gap-1.5">
            <label htmlFor="pageSizeSelect" className="text-slate-500 dark:text-slate-400">
              Per page:
            </label>
            <select
              id="pageSizeSelect"
              value={pageSize}
              onChange={(e) => navigateTo(1, Number(e.target.value))}
              className="h-7 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Page Controls */}
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigateTo(1)}
            disabled={currentPage <= 1}
            className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            title="First Page"
          >
            <ChevronsLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </Button>

          {/* Previous page */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigateTo(currentPage - 1)}
            disabled={currentPage <= 1}
            className="h-8 px-2.5 gap-1 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            title="Previous Page"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline text-xs">Prev</span>
          </Button>

          {/* Numbered Pills */}
          <div className="flex items-center gap-1 mx-0.5">
            {paginationRange.map((item, index) => {
              if (item === 'dots-start' || item === 'dots-end') {
                return (
                  <span
                    key={`dots-${index}`}
                    className="h-8 w-6 flex items-center justify-center text-xs text-slate-400 dark:text-slate-600 select-none"
                  >
                    …
                  </span>
                );
              }

              const isCurrent = item === currentPage;
              return (
                <button
                  key={`page-${item}`}
                  type="button"
                  onClick={() => navigateTo(item)}
                  className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/30'
                      : 'border border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Next page */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigateTo(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-8 px-2.5 gap-1 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            title="Next Page"
          >
            <span className="hidden sm:inline text-xs">Next</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
          </Button>

          {/* Last page */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigateTo(totalPages)}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            title="Last Page"
          >
            <ChevronsRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </Button>
        </div>

        {/* Right: Direct Page Jump */}
        <form onSubmit={handleJump} className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <span>Go to</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            placeholder={String(currentPage)}
            className="h-7 w-12 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 text-center text-xs font-semibold text-slate-900 dark:text-slate-100 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span>of {totalPages}</span>
          <button
            type="submit"
            disabled={!jumpPage}
            className="h-7 w-7 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 disabled:opacity-40 flex items-center justify-center transition"
            title="Go to page"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
