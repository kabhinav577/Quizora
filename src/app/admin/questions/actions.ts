'use server';

import { revalidatePath } from 'next/cache';
import {
  deleteQuestion,
  bulkDeleteQuestions,
  bulkDeleteQuestionsBySource,
  duplicateQuestion,
  archiveQuestion,
  resetQuestionsToSample,
} from '@/services/questions';

export async function deleteQuestionAction(id: string) {
  try {
    const success = await deleteQuestion(id);
    revalidatePath('/admin/questions');
    revalidatePath('/admin');
    return {
      success,
      message: success ? 'Question deleted successfully.' : 'Failed to delete question.',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting question';
    return { success: false, message };
  }
}

export async function bulkDeleteQuestionsAction(ids: string[]) {
  try {
    const result = await bulkDeleteQuestions(ids);
    revalidatePath('/admin/questions');
    revalidatePath('/admin');
    return {
      success: true,
      count: result.count,
      message: `Successfully deleted ${result.count} question${result.count === 1 ? '' : 's'}.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error bulk deleting questions';
    return { success: false, count: 0, message };
  }
}

export async function bulkDeleteBySourceAction(sourceName: string) {
  try {
    const result = await bulkDeleteQuestionsBySource(sourceName);
    revalidatePath('/admin/questions');
    revalidatePath('/admin');
    return {
      success: true,
      count: result.count,
      message: `Successfully deleted ${result.count} question${result.count === 1 ? '' : 's'} from "${sourceName}".`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting questions by source';
    return { success: false, count: 0, message };
  }
}

export async function duplicateQuestionAction(id: string) {
  try {
    await duplicateQuestion(id);
    revalidatePath('/admin/questions');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error duplicating question';
    return { success: false, message };
  }
}

export async function archiveQuestionAction(id: string) {
  try {
    await archiveQuestion(id);
    revalidatePath('/admin/questions');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error archiving question';
    return { success: false, message };
  }
}

export async function resetQuestionsToSampleAction() {
  try {
    const result = await resetQuestionsToSample();
    revalidatePath('/admin/questions');
    revalidatePath('/admin');
    revalidatePath('/practice');
    revalidatePath('/tests');
    return {
      success: true,
      count: result.count,
      message: `Questions successfully reset to ${result.count} standard sample questions.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error resetting questions to sample';
    return { success: false, count: 0, message };
  }
}
