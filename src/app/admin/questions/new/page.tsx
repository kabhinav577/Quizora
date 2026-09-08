import * as React from 'react';
import { getExams } from '@/services/exams';
import { getSubjects } from '@/services/subjects';
import { getTopics } from '@/services/topics';
import { createQuestion } from '@/services/questions';
import { QuestionEditor } from '@/components/questions/QuestionEditor';
import { QuestionFormInput } from '@/schemas/question';

export default async function NewQuestionPage() {
  const [exams, subjects, topics] = await Promise.all([
    getExams(true),
    getSubjects(),
    getTopics(),
  ]);

  async function handleCreateQuestion(data: QuestionFormInput) {
    'use server';
    try {
      await createQuestion(data);
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create question',
      };
    }
  }

  return (
    <QuestionEditor
      exams={exams}
      subjects={subjects}
      topics={topics}
      onSubmit={handleCreateQuestion}
    />
  );
}
