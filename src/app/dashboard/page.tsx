import React from 'react';
import { getStudentDashboardAction } from './actions';
import { DashboardClient } from '@/components/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await getStudentDashboardAction();

  return <DashboardClient initialData={data} />;
}
