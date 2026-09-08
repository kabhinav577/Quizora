import * as React from 'react';
import { getExams } from '@/services/exams';
import { getSubjects } from '@/services/subjects';
import { getTopics } from '@/services/topics';
import { listQuestions } from '@/services/questions';
import { createTest } from '@/services/tests';
import { TestBuilder } from '@/components/admin/TestBuilder';
import { TestFormInput } from '@/schemas/test';

export default async function NewTestPage() {
  const [exams, subjects, topics, questionData] = await Promise.all([
    getExams(true),
    getSubjects(),
    getTopics(),
    listQuestions({ pageSize: 100 }),
  ]);

  async function handleCreateTest(data: TestFormInput) {
    'use server';
    try {
      await createTest(data);
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create test',
      };
    }
  }

  return (
    <TestBuilder
      exams={exams}
      subjects={subjects}
      topics={topics}
      availableQuestions={questionData.questions}
      onSubmit={handleCreateTest}
    />
  );
}
