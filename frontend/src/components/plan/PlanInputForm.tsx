'use client';

import { useState, useRef } from 'react';
import { Spinner } from '../ui/Spinner';
import { PrimaryButton } from '../ui/primary-button';
import { PlanMode } from '../../lib/types';

interface PlanInputFormProps {
  onSubmit: (rawInput: string, mode: PlanMode) => void;
  loading: boolean;
  scrollToResults?: () => void;
  shareEnabled?: boolean;
  saveToWorkspace?: boolean;
  workspaceName?: string;
  onChangeSaveToWorkspace?: (next: boolean) => void;
}

const MODE_CONFIG: { mode: PlanMode; emoji: string; label: string; desc: string }[] = [
  { mode: 'date', emoji: '💑', label: '데이트 코스', desc: '저녁 중심 · 3~4곳 · 짧은 동선' },
  { mode: 'trip', emoji: '🧳', label: '당일치기 여행', desc: '하루 일정 · 4~6곳 · 알찬 동선' },
];

const EXAMPLES = [
  { text: '강남에서 데이트할 건데, 저녁은 파스타 먹고 영화 보는 코스로 짜줘', emoji: '🍝' },
  { text: '홍대에서 친구 3명이 놀 건데, 맛집 1곳, 카페 1곳, 액티비티 1곳 포함해서 하루 코스 짜줘', emoji: '🎸' },
  { text: '이태원에서 데이트할 건데, 저녁 맛집 1곳, 분위기 좋은 카페 1곳, 산책 코스까지 추천해줘', emoji: '💕' },
  { text: '성수동에서 카페 2곳이랑 맛집 1곳 포함해서, 사진 찍기 좋은 코스로 짜줘', emoji: '☕' },
  { text: '여의도에서 벚꽃 산책하고 맛집 1곳 가는 코스 짜줘. 저녁 8시 전에 끝나게 해줘', emoji: '🌸' },
];

export function PlanInputForm({
  onSubmit,
  loading,
  scrollToResults,
  shareEnabled,
  saveToWorkspace,
  workspaceName,
  onChangeSaveToWorkspace,
}: PlanInputFormProps) {
  const [rawInput, setRawInput] = useState('');
  const [mode, setMode] = useState<PlanMode>('date');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) return;
    onSubmit(rawInput.trim(), mode);
    scrollToResults?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (rawInput.trim()) {
        onSubmit(rawInput.trim(), mode);
        scrollToResults?.();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        {MODE_CONFIG.map(({ mode: m, emoji, label, desc }) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            disabled={loading}
            className={`
              relative flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border-2 p-3 sm:p-4 text-center transition-all duration-300 cursor-pointer
              ${
                mode === m
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-[var(--border-default)] bg-white hover:border-orange-200 hover:bg-orange-50/40'
              }
            `}
            style={mode === m ? { boxShadow: 'var(--shadow-brand)' } : undefined}
          >
            {mode === m && (
              <div className="absolute top-2 right-2">
                <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
            <span className="text-2xl sm:text-3xl" aria-hidden="true">{emoji}</span>
            <span className={`text-xs sm:text-sm font-semibold ${mode === m ? 'text-orange-700' : ''}`}
                  style={mode !== m ? { color: 'var(--text-primary)' } : undefined}>
              {label}
            </span>
            <span className={`text-[10px] sm:text-xs ${mode === m ? 'text-orange-500' : ''}`}
                  style={mode !== m ? { color: 'var(--text-tertiary)' } : undefined}>
              {desc}
            </span>
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div className="flex flex-col gap-2">
        {shareEnabled && onChangeSaveToWorkspace && (
          <button
            type="button"
            onClick={() => onChangeSaveToWorkspace(!saveToWorkspace)}
            className={`flex items-center justify-between rounded-[var(--radius-md)] border px-4 py-3 text-sm transition-colors ${
              saveToWorkspace
                ? 'border-orange-200 bg-orange-50 text-orange-700'
                : 'border-[var(--border-default)] bg-white text-stone-600'
            }`}
          >
            <div className="text-left">
              <p className="font-semibold">
                {saveToWorkspace ? '공유 일정으로 저장' : '개인 일정으로 저장'}
              </p>
              <p className="mt-0.5 text-xs opacity-80">
                {saveToWorkspace
                  ? `${workspaceName ?? '워크스페이스'}에 함께 보입니다.`
                  : '내 보관함에만 저장됩니다.'}
              </p>
            </div>
            <span className="text-xs font-semibold">
              {saveToWorkspace ? 'ON' : 'OFF'}
            </span>
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="어디서 무엇을 하고 싶은지 자유롭게 적어주세요..."
          rows={3}
          disabled={loading}
          className="w-full resize-none border px-4 py-3 text-sm outline-none transition-all duration-200 focus:bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            borderRadius: 'var(--radius-md)',
            borderColor: 'var(--border-default)',
            background: 'var(--surface-sunken)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Example pills */}
      <div className="flex gap-2 overflow-x-auto pill-scroll pb-1 -mb-1">
        {EXAMPLES.map(({ text, emoji }) => (
          <button
            key={text}
            type="button"
            onClick={() => {
              setRawInput(text);
              textareaRef.current?.focus();
            }}
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs sm:text-sm transition-all duration-200 cursor-pointer hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700"
            style={{
              background: 'var(--surface-sunken)',
              borderColor: 'var(--border-light)',
              color: 'var(--text-secondary)',
            }}
          >
            <span className="text-sm" aria-hidden="true">{emoji}</span>
            <span className="whitespace-nowrap">{text}</span>
          </button>
        ))}
      </div>

      {/* Submit */}
      <PrimaryButton
        type="submit"
        variant="brand"
        size="lg"
        className="w-full"
        disabled={!rawInput.trim() || loading}
        loading={loading}
      >
        {loading && <Spinner size="sm" />}
        {loading ? 'AI가 최적 일정을 짜는 중...' : '일정 만들기'}
      </PrimaryButton>
    </form>
  );
}
