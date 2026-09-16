'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MistakeQuestionItem } from '@/services/dashboard';
import { StudentHeader } from '@/components/layout/StudentHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertOctagon,
  Search,
  Zap,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { startMistakesHubPracticeAction } from '@/app/dashboard/actions';
import { ImageLightbox } from '@/components/media/ImageLightbox';

interface MistakesClientProps {
  initialMistakes: MistakeQuestionItem[];
}

export function MistakesClient({ initialMistakes }: MistakesClientProps) {
  const router = useRouter();
  const [mistakes] = useState<MistakeQuestionItem[]>(initialMistakes);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'wrong' | 'skipped'>('all');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [isStartingPractice, setIsStartingPractice] = useState(false);

  // Distinct Exams in mistakes
  const distinctExams = useMemo(() => {
    return Array.from(new Set(mistakes.map((m) => m.examName)));
  }, [mistakes]);

  // Filtered mistakes
  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      if (selectedExam !== 'all' && m.examName !== selectedExam) return false;
      if (selectedType === 'wrong' && m.isSkipped) return false;
      if (selectedType === 'skipped' && !m.isSkipped) return false;
      if (
        searchQuery &&
        !m.snapshot.question_text.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !m.topicName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [mistakes, selectedExam, selectedType, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  const handleStartPractice = async () => {
    if (filteredMistakes.length === 0) return;
    setIsStartingPractice(true);
    try {
      const qIds = filteredMistakes.map((m) => m.questionId);
      const attempt = await startMistakesHubPracticeAction(qIds);
      router.push(`/practice?attemptId=${attempt.id}`);
    } catch (err) {
      console.error('Failed to start mistakes practice', err);
      setIsStartingPractice(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <StudentHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header & Practice CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                My Mistakes Hub
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Central error repository of questions missed or skipped in past CBT tests. Re-attempt them to eliminate blind spots.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              size="lg"
              disabled={filteredMistakes.length === 0 || isStartingPractice}
              onClick={handleStartPractice}
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {isStartingPractice ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing Practice...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-white fill-white" />
                  <span>Practice These Mistakes ({filteredMistakes.length})</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search mistake question or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Type and Exam Filters */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Type tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  selectedType === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All ({mistakes.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('wrong')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  selectedType === 'wrong'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                }`}
              >
                Incorrect ({mistakes.filter((m) => !m.isSkipped).length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('skipped')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  selectedType === 'skipped'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Skipped ({mistakes.filter((m) => m.isSkipped).length})
              </button>
            </div>

            {/* Exam selector */}
            {distinctExams.length > 1 && (
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Exams</option>
                {distinctExams.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Mistakes Questions List */}
        {filteredMistakes.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-950/50 w-16 h-16 mx-auto flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Zero Mistakes Found!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || selectedExam !== 'all' || selectedType !== 'all'
                  ? 'No mistake questions match your search filters.'
                  : 'Fantastic work! You have not made any mistakes in completed test attempts, or all previous errors have been resolved.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/tests')}
              className="text-xs font-semibold"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Take a Mock Test
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMistakes.map((item, index) => {
              const { snapshot } = item;
              const isExpanded = expandedCardId === item.id;
              const letterMap = (idx: number | null) =>
                idx !== null ? String.fromCharCode(64 + idx) : 'None';

              return (
                <Card
                  key={item.id}
                  className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Header Row: Taxonomies, Badges & Expansion Toggle */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center justify-center">
                          #{index + 1}
                        </span>

                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200"
                        >
                          {item.examName}
                        </Badge>

                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200"
                        >
                          {item.topicName}
                        </Badge>

                        {/* Status Badge: Wrong vs Skipped */}
                        {item.isSkipped ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            <span>Skipped</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Marked Option {letterMap(item.lastSelectedOption)}</span>
                          </span>
                        )}

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Correct: Option {letterMap(snapshot.correct_option)}</span>
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(item.id)}
                        className="h-8 text-xs font-semibold"
                      >
                        <span>{isExpanded ? 'Hide Solution' : 'View Full Solution'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 ml-1" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        )}
                      </Button>
                    </div>

                    {/* Question Statement */}
                    <div className="space-y-3">
                      <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                        {snapshot.question_text}
                      </p>

                      {/* Question Diagram if present */}
                      {snapshot.question_image_path && (
                        <div className="relative inline-block border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-w-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={snapshot.question_image_path}
                            alt="Question Diagram"
                            className="max-h-48 object-contain cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => setLightboxSrc(snapshot.question_image_path)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Expanded Solution & Options View */}
                    {isExpanded && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        {/* Options List with visual student vs correct highlights */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Answer Choices:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {snapshot.options.map((opt, oIdx) => {
                              const optionNumber = oIdx + 1;
                              const isCorrect = optionNumber === snapshot.correct_option;
                              const wasSelected = optionNumber === item.lastSelectedOption;
                              const letter = String.fromCharCode(65 + oIdx);

                              let cardStyle =
                                'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                              let badgeText: string | null = null;

                              if (isCorrect) {
                                cardStyle =
                                  'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-400/40';
                                badgeText = 'Correct Answer';
                              } else if (wasSelected) {
                                cardStyle =
                                  'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100 ring-1 ring-rose-400/40';
                                badgeText = 'Your Answer';
                              }

                              return (
                                <div
                                  key={letter}
                                  className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-2.5 transition-all ${cardStyle}`}
                                >
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <span
                                      className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : wasSelected
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      {letter}
                                    </span>
                                    <div className="space-y-1">
                                      {opt.text && <p>{opt.text}</p>}
                                      {opt.image_path && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={opt.image_path}
                                          alt={`Option ${letter}`}
                                          className="max-h-20 object-contain rounded border border-slate-200"
                                        />
                                      )}
                                    </div>
                                  </div>

                                  {badgeText && (
                                    <span
                                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-rose-600 text-white'
                                      }`}
                                    >
                                      {badgeText}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Explanation Narrative */}
                        {snapshot.explanation && (
                          <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-indigo-800 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
                              <Lightbulb className="w-4 h-4 text-indigo-600" />
                              <span>Official Solution Narrative</span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                              {snapshot.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox for diagrams */}
      <ImageLightbox
        isOpen={!!lightboxSrc}
        imagePath={lightboxSrc}
        alt="Enlarged Question Media"
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
