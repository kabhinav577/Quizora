'use server';

import {
  RawImportRow,
  validateImportData,
  commitBulkImport,
  ValidatedImportItem,
  ValidationReport,
} from '@/services/imports';

export async function validateImportAction(
  rows: RawImportRow[],
  imageFileNames: string[]
): Promise<ValidationReport> {
  const imagesMap = new Map<string, Blob>();
  imageFileNames.forEach((name) => {
    imagesMap.set(name.toLowerCase(), new Blob());
  });

  return validateImportData(rows, imagesMap);
}

export async function commitImportAction(
  items: ValidatedImportItem[],
  skipDuplicates: boolean
): Promise<{ importedCount: number; skippedCount: number }> {
  return commitBulkImport(items, skipDuplicates);
}
