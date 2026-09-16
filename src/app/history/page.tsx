import React from 'react';
import { getStudentHistoryAction } from '@/app/dashboard/actions';
import { HistoryClient } from '@/components/history/HistoryClient';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const history = await getStudentHistoryAction();

  return <HistoryClient initialHistory={history} />;
}
