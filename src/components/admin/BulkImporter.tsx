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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseImportFile, generateSampleCsv } from '@/lib/imports/clientParser';
import { validateImportAction, commitImportAction } from '@/app/admin/imports/actions';
import { ValidationReport } from '@/services/imports';

export function BulkImporter() {
  const [file, setFile] = React.useState<File | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isCommitting, setIsCommitting] = React.useState(false);
  const [report, setReport] = React.useState<ValidationReport | null>(null);
  const [activeTab, setActiveTab] = React.useState<'valid' | 'errors' | 'duplicates' | 'all'>('valid');
  const [skipDuplicates, setSkipDuplicates] = React.useState(true);
  const [completedSummary, setCompletedSummary] = React.useState<{
    imported: number;
    skipped: number;
  } | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setReport(null);
    setCompletedSummary(null);
    setIsParsing(true);

    try {
      const { rows, imagesMap, error } = await parseImportFile(selectedFile, selectedFile.name);
      if (error || rows.length === 0) {
        setParseError(error || 'The uploaded spreadsheet contained 0 rows.');
        setIsParsing(false);
        return;
      }

      const imageFileNames = Array.from(imagesMap.keys());
      const plainRows = rows.map((r) => ({ ...r }));
      const validationReport = await validateImportAction(plainRows, imageFileNames);
      setReport(validationReport);
      if (validationReport.validCount > 0) {
        setActiveTab('valid');
      } else if (validationReport.errorCount > 0) {
        setActiveTab('errors');
      }
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsParsing(false);
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
      const res = await commitImportAction(plainItems, skipDuplicates);
      setCompletedSummary({
        imported: res.importedCount,
        skipped: res.skippedCount,
      });
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
    link.setAttribute('download', 'quizora_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Bulk Question Importer
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Import hundreds of MCQs via CSV, Excel (.xlsx), or ZIP archives with diagrams.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadSample}
          className="text-xs gap-1.5 shadow-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Download Sample Template (CSV)
        </Button>
      </div>

      {/* Step 1: Upload Card if not parsed */}
      {!report && !completedSummary && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 md:p-12 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-4 shadow-inner">
            <UploadCloud className="h-8 w-8" />
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Upload Spreadsheet or ZIP Package
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
            Drag & drop your <strong>.csv</strong>, <strong>.xlsx</strong>, or <strong>.zip</strong> file.
            For questions with diagrams or option images, include them in an <code className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">images/</code> folder within your ZIP.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <label className="cursor-pointer">
              <span className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
                {isParsing ? 'Processing File...' : 'Choose File to Import'}
              </span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls, .zip"
                disabled={isParsing}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
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
              <CheckCircle2 className="h-4 w-4 text-indigo-500" /> Auto-Validation
            </span>
          </div>

          {parseError && (
            <div className="mt-6 mx-auto max-w-md rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
              {parseError}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Validation Preview & Confirmation */}
      {report && !completedSummary && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Rows
              </p>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{report.totalRows}</p>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 shadow-xs">
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Valid
              </p>
              <p className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5">{report.validCount}</p>
            </div>

            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 p-3.5 shadow-xs">
              <p className="text-[11px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /> Invalid
              </p>
              <p className="text-xl font-black text-red-900 dark:text-red-200 mt-0.5">{report.errorCount}</p>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 p-3.5 shadow-xs">
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Duplicates
              </p>
              <p className="text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5">{report.duplicateCount}</p>
            </div>

            <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 shadow-xs">
              <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Images
              </p>
              <p className="text-xl font-black text-indigo-900 dark:text-indigo-200 mt-0.5">
                {report.imagesFoundCount}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                />
                Skip potential duplicates ({report.duplicateCount})
              </label>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono">{file?.name}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReport(null);
                  setFile(null);
                }}
                disabled={isCommitting}
                className="text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel / Re-upload
              </Button>

              <Button
                size="sm"
                onClick={handleCommit}
                disabled={isCommitting || report.validCount === 0}
                className="text-xs gap-1.5 shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Importing Questions...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm & Import ({skipDuplicates ? report.validCount - report.duplicateCount : report.validCount}) Questions
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Tabbed Inspection View */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('valid')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'valid'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Valid Rows ({report.validCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('errors')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'errors'
                    ? 'bg-white dark:bg-slate-900 text-red-700 dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Errors ({report.errorCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('duplicates')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'duplicates'
                    ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Duplicates ({report.duplicateCount})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 max-h-[500px] overflow-y-auto">
              {activeTab === 'valid' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {report.items.map((item) => (
                    <div key={item.rowIndex} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                            Row {item.rowIndex}
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
                              Potential Duplicate
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {item.parsedInput.question_text}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Correct: Option {String.fromCharCode(64 + Number(item.parsedInput.correct_option))} • Marks: +{Number(item.parsedInput.marks)} (-{Number(item.parsedInput.negative_marks)})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'errors' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {report.errors.map((err, i) => (
                    <div key={i} className="py-3 flex items-start gap-3">
                      <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-800 dark:text-red-400">
                          Row {err.rowIndex}: {err.field}
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{err.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'duplicates' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {report.duplicates.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">No potential duplicates detected.</p>
                  ) : (
                    report.duplicates.map((dup, i) => (
                      <div key={i} className="py-3 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800 dark:text-amber-400">
                            Row {dup.rowIndex}: Duplicate of existing question
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{dup.questionText}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success Confirmation Banner */}
      {completedSummary && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">
            Bulk Import Successful!
          </h3>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
            Successfully created <strong>{completedSummary.imported}</strong> new MCQs in the Question Bank.
            {completedSummary.skipped > 0 && ` (${completedSummary.skipped} duplicates skipped)`}
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
