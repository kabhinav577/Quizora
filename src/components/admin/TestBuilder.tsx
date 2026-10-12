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
  BookOpen,
  ChevronDown,
  ChevronRight,
  List,
  FolderPlus,
  CheckCircle2,
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

  // Subject View Mode: 'subject_grouped' (default) or 'flat_list'
  const [viewMode, setViewMode] = React.useState<'subject_grouped' | 'flat_list'>('subject_grouped');
  const [collapsedSubjects, setCollapsedSubjects] = React.useState<Record<string, boolean>>({});

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

  // Batch Selection per Subject
  const selectAllInSubject = (questions: Question[]) => {
    const unselectedIds = questions.map((q) => q.id).filter((id) => !selectedQuestionIds.includes(id));
    if (unselectedIds.length > 0) {
      setSelectedQuestionIds((prev) => [...prev, ...unselectedIds]);
    }
  };

  const deselectAllInSubject = (questions: Question[]) => {
    const idsToRemove = new Set(questions.map((q) => q.id));
    setSelectedQuestionIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
  };

  const toggleCollapseSubject = (subId: string) => {
    setCollapsedSubjects((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  // Filter available questions (exam, subject, topic, difficulty, search across text, subject, topic)
  const filteredAvailableQuestions = React.useMemo(() => {
    const normalizedSearch = questionSearch.trim().toLowerCase();

    return availableQuestions.filter((q) => {
      if (examId && q.exam_id !== examId && !(Array.isArray(q.exam_ids) && q.exam_ids.includes(examId))) return false;
      if (subjectFilter && q.subject_id !== subjectFilter) return false;
      if (topicFilter && q.topic_id !== topicFilter) return false;
      if (difficultyFilter && q.difficulty !== difficultyFilter) return false;

      if (normalizedSearch) {
        const textMatch = q.question_text.toLowerCase().includes(normalizedSearch);
        const subName = q.subject_name || subjects.find((s) => s.id === q.subject_id)?.name || '';
        const subMatch = subName.toLowerCase().includes(normalizedSearch);
        const topName = q.topic_name || topics.find((t) => t.id === q.topic_id)?.name || '';
        const topMatch = topName.toLowerCase().includes(normalizedSearch);
        const explMatch = (q.explanation || '').toLowerCase().includes(normalizedSearch);
        if (!textMatch && !subMatch && !topMatch && !explMatch) return false;
      }
      return true;
    });
  }, [availableQuestions, examId, subjectFilter, topicFilter, difficultyFilter, questionSearch, subjects, topics]);

  // Selected questions objects in current sequence
  const selectedQuestions = React.useMemo(() => {
    return selectedQuestionIds
      .map((id) => availableQuestions.find((q) => q.id === id))
      .filter((q): q is Question => Boolean(q));
  }, [selectedQuestionIds, availableQuestions]);

  // Subject-wise grouping of available questions
  interface SubjectGroup {
    subjectId: string;
    subjectName: string;
    questions: Question[];
    selectedCount: number;
    totalCount: number;
  }

  const subjectGroups: SubjectGroup[] = React.useMemo(() => {
    const groupMap = new Map<string, Question[]>();

    filteredAvailableQuestions.forEach((q) => {
      const sId = q.subject_id || 'unknown';
      if (!groupMap.has(sId)) {
        groupMap.set(sId, []);
      }
      groupMap.get(sId)!.push(q);
    });

    const groups: SubjectGroup[] = [];
    groupMap.forEach((qList, sId) => {
      const subObj = subjects.find((s) => s.id === sId);
      const subName = subObj?.name || qList[0]?.subject_name || 'General Subject';
      const selectedCount = qList.filter((q) => selectedQuestionIds.includes(q.id)).length;
      groups.push({
        subjectId: sId,
        subjectName: subName,
        questions: qList,
        selectedCount,
        totalCount: qList.length,
      });
    });

    return groups.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [filteredAvailableQuestions, subjects, selectedQuestionIds]);

  // Subject breakdown for selected questions
  const selectedSubjectBreakdown = React.useMemo(() => {
    const counts = new Map<string, number>();
    selectedQuestions.forEach((q) => {
      const sName = q.subject_name || subjects.find((s) => s.id === q.subject_id)?.name || 'General';
      counts.set(sName, (counts.get(sName) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [selectedQuestions, subjects]);

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {initialData ? `Edit Test: ${initialData.title}` : 'Create New Test / Practice Session'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build full mock tests or topic practice sessions with subject-wise question selection and countdown timers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Eye className="h-4 w-4 text-slate-500" />
            Preview Test
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="text-xs gap-1.5 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Saving...' : initialData ? 'Update Test' : 'Save Test'}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-3 text-red-700 dark:text-red-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main 2-column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Test Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Basic Information */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              1. Basic Information
            </h3>

            {/* Exam selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Examination <span className="text-red-500">*</span>
              </label>
              <div className="relative min-w-0">
                <select
                  value={examId}
                  onChange={(e) => {
                    setExamId(e.target.value);
                    setSubjectFilter('');
                    setTopicFilter('');
                  }}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer truncate"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {/* Test Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Test Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Bihar STET Computer Science Full Mock 1"
                className="text-xs"
              />
            </div>

            {/* URL Slug */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. bihar-stet-cs-mock-1"
                className="text-xs font-mono"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief guidelines or syllabus covered in this test..."
                className="text-xs"
              />
            </div>

            {/* Test Type and Status */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Type
                </label>
                <div className="relative min-w-0">
                  <select
                    value={testType}
                    onChange={(e) => {
                      const val = e.target.value as 'practice' | 'mock_test';
                      setTestType(val);
                      if (val === 'mock_test') {
                        setHasDuration(true);
                        setHasQuestionTimer(false);
                      }
                    }}
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer truncate"
                  >
                    <option value="practice">Practice Mode</option>
                    <option value="mock_test">Full Mock Test</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <div className="relative min-w-0">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'archived')}
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer truncate"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </div>
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

        {/* Right Column: Subject-Wise Question Selection & Ordering (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Selected Questions Pool with Subject Breakdown */}
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
                  className="text-xs text-red-500 hover:underline font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Subject Balance Chips */}
            {selectedSubjectBreakdown.length > 0 && (
              <div className="px-4 py-2 bg-slate-100/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 dark:text-slate-500 font-semibold mr-1">Subject Breakdown:</span>
                {selectedSubjectBreakdown.map((sb) => (
                  <Badge
                    key={sb.name}
                    variant="purple"
                    className="text-[10px] py-0 px-2 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                  >
                    {sb.name}: <strong className="ml-1 font-bold">{sb.count}</strong>
                  </Badge>
                ))}
              </div>
            )}

            {selectedQuestions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No questions selected yet. Check questions from the subject-wise catalog below to add them to this test.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70 max-h-[340px] overflow-y-auto">
                {selectedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between gap-3 transition"
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
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {q.subject_name || subjects.find((s) => s.id === q.subject_id)?.name || 'General'}
                          </span>
                          <span>•</span>
                          <span>{q.options.length} Options</span>
                          <span>•</span>
                          <span>{q.difficulty}</span>
                          {q.question_image_path && <span>• Diagram</span>}
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

          {/* Question Catalog & Subject-Wise Picker */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden space-y-3 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Subject-Wise Question Catalog
                </h3>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {filteredAvailableQuestions.length} questions available across {subjectGroups.length} subjects
                </span>
              </div>

              {/* View Mode Toggle: Subject-wise vs Flat List */}
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('subject_grouped')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1 ${
                    viewMode === 'subject_grouped'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FolderPlus className="h-3 w-3" />
                  Subject Groups
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('flat_list')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1 ${
                    viewMode === 'flat_list'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <List className="h-3 w-3" />
                  Flat List
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative sm:col-span-3">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  placeholder="Search questions by text, subject, topic, or explanation..."
                  className="pl-8 h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="relative min-w-0">
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium appearance-none cursor-pointer truncate"
                >
                  <option value="">All Subjects</option>
                  {subjects
                    .filter((s) => !examId || s.exam_id === examId || (Array.isArray(s.exam_ids) && s.exam_ids.includes(examId)))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              </div>

              <div className="relative min-w-0">
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer truncate"
                >
                  <option value="">All Topics</option>
                  {topics
                    .filter((t) => !subjectFilter || t.subject_id === subjectFilter)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              </div>

              <div className="relative min-w-0">
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer truncate"
                >
                  <option value="">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {/* Quick Subject Filter Chips */}
            {subjectGroups.length > 1 && !subjectFilter && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] no-scrollbar">
                <span className="text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase shrink-0">
                  Quick Filter:
                </span>
                {subjectGroups.map((grp) => (
                  <button
                    key={grp.subjectId}
                    type="button"
                    onClick={() => setSubjectFilter(grp.subjectId)}
                    className="shrink-0 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    {grp.subjectName} ({grp.totalCount})
                  </button>
                ))}
              </div>
            )}

            {/* SUBJECT-GROUPED VIEW */}
            {viewMode === 'subject_grouped' ? (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {subjectGroups.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No questions found matching your filters.
                  </div>
                ) : (
                  subjectGroups.map((group) => {
                    const isCollapsed = Boolean(collapsedSubjects[group.subjectId]);
                    const allSelected = group.selectedCount === group.totalCount && group.totalCount > 0;

                    return (
                      <div
                        key={group.subjectId}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs overflow-hidden transition"
                      >
                        {/* Subject Group Header */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => toggleCollapseSubject(group.subjectId)}
                            className="flex items-center gap-2 text-left flex-1 min-w-0 font-bold text-xs text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{group.subjectName}</span>
                            {allSelected && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                (All Selected)
                              </span>
                            )}
                            <Badge
                              variant="purple"
                              className="text-[10px] py-0 px-2 shrink-0 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                            >
                              {group.selectedCount} / {group.totalCount} selected
                            </Badge>
                          </button>

                          {/* Quick Batch Select / Deselect Subject Questions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {group.selectedCount < group.totalCount && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => selectAllInSubject(group.questions)}
                                className="h-7 text-[10px] px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/50 gap-1 font-semibold"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Select All ({group.totalCount})
                              </Button>
                            )}

                            {group.selectedCount > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deselectAllInSubject(group.questions)}
                                className="h-7 text-[10px] px-2 text-slate-500 hover:text-red-600"
                              >
                                Deselect
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Questions List inside Subject */}
                        {!isCollapsed && (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                            {group.questions.map((q) => {
                              const isSelected = selectedQuestionIds.includes(q.id);
                              return (
                                <div
                                  key={q.id}
                                  onClick={() => toggleSelectQuestion(q.id)}
                                  className={`p-3 flex items-start gap-3 cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // handled by parent onClick
                                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-800 dark:border-slate-700"
                                  />

                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                                      {q.question_text}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                      {q.topic_name && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] py-0 px-1.5 text-slate-600 dark:text-slate-400"
                                        >
                                          {q.topic_name}
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                                        {q.difficulty}
                                      </Badge>
                                      <span>{q.options.length} Options</span>
                                      {q.question_image_path && <span>• Diagram</span>}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewQuestion(q);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0"
                                    title="Preview Question"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* FLAT LIST VIEW */
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70 max-h-[460px] overflow-y-auto border rounded-lg border-slate-200 dark:border-slate-800">
                {filteredAvailableQuestions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No questions found matching your filters.
                  </div>
                ) : (
                  filteredAvailableQuestions.map((q) => {
                    const isSelected = selectedQuestionIds.includes(q.id);
                    const subName = q.subject_name || subjects.find((s) => s.id === q.subject_id)?.name || 'General';

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
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <Badge
                              variant="purple"
                              className="text-[9px] py-0 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                            >
                              {subName}
                            </Badge>
                            {q.topic_name && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1.5 text-slate-600 dark:text-slate-400"
                              >
                                {q.topic_name}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                              {q.difficulty}
                            </Badge>
                            <span>{q.options.length} Options</span>
                            {q.question_image_path && <span>• Diagram</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewQuestion(q);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0"
                          title="Preview Question"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
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
            {selectedSubjectBreakdown.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-1.5">
                {selectedSubjectBreakdown.map((sb) => (
                  <Badge
                    key={sb.name}
                    variant="purple"
                    className="text-[10px] py-0 px-2 bg-indigo-50 text-indigo-700 border-indigo-200"
                  >
                    {sb.name}: {sb.count}
                  </Badge>
                ))}
              </div>
            )}
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
