import { QuestionReport, ReportReason, ReportStatus } from '@/types/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';

declare global {
  var __localQuestionReports: QuestionReport[] | undefined;
}

export const localQuestionReports: QuestionReport[] =
  globalThis.__localQuestionReports ?? (globalThis.__localQuestionReports = []);

export interface SubmitReportInput {
  questionId: string;
  reason: ReportReason;
  description?: string;
}

/**
 * Submits a question issue report from a student during review or practice
 */
export async function submitQuestionReport(
  userId: string,
  input: SubmitReportInput
): Promise<QuestionReport> {
  const newReport: QuestionReport = {
    id: crypto.randomUUID(),
    user_id: userId,
    question_id: input.questionId,
    reason: input.reason,
    description: input.description || null,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('question_reports')
      .insert(newReport)
      .select()
      .single();

    if (!error && data) {
      localQuestionReports.unshift(data as QuestionReport);
      return data as QuestionReport;
    }
  } catch {
    // fallback
  }

  localQuestionReports.unshift(newReport);
  return newReport;
}

/**
 * Lists question reports (for admin or user auditing)
 */
export async function listQuestionReports(status?: ReportStatus): Promise<QuestionReport[]> {
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from('question_reports').select('*').order('created_at', { ascending: false });
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (!error && data) {
      return data as QuestionReport[];
    }
  } catch {
    // fallback
  }

  if (status) {
    return localQuestionReports.filter((r) => r.status === status);
  }
  return localQuestionReports;
}
