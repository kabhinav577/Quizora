'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers,
  BookOpen,
  Tag,
  Plus,
  Trash2,
  Search,
  ChevronRight,
  AlertCircle,
  FolderTree,
  X,
} from 'lucide-react';
import { Exam, Subject, Topic } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  createExamAction,
  createSubjectAction,
  createTopicAction,
  deleteExamAction,
  deleteSubjectAction,
  deleteTopicAction,
} from '@/app/admin/exams/actions';

interface TaxonomyManagerProps {
  exams: Exam[];
  subjects: Subject[];
  topics: Topic[];
}

export function TaxonomyManager({
  exams: initialExams,
  subjects: initialSubjects,
  topics: initialTopics,
}: TaxonomyManagerProps) {
  const router = useRouter();

  // Selected State
  const [selectedExamId, setSelectedExamId] = React.useState<string>(
    initialExams[0]?.id || ''
  );
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>('');

  // Search terms
  const [examSearch, setExamSearch] = React.useState('');
  const [subjectSearch, setSubjectSearch] = React.useState('');
  const [topicSearch, setTopicSearch] = React.useState('');

  // Form states
  const [isAddingExam, setIsAddingExam] = React.useState(false);
  const [examName, setExamName] = React.useState('');
  const [examSlug, setExamSlug] = React.useState('');
  const [examDesc, setExamDesc] = React.useState('');
  const [examError, setExamError] = React.useState<string | null>(null);

  const [isAddingSubject, setIsAddingSubject] = React.useState(false);
  const [subjectName, setSubjectName] = React.useState('');
  const [subjectSlug, setSubjectSlug] = React.useState('');
  const [subjectDesc, setSubjectDesc] = React.useState('');
  const [subjectError, setSubjectError] = React.useState<string | null>(null);

  const [isAddingTopic, setIsAddingTopic] = React.useState(false);
  const [topicName, setTopicName] = React.useState('');
  const [topicSlug, setTopicSlug] = React.useState('');
  const [topicDesc, setTopicDesc] = React.useState('');
  const [topicError, setTopicError] = React.useState<string | null>(null);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = React.useState<{
    type: 'exam' | 'subject' | 'topic';
    id: string;
    name: string;
  } | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Auto-select subject when exam changes
  const activeExam = initialExams.find((e) => e.id === selectedExamId);
  const filteredSubjectsForExam = React.useMemo(() => {
    return initialSubjects.filter((s) => s.exam_id === selectedExamId);
  }, [initialSubjects, selectedExamId]);

  const effectiveSubjectId = filteredSubjectsForExam.some((s) => s.id === selectedSubjectId)
    ? selectedSubjectId
    : filteredSubjectsForExam[0]?.id || '';

  const activeSubject = filteredSubjectsForExam.find((s) => s.id === effectiveSubjectId);
  const filteredTopicsForSubject = React.useMemo(() => {
    return initialTopics.filter((t) => t.subject_id === effectiveSubjectId);
  }, [initialTopics, effectiveSubjectId]);

  // Search filtered lists
  const visibleExams = initialExams.filter((e) =>
    e.name.toLowerCase().includes(examSearch.toLowerCase()) ||
    e.slug.toLowerCase().includes(examSearch.toLowerCase())
  );

  const visibleSubjects = filteredSubjectsForExam.filter((s) =>
    s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
    s.slug.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const visibleTopics = filteredTopicsForSubject.filter((t) =>
    t.name.toLowerCase().includes(topicSearch.toLowerCase()) ||
    t.slug.toLowerCase().includes(topicSearch.toLowerCase())
  );

  // Counts helpers
  const getSubjectCountForExam = (examId: string) =>
    initialSubjects.filter((s) => s.exam_id === examId).length;

  const getTopicCountForSubject = (subId: string) =>
    initialTopics.filter((t) => t.subject_id === subId).length;

  // Auto-slug helper
  const slugify = (text: string) =>
    text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Add Handlers
  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setExamError(null);
    setIsSubmitting(true);
    const res = await createExamAction({
      name: examName,
      slug: examSlug || slugify(examName),
      description: examDesc,
    });
    setIsSubmitting(false);
    if (!res.success) {
      setExamError(res.error || 'Failed to add exam');
    } else {
      setExamName('');
      setExamSlug('');
      setExamDesc('');
      setIsAddingExam(false);
      router.refresh();
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;
    setSubjectError(null);
    setIsSubmitting(true);
    const res = await createSubjectAction({
      exam_id: selectedExamId,
      name: subjectName,
      slug: subjectSlug || slugify(subjectName),
      description: subjectDesc,
    });
    setIsSubmitting(false);
    if (!res.success) {
      setSubjectError(res.error || 'Failed to add subject');
    } else {
      setSubjectName('');
      setSubjectSlug('');
      setSubjectDesc('');
      setIsAddingSubject(false);
      router.refresh();
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveSubjectId) return;
    setTopicError(null);
    setIsSubmitting(true);
    const res = await createTopicAction({
      subject_id: effectiveSubjectId,
      name: topicName,
      slug: topicSlug || slugify(topicName),
      description: topicDesc,
    });
    setIsSubmitting(false);
    if (!res.success) {
      setTopicError(res.error || 'Failed to add topic');
    } else {
      setTopicName('');
      setTopicSlug('');
      setTopicDesc('');
      setIsAddingTopic(false);
      router.refresh();
    }
  };

  // Delete Handler
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);

    let res: { success: boolean; error?: string };
    if (deleteTarget.type === 'exam') {
      res = await deleteExamAction(deleteTarget.id);
    } else if (deleteTarget.type === 'subject') {
      res = await deleteSubjectAction(deleteTarget.id);
    } else {
      res = await deleteTopicAction(deleteTarget.id);
    }

    setIsDeleting(false);
    if (!res.success) {
      setDeleteError(res.error || 'Failed to delete');
    } else {
      setDeleteTarget(null);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Curriculum Taxonomy Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Industry-standard 3-tier hierarchy: <span className="font-semibold text-slate-700 dark:text-slate-300">Exam → Subject → Topic → Question</span>.
          </p>
        </div>

        {activeExam && (
          <div className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeExam.name}</span>
            {activeSubject && (
              <>
                <ChevronRight className="h-3 w-3 text-slate-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">{activeSubject.name}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 3 Cascading Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PANEL 1: EXAMS */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col min-h-[580px]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              1. Exams ({initialExams.length})
            </span>
            <Button
              size="sm"
              variant={isAddingExam ? 'secondary' : 'default'}
              onClick={() => {
                setIsAddingExam(!isAddingExam);
                setExamError(null);
              }}
              className="h-7 text-xs gap-1"
            >
              {isAddingExam ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {isAddingExam ? 'Close' : 'Add Exam'}
            </Button>
          </div>

          {/* Add Exam Form */}
          {isAddingExam && (
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-950/20">
              <form onSubmit={handleAddExam} className="space-y-2.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Add New Examination</p>
                <Input
                  value={examName}
                  onChange={(e) => {
                    setExamName(e.target.value);
                    if (!examSlug || examSlug === slugify(examName)) {
                      setExamSlug(slugify(e.target.value));
                    }
                  }}
                  placeholder="Exam name, e.g. Bihar STET"
                  required
                  className="h-8 text-xs bg-white dark:bg-slate-900"
                />
                <Input
                  value={examSlug}
                  onChange={(e) => setExamSlug(slugify(e.target.value))}
                  placeholder="Slug, e.g. bihar-stet"
                  required
                  className="h-8 text-xs bg-white dark:bg-slate-900 font-mono"
                />
                <Input
                  value={examDesc}
                  onChange={(e) => setExamDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="h-8 text-xs bg-white dark:bg-slate-900"
                />
                {examError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {examError}
                  </p>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSubmitting ? 'Saving...' : 'Save Exam'}
                </Button>
              </form>
            </div>
          )}

          {/* Search Bar */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                placeholder="Search exams..."
                className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-800/50 border-0"
              />
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70 p-2 flex-1 overflow-y-auto max-h-[500px]">
            {visibleExams.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No exams found.</p>
            ) : (
              visibleExams.map((ex) => {
                const isSelected = ex.id === selectedExamId;
                const subCount = getSubjectCountForExam(ex.id);
                return (
                  <div
                    key={ex.id}
                    onClick={() => setSelectedExamId(ex.id)}
                    className={`p-3 rounded-lg cursor-pointer transition flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/70'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                          {ex.name}
                        </p>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {subCount} {subCount === 1 ? 'subject' : 'subjects'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                        {ex.slug}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ type: 'exam', id: ex.id, name: ex.name });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition"
                        title="Delete Exam"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: SUBJECTS */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col min-h-[580px]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                2. Subjects ({filteredSubjectsForExam.length})
              </span>
              {activeExam && (
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  Under: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeExam.name}</span>
                </p>
              )}
            </div>
            {activeExam && (
              <Button
                size="sm"
                variant={isAddingSubject ? 'secondary' : 'default'}
                onClick={() => {
                  setIsAddingSubject(!isAddingSubject);
                  setSubjectError(null);
                }}
                className="h-7 text-xs gap-1"
              >
                {isAddingSubject ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {isAddingSubject ? 'Close' : 'Add Subject'}
              </Button>
            )}
          </div>

          {!activeExam ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-400">
              Select an exam from the left to manage its subjects.
            </div>
          ) : (
            <>
              {/* Add Subject Form */}
              {isAddingSubject && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-950/20">
                  <form onSubmit={handleAddSubject} className="space-y-2.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Add Subject to {activeExam.name}
                    </p>
                    <Input
                      value={subjectName}
                      onChange={(e) => {
                        setSubjectName(e.target.value);
                        if (!subjectSlug || subjectSlug === slugify(subjectName)) {
                          setSubjectSlug(slugify(e.target.value));
                        }
                      }}
                      placeholder="e.g. Computer Science"
                      required
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                    />
                    <Input
                      value={subjectSlug}
                      onChange={(e) => setSubjectSlug(slugify(e.target.value))}
                      placeholder="slug, e.g. computer-science"
                      required
                      className="h-8 text-xs bg-white dark:bg-slate-900 font-mono"
                    />
                    <Input
                      value={subjectDesc}
                      onChange={(e) => setSubjectDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                    />
                    {subjectError && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {subjectError}
                      </p>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting}
                      className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Subject'}
                    </Button>
                  </form>
                </div>
              )}

              {/* Search Bar */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="Search subjects..."
                    className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-800/50 border-0"
                  />
                </div>
              </div>

              {/* List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70 p-2 flex-1 overflow-y-auto max-h-[500px]">
                {visibleSubjects.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No subjects in this exam yet.
                  </p>
                ) : (
                  visibleSubjects.map((sub) => {
                    const isSelected = sub.id === effectiveSubjectId;
                    const topCount = getTopicCountForSubject(sub.id);
                    return (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSubjectId(sub.id)}
                        className={`p-3 rounded-lg cursor-pointer transition flex items-center justify-between group ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/70'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                              {sub.name}
                            </p>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {topCount} {topCount === 1 ? 'topic' : 'topics'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                            {sub.slug}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ type: 'subject', id: sub.id, name: sub.name });
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition"
                            title="Delete Subject"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* PANEL 3: TOPICS */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col min-h-[580px]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                3. Topics ({filteredTopicsForSubject.length})
              </span>
              {activeSubject && (
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  Under: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeSubject.name}</span>
                </p>
              )}
            </div>
            {activeSubject && (
              <Button
                size="sm"
                variant={isAddingTopic ? 'secondary' : 'default'}
                onClick={() => {
                  setIsAddingTopic(!isAddingTopic);
                  setTopicError(null);
                }}
                className="h-7 text-xs gap-1"
              >
                {isAddingTopic ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {isAddingTopic ? 'Close' : 'Add Topic'}
              </Button>
            )}
          </div>

          {!activeSubject ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-400">
              Select a subject from the middle panel to view and manage its topics.
            </div>
          ) : (
            <>
              {/* Add Topic Form */}
              {isAddingTopic && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-950/20">
                  <form onSubmit={handleAddTopic} className="space-y-2.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Add Topic to {activeSubject.name}
                    </p>
                    <Input
                      value={topicName}
                      onChange={(e) => {
                        setTopicName(e.target.value);
                        if (!topicSlug || topicSlug === slugify(topicName)) {
                          setTopicSlug(slugify(e.target.value));
                        }
                      }}
                      placeholder="e.g. Computer Networks / Compiler Design"
                      required
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                    />
                    <Input
                      value={topicSlug}
                      onChange={(e) => setTopicSlug(slugify(e.target.value))}
                      placeholder="slug, e.g. computer-networks"
                      required
                      className="h-8 text-xs bg-white dark:bg-slate-900 font-mono"
                    />
                    <Input
                      value={topicDesc}
                      onChange={(e) => setTopicDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                    />
                    {topicError && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {topicError}
                      </p>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting}
                      className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Topic'}
                    </Button>
                  </form>
                </div>
              )}

              {/* Search Bar */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    placeholder="Search topics..."
                    className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-800/50 border-0"
                  />
                </div>
              </div>

              {/* List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70 p-2 flex-1 overflow-y-auto max-h-[500px]">
                {visibleTopics.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No topics in this subject yet.
                  </p>
                ) : (
                  visibleTopics.map((top) => (
                    <div
                      key={top.id}
                      className="p-3 rounded-lg transition flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {top.name}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                          {top.slug}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({ type: 'topic', id: top.id, name: top.name })
                        }
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition"
                        title="Delete Topic"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={Boolean(deleteTarget)}
          onClose={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          title={`Delete ${deleteTarget.type === 'exam' ? 'Exam' : deleteTarget.type === 'subject' ? 'Subject' : 'Topic'}`}
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900 dark:text-slate-100">{deleteTarget.name}</strong>?
              {deleteTarget.type !== 'topic' && ' This will only succeed if no questions or child items depend on it.'}
            </p>

            {deleteError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="text-xs gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
