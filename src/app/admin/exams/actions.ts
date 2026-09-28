'use server';

import { revalidatePath } from 'next/cache';
import { createExam, deleteExam } from '@/services/exams';
import { createSubject, deleteSubject } from '@/services/subjects';
import { createTopic, deleteTopic } from '@/services/topics';

export async function createExamAction(formData: {
  name: string;
  slug?: string;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const slug = (formData.slug || formData.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await createExam({
      name: formData.name.trim(),
      slug,
      description: formData.description?.trim() || null,
      is_active: true,
    });
    revalidatePath('/admin/exams');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create exam' };
  }
}

export async function createSubjectAction(formData: {
  exam_id: string;
  name: string;
  slug?: string;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!formData.exam_id) {
      return { success: false, error: 'Exam ID is required.' };
    }
    const slug = (formData.slug || formData.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await createSubject({
      exam_id: formData.exam_id,
      name: formData.name.trim(),
      slug,
      description: formData.description?.trim() || null,
      display_order: 1,
      is_active: true,
    });
    revalidatePath('/admin/exams');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create subject' };
  }
}

export async function createTopicAction(formData: {
  subject_id: string;
  name: string;
  slug?: string;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!formData.subject_id) {
      return { success: false, error: 'Subject ID is required.' };
    }
    const slug = (formData.slug || formData.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await createTopic({
      subject_id: formData.subject_id,
      name: formData.name.trim(),
      slug,
      description: formData.description?.trim() || null,
      display_order: 1,
      is_active: true,
    });
    revalidatePath('/admin/exams');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create topic' };
  }
}

export async function deleteExamAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteExam(id);
    revalidatePath('/admin/exams');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete exam' };
  }
}

export async function deleteSubjectAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteSubject(id);
    revalidatePath('/admin/exams');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete subject' };
  }
}

export async function deleteTopicAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteTopic(id);
    revalidatePath('/admin/exams');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete topic' };
  }
}
