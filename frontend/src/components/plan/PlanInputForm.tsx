'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { PlanMode } from '../../lib/types';

interface PlanInputFormProps {
  onSubmit: (rawInput: string, mode: PlanMode) => void;
  loading: boolean;
  scrollToResults?: () => void;  // 새로운 prop 추가
}

const MODE_CONFIG: { mode: PlanMode; emoji: string; label: string; desc: string }[] = [
  { mode: 'date', emoji: '💑', label: '데이트 코스', desc: '저녁 중심 · 3~4곳 · 짧은 동선' },
  { mode: 'trip', emoji: '🧳', label: '당일치기 여행', desc: '하루 일정 · 4~6곳 · 알찬 동선' },
];

const EXAMPLES = [
  { text: '강남에서 저녁에 파스타 먹고 영화 보고 싶어', emoji: '🍝' },
  { text: '홍대에서 친구들이랑 하루 일정 짜줘', emoji: '🎸' },
  { text: '이태원에서 데이트 코스 추천해줘', emoji: '💕' },
  { text: '성수동 카페 투어하고 맛있는 거 가고 싶어', emoji: '☕' },
  { text: '여의도 벚꽃 보고 맛있는 거 먹자', emoji: '🌸' },
];

export function PlanInputForm({ onSubmit, loading, scrollToResults }: PlanInputFormProps) {
  const [rawInput, setRawInput] = useState('');
  const [mode, setMode] = useState<PlanMode>('date');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) return;
    onSubmit(rawInput.trim(), mode);
    scrollToResults?.(); // 결과 위치로 스크롤
  };

  // Enter 키로 제출 (Shift+Enter는 줄바꿈)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (rawInput.trim()) {
        onSubmit(rawInput.trim(), mode);
        scrollToResults?.(); // 결과 위치로 스크롤
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
      {/* Mode toggle cards - 상단으로 이동 */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        {MODE_CONFIG.map(({ mode: m, emoji, label, desc }) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            disabled={loading}
            className={`
              relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 sm:p-4 text-center transition-all duration-300 cursor-pointer
              ${
                mode === m
                  ? 'border-orange-400 bg-orange-50 shadow-md shadow-orange-100'
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
              }
            `}
          >
            {mode === m && (
              <div className="absolute top-2 right-2">
                <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
            <span className="text-2xl sm:text-3xl">{emoji}</span>
            <span className={`text-xs sm:text-sm font-semibold ${mode === m ? 'text-orange-700' : 'text-stone-700'}`}>
              {label}
            </span>
            <span className={`text-[10px] sm:text-xs ${mode === m ? 'text-orange-500' : 'text-stone-400'}`}>
              {desc}
            </span>
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div className="flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="어디서 무엇을 하고 싶은지 자유롭게 적어주세요..."
          rows={3}
          className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm sm:text-base text-stone-800 placeholder-stone-400 outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100 transition-all duration-300"
          disabled={loading}
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
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full bg-stone-50 border border-stone-200 px-3 py-1.5 text-xs sm:text-sm text-stone-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all duration-200 cursor-pointer"
          >
            <span className="text-sm">{emoji}</span>
            <span className="whitespace-nowrap">{text}</span>
          </button>
        ))}
      </div>

      {/* Submit */}
      <Button 
        type="submit" 
        loading={loading} 
        disabled={!rawInput.trim()} 
        className="w-full py-3 sm:py-4 text-sm sm:text-base"
      >
        {loading ? 'AI가 최적 일정을 짜는 중...' : '일정 만들기'}
      </Button>
    </form>
  );
}
