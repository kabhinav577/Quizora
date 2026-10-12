'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  Copy,
  Edit,
  Archive,
  BookOpen,
  ImageIcon,
  AlertTriangle,
  CheckSquare,
  Square,
  MinusSquare,
  Layers,
  RotateCcw,
  Database,
  Loader2,
  X,
  Code2,
} from 'lucide-react';
import { Question } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  deleteQuestionAction,
  bulkDeleteQuestionsAction,
  bulkDeleteBySourceAction,
  duplicateQuestionAction,
  archiveQuestionAction,
  resetQuestionsToSampleAction,
} from '@/app/admin/questions/actions';

interface SourceSummary {
  source_name: string;
  count: number;
}

interface QuestionBankTableProps {
  questions: Question[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  subjectFilterName?: string;
  sources: SourceSummary[];
}

export function QuestionBankTable({
  questions,
  total,
  page,
  pageSize,
  totalPages,
  subjectFilterName,
  sources,
}: QuestionBankTableProps) {
  const router = useRouter();

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [targetToDelete, setTargetToDelete] = React.useState<{ ids: string[]; label: string } | null>(null);
  const [sourceDeleteModalOpen, setSourceDeleteModalOpen] = React.useState(false);
  const [selectedSourceToDelete, setSelectedSourceToDelete] = React.useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  // Toggle single selection
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all on current page
  const pageIds = React.useMemo(() => questions.map((q) => q.id), [questions]);
  const isAllPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const isPartiallySelected =
    pageIds.some((id) => selectedIds.includes(id)) && !isAllPageSelected;

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Trigger delete modal for selected
  const requestBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setTargetToDelete({
      ids: selectedIds,
      label: `${selectedIds.length} selected question${selectedIds.length > 1 ? 's' : ''}`,
    });
    setDeleteModalOpen(true);
  };

  // Trigger delete modal for a single question
  const requestSingleDelete = (q: Question) => {
    setTargetToDelete({
      ids: [q.id],
      label: `"${q.question_text.slice(0, 60)}${q.question_text.length > 60 ? '...' : ''}"`,
    });
    setDeleteModalOpen(true);
  };

