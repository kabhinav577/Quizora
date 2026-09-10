'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  Search,
  Clock,
  Layers,
  AlertCircle,
  Shuffle,
} from 'lucide-react';
import { Exam, Subject, Topic, Question } from '@/types/database';
import { TestWithQuestions } from '@/services/tests';
import { TestFormInput, TestFormSchema } from '@/schemas/test';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { QuestionPreview } from '@/components/questions/QuestionPreview';

interface TestBuilderProps {
  initialData?: TestWithQuestions | null;
  exams: Exam[];
  subjects: Subject[];
  topics: Topic[];
  availableQuestions: Question[];
  onSubmit: (data: TestFormInput) => Promise<{ success: boolean; error?: string }>;
}

export function TestBuilder({
  initialData,
  exams,
  subjects,
  topics,
  availableQuestions,
  onSubmit,
}: TestBuilderProps) {
  const router = useRouter();

  // Basic Details
  const [examId, setExamId] = React.useState<string>(initialData?.exam_id || exams[0]?.id || '');
  const [title, setTitle] = React.useState<string>(initialData?.title || '');
  const [slug, setSlug] = React.useState<string>(initialData?.slug || '');
  const [description, setDescription] = React.useState<string>(initialData?.description || '');
  const [testType, setTestType] = React.useState<'practice' | 'mock_test'>(
    initialData?.test_type || 'practice'
  );

  // Timer & Scoring
  const [durationMinutes, setDurationMinutes] = React.useState<number | ''>(
    initialData?.duration_seconds ? Math.round(initialData.duration_seconds / 60) : 60
  );
  const [hasDuration, setHasDuration] = React.useState<boolean>(
    Boolean(initialData?.duration_seconds || initialData?.test_type === 'mock_test')
  );
  const [questionTimeSeconds, setQuestionTimeSeconds] = React.useState<number | ''>(
    initialData?.question_time_seconds || ''
  );
  const [hasQuestionTimer, setHasQuestionTimer] = React.useState<boolean>(
    Boolean(initialData?.question_time_seconds)
  );

  const [marksPerQuestion, setMarksPerQuestion] = React.useState<number>(
    initialData?.marks_per_question || 1.0
  );
  const [negativeMarks, setNegativeMarks] = React.useState<number>(
    initialData?.negative_marks || 0.25
  );

  // Flags
  const [shuffleQuestions, setShuffleQuestions] = React.useState<boolean>(
    initialData?.shuffle_questions ?? true
  );
  const [shuffleOptions, setShuffleOptions] = React.useState<boolean>(
    initialData?.shuffle_options ?? false
  );
  const [showResultImmediately, setShowResultImmediately] = React.useState<boolean>(
    initialData?.show_result_immediately ?? true
  );
  const [showExplanations, setShowExplanations] = React.useState<boolean>(
    initialData?.show_explanations ?? true
  );
  const [status, setStatus] = React.useState<'draft' | 'published' | 'archived'>(
    initialData?.status || 'draft'
  );

  // Selected Question IDs in current Order
  const [selectedQuestionIds, setSelectedQuestionIds] = React.useState<string[]>(
    initialData?.questions.map((q) => q.id) || []
  );

  // Question Selector Filters
  const [questionSearch, setQuestionSearch] = React.useState('');
  const [subjectFilter, setSubjectFilter] = React.useState('');
  const [topicFilter, setTopicFilter] = React.useState('');
  const [difficultyFilter, setDifficultyFilter] = React.useState('');

  // Modals & Submissions
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false);
  const [previewQuestion, setPreviewQuestion] = React.useState<Question | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Auto-generate slug from title
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialData) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  // Reordering helpers
  const moveUp = (index: number) => {
    if (index === 0) return;
    setSelectedQuestionIds((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index === selectedQuestionIds.length - 1) return;
    setSelectedQuestionIds((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const removeQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => prev.filter((qid) => qid !== id));
  };

  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    );
  };

  // Filter available questions
  const filteredAvailableQuestions = React.useMemo(() => {
    return availableQuestions.filter((q) => {
      if (examId && q.exam_id !== examId) return false;
      if (subjectFilter && q.subject_id !== subjectFilter) return false;
      if (topicFilter && q.topic_id !== topicFilter) return false;
      if (difficultyFilter && q.difficulty !== difficultyFilter) return false;
      if (
        questionSearch &&
        !q.question_text.toLowerCase().includes(questionSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [availableQuestions, examId, subjectFilter, topicFilter, difficultyFilter, questionSearch]);

  const selectedQuestions = React.useMemo(() => {
    return selectedQuestionIds
      .map((id) => availableQuestions.find((q) => q.id === id))
      .filter((q): q is Question => Boolean(q));
  }, [selectedQuestionIds, availableQuestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: TestFormInput = {
      exam_id: examId,
      title,
      slug,
      description: description || null,
      test_type: testType,
      duration_seconds: hasDuration && durationMinutes !== '' ? Number(durationMinutes) * 60 : null,
      question_time_seconds:
        hasQuestionTimer && questionTimeSeconds !== '' ? Number(questionTimeSeconds) : null,
      marks_per_question: Number(marksPerQuestion),
      negative_marks: Number(negativeMarks),
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions,
      show_result_immediately: showResultImmediately,
      show_explanations: showExplanations,
      status,
      question_ids: selectedQuestionIds,
    };

    const validation = TestFormSchema.safeParse(payload);
    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || 'Validation error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmit(validation.data);
      if (res.success) {
        router.push('/admin/tests');
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Failed to save test');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error submitting test');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {initialData ? 'Edit Test' : 'Test Builder'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure examination mock tests and rapid practice sets with custom timer and scoring rules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewModalOpen(true)}
            className="text-xs gap-1 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview Test
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="text-xs gap-1.5 shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Saving Test...' : 'Save & Publish Test'}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Cannot save test</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Grid: Left column (Parameters) | Right column (Questions Pool & Selector) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Test Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Core Details */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              1. Test Metadata
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Exam *</label>
              <select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Test Title *</label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Bihar STET Computer Science Mock Test 1"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">URL Slug *</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. bihar-stet-cs-mock-1"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description / Instructions
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions for students taking this test..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Test Type</label>
                <select
                  value={testType}
                  onChange={(e) =>
                    setTestType(e.target.value as 'practice' | 'mock_test')
                  }
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="practice">Practice Mode</option>
                  <option value="mock_test">Full Mock Test</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as 'draft' | 'published' | 'archived')
                  }
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Timers & Scoring */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              2. Timing & Scoring Engine
            </h3>

            {/* Full test timer */}
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2">
              <label className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <span>Full Test Timer (Countdown)</span>
                <input
                  type="checkbox"
                  checked={hasDuration}
                  onChange={(e) => setHasDuration(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                />
              </label>

              {hasDuration && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="number"
                    min="1"
                    max="300"
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="h-8 text-xs bg-white dark:bg-slate-900 w-24"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Minutes</span>
                </div>
              )}
            </div>

            {/* Per-question timer */}
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2">
              <label className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <span>Per-Question Rapid Timer</span>
                <input
                  type="checkbox"
                  checked={hasQuestionTimer}
                  onChange={(e) => setHasQuestionTimer(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                />
              </label>

              {hasQuestionTimer && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="number"
                    min="5"
                    max="180"
                    value={questionTimeSeconds}
                    onChange={(e) =>
                      setQuestionTimeSeconds(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="e.g. 30"
                    className="h-8 text-xs bg-white dark:bg-slate-900 w-24"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Seconds / Question</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Marks per Question
                </label>
                <Input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={marksPerQuestion}
                  onChange={(e) => setMarksPerQuestion(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Negative Marks
                </label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Shuffle & Visibility Settings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Shuffle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              3. Delivery & Randomization
            </h3>

            <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
              <span>Shuffle question order for each attempt</span>
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
              <span>Shuffle answer options order</span>
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
              <span>Show result immediately after submit</span>
              <input
                type="checkbox"
                checked={showResultImmediately}
                onChange={(e) => setShowResultImmediately(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
              <span>Show question explanations on review</span>
              <input
                type="checkbox"
                checked={showExplanations}
                onChange={(e) => setShowExplanations(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
              />
            </label>
          </div>
        </div>

        {/* Right Column: Question Selection & Ordering (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Selected Questions Pool */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Selected Questions ({selectedQuestionIds.length})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total Marks: {selectedQuestionIds.length * marksPerQuestion}
                </p>
              </div>

              {selectedQuestionIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedQuestionIds([])}
                  className="text-xs text-red-500 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {selectedQuestions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No questions selected yet. Check questions from the catalog below to add them to this test.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70 max-h-[380px] overflow-y-auto">
                {selectedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {q.question_text}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                          <span>{q.options.length} Options</span>
                          <span>•</span>
                          <span>{q.difficulty}</span>
                          {q.question_image_path && <span>• Has Diagram</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(idx)}
                        disabled={idx === selectedQuestions.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewQuestion(q);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        title="Preview Question"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Question Catalog & Filter Picker */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden space-y-3 p-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Add Questions from Question Bank
              </h3>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {filteredAvailableQuestions.length} available
              </span>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative sm:col-span-3">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  placeholder="Search questions by text..."
                  className="pl-8 h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Subjects</option>
                  {subjects
                    .filter((s) => s.exam_id === examId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Topics</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Available questions scrollable list */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70 max-h-[360px] overflow-y-auto border rounded-lg border-slate-200 dark:border-slate-800">
              {filteredAvailableQuestions.map((q) => {
                const isSelected = selectedQuestionIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleSelectQuestion(q.id)}
                    className={`p-3 flex items-start gap-3 cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent onClick
                      className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-800 dark:border-slate-700"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {q.question_text}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                          {q.difficulty}
                        </Badge>
                        <span>{q.options.length} Options</span>
                        {q.question_image_path && <span>• Diagram</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Test Preview Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Test Preview"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title || 'Untitled Test'}</h4>
            <p className="text-slate-600 dark:text-slate-400">{description || 'No description provided.'}</p>
            <div className="flex flex-wrap gap-3 pt-2 text-slate-500 dark:text-slate-400 font-medium">
              <span>Type: {testType}</span>
              <span>•</span>
              <span>
                Questions: <strong>{selectedQuestionIds.length}</strong>
              </span>
              <span>•</span>
              <span>Total Marks: {selectedQuestionIds.length * marksPerQuestion}</span>
              {hasDuration && (
                <>
                  <span>•</span>
                  <span>Duration: {durationMinutes} mins</span>
                </>
              )}
            </div>
          </div>

          <div>
            <h5 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Question Order Sequence:</h5>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
              {selectedQuestions.map((q) => (
                <li key={q.id} className="truncate">
                  {q.question_text}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Modal>

      {/* Single Question Preview Modal */}
      {previewQuestion && (
        <Modal
          isOpen={Boolean(previewQuestion)}
          onClose={() => setPreviewQuestion(null)}
          title="Question Details"
          maxWidth="2xl"
        >
          <QuestionPreview
            questionText={previewQuestion.question_text}
            questionImagePath={previewQuestion.question_image_path}
            options={previewQuestion.options}
            correctOption={previewQuestion.correct_option}
            explanation={previewQuestion.explanation}
            mode="admin"
          />
        </Modal>
      )}
    </form>
  );
}
