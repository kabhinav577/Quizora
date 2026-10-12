-- Migration: Add code_language and code_content nullable columns to questions table for V2 Code Questions
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS code_language TEXT NULL,
  ADD COLUMN IF NOT EXISTS code_content TEXT NULL;
