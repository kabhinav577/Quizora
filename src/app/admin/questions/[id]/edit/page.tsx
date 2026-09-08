import * as React from 'react';
import { notFound } from 'next/navigation';
import { getExams } from '@/services/exams';
import { getSubjects } from '@/services/subjects';
import { getTopics } from '@/services/topics';
import { getQuestionById, updateQuestion } from '@/services/questions';
import { QuestionEditor } from '@/components/questions/QuestionEditor';
import { QuestionFormInput } from '@/schemas/question';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuestionPage({ params }: EditPageProps) {
  const { id } = await params;

  const [question, exams, subjects, topics] = await Promise.all([
    getQuestionById(id),
    getExams(false),
    getSubjects(),
    getTopics(),
  ]);

  if (!question) {
    notFound();
  }

  async function handleUpdateQuestion(data: QuestionFormInput) {
    'use server';
    try {
      const updated = await updateQuestion(id, data);
      if (!updated) {
        return { success: false, error: 'Question not found' };
      }
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update question',
      };
    }
  }

  return (
    <QuestionEditor
      initialData={question}
      exams={exams}
      subjects={subjects}
      topics={topics}
      onSubmit={handleUpdateQuestion}
    />
  );
}
