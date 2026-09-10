'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Eye, Save, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Exam, Subject, Topic, Question, QuestionOption } from '@/types/database';
import { QuestionFormSchema, QuestionFormInput } from '@/schemas/question';
import { ImageUploader } from '@/components/media/ImageUploader';
import { QuestionPreview } from './QuestionPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface QuestionEditorProps {
  initialData?: Question | null;
  exams: Exam[];
  subjects: Subject[];
  topics: Topic[];
  onSubmit: (data: QuestionFormInput) => Promise<{ success: boolean; error?: string }>;
}

const OPTION_LABELS = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'];

export function QuestionEditor({
  initialData,
  exams,
  subjects,
  topics,
  onSubmit,
}: QuestionEditorProps) {
  const router = useRouter();

  // Selected Exam, Subject, Topic cascaded filters
  const [selectedExamId, setSelectedExamId] = React.useState<string>(
    initialData?.exam_id || exams[0]?.id || ''
  );
  const availableSubjects = React.useMemo(
    () => subjects.filter((s) => s.exam_id === selectedExamId),
    [subjects, selectedExamId]
  );
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>(
    initialData?.subject_id || availableSubjects[0]?.id || ''
  );
  const availableTopics = React.useMemo(
    () => topics.filter((t) => t.subject_id === selectedSubjectId),
    [topics, selectedSubjectId]
  );
  const [selectedTopicId, setSelectedTopicId] = React.useState<string>(
    initialData?.topic_id || availableTopics[0]?.id || ''
  );

  // Question basic fields
  const [questionText, setQuestionText] = React.useState<string>(initialData?.question_text || '');
  const [questionImagePath, setQuestionImagePath] = React.useState<string | null>(
    initialData?.question_image_path || null
  );

  // Options state: 4 or 5 options
  const defaultOptions: QuestionOption[] = initialData?.options || [
    { text: '', image_path: null },
    { text: '', image_path: null },
    { text: '', image_path: null },
    { text: '', image_path: null },
  ];
  const [options, setOptions] = React.useState<QuestionOption[]>(defaultOptions);

  // Correct option (1-based: 1, 2, 3, 4, 5)
  const [correctOption, setCorrectOption] = React.useState<number>(initialData?.correct_option || 1);

  // Metadata
  const [explanation, setExplanation] = React.useState<string>(initialData?.explanation || '');
  const [difficulty, setDifficulty] = React.useState<'easy' | 'medium' | 'hard'>(
    initialData?.difficulty || 'medium'
  );
  const [defaultTime, setDefaultTime] = React.useState<number | ''>(
    initialData?.default_time_seconds || 45
  );
  const [marks, setMarks] = React.useState<number>(initialData?.marks || 1.0);
  const [negativeMarks, setNegativeMarks] = React.useState<number>(
    initialData?.negative_marks || 0.25
  );
  const [sourceName, setSourceName] = React.useState<string>(initialData?.source_name || '');
  const [sourceYear, setSourceYear] = React.useState<number | ''>(
    initialData?.source_year || new Date().getFullYear()
  );
  const [status, setStatus] = React.useState<'draft' | 'published' | 'archived'>(
    initialData?.status || 'published'
  );

  // View mode
  const [previewMode, setPreviewMode] = React.useState<'admin' | 'student'>('admin');
  const [activeTab, setActiveTab] = React.useState<'editor' | 'preview' | 'split'>('split');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Handlers for Option modifications
  const handleOptionTextChange = (index: number, text: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], text };
      return next;
    });
  };

  const handleOptionImageChange = (index: number, imagePath: string | null) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], image_path: imagePath };
      return next;
    });
  };

  const handleAddOptionE = () => {
    if (options.length >= 5) return;
    setOptions((prev) => [...prev, { text: '', image_path: null }]);
  };

  const handleRemoveOptionE = () => {
    if (options.length <= 4) return;
    setOptions((prev) => prev.slice(0, 4));
    if (correctOption === 5) {
      setCorrectOption(1);
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const payload: QuestionFormInput = {
      exam_id: selectedExamId,
      subject_id: selectedSubjectId,
      topic_id: selectedTopicId || null,
      question_type: 'single_select',
      question_text: questionText,
      question_image_path: questionImagePath,
      options: options as QuestionFormInput['options'],
      correct_option: correctOption,
      explanation: explanation || null,
      difficulty,
      default_time_seconds: defaultTime === '' ? null : Number(defaultTime),
      marks: Number(marks),
      negative_marks: Number(negativeMarks),
      source_name: sourceName || null,
      source_year: sourceYear === '' ? null : Number(sourceYear),
      status,
    };

    const validation = QuestionFormSchema.safeParse(payload);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Validation error';
      setErrorMsg(firstError);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit(validation.data);
      if (result.success) {
        router.push('/admin/questions');
        router.refresh();
      } else {
        setErrorMsg(result.error || 'Failed to save question');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {initialData ? 'Edit Question' : 'Create New MCQ Question'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build single-select questions with 4 or 5 options, formula text, diagrams, and media.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                activeTab === 'editor'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Editor Only
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('split')}
              className={`hidden lg:block rounded-md px-3 py-1.5 font-medium transition ${
                activeTab === 'split'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Eye className="inline h-3.5 w-3.5 mr-1" />
              Live Preview
            </button>
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Question'}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <p className="font-semibold">Validation Error</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Editor & Preview */}
      <div className={`grid gap-8 ${activeTab === 'split' ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* Editor Column */}
        <div
          className={`${
            activeTab === 'preview' ? 'hidden' : activeTab === 'split' ? 'lg:col-span-7' : 'w-full'
          } space-y-6`}
        >
          {/* 1. Classification & Hierarchy */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              1. Exam Classification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exam *</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => {
                    setSelectedExamId(e.target.value);
                    const subs = subjects.filter((s) => s.exam_id === e.target.value);
                    setSelectedSubjectId(subs[0]?.id || '');
                  }}
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    const tops = topics.filter((t) => t.subject_id === e.target.value);
                    setSelectedTopicId(tops[0]?.id || '');
                  }}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Topic (Optional)</label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- No Topic --</option>
                  {availableTopics.map((top) => (
                    <option key={top.id} value={top.id}>
                      {top.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Question Text & Diagram */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              2. Question Content
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Question Text *
              </label>
              <Textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter complete textual question statement..."
                className="min-h-[100px] text-base"
                required
              />
            </div>

            <div>
              <ImageUploader
                label="Question Image / Diagram (Optional)"
                value={questionImagePath}
                onChange={setQuestionImagePath}
                helperText="Upload circuit diagrams, flowchart, system models, or graphs."
              />
            </div>
          </div>

          {/* 3. Answer Options (A to D / E) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  3. Answer Options ({options.length} Total)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select the radio button next to an option to mark it as the correct answer.
                </p>
              </div>

              {options.length === 4 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOptionE}
                  className="text-xs gap-1 border-dashed border-indigo-400 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  + Add Option E
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveOptionE}
                  className="text-xs gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Option E
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {options.map((option, idx) => {
                const optNum = idx + 1;
                const isCorrect = correctOption === optNum;
                const label = OPTION_LABELS[idx];

                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-4 transition-all ${
                      isCorrect
                        ? 'border-emerald-400 dark:border-emerald-500/70 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-400'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="correct_option_radio"
                            checked={isCorrect}
                            onChange={() => setCorrectOption(optNum)}
                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer dark:bg-slate-800 dark:border-slate-700"
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">
                            {label}
                          </span>
                        </label>
                        {isCorrect && (
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Correct Answer
                          </span>
                        )}
                      </div>

                      {idx === 4 && (
                        <button
                          type="button"
                          onClick={handleRemoveOptionE}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete Option E
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Input
                        value={option.text || ''}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text (optional if image is provided)`}
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />

                      <ImageUploader
                        value={option.image_path}
                        onChange={(path) => handleOptionImageChange(idx, path)}
                        helperText={`Optional image for Option ${String.fromCharCode(65 + idx)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Explanation & Scoring Configuration */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              4. Explanation & Exam Parameters
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Explanation (Displayed during result review)
              </label>
              <Textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explain why the answer is correct..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Time (Seconds)
                </label>
                <Input
                  type="number"
                  min="5"
                  max="300"
                  value={defaultTime}
                  onChange={(e) => setDefaultTime(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Positive Marks
                </label>
                <Input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
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
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source Name
                </label>
                <Input
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g. Bihar STET / SSC CGL"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Exam Year
                </label>
                <Input
                  type="number"
                  min="1950"
                  max="2100"
                  value={sourceYear}
                  onChange={(e) => setSourceYear(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="2024"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as 'draft' | 'published' | 'archived')
                  }
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Column */}
        <div
          className={`${
            activeTab === 'editor' ? 'hidden' : activeTab === 'split' ? 'lg:col-span-5' : 'w-full'
          }`}
        >
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-xs border border-slate-800 dark:border-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-indigo-400" />
                Live Preview
              </span>

              <div className="flex items-center gap-1 bg-slate-800 dark:bg-slate-900 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode('student')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    previewMode === 'student' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Student Mode
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('admin')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    previewMode === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Admin Review
                </button>
              </div>
            </div>

            <QuestionPreview
              questionText={questionText}
              questionImagePath={questionImagePath}
              options={options}
              correctOption={correctOption}
              explanation={explanation}
              mode={previewMode}
              marks={marks}
              negativeMarks={negativeMarks}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
