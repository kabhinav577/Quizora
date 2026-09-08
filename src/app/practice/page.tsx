'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Exam, Subject, Topic } from '@/types/database';
import type { AttemptWithDetails } from '@/types/quiz';
import {
  listExamsAction,
  listSubjectsAction,
  listTopicsAction,
  startPracticeSessionAction,
  saveAnswerAction,
  submitAttemptAction,
} from '@/app/tests/actions';
import { QuizEngine } from '@/components/quiz/QuizEngine';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Target,
  Sparkles,
  BookOpen,
  Layers,
  Clock,
  HelpCircle,
  Play,
} from 'lucide-react';

export default function PracticeModePage() {
  const router = useRouter();

  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timerSeconds, setTimerSeconds] = useState<number>(45);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [activeAttempt, setActiveAttempt] = useState<AttemptWithDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Exams on mount
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      setLoadingConfig(true);
      try {
        const examList = await listExamsAction();
        if (!isMounted) return;
        setExams(examList);
        if (examList.length > 0) {
          setSelectedExamId(examList[0].id);
        }
      } catch (err) {
        console.error('Failed to load exams', err);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    }
    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load Subjects when Exam changes
  useEffect(() => {
    let isMounted = true;
    if (!selectedExamId) return;

    listSubjectsAction(selectedExamId)
      .then((subList) => {
        if (isMounted) {
          setSubjects(subList);
        }
      })
      .catch((err) => {
        console.error('Failed to load subjects', err);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedExamId]);

  // Load Topics when Subject changes
  useEffect(() => {
    let isMounted = true;
    if (!selectedSubjectId) return;

    listTopicsAction(selectedSubjectId)
      .then((topicList) => {
        if (isMounted) {
          setTopics(topicList);
        }
      })
      .catch((err) => {
        console.error('Failed to load topics', err);
      });


    return () => {
      isMounted = false;
    };
  }, [selectedSubjectId]);

  const handleStartPractice = async () => {

    setIsStarting(true);
    setErrorMessage(null);
    try {
      const attempt = await startPracticeSessionAction({
        examId: selectedExamId || undefined,
        subjectId: selectedSubjectId || undefined,
        topicId: selectedTopicId || undefined,
        count: questionCount,
        timerSeconds: timerSeconds > 0 ? timerSeconds : undefined,
      });

      setActiveAttempt(attempt);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not generate practice session'
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleSaveAnswer = async (
    questionId: string,
    selectedOption: number | null,
    isMarkedForReview: boolean,
    timeSpentSeconds: number
  ) => {
    if (!activeAttempt) return false;
    return await saveAnswerAction(
      activeAttempt.id,
      questionId,
      selectedOption,
      isMarkedForReview,
      timeSpentSeconds
    );
  };

  const handleSubmitAttempt = async (
    finalAnswers: Array<{
      question_id: string;
      selected_option: number | null;
      is_marked_for_review: boolean;
      time_spent_seconds: number;
    }>
  ) => {
    if (!activeAttempt) return;
    try {
      const res = await submitAttemptAction(activeAttempt.id, finalAnswers);
      setActiveAttempt(null);
      // Navigate to results page
      router.push(`/practice/results/${res.attempt.id}`);
    } catch (err) {
      console.error('Failed to submit practice attempt:', err);
      alert('Failed to submit practice session.');
    }
  };

  // If in an active practice attempt, render QuizEngine
  if (activeAttempt) {
    return (
      <QuizEngine
        attempt={activeAttempt}
        onSaveAnswer={handleSaveAnswer}
        onSubmitAttempt={handleSubmitAttempt}
        testTitle="Dynamic Practice Session"
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
            <Sparkles className="w-3.5 h-3.5" />
            Adaptive Daily Practice
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Targeted Question Practice
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Build exam muscle memory. Filter by examination, subject, or topic, configure per-question timers, and practice with real questions.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm">
            {errorMessage}
          </div>
        )}

        <Card className="border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
          <CardHeader className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Configure Practice Session
            </CardTitle>
            <CardDescription>
              Select your practice criteria below. Leave fields empty to practice across all topics.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Exam Selector */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Select Target Examination
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                  setSelectedSubjectId('');
                  setSelectedTopicId('');
                  setSubjects([]);
                  setTopics([]);
                }}
                disabled={loadingConfig}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- All Competitive Exams --</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Select Subject (Optional)
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedTopicId('');
                  setTopics([]);
                }}
                disabled={subjects.length === 0}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >

                <option value="">-- All Subjects in this Exam --</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Selector */}
            {topics.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Select Topic (Optional)
                </label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- All Topics in this Subject --</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Question Count & Timer Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Question Count */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Number of Questions
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 20, 30].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                        questionCount === num
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm font-bold'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timer Seconds */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  Per-Question Timer
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '30s', val: 30 },
                    { label: '45s', val: 45 },
                    { label: '60s', val: 60 },
                    { label: 'None', val: 0 },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setTimerSeconds(t.val)}
                      className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                        timerSeconds === t.val
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm font-bold'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                size="lg"
                onClick={handleStartPractice}
                isLoading={isStarting}
                className="w-full bg-primary text-primary-foreground font-bold text-base py-6 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start Practice Session ({questionCount} Questions)</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
