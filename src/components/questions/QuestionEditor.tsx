'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Eye, Save, Sparkles, Check, AlertCircle, ChevronDown, Code2 } from 'lucide-react';
import { Exam, Subject, Topic, Question, QuestionOption } from '@/types/database';
import { QuestionFormSchema, QuestionFormInput } from '@/schemas/question';
import { ImageUploader } from '@/components/media/ImageUploader';
import { QuestionPreview } from './QuestionPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QuizoraCodeEditor } from '@/components/code/QuizoraCodeEditor';
import { SUPPORTED_LANGUAGES, getLanguageDisplayName } from '@/lib/code/languages';

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
  const [codeLanguage, setCodeLanguage] = React.useState<string>(initialData?.code_language || '');
  const [codeContent, setCodeContent] = React.useState<string>(initialData?.code_content || '');
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

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
      code_language: codeLanguage.trim() ? codeLanguage.trim() : null,
      code_content: codeContent.length > 0 ? codeContent : null,
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
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 overflow-hidden">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              1. Exam Classification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exam *</label>
                <div className="relative min-w-0">
                  <select
                    value={selectedExamId}
                    onChange={(e) => {
                      setSelectedExamId(e.target.value);
                      const subs = subjects.filter((s) => s.exam_id === e.target.value);
                      setSelectedSubjectId(subs[0]?.id || '');
                    }}
                    className="w-full min-w-0 max-w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate appearance-none cursor-pointer"
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject *</label>
                <div className="relative min-w-0">
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      const tops = topics.filter((t) => t.subject_id === e.target.value);
                      setSelectedTopicId(tops[0]?.id || '');
                    }}
                    className="w-full min-w-0 max-w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate appearance-none cursor-pointer"
                  >
                    {availableSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Topic (Optional)</label>
                <div className="relative min-w-0">
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    className="w-full min-w-0 max-w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate appearance-none cursor-pointer"
                  >
                    <option value="">-- No Topic --</option>
                    {availableTopics.map((top) => (
                      <option key={top.id} value={top.id}>
                        {top.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Question Text & Diagram */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              2. Question Content
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Question Text *
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const placeholder = '{{CODE}}';
                      if (questionText.includes(placeholder)) return;
                      if (!codeLanguage) setCodeLanguage('javascript');

                      const textarea = textareaRef.current;
                      if (!textarea) {
                        setQuestionText((prev) => (prev ? `${prev}\n\n${placeholder}\n\n` : `${placeholder}\n\n`));
                        return;
                      }

                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const before = questionText.substring(0, start);
                      const after = questionText.substring(end);
                      const prefix = before.length > 0 && !before.endsWith('\n') ? '\n\n' : '';
                      const suffix = after.length > 0 && !after.startsWith('\n') ? '\n\n' : '';
                      const nextText = `${before}${prefix}${placeholder}${suffix}${after}`;

                      setQuestionText(nextText);

                      setTimeout(() => {
                        textarea.focus();
                        const newPos = start + prefix.length + placeholder.length + suffix.length;
                        textarea.setSelectionRange(newPos, newPos);
                      }, 50);
                    }}
                    className="h-7 px-2.5 text-xs gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    <span>+ Insert Code</span>
                  </Button>
                </div>

                <Textarea
                  ref={textareaRef}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter complete textual question statement... (Click '+ Insert Code' to place {{CODE}} marker)"
                  className="min-h-[100px] text-base"
                  required
                />
              </div>

              {/* Code Question Section */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Code Language
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Select a language to enable the Monaco code editor.
                    </p>
                  </div>

                  <div className="relative inline-block">
                    <select
                      value={codeLanguage}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        setCodeLanguage(newLang);
                        if (newLang && !questionText.includes('{{CODE}}')) {
                          setQuestionText((prev) => (prev ? `${prev}\n\n{{CODE}}\n\n` : `{{CODE}}\n\n`));
                        }

                        // Auto-suggest topic based on code language
                        if (newLang) {
                          const langLower = newLang.toLowerCase();
                          const webDevLangs = ['javascript', 'typescript', 'xml', 'html', 'css', 'json'];
                          if (webDevLangs.includes(langLower)) {
                            const webTopic = availableTopics.find((t) =>
                              t.name.toLowerCase().includes('web development') ||
                              t.slug.includes('web-development')
                            );
                            if (webTopic) {
                              setSelectedTopicId(webTopic.id);
                            }
                          } else if (langLower === 'sql') {
                            const dbmsTopic = availableTopics.find((t) =>
                              t.name.toLowerCase() === 'dbms' ||
                              t.slug === 'dbms'
                            );
                            if (dbmsTopic) {
                              setSelectedTopicId(dbmsTopic.id);
                            }
                          }
                        }
                      }}
                      className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="">[ None / No Code ]</option>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {Boolean(codeLanguage || questionText.includes('{{CODE}}')) && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Code Content ({getLanguageDisplayName(codeLanguage || 'javascript')})
                      </span>
                      {!questionText.includes('{{CODE}}') && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuestionText((prev) => (prev ? `${prev}\n\n{{CODE}}\n\n` : `{{CODE}}\n\n`));
                          }}
                          className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          ⚠️ Missing {'{{CODE}}'} in Question Text (Click to Add)
                        </button>
                      )}
                    </div>

                    <QuizoraCodeEditor
                      value={codeContent}
                      language={codeLanguage || 'javascript'}
                      onChange={setCodeContent}
                      onLanguageChange={setCodeLanguage}
                      height="220px"
                    />
                  </div>
                )}
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
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 overflow-hidden">
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 min-w-0">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Difficulty
                </label>
                <div className="relative min-w-0">
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="w-full min-w-0 max-w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate appearance-none cursor-pointer"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 min-w-0">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source Name
                </label>
                <Input
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g. Bihar STET / SSC CGL"
                />
              </div>

              <div className="min-w-0">
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

              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <div className="relative min-w-0">
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as 'draft' | 'published' | 'archived')
                    }
                    className="w-full min-w-0 max-w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium truncate appearance-none cursor-pointer"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
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
              codeLanguage={codeLanguage}
              codeContent={codeContent}
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
