import { NextRequest, NextResponse } from 'next/server';
import { abandonAttempt } from '@/services/attempts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let attemptId: string | undefined;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      attemptId = body?.attemptId;
    } else {
      const text = await req.text();
      try {
        const body = JSON.parse(text);
        attemptId = body?.attemptId;
      } catch {
        attemptId = text?.trim();
      }
    }

    if (attemptId) {
      await abandonAttempt(attemptId);
      return NextResponse.json({ success: true, message: 'Attempt abandoned successfully' });
    }

    return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Error abandoning attempt:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to abandon attempt' },
      { status: 500 }
    );
  }
}
