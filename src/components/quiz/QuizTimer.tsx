'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface QuizTimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  isPaused?: boolean;
  mode?: 'full' | 'question';
  label?: string;
}

export function QuizTimer({
  initialSeconds,
  onTimeUp,
  isPaused = false,
  mode = 'full',
  label,
}: QuizTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(Math.max(0, initialSeconds));
  const onTimeUpRef = useRef(onTimeUp);
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // If initialSeconds changed externally or not yet initialized
  const prevInitialRef = useRef(initialSeconds);
  useEffect(() => {
    if (endTimeRef.current === null || initialSeconds !== prevInitialRef.current) {
      prevInitialRef.current = initialSeconds;
      endTimeRef.current = Date.now() + Math.max(0, initialSeconds) * 1000;
      setSecondsLeft(Math.max(0, initialSeconds));
    }
  }, [initialSeconds]);

  useEffect(() => {
    if (isPaused) return;

    const tick = () => {
      const end = endTimeRef.current ?? Date.now() + Math.max(0, initialSeconds) * 1000;
      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        onTimeUpRef.current?.();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isPaused, initialSeconds]);

  // Format time display
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Warning thresholds
  const isDanger = mode === 'full' ? secondsLeft <= 60 : secondsLeft <= 5;
  const isWarning = mode === 'full' ? secondsLeft <= 300 && !isDanger : secondsLeft <= 10 && !isDanger;

  let colorClasses =
    'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700';

  if (isDanger) {
    colorClasses =
      'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 animate-pulse';
  } else if (isWarning) {
    colorClasses =
      'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
  }

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${formatTime(secondsLeft)}`}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono font-medium text-sm transition-all duration-300 ${colorClasses}`}
    >
      {isDanger ? (
        <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
      ) : (
        <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      )}
      {label && <span className="text-xs font-sans uppercase tracking-wider font-semibold opacity-80">{label}</span>}
      <span className="text-base font-bold tracking-tight">{formatTime(secondsLeft)}</span>
    </div>
  );
}
