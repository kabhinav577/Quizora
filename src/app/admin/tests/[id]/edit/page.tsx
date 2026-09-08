import * as React from 'react';
import { notFound } from 'next/navigation';
import { getExams } from '@/services/exams';
import { getSubjects } from '@/services/subjects';
import { getTopics } from '@/services/topics';
import { listQuestions } from '@/services/questions';
import { getTestById, updateTest } from '@/services/tests';
import { TestBuilder } from '@/components/admin/TestBuilder';
import { TestFormInput } from '@/schemas/test';

interface EditTestPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTestPage({ params }: EditTestPageProps) {
  const { id } = await params;

  const [test, exams, subjects, topics, questionData] = await Promise.all([
    getTestById(id),
    getExams(false),
    getSubjects(),
    getTopics(),
    listQuestions({ pageSize: 100 }),
  ]);

  if (!test) {
    notFound();
  }

  async function handleUpdateTest(data: TestFormInput) {
    'use server';
    try {
      const updated = await updateTest(id, data);
      if (!updated) {
        return { success: false, error: 'Test not found' };
      }
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update test',
      };
    }
  }

  return (
    <TestBuilder
      initialData={test}
      exams={exams}
      subjects={subjects}
      topics={topics}
      availableQuestions={questionData.questions}
      onSubmit={handleUpdateTest}
    />
  );
}
