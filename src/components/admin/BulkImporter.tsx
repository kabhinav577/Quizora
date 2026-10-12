'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileSpreadsheet,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  RefreshCw,
  ImageIcon,
  FolderTree,
  Layers,
  BookOpen,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { parseImportFile, generateSampleCsv } from '@/lib/imports/clientParser';
import { validateImportAction, commitImportAction } from '@/app/admin/imports/actions';
import { ValidationReport } from '@/services/imports';

export function BulkImporter() {
  const [file, setFile] = React.useState<File | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [parsingStage, setParsingStage] = React.useState<string>('Parsing file & validating taxonomy...');
  const [isCommitting, setIsCommitting] = React.useState(false);
  const [report, setReport] = React.useState<ValidationReport | null>(null);
  const [activeTab, setActiveTab] = React.useState<'errors' | 'duplicates' | 'valid' | 'taxonomy'>('errors');
  const [skipDuplicates, setSkipDuplicates] = React.useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [completedSummary, setCompletedSummary] = React.useState<{
    imported: number;
    skipped: number;
    examName?: string;
    subjectName?: string;
  } | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleCancelParsing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsParsing(false);
    setParseError('Validation was cancelled.');
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setReport(null);
    setCompletedSummary(null);
    setIsParsing(true);
    setParsingStage('Reading spreadsheet & unpacking contents...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { rows, imagesMap, error } = await parseImportFile(selectedFile, selectedFile.name);
      if (error || rows.length === 0) {
        setParseError(error || 'The uploaded spreadsheet contained 0 rows.');
        setIsParsing(false);
        return;
      }

      setParsingStage(`Validating ${rows.length} rows against Exam & Topic taxonomy...`);

      const imageFileNames = Array.from(imagesMap.keys());
      const plainRows = rows.map((r) => ({ ...r }));

      let validationReport: ValidationReport;

      // Primary: High-speed direct API route with timeout protection
      try {
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        const res = await fetch('/api/admin/imports/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: plainRows, imageFileNames }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned status ${res.status}`);
        }
        validationReport = await res.json();
      } catch (apiErr: unknown) {
        if (controller.signal.aborted) {
          throw new Error('Validation request timed out or was cancelled. Please try again.');
        }
        // Fallback to Server Action if API route is unavailable
        validationReport = await validateImportAction(plainRows, imageFileNames);
      }

      setReport(validationReport);
      if (validationReport.errorCount > 0) {
        setActiveTab('errors');
      } else if (validationReport.duplicateCount > 0) {
        setActiveTab('duplicates');
      } else {
        setActiveTab('valid');
      }
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsParsing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCommit = async () => {
    if (!report || report.validCount === 0) return;
    setIsCommitting(true);
    try {
      const plainItems = report.items.map((it) => ({
        ...it,
        parsedInput: {
          ...it.parsedInput,
          options: it.parsedInput.options.map((opt) => ({ ...opt })),
        },
      }));

      let res: { importedCount: number; skippedCount: number };

      // Primary: API route with fallback to Server Action
      try {
        const apiRes = await fetch('/api/admin/imports/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: plainItems, skipDuplicates }),
        });
        if (!apiRes.ok) {
          const errData = await apiRes.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned status ${apiRes.status}`);
        }
        res = await apiRes.json();
      } catch {
        res = await commitImportAction(plainItems, skipDuplicates);
      }

      const examName = report.examsDetected.map((e) => e.name).join(', ') || 'General Exam';
      const subjectName = report.subjectsDetected.map((s) => s.name).join(', ') || 'General Subject';
      setCompletedSummary({
        imported: res.importedCount,
        skipped: res.skippedCount,
        examName,
        subjectName,
      });
      setIsReviewModalOpen(false);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Error committing import');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadSample = () => {
    const csvContent = generateSampleCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Quizora_Bulk_Import_Sample_v2.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'exam',
      'subject',
      'topic',
      'question_text',
      'question_image',
      'code_language',
      'code_content',
      'option_a',
      'option_a_image',
      'option_b',
      'option_b_image',
      'option_c',
      'option_c_image',
      'option_d',
      'option_d_image',
      'option_e',
      'option_e_image',
      'correct_option',
      'explanation',
      'difficulty',
      'default_time_seconds',
      'marks',
      'negative_marks',
      'source_name',
      'source_year',
    ].join(',');
    const blob = new Blob([templateHeaders + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Quizora_Bulk_Import_Template_v2.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate questions that will be imported
  const validToImportCount = report
    ? skipDuplicates
      ? Math.max(0, report.validCount - report.duplicateCount)
      : report.validCount
    : 0;

  // Active step calculation for the workflow stepper
  const currentStep = completedSummary
    ? 5
    : report
    ? isReviewModalOpen
      ? 4
      : 3
    : isParsing
    ? 2
    : 1;

  const steps = [
    { num: 1, label: 'Upload CSV' },
    { num: 2, label: 'Parse & Validate' },
    { num: 3, label: 'Preview' },
    { num: 4, label: 'Admin Reviews Errors' },
    { num: 5, label: 'Import Summary' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UploadCloud className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Bulk Question Importer (V2)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Industry taxonomy: <span className="font-semibold text-slate-700 dark:text-slate-300">Exam → Subject → Topic → Question</span>. Supports 25-column V2 format with code questions and multiline blocks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="text-xs gap-1.5 shadow-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Template (CSV)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
            className="text-xs gap-1.5 shadow-xs border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 cursor-pointer"
          >
            <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            V2 Sample CSV
          </Button>
        </div>
      </div>

      {/* Import Workflow Stepper */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-2 text-xs">
          {steps.map((st, i) => {
            const isDone = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            return (
              <React.Fragment key={st.num}>
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : st.num}
                  </div>
                  <span
                    className={`font-medium ${
                      isCurrent
                        ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                        : isDone
                        ? 'text-slate-700 dark:text-slate-300 font-medium'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-6 sm:w-12 shrink-0 rounded ${
                      isDone
                        ? 'bg-emerald-500'
                        : isCurrent
                        ? 'bg-indigo-500/50'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step 1 & 2: Upload CSV / Parsing State */}
      {!report && !completedSummary && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!isParsing) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!isParsing && e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileSelect(e.dataTransfer.files[0]);
            }
          }}
          className={`rounded-2xl border-2 border-dashed transition-all p-8 md:p-12 text-center shadow-xs ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500'
          }`}
        >
          {isParsing ? (
            <div className="py-8 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 animate-pulse">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Parsing CSV & Validating Taxonomy...
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto font-medium">
                {parsingStage}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                Checking Exam, Subject, Topic hierarchy, duplicate questions, and correct answer options.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelParsing}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border-slate-200 dark:border-slate-700"
                >
                  Cancel Validation
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-4 shadow-inner">
                <UploadCloud className="h-8 w-8" />
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Upload CSV, Excel, or ZIP Package
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                Drag & drop your <strong>.csv</strong>, <strong>.xlsx</strong>, or <strong>.zip</strong> archive.
                Columns required: <code className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.5 rounded text-[11px]">exam, subject, topic, question_text, ...</code>
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
                    Choose File to Import
                  </span>
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls, .zip"
                    disabled={isParsing}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const selected = e.target.files[0];
                        e.target.value = '';
                        handleFileSelect(selected);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400 dark:text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Excel / CSV
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <FileArchive className="h-4 w-4 text-amber-500" /> ZIP with Diagrams
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500" /> Pre-Insert Validation
                </span>
              </div>
            </>
          )}

          {parseError && (
            <div className="mt-6 mx-auto max-w-md rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
              {parseError}
            </div>
          )}

          {/* Format Guidelines Box */}
          <div className="mt-8 text-left border-t border-slate-100 dark:border-slate-800 pt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-500" /> CSV Format & Validation Guidelines
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Required columns:</p>
                <code className="text-[11px] block font-mono text-indigo-600 dark:text-indigo-400 break-words">
                  exam, subject, topic, question_text, option_a, option_b, option_c, option_d, correct_option
                </code>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Multiple exams:</p>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Use &quot;|&quot; to assign one question to multiple exams without duplicates.
                  <br />
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">Example: Bihar STET|Bihar TRE 4.0</span>
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Options & Correct Answer:</p>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  <strong>A–D are required.</strong> Option E is optional.
                  <br />
                  <strong>Correct option:</strong> Use <strong>A, B, C, D</strong> or <strong>E</strong>.
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Images & Metadata:</p>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Question and option image columns are optional.
                  <br />
                  Supports explanation, difficulty, marks, negative marks, and source year.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Exact "Bulk Import Preview" Card as Requested */}
      {report && !completedSummary && (
        <div className="space-y-6">
          <div className="mx-auto max-w-xl">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md overflow-hidden">
              {/* Card Header */}
              <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    Bulk Import Preview
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Source: {file?.name || 'Uploaded File'}
                  </p>
                </div>
                {report.errorCount > 0 ? (
                  <Badge variant="destructive" className="text-[11px] font-semibold gap-1">
                    <XCircle className="h-3.5 w-3.5" /> {report.errorCount} Errors Detected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 gap-1 bg-emerald-50/50 dark:bg-emerald-950/40">
                    <CheckCircle2 className="h-3.5 w-3.5" /> All Questions Valid
                  </Badge>
                )}
              </div>

              {/* Card Body - Exact Key-Value Layout */}
              <div className="p-6 space-y-4 text-sm divide-y divide-slate-100 dark:divide-slate-800/80">
                {/* Metric Rows */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Total Questions</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-base">
                      {report.totalRows}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Valid Questions
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-base">
                      {report.validCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Duplicate Questions
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-base">
                      {report.duplicateCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Invalid Questions
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400 font-mono text-base">
                      {report.errorCount}
                    </span>
                  </div>
                </div>

                {/* Taxonomy Rows */}
                <div className="pt-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-500" /> Exam
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                      {report.examsDetected.map((e) => e.name).join(', ') || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-indigo-500" /> Subject
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                      {report.subjectsDetected.map((s) => s.name).join(', ') || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <Tag className="h-4 w-4 text-indigo-500" /> Topics Detected
                    </span>
                    <div className="text-right space-y-1">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-base">
                        {report.topicsDetected.length}
                      </span>
                      {report.topicsDetected.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-1 max-w-[280px]">
                          {report.topicsDetected.slice(0, 4).map((t, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] font-normal">
                              {t.name}
                            </Badge>
                          ))}
                          {report.topicsDetected.length > 4 && (
                            <span className="text-[10px] text-slate-400">
                              +{report.topicsDetected.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Duplicates skip option */}
                {report.duplicateCount > 0 && (
                  <div className="pt-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                      />
                      <span>
                        Skip duplicate questions (Safely import <strong>{validToImportCount}</strong> new questions)
                      </span>
                    </label>
                  </div>
                )}

                {/* Exact 3 Buttons: [View Errors] [Cancel] [Import X] */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsReviewModalOpen(true)}
                    className="w-full sm:w-auto text-xs gap-1.5 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    {report.errorCount > 0 ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                    )}
                    View Errors & Review
                  </Button>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setReport(null);
                        setFile(null);
                        setParseError(null);
                      }}
                      disabled={isCommitting}
                      className="text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      onClick={handleCommit}
                      disabled={isCommitting || validToImportCount === 0}
                      className="text-xs gap-1.5 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4"
                    >
                      {isCommitting ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Import {validToImportCount}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Admin Reviews Errors Modal */}
      {report && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          title="Admin Review: Validation Errors & Questions"
          maxWidth="4xl"
        >
          <div className="space-y-4">
            {/* Modal Tabs */}
            <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 pb-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('errors')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'errors'
                    ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 ring-1 ring-red-300 dark:ring-red-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                Invalid Questions ({report.errorCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('duplicates')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'duplicates'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Duplicates ({report.duplicateCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('valid')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'valid'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Valid Questions ({report.validCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('taxonomy')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'taxonomy'
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <FolderTree className="h-3.5 w-3.5 text-indigo-500" />
                Taxonomy Details
              </button>
            </div>

            {/* Modal Body Contents */}
            <div className="max-h-[55vh] overflow-y-auto pr-1">
              {/* Tab: Errors */}
              {activeTab === 'errors' && (
                <div className="space-y-3">
                  {report.errors.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Zero Validation Errors!
                      </p>
                      <p className="text-xs mt-1">
                        All question rows adhere to the required schema, taxonomy, and option rules.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {report.errors.map((err, i) => (
                        <div key={i} className="py-3 flex items-start gap-3">
                          <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-[10px] font-mono">
                                Row {err.rowIndex}
                              </Badge>
                              {err.field && (
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                  Field: {err.field}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                              {err.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Duplicates */}
              {activeTab === 'duplicates' && (
                <div className="space-y-3">
                  {report.duplicates.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        No Duplicates Found
                      </p>
                      <p className="text-xs mt-1">
                        Every question in this file is unique and does not match existing bank items.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {report.duplicates.map((dup, i) => (
                        <div key={i} className="py-3 flex items-start gap-3">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="warning" className="text-[10px] font-mono">
                                Row {dup.rowIndex}
                              </Badge>
                              <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                                {dup.isInternal
                                  ? 'Duplicate of earlier row within this file'
                                  : 'Matches question already stored in Question Bank'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300">
                              &ldquo;{dup.questionText}&rdquo;
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Valid Questions */}
              {activeTab === 'valid' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {report.items.map((item) => (
                    <div key={item.rowIndex} className="py-3 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                          Row {item.rowIndex}
                        </span>
                        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 px-2 py-0.5 rounded">
                          {(item.examNames && item.examNames.length > 0 ? item.examNames.join(' | ') : item.examName)} → {item.subjectName} → {item.topicName}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {item.parsedInput.difficulty}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.parsedInput.options.length} Options
                        </Badge>
                        {item.referencedImages.length > 0 && (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" /> {item.referencedImages.length} Image(s)
                          </span>
                        )}
                        {item.isDuplicate && (
                          <Badge variant="warning" className="text-[10px]">
                            Duplicate
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {item.parsedInput.question_text}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Correct: Option {item.correctOptionLetter || String.fromCharCode(64 + Number(item.parsedInput.correct_option))} • Marks: +{Number(item.parsedInput.marks)} (-{Number(item.parsedInput.negative_marks)})
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Taxonomy Details */}
              {activeTab === 'taxonomy' && (
                <div className="space-y-4 pt-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">Exams ({report.examsDetected.length})</h4>
                    <div className="space-y-1.5">
                      {report.examsDetected.map((e) => (
                        <div key={e.id} className="text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{e.name}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{e.rowCount} rows</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">Subjects ({report.subjectsDetected.length})</h4>
                    <div className="space-y-1.5">
                      {report.subjectsDetected.map((s, idx) => (
                        <div key={idx} className="text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
                          <span className="text-slate-800 dark:text-slate-200">
                            <span className="font-semibold">{s.name}</span>{' '}
                            <span className="text-slate-400">(Exam: {s.examName})</span>
                            {s.isNew && <Badge variant="outline" className="ml-2 text-[10px] text-indigo-600 border-indigo-300">New</Badge>}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">{s.rowCount} rows</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">Topics ({report.topicsDetected.length})</h4>
                    <div className="space-y-1.5">
                      {report.topicsDetected.map((t, idx) => (
                        <div key={idx} className="text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
                          <span className="text-slate-800 dark:text-slate-200">
                            <span className="font-semibold">{t.name}</span>{' '}
                            <span className="text-slate-400">(Subject: {t.subjectName})</span>
                            {t.isNew && <Badge variant="outline" className="ml-2 text-[10px] text-emerald-600 border-emerald-300">New</Badge>}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">{t.rowCount} rows</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with quick import or close */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                />
                Skip duplicates ({report.duplicateCount})
              </label>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="text-xs"
                >
                  Back to Preview
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleCommit}
                  disabled={isCommitting || validToImportCount === 0}
                  className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Import {validToImportCount}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Step 5: Exact "Import Summary" View */}
      {completedSummary && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 p-8 text-center space-y-4 shadow-sm max-w-xl mx-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-100">
            Bulk Import Summary
          </h3>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/40 text-left space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Total Imported</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                {completedSummary.imported} Questions
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Duplicates Skipped</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                {completedSummary.skipped}
              </span>
            </div>
            {completedSummary.examName && (
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Exam</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {completedSummary.examName}
                </span>
              </div>
            )}
            {completedSummary.subjectName && (
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Subject</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {completedSummary.subjectName}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            Your questions are now saved to the database and organized by curriculum taxonomy.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/admin/questions">
              <Button size="sm" className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                View Question Bank <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCompletedSummary(null);
                setReport(null);
                setFile(null);
                setParseError(null);
              }}
              className="text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Import Another File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