  // Confirm and execute deletion
  const handleConfirmDelete = async () => {
    if (!targetToDelete || targetToDelete.ids.length === 0) return;

    setIsDeleting(true);
    setActionMessage(null);

    try {
      if (targetToDelete.ids.length === 1) {
        const res = await deleteQuestionAction(targetToDelete.ids[0]);
        if (res.success) {
          setActionMessage({ type: 'success', text: res.message });
          setSelectedIds((prev) => prev.filter((id) => id !== targetToDelete.ids[0]));
        } else {
          setActionMessage({ type: 'error', text: res.message });
        }
      } else {
        const res = await bulkDeleteQuestionsAction(targetToDelete.ids);
        if (res.success) {
          setActionMessage({ type: 'success', text: res.message });
          setSelectedIds((prev) => prev.filter((id) => !targetToDelete.ids.includes(id)));
        } else {
          setActionMessage({ type: 'error', text: res.message });
        }
      }
      setDeleteModalOpen(false);
      setTargetToDelete(null);
      router.refresh();
    } catch {
      setActionMessage({ type: 'error', text: 'An unexpected error occurred during deletion.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete by source (e.g., CSV imports batch)
  const handleConfirmSourceDelete = async () => {
    if (!selectedSourceToDelete) return;

    setIsDeleting(true);
    setActionMessage(null);

    try {
      const res = await bulkDeleteBySourceAction(selectedSourceToDelete);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
        setSelectedIds([]);
      } else {
        setActionMessage({ type: 'error', text: res.message });
      }
      setSourceDeleteModalOpen(false);
      setSelectedSourceToDelete(null);
      router.refresh();
    } catch {
      setActionMessage({ type: 'error', text: 'An error occurred during bulk source deletion.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Duplicate handler
  const handleDuplicate = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await duplicateQuestionAction(id);
      if (res.success) {
        setActionMessage({ type: 'success', text: 'Question duplicated as a draft.' });
        router.refresh();
      } else {
        setActionMessage({ type: 'error', text: res.message || 'Failed to duplicate.' });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Archive handler
  const handleArchive = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await archiveQuestionAction(id);
      if (res.success) {
        setActionMessage({ type: 'success', text: 'Question archived.' });
        router.refresh();
      } else {
        setActionMessage({ type: 'error', text: res.message || 'Failed to archive.' });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset to 5 sample questions handler
  const handleConfirmReset = async () => {
    setIsResetting(true);
    setActionMessage(null);
    try {
      const res = await resetQuestionsToSampleAction();
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
        setSelectedIds([]);
      } else {
        setActionMessage({ type: 'error', text: res.message });
      }
      setResetModalOpen(false);
      router.refresh();
    } catch {
      setActionMessage({ type: 'error', text: 'Error resetting questions to sample data.' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast / Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {actionMessage.type === 'success' ? (
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Table Container */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            {/* Select All on Page Checkbox */}
            {questions.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllPage}
                title={isAllPageSelected ? 'Deselect all on this page' : 'Select all on this page'}
                className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
              >
                {isAllPageSelected ? (
                  <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                ) : isPartiallySelected ? (
                  <MinusSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
                <span>Select Page</span>
              </button>
            )}

            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Questions Found: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{total}</span>
            </span>

            {subjectFilterName && (
              <Badge variant="purple" className="text-[10px]">
                Filtered by Subject: {subjectFilterName}
              </Badge>
            )}

            {total > 0 && (
              <span className="hidden sm:inline-block text-xs text-slate-500 dark:text-slate-400 font-medium">
                (Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Reset to 5 Sample Questions Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetModalOpen(true)}
              className="text-xs h-8 gap-1.5 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400"
              title="Reset questions to only the 5 standard sample questions"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to 5 Samples</span>
            </Button>

            {/* Bulk Deletion by Source/CSV Batch Quick Action */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSourceDeleteModalOpen(true)}
              className="text-xs h-8 gap-1.5 border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400"
              title="Delete questions by imported CSV source or batch"
            >
              <Database className="h-3.5 w-3.5" />
              <span>Bulk Clean by Source</span>
            </Button>

            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Page <strong className="font-semibold text-slate-800 dark:text-slate-200">{page}</strong> of{' '}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">{totalPages || 1}</strong>
            </span>
          </div>
        </div>

        {/* Selected Floating Action Bar */}
        {selectedIds.length > 0 && (
          <div className="sticky top-0 z-20 bg-indigo-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center bg-white/20 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
                {selectedIds.length}
              </span>
              <span className="text-xs font-medium">question{selectedIds.length > 1 ? 's' : ''} selected</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-xs h-7 text-indigo-100 hover:text-white hover:bg-white/10"
              >
                Clear Selection
              </Button>

              <Button
                size="sm"
                onClick={requestBulkDelete}
                disabled={isDeleting}
                className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs gap-1.5"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Delete Selected ({selectedIds.length})</span>
              </Button>
            </div>
          </div>
        )}

        {/* Questions Rows */}
        {questions.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No questions found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your search criteria, clearing the filters, or uploading questions via Bulk Import.
            </p>
            <Link href="/admin/questions/new" className="inline-block mt-4">
              <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                Create Question
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {questions.map((q) => {
              const isSelected = selectedIds.includes(q.id);
              const hasDiag = Boolean(q.question_image_path);
              const hasOptImg = q.options.some((o) => Boolean(o.image_path));
              const optCount = q.options.length;

              return (
                <div
                  key={q.id}
                  className={`p-4 md:p-5 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Row Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleSelectOne(q.id)}
                      className="mt-1 cursor-pointer text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      title={isSelected ? 'Deselect question' : 'Select question'}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>

                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            q.status === 'published'
                              ? 'success'
                              : q.status === 'draft'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {q.status}
                        </Badge>

                        {/* Exam Badge(s) */}
                        {q.exam_names && q.exam_names.length > 0 ? (
                          q.exam_names.map((en, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                            >
                              {en}
                            </Badge>
                          ))
                        ) : q.exam_name ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                          >
                            {q.exam_name}
                          </Badge>
                        ) : null}

                        {/* Subject Badge */}
                        <Badge
                          variant="purple"
                          className="text-[10px] font-semibold gap-1 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                        >
                          <BookOpen className="h-3 w-3" />
                          {q.subject_name || 'General Subject'}
                        </Badge>

                        {/* Topic Badge */}
                        {q.topic_name && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          >
                            {q.topic_name}
                          </Badge>
                        )}

                        <Badge variant="outline" className="text-[10px]">
                          {q.difficulty}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {optCount} Options
                        </Badge>

                        {hasDiag && (
                          <Badge variant="purple" className="text-[10px] gap-1">
                            <ImageIcon className="h-3 w-3" />
                            Diagram
                          </Badge>
                        )}

                        {hasOptImg && (
                          <Badge variant="default" className="text-[10px] gap-1">
                            <ImageIcon className="h-3 w-3" />
                            Option Images
                          </Badge>
                        )}

                        {q.code_language && (
                          <Badge variant="outline" className="text-[10px] gap-1 font-mono text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                            <Code2 className="h-3 w-3" />
                            {q.code_language}
                          </Badge>
                        )}

                        {q.source_name && (
                          <span
                            className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[280px]"
                            title={q.source_name}
                          >
                            {q.source_name} {q.source_year ? `'${q.source_year.toString().slice(-2)}` : ''}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                        {q.question_text}
                      </p>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span>Correct: Option {q.correct_option_letter || String.fromCharCode(64 + q.correct_option)}</span>
                        <span>•</span>
                        <span>Marks: +{q.marks}</span>
                        {q.negative_marks > 0 && <span>(-{q.negative_marks})</span>}
                        {q.default_time_seconds && (
                          <>
                            <span>•</span>
                            <span>Time: {q.default_time_seconds}s</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                    <Link href={`/admin/questions/${q.id}/edit`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                        <Edit className="h-3.5 w-3.5 text-slate-500" />
                        Edit
                      </Button>
                    </Link>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(q.id)}
                      disabled={isDeleting}
                      className="h-8 text-xs gap-1 text-slate-600 dark:text-slate-300"
                      title="Duplicate Question"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>

                    {q.status !== 'archived' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(q.id)}
                        disabled={isDeleting}
                        className="h-8 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        title="Archive Question"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {/* Permanent Delete Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => requestSingleDelete(q)}
                      disabled={isDeleting}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 p-2"
                      title="Permanently Delete Question"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Permanent Delete (Single or Selected Bulk) */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Confirm Permanent Deletion"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">This action cannot be undone.</p>
              <p>
                You are about to permanently delete <strong>{targetToDelete?.label}</strong>. These questions will be
                removed from the database, question bank, and any test question references.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeleteModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Permanently Delete</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete by Source / Import Batch Modal */}
      <Modal
        isOpen={sourceDeleteModalOpen}
        onClose={() => !isDeleting && setSourceDeleteModalOpen(false)}
        title="Bulk Delete Questions by Source / Batch"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Delete an entire batch of uploaded questions based on their source (e.g. from a CSV file import). This
            permanently purges all questions under that source.
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {sources.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No question sources found.</p>
            ) : (
              sources.map((src) => {
                const isSelected = selectedSourceToDelete === src.source_name;
                return (
                  <div
                    key={src.source_name}
                    onClick={() => setSelectedSourceToDelete(src.source_name)}
                    className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {src.source_name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Contains <strong className="text-slate-800 dark:text-slate-200">{src.count}</strong> question{src.count > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge variant={isSelected ? 'destructive' : 'secondary'} className="text-[11px] font-bold">
                      {src.count} Qs
                    </Badge>
                  </div>
                );
              })
            )}
          </div>

          {selectedSourceToDelete && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                Selected: <strong>{selectedSourceToDelete}</strong>. All questions from this source will be deleted.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => {
                setSourceDeleteModalOpen(false);
                setSelectedSourceToDelete(null);
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeleting || !selectedSourceToDelete}
              onClick={handleConfirmSourceDelete}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting Batch...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Selected Batch</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset to Sample Questions Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => !isResetting && setResetModalOpen(false)}
        title="Refresh App to 5 Sample Questions"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">Reset to Standard Sample Questions</p>
              <p>
                This will remove all uploaded, draft, and extra questions, leaving <strong>only the 5 standard sample questions</strong> for testing.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isResetting}
              onClick={() => setResetModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isResetting}
              onClick={handleConfirmReset}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset to 5 Questions</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
