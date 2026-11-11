'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wand2,
  Save,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  RefreshCw,
  Shuffle,
  Clock,
  Layers,
  AlertCircle,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Sparkles,
  HelpCircle,
  Check,
  Search,
} from 'lucide-react';
import { Exam, Subject, Topic, Question } from '@/types/database';
import { TestFormInput, TestFormSchema } from '@/schemas/test';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { QuestionPreview } from '@/components/questions/QuestionPreview';
import {
  computeExamTaxonomyStats,
  validateSmartTestQuotas,
  generateSmartQuestions,
  getReplacementCandidates,
  TopicRule,
} from '@/services/smartTestBuilder';

interface SmartTestBuilderProps {
  exams: Exam[];
  subjects: Subject[];
  topics: Topic[];
  availableQuestions: Question[];
  onSubmit: (data: TestFormInput) => Promise<{ success: boolean; error?: string }>;
}

type DifficultyPreset = 'balanced' | 'beginner' | 'challenging' | 'custom';

const PRESET_DISTRIBUTIONS: Record<
  Exclude<DifficultyPreset, 'custom'>,
  { easy: number; medium: number; hard: number; label: string }
> = {
  balanced: { easy: 40, medium: 40, hard: 20, label: 'Balanced (40% Easy, 40% Med, 20% Hard)' },
  beginner: { easy: 60, medium: 30, hard: 10, label: 'Beginner-Friendly (60% Easy, 30% Med, 10% Hard)' },
  challenging: { easy: 20, medium: 40, hard: 40, label: 'Challenging (20% Easy, 40% Med, 40% Hard)' },
};

