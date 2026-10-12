'use client';

import React from 'react';
import { QuizoraCodeBlock } from './QuizoraCodeBlock';

interface QuizoraQuestionContentProps {
  questionText: string;
  codeLanguage?: string | null;
  codeContent?: string | null;
  className?: string;
  textClassName?: string;
}

export const CODE_PLACEHOLDER = '{{CODE}}';

export function QuizoraQuestionContent({
  questionText,
  codeLanguage,
  codeContent,
  className = '',
  textClassName = '',
}: QuizoraQuestionContentProps) {
  // If there's no code_content and no {{CODE}} placeholder, render lightweight plain text
  const hasPlaceholder = questionText.includes(CODE_PLACEHOLDER);
  const hasCodeContent = Boolean(codeContent && codeContent.trim().length > 0);

  if (!hasPlaceholder && !hasCodeContent) {
    return (
      <div className={`whitespace-pre-wrap leading-relaxed ${textClassName}`}>
        {questionText}
      </div>
    );
  }

  // If question_text contains {{CODE}}
  if (hasPlaceholder) {
    const parts = questionText.split(CODE_PLACEHOLDER);
    const beforeText = parts[0];
    const afterText = parts.slice(1).join(CODE_PLACEHOLDER); // Handle any extra if present

    return (
      <div className={`space-y-4 ${className}`}>
        {beforeText && beforeText.trim().length > 0 && (
          <div className={`whitespace-pre-wrap leading-relaxed ${textClassName}`}>
            {beforeText.trimEnd()}
          </div>
        )}

        {hasCodeContent && (
          <QuizoraCodeBlock
            code={codeContent!}
            language={codeLanguage || 'plaintext'}
          />
        )}

        {afterText && afterText.trim().length > 0 && (
          <div className={`whitespace-pre-wrap leading-relaxed ${textClassName}`}>
            {afterText.trimStart()}
          </div>
        )}
      </div>
    );
  }

  // Fallback: If code_content is provided but {{CODE}} was omitted from question_text
  return (
    <div className={`space-y-4 ${className}`}>
      {questionText && questionText.trim().length > 0 && (
        <div className={`whitespace-pre-wrap leading-relaxed ${textClassName}`}>
          {questionText}
        </div>
      )}
      <QuizoraCodeBlock
        code={codeContent!}
        language={codeLanguage || 'plaintext'}
      />
    </div>
  );
}
