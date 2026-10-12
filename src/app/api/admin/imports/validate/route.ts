import { NextRequest, NextResponse } from 'next/server';
import { validateImportData, RawImportRow } from '@/services/imports';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = body.rows as RawImportRow[];
    const imageFileNames = (body.imageFileNames || []) as string[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'The uploaded file contained 0 rows or invalid data.' },
        { status: 400 }
      );
    }

    const imagesMap = new Map<string, Blob>();
    imageFileNames.forEach((name) => {
      imagesMap.set(name.toLowerCase(), new Blob());
    });

    const report = await validateImportData(rows, imagesMap);
    return NextResponse.json(report);
  } catch (err: unknown) {
    console.error('[BulkImport API] Validation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to validate questions' },
      { status: 500 }
    );
  }
}