export function SmartTestBuilder({
  exams,
  subjects,
  topics,
  availableQuestions,
  onSubmit,
}: SmartTestBuilderProps) {
  const router = useRouter();

  // Basic Information
  const [examId, setExamId] = React.useState<string>(exams[0]?.id || '');
  const [title, setTitle] = React.useState<string>('');
  const [slug, setSlug] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [testType, setTestType] = React.useState<'practice' | 'mock_test'>('mock_test');

  // Timers & Scoring
  const [hasDuration, setHasDuration] = React.useState<boolean>(true);
  const [durationMinutes, setDurationMinutes] = React.useState<number | ''>(60);
  const [hasQuestionTimer, setHasQuestionTimer] = React.useState<boolean>(false);
  const [questionTimeSeconds, setQuestionTimeSeconds] = React.useState<number | ''>('');
  const [marksPerQuestion, setMarksPerQuestion] = React.useState<number>(1.0);
  const [negativeMarks, setNegativeMarks] = React.useState<number>(0.25);

  // Delivery & Shuffling Controls
  const [shuffleQuestions, setShuffleQuestions] = React.useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = React.useState<boolean>(true);
  const [showResultImmediately, setShowResultImmediately] = React.useState<boolean>(true);
  const [showExplanations, setShowExplanations] = React.useState<boolean>(true);

  // Topic Quotas state: Map of topicId -> count
  const [topicQuotas, setTopicQuotas] = React.useState<Record<string, number>>({});
  // Per-topic detailed difficulty breakdown state: Map of topicId -> { easy, medium, hard }
  const [topicBreakdowns, setTopicBreakdowns] = React.useState<
    Record<string, { easy: number; medium: number; hard: number }>
  >({});
  const [expandedTopics, setExpandedTopics] = React.useState<Record<string, boolean>>({});

  // Difficulty Target Preset
  const [difficultyPreset, setDifficultyPreset] = React.useState<DifficultyPreset>('balanced');
  const [customEasyPercent, setCustomEasyPercent] = React.useState<number>(40);
  const [customMediumPercent, setCustomMediumPercent] = React.useState<number>(40);
  const [customHardPercent, setCustomHardPercent] = React.useState<number>(20);

  // Generated Questions state (Step 2)
  const [generatedQuestions, setGeneratedQuestions] = React.useState<Question[]>([]);
  const [hasGenerated, setHasGenerated] = React.useState<boolean>(false);

  // Modals & Interactivity
  const [previewQuestion, setPreviewQuestion] = React.useState<Question | null>(null);
  const [replacingQuestion, setReplacingQuestion] = React.useState<Question | null>(null);
  const [replacementSearch, setReplacementSearch] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Auto-slugify
  const handleTitleChange = (val: string) => {
    setTitle(val);
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(generated);
  };

  // Compute live taxonomy statistics for the selected exam
  const examStats = React.useMemo(() => {
    return computeExamTaxonomyStats(examId, availableQuestions, topics, subjects);
  }, [examId, availableQuestions, topics, subjects]);

  // Construct topic rules array
  const topicRules: TopicRule[] = React.useMemo(() => {
    return Object.entries(topicQuotas)
      .filter(([, count]) => count > 0)
      .map(([topicId, count]) => {
        const breakdown = topicBreakdowns[topicId];
        return {
          topicId,
          count,
          difficultyBreakdown: breakdown ? { ...breakdown } : undefined,
        };
      });
  }, [topicQuotas, topicBreakdowns]);

  // Real-time quota validation
  const validationResult = React.useMemo(() => {
    return validateSmartTestQuotas(examStats, topicRules);
  }, [examStats, topicRules]);

  // Bulk actions for quotas
  const setAllTopicQuotas = (count: number) => {
    const updated: Record<string, number> = {};
    for (const t of examStats.topics) {
      if (t.totalCount > 0) {
        updated[t.topicId] = Math.min(count, t.totalCount);
      }
    }
    setTopicQuotas(updated);
  };

  const clearAllQuotas = () => {
    setTopicQuotas({});
    setTopicBreakdowns({});
  };

  const handleTopicQuotaChange = (topicId: string, val: string) => {
    const num = val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0);
    setTopicQuotas((prev) => ({
      ...prev,
      [topicId]: num,
    }));
  };

  const toggleTopicExpand = (topicId: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  const handleBreakdownChange = (
    topicId: string,
    diff: 'easy' | 'medium' | 'hard',
    val: string
  ) => {
    const num = val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0);
    setTopicBreakdowns((prev) => {
      const existing = prev[topicId] || { easy: 0, medium: 0, hard: 0 };
      const next = { ...existing, [diff]: num };
      // Also update total topic quota to match the sum
      const total = next.easy + next.medium + next.hard;
      setTopicQuotas((qPrev) => ({ ...qPrev, [topicId]: total }));
      return { ...prev, [topicId]: next };
    });
  };

  // Run automatic question selection
  const handleGenerateQuestions = () => {
    setErrorMessage(null);
    if (!validationResult.isValid) {
      setErrorMessage('Please fix topic shortage errors before generating test.');
      return;
    }
    if (topicRules.length === 0) {
      setErrorMessage('Please specify question counts for at least one topic.');
      return;
    }

    const overallRatio =
      difficultyPreset === 'custom'
        ? { easyPercent: customEasyPercent, mediumPercent: customMediumPercent, hardPercent: customHardPercent }
        : {
            easyPercent: PRESET_DISTRIBUTIONS[difficultyPreset].easy,
            mediumPercent: PRESET_DISTRIBUTIONS[difficultyPreset].medium,
            hardPercent: PRESET_DISTRIBUTIONS[difficultyPreset].hard,
          };

    const result = generateSmartQuestions(examId, topicRules, availableQuestions, overallRatio);
    setGeneratedQuestions(result.questions);
    setHasGenerated(true);
    setSuccessMessage(`Successfully auto-selected ${result.questions.length} questions across ${result.stats.topicDistribution.length} topics!`);

    // Auto-fill title if empty
    if (!title) {
      const selectedExam = exams.find((e) => e.id === examId)?.name || 'Exam';
      const autoTitle = `${selectedExam} Smart Generated Test (${result.questions.length} Questions)`;
      handleTitleChange(autoTitle);
    }
  };

  // Reorder generated questions
  const moveUp = (index: number) => {
    if (index === 0) return;
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index === generatedQuestions.length - 1) return;
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const removeQuestion = (id: string) => {
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Replacement candidates for selected question
  const replacementCandidates = React.useMemo(() => {
    if (!replacingQuestion) return [];
    const allSelectedIds = generatedQuestions.map((q) => q.id);
    const rawCandidates = getReplacementCandidates(
      examId,
      replacingQuestion.id,
      replacingQuestion.topic_id,
      replacingQuestion.difficulty,
      allSelectedIds,
      availableQuestions
    );

    if (!replacementSearch.trim()) return rawCandidates;
    const term = replacementSearch.toLowerCase();
    return rawCandidates.filter(
      (c) =>
        c.question_text.toLowerCase().includes(term) ||
        (c.explanation || '').toLowerCase().includes(term) ||
        c.options.some((opt) => opt.text && opt.text.toLowerCase().includes(term))
    );
  }, [replacingQuestion, generatedQuestions, examId, availableQuestions, replacementSearch]);

  const handleApplyReplacement = (candidate: Question) => {
    if (!replacingQuestion) return;
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === replacingQuestion.id ? candidate : q))
    );
    setReplacingQuestion(null);
    setReplacementSearch('');
  };

  // Final Submit to database
  const handleSaveTest = async (targetStatus: 'draft' | 'published') => {
    setErrorMessage(null);
    if (!title.trim()) {
      setErrorMessage('Please provide a test title.');
      return;
    }
    if (!slug.trim()) {
      setErrorMessage('Please provide a URL slug.');
      return;
    }
    if (generatedQuestions.length === 0) {
      setErrorMessage('Test must have at least one question. Click "Generate Questions Automatically".');
      return;
    }

    const payload: TestFormInput = {
      exam_id: examId,
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
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
      status: targetStatus,
      question_ids: generatedQuestions.map((q) => q.id),
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

  // Stats for generated questions
  const generatedStats = React.useMemo(() => {
    let easy = 0;
    let medium = 0;
    let hard = 0;
    const topicMap = new Map<string, number>();

    generatedQuestions.forEach((q) => {
      if (q.difficulty === 'easy') easy++;
      else if (q.difficulty === 'hard') hard++;
      else medium++;

      const tName = q.topic_name || topics.find((t) => t.id === q.topic_id)?.name || 'General';
      topicMap.set(tName, (topicMap.get(tName) || 0) + 1);
    });

    return {
      easy,
      medium,
      hard,
      total: generatedQuestions.length,
      topics: Array.from(topicMap.entries()).map(([name, count]) => ({ name, count })),
    };
  }, [generatedQuestions, topics]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link
              href="/admin/tests"
              className="hover:text-indigo-600 flex items-center gap-1 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Tests
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              Smart Test Builder
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Smart Test Builder
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Auto-generate balanced mock exams with topic-wise quotas, difficulty ratios, and instant replacement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/tests/new">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 dark:border-slate-700">
              Switch to Manual Builder
            </Button>
          </Link>

          {hasGenerated && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveTest('draft')}
                disabled={isSubmitting}
                className="text-xs gap-1.5 font-medium"
              >
                <Save className="h-4 w-4 text-slate-500" />
                Save Draft
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveTest('published')}
                disabled={isSubmitting}
                className="text-xs gap-1.5 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Publish Test'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-3 text-red-700 dark:text-red-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration & Rules (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Section 1: Examination & Test Parameters */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              1. Exam & Basic Settings
            </h3>

            {/* Exam selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Examination <span className="text-red-500">*</span>
              </label>
              <div className="relative min-w-0">
                <select
                  value={examId}
                  onChange={(e) => {
                    setExamId(e.target.value);
                    setTopicQuotas({});
                    setTopicBreakdowns({});
                    setGeneratedQuestions([]);
                    setHasGenerated(false);
                  }}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer truncate"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
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
                placeholder="e.g. Bihar STET High-Yield Smart Mock Test"
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
                placeholder="e.g. bihar-stet-smart-mock"
                className="text-xs font-mono"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions or syllabus covered..."
                className="text-xs"
              />
            </div>

            {/* Test Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Test Type
              </label>
              <div className="relative min-w-0">
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as 'practice' | 'mock_test')}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer truncate"
                >
                  <option value="mock_test">Full Mock Test</option>
                  <option value="practice">Practice Mode</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Section 2: Timing, Scoring & Shuffling */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              2. Timing & Delivery Controls
            </h3>

            {/* Full test timer */}
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2">
              <label className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <span>Full Test Timer (Countdown)</span>
                <input
                  type="checkbox"
                  checked={hasDuration}
                  onChange={(e) => setHasDuration(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
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
                  <span className="text-xs text-slate-500">Minutes</span>
                </div>
              )}
            </div>

            {/* Scoring */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Marks / Question
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

            {/* Shuffling Controls */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                    <Shuffle className="h-3.5 w-3.5 text-indigo-600" />
                    Question-Order Shuffling
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Randomizes question sequence for every student attempt while keeping question identity stable.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>

              <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                    <Shuffle className="h-3.5 w-3.5 text-indigo-600" />
                    Option-Order Shuffling
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Permutes answer choices per student while automatically remapping correct answer index.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Difficulty Ratio Preset */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              3. Difficulty Distribution Target
            </h3>

            <div className="space-y-2">
              {(['balanced', 'beginner', 'challenging', 'custom'] as DifficultyPreset[]).map((p) => (
                <label
                  key={p}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                    difficultyPreset === p
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="difficultyPreset"
                      value={p}
                      checked={difficultyPreset === p}
                      onChange={() => setDifficultyPreset(p)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      {p === 'custom'
                        ? 'Custom Proportions'
                        : PRESET_DISTRIBUTIONS[p as Exclude<DifficultyPreset, 'custom'>].label}
                    </span>
                  </div>
                </label>
              ))}

              {difficultyPreset === 'custom' && (
                <div className="grid grid-cols-3 gap-2 pt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block">Easy %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={customEasyPercent}
                      onChange={(e) => setCustomEasyPercent(Number(e.target.value))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block">Medium %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={customMediumPercent}
                      onChange={(e) => setCustomMediumPercent(Number(e.target.value))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block">Hard %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={customHardPercent}
                      onChange={(e) => setCustomHardPercent(Number(e.target.value))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Topic-Wise Question Quotas & Generation (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Topic Quota Allocation Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Topic-Wise Question Quota Allocation
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Question bank has {examStats.totalQuestions} questions ({examStats.totalEasy} Easy,{' '}
                  {examStats.totalMedium} Medium, {examStats.totalHard} Hard).
                </p>
              </div>

              {/* Quick Fill Actions */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAllTopicQuotas(5)}
                  className="h-7 text-[10px] px-2"
                >
                  +5 to all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAllTopicQuotas(10)}
                  className="h-7 text-[10px] px-2"
                >
                  +10 to all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllQuotas}
                  className="h-7 text-[10px] px-2 text-red-500 hover:text-red-700"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Real-Time Quota Summary Bar */}
            <div className="px-4 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Total Requested: <strong className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">{validationResult.totalRequested}</strong> questions
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">
                  Total Marks: <strong>{validationResult.totalRequested * marksPerQuestion}</strong>
                </span>
              </div>

              {validationResult.topicErrors.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-[11px]">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {validationResult.topicErrors.length} topic shortage(s)
                </span>
              ) : validationResult.totalRequested > 0 ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                  <Check className="h-3.5 w-3.5" />
                  All requested quotas available
                </span>
              ) : null}
            </div>

            {/* Topic Quota List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70 max-h-[380px] overflow-y-auto p-1">
              {examStats.topics.map((t) => {
                const requested = topicQuotas[t.topicId] || 0;
                const isOver = requested > t.totalCount;
                const isExpanded = Boolean(expandedTopics[t.topicId]);
                const breakdown = topicBreakdowns[t.topicId] || { easy: 0, medium: 0, hard: 0 };

                return (
                  <div
                    key={t.topicId}
                    className={`p-3 rounded-lg transition ${
                      isOver
                        ? 'bg-red-50/70 dark:bg-red-950/30'
                        : requested > 0
                        ? 'bg-slate-50/80 dark:bg-slate-800/40'
                        : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTopicExpand(t.topicId)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Expand difficulty breakdown"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {t.topicName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            ({t.subjectName})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 pl-5">
                          <span>
                            Available: <strong>{t.totalCount}</strong>
                          </span>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400">Easy: {t.easyCount}</span>
                          <span>•</span>
                          <span className="text-amber-600 dark:text-amber-400">Med: {t.mediumCount}</span>
                          <span>•</span>
                          <span className="text-rose-600 dark:text-rose-400">Hard: {t.hardCount}</span>
                        </div>
                      </div>

                      {/* Quota input */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          min="0"
                          max={t.totalCount}
                          value={requested === 0 ? '' : requested}
                          onChange={(e) => handleTopicQuotaChange(t.topicId, e.target.value)}
                          placeholder="0"
                          className={`h-8 w-20 text-xs font-bold text-center ${
                            isOver
                              ? 'border-red-500 bg-red-100 dark:bg-red-950 text-red-900'
                              : 'bg-white dark:bg-slate-900'
                          }`}
                        />
                        <span className="text-[11px] text-slate-400">/ {t.totalCount}</span>
                      </div>
                    </div>

                    {/* Expanded breakdown row */}
                    {isExpanded && (
                      <div className="mt-3 pl-5 pr-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                            Easy (Avail: {t.easyCount})
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={t.easyCount}
                            value={breakdown.easy === 0 ? '' : breakdown.easy}
                            onChange={(e) => handleBreakdownChange(t.topicId, 'easy', e.target.value)}
                            placeholder="0"
                            className="h-7 text-xs bg-white dark:bg-slate-900 mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block">
                            Medium (Avail: {t.mediumCount})
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={t.mediumCount}
                            value={breakdown.medium === 0 ? '' : breakdown.medium}
                            onChange={(e) => handleBreakdownChange(t.topicId, 'medium', e.target.value)}
                            placeholder="0"
                            className="h-7 text-xs bg-white dark:bg-slate-900 mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block">
                            Hard (Avail: {t.hardCount})
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={t.hardCount}
                            value={breakdown.hard === 0 ? '' : breakdown.hard}
                            onChange={(e) => handleBreakdownChange(t.topicId, 'hard', e.target.value)}
                            placeholder="0"
                            className="h-7 text-xs bg-white dark:bg-slate-900 mt-0.5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action footer: Generate Test */}
            <div className="p-4 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Ready to auto-select from question bank
              </span>

              <Button
                type="button"
                onClick={handleGenerateQuestions}
                disabled={validationResult.totalRequested === 0 || !validationResult.isValid}
                className="text-xs gap-1.5 shadow-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4"
              >
                <Wand2 className="h-4 w-4" />
                Generate Questions Automatically
              </Button>
            </div>
          </div>

          {/* Generated Questions Review & Refinement Card */}
          {hasGenerated && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Review & Refine Generated Test ({generatedQuestions.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Questions ready. Review, reorder, or swap any question using 1-click replacement.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateQuestions}
                  className="text-[11px] gap-1 h-7 border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </Button>
              </div>

              {/* Metrics & Distribution Chips */}
              <div className="px-4 py-2.5 bg-slate-100/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-[11px]">
                <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-800">
                  Total: {generatedStats.total} Questions ({generatedStats.total * marksPerQuestion} Marks)
                </Badge>
                <Badge variant="success" className="text-[10px]">
                  Easy: {generatedStats.easy}
                </Badge>
                <Badge variant="warning" className="text-[10px]">
                  Medium: {generatedStats.medium}
                </Badge>
                <Badge variant="destructive" className="text-[10px]">
                  Hard: {generatedStats.hard}
                </Badge>
              </div>

              {/* Generated Question Sequence List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70 max-h-[440px] overflow-y-auto">
                {generatedQuestions.map((q, idx) => (
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
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {q.topic_name || topics.find((t) => t.id === q.topic_id)?.name || 'General'}
                          </span>
                          <span>•</span>
                          <span
                            className={
                              q.difficulty === 'easy'
                                ? 'text-emerald-600 font-semibold'
                                : q.difficulty === 'hard'
                                ? 'text-rose-600 font-semibold'
                                : 'text-amber-600 font-semibold'
                            }
                          >
                            {q.difficulty}
                          </span>
                          <span>•</span>
                          <span>{q.options.length} Options</span>
                          {q.code_language && <span>• Code ({q.code_language})</span>}
                          {q.question_image_path && <span>• Image</span>}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons per question */}
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
                        disabled={idx === generatedQuestions.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewQuestion(q)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600"
                        title="Preview Full Question"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingQuestion(q);
                          setReplacementSearch('');
                        }}
                        className="p-1 rounded text-slate-400 hover:text-emerald-600"
                        title="Replace Question with Another Candidate"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Question Modal */}
      {previewQuestion && (
        <Modal
          isOpen={Boolean(previewQuestion)}
          onClose={() => setPreviewQuestion(null)}
          title="Question Preview"
          maxWidth="4xl"
        >
          <QuestionPreview
            questionText={previewQuestion.question_text}
            questionImagePath={previewQuestion.question_image_path}
            codeLanguage={previewQuestion.code_language}
            codeContent={previewQuestion.code_content}
            options={previewQuestion.options}
            correctOption={previewQuestion.correct_option}
            explanation={previewQuestion.explanation}
            marks={previewQuestion.marks || marksPerQuestion}
            negativeMarks={previewQuestion.negative_marks || negativeMarks}
            mode="admin"
          />
        </Modal>
      )}

      {/* Question Replacement Modal */}
      {replacingQuestion && (
        <Modal
          isOpen={Boolean(replacingQuestion)}
          onClose={() => {
            setReplacingQuestion(null);
            setReplacementSearch('');
          }}
          title={`Replace Question: ${replacingQuestion.topic_name || 'Topic Question'}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                Currently Selected Question to Replace:
              </span>
              <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 line-clamp-2">
                {replacingQuestion.question_text}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                <span>Difficulty: {replacingQuestion.difficulty}</span>
                <span>•</span>
                <span>Topic: {replacingQuestion.topic_name}</span>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={replacementSearch}
                onChange={(e) => setReplacementSearch(e.target.value)}
                placeholder="Search replacement candidates..."
                className="pl-8 h-8 text-xs bg-white dark:bg-slate-900"
              />
            </div>

            <div className="text-xs font-semibold text-slate-500">
              Found {replacementCandidates.length} replacement candidate(s)
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
              {replacementCandidates.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No other candidate questions found for this topic.
                </div>
              ) : (
                replacementCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-start justify-between gap-3 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                        {candidate.question_text}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <Badge
                          variant={
                            candidate.difficulty === 'easy'
                              ? 'success'
                              : candidate.difficulty === 'hard'
                              ? 'destructive'
                              : 'warning'
                          }
                          className="text-[9px] py-0 px-1.5"
                        >
                          {candidate.difficulty}
                        </Badge>
                        <span>{candidate.options.length} options</span>
                        {candidate.code_language && <span>• {candidate.code_language}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewQuestion(candidate)}
                        className="h-7 text-[11px] px-2"
                      >
                        Preview
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleApplyReplacement(candidate)}
                        className="h-7 text-[11px] px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                      >
                        Use This
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
