'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { PlanMode } from '../../lib/types';

interface PlanInputFormProps {
  onSubmit: (rawInput: string, mode: PlanMode) => void;
  loading: boolean;
}

export function PlanInputForm({ onSubmit, loading }: PlanInputFormProps) {
  const [rawInput, setRawInput] = useState('');
  const [mode, setMode] = useState<PlanMode>('date');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) return;
    onSubmit(rawInput.trim(), mode);
  };

  const examples = [
    '강남에서 저녁에 파스타 먹고 영화 보고 싶어',
    '홍대에서 친구들이랑 하루 일정 짜줘',
    '이태원에서 데이트 코스 추천해줘',
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700">어떤 일정을 원하세요?</label>
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="예: 강남에서 저녁에 파스타 먹고 영화 보고 싶어"
          rows={3}
          className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          disabled={loading}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setRawInput(ex)}
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700">모드 선택</label>
        <div className="flex gap-3">
          {(['date', 'trip'] as PlanMode[]).map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="accent-indigo-600"
                disabled={loading}
              />
              <span className="text-sm text-zinc-700">
                {m === 'date' ? '💑 데이트 코스' : '🗺 당일치기 여행'}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-zinc-400">
          {mode === 'date'
            ? '저녁 중심 · 3~4개 장소 · 이동거리 최소화'
            : '하루 일정 · 4~6개 장소 · 효율적 동선'}
        </p>
      </div>

      <Button type="submit" loading={loading} disabled={!rawInput.trim()} className="self-end w-full sm:w-auto">
        {loading ? 'AI가 일정을 생성중...' : '일정 생성하기 →'}
      </Button>
    </form>
  );
}
