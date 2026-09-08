import * as React from 'react';
import { BulkImporter } from '@/components/admin/BulkImporter';

export const metadata = {
  title: 'Bulk Question Import — Quizora Admin',
  description: 'Upload and validate questions in bulk via CSV, XLSX, and ZIP with images.',
};

export default function AdminImportsPage() {
  return <BulkImporter />;
}
