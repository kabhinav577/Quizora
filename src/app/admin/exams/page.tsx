import * as React from 'react';
import { getExams } from '@/services/exams';
import { getSubjects } from '@/services/subjects';
import { getTopics } from '@/services/topics';
import { TaxonomyManager } from '@/components/admin/TaxonomyManager';

export const metadata = {
  title: 'Taxonomy Management | Quizora Admin',
  description: 'Manage Exams, Subjects, and Topics hierarchy',
};

export default async function AdminExamsPage() {
  const [exams, subjects, topics] = await Promise.all([
    getExams(false),
    getSubjects(),
    getTopics(),
  ]);

  return (
    <TaxonomyManager
      exams={exams}
      subjects={subjects}
      topics={topics}
    />
  );
}
