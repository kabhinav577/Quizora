import { NextRequest, NextResponse } from 'next/server';
import { commitBulkImport, ValidatedImportItem } from '@/services/imports';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items as ValidatedImportItem[];
    const skipDuplicates = Boolean(body.skipDuplicates);

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No valid questions to import' },
        { status: 400 }
      );
    }

    const result = await commitBulkImport(items, skipDuplicates);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[BulkImport API] Commit error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to import questions' },
      { status: 500 }
    );
  }
}
