import React from 'react';
import { getStudentMistakesAction } from '@/app/dashboard/actions';
import { MistakesClient } from '@/components/mistakes/MistakesClient';

export const dynamic = 'force-dynamic';

export default async function MistakesPage() {
  const mistakes = await getStudentMistakesAction();

  return <MistakesClient initialMistakes={mistakes} />;
}
