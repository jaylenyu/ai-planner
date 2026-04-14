'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Turnstile } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { OAuthButtonList } from '../../../components/auth/OAuthButtonList';
import { authApi } from '../../../lib/api';
import { setToken, setRefreshToken } from '../../../lib/auth';

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA';

const SESSION_KEY = 'register_state';
const CODE_TTL = 180;
const RESEND_COOLDOWN = 60;

// ── Zod 스키마 ─────────────────────────────────────────────────
const emailSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요.'),
});

const codeSchema = z.object({
  code: z
    .string()
    .length(6, '인증코드는 6자리입니다.')
    .regex(/^\d{6}$/, '숫자 6자리를 입력해주세요.'),
});

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .max(32, '비밀번호는 32자 이하여야 합니다.'),
    passwordConfirm: z.string(),
    agreedTerms: z
      .boolean()
      .refine((v) => v === true, { message: '이용약관에 동의해주세요.' }),
    agreedPrivacy: z
      .boolean()
      .refine((v) => v === true, { message: '개인정보 처리방침에 동의해주세요.' }),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });

type EmailForm = z.infer<typeof emailSchema>;
type CodeForm = z.infer<typeof codeSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// ── 공통 입력 클래스 ───────────────────────────────────────────
const inputCls =
  'w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

// ── 단계 표시기 ────────────────────────────────────────────────
function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              n <= step ? 'bg-orange-500' : 'bg-stone-200'
            }`}
          />
          {n < 3 && <div className={`h-px w-6 ${n < step ? 'bg-orange-300' : 'bg-stone-200'}`} />}
        </div>
      ))}
    </div>
  );
}

// ── 에러 박스 ──────────────────────────────────────────────────
function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
      {message}
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaInstanceKey, setCaptchaInstanceKey] = useState(0);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // 타이머 상태
  const [timeLeft, setTimeLeft] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canResend = resendCooldown === 0;
  const turnstileWidgetKey = `turnstile-${captchaInstanceKey}`;

  const startTimer = useCallback((codeSeconds = CODE_TTL, resendSeconds = RESEND_COOLDOWN) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(codeSeconds);
    setResendCooldown(resendSeconds);

    if (codeSeconds <= 0 && resendSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
      setResendCooldown((cooldown) => (cooldown <= 1 ? 0 : cooldown - 1));
    }, 1000);
  }, []);

  // 새로고침 복원
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const { savedEmail, savedStep, requestedAt } = JSON.parse(saved);
        if (savedEmail && savedStep === 2) {
          const age = requestedAt ? Math.floor((Date.now() - requestedAt) / 1000) : 0;
          const remainingCode = Math.max(CODE_TTL - age, 0);
          const remainingResend = Math.max(RESEND_COOLDOWN - age, 0);
          if (remainingCode > 0) {
            setEmail(savedEmail);
            setStep(2);
            startTimer(remainingCode, remainingResend);
            return;
          }
        }
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // 무시
    }
  }, [startTimer]);

  useEffect(() => {
    if (timeLeft === 0 && resendCooldown === 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [timeLeft, resendCooldown]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const formatTime = (s: number) => {
    const clamped = Math.max(0, s);
    return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
  };

  // ── Step 1 폼 ──────────────────────────────────────────────
  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });

  const onStep1Submit = emailForm.handleSubmit(async (data) => {
    if (!captchaToken) {
      setError('보안 인증을 완료해주세요.');
      return;
    }
    setFormLoading(true);
    setError('');
    try {
      await authApi.requestEmailCode(data.email, captchaToken);
      setEmail(data.email);
      const requestedAt = Date.now();
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ savedEmail: data.email, savedStep: 2, requestedAt }),
      );
      setStep(2);
      startTimer();
      setCaptchaToken('');
      setCaptchaInstanceKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '인증코드 전송 실패');
    } finally {
      setFormLoading(false);
    }
  });

  // ── Step 2 폼 ──────────────────────────────────────────────
  const codeForm = useForm<CodeForm>({ resolver: zodResolver(codeSchema) });
  const autoSubmitRef = useRef(false);
  const codeValue = codeForm.watch('code');

  const onStep2Submit = codeForm.handleSubmit(async (data) => {
    setFormLoading(true);
    setError('');
    try {
      await authApi.verifyEmailCode(email, data.code);
      sessionStorage.removeItem(SESSION_KEY);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : '인증 실패');
    } finally {
      setFormLoading(false);
    }
  });

  useEffect(() => {
    if (step !== 2) {
      autoSubmitRef.current = false;
      return;
    }
    if (codeValue?.length === 6 && !formLoading && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      void onStep2Submit().finally(() => {
        autoSubmitRef.current = false;
      });
    } else if ((codeValue?.length ?? 0) < 6) {
      autoSubmitRef.current = false;
    }
  }, [codeValue, formLoading, onStep2Submit, step]);

  const onResend = async () => {
    if (!canResend || !email) return;
    if (!captchaToken) {
      setError('보안 인증을 다시 완료해주세요.');
      return;
    }
    setResendLoading(true);
    setError('');
    try {
      await authApi.requestEmailCode(email, captchaToken);
      const requestedAt = Date.now();
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ savedEmail: email, savedStep: 2, requestedAt }),
      );
      startTimer();
      codeForm.reset();
      setCaptchaToken('');
      setCaptchaInstanceKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '재전송 실패');
    } finally {
      setResendLoading(false);
    }
  };

  // ── Step 3 폼 ──────────────────────────────────────────────
  const pwForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onStep3Submit = pwForm.handleSubmit(async (data) => {
    setFormLoading(true);
    setError('');
    try {
      const res = await authApi.register(email, data.password, data.agreedTerms, data.agreedPrivacy);
      setToken(res.access_token);
      setRefreshToken(res.refresh_token);
      window.location.href = '/plan';
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 실패');
    } finally {
      setFormLoading(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center hero-pattern">
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 shadow-lg shadow-orange-500/20">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight">DatePlanner</span>
          </Link>
          <p className="mt-2 text-sm text-stone-500">가입하고 나만의 일정을 만들어보세요</p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-stone-200/50 border border-stone-100">
          <StepIndicator step={step} />

          {/* ── STEP 1: 이메일 입력 ── */}
          {step === 1 && (
            <>
              <h1 className="mb-6 text-xl font-bold text-stone-900">이메일 인증</h1>
              <form onSubmit={onStep1Submit} className="flex flex-col gap-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-stone-700">이메일</label>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    {...emailForm.register('email')}
                    className={inputCls}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="mt-1.5 text-xs text-red-500">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Turnstile
                    key={turnstileWidgetKey}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken('')}
                    onExpire={() => setCaptchaToken('')}
                    options={{ theme: 'light', refreshExpired: 'auto' }}
                  />
                </div>

                {error && <ErrorBox message={error} />}

                <Button type="submit" disabled={formLoading} className="w-full gap-2 py-3.5">
                  {formLoading ? (
                    <>
                      <Spinner size="sm" />
                      <span>전송 중...</span>
                    </>
                  ) : (
                    '인증코드 전송'
                  )}
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-stone-100" />
                <span className="text-xs text-stone-400">또는</span>
                <div className="h-px flex-1 bg-stone-100" />
              </div>
              <Suspense fallback={null}>
                <OAuthButtonList actionLabel="가입하기" />
              </Suspense>
            </>
          )}

          {/* ── STEP 2: 인증코드 입력 ── */}
          {step === 2 && (
            <>
              <h1 className="mb-1 text-xl font-bold text-stone-900">인증코드 확인</h1>
              <p className="mb-5 text-sm text-stone-500">
                <span className="font-medium text-stone-700">{email}</span>로 전송된 6자리 코드를 입력해주세요.
              </p>
              <form onSubmit={onStep2Submit} className="flex flex-col gap-5">
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      {...codeForm.register('code')}
                      className={`${inputCls} text-center text-2xl tracking-[0.5em] font-bold`}
                    />
                    {timeLeft > 0 && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-orange-500">
                        {formatTime(timeLeft)}
                      </span>
                    )}
                  </div>
                  {codeForm.formState.errors.code && (
                    <p className="mt-1.5 text-xs text-red-500">{codeForm.formState.errors.code.message}</p>
                  )}
                  {timeLeft === 0 && (
                    <p className="mt-1.5 text-xs text-red-500">인증코드가 만료되었습니다. 재전송 해주세요.</p>
                  )}
                </div>

                <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
                  <p className="mb-2 font-semibold text-stone-700">보안 인증</p>
                  <p className="text-xs text-stone-500">
                    인증코드를 다시 받으려면 아래 Cloudflare Turnstile 인증을 다시 완료해주세요.
                  </p>
                  <div className="mt-3">
                    <Turnstile
                      key={turnstileWidgetKey}
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setCaptchaToken(token)}
                      onError={() => setCaptchaToken('')}
                      onExpire={() => setCaptchaToken('')}
                      options={{ theme: 'light', refreshExpired: 'auto' }}
                    />
                  </div>
                </div>

                {error && <ErrorBox message={error} />}

                <Button
                  type="submit"
                  disabled={timeLeft === 0 || formLoading}
                  className="w-full gap-2 py-3.5"
                >
                  {formLoading ? (
                    <>
                      <Spinner size="sm" />
                      <span>확인 중...</span>
                    </>
                  ) : (
                    '인증 확인'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={onResend}
                  disabled={!canResend || formLoading || resendLoading}
                  className="text-sm text-stone-500 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {canResend
                    ? resendLoading
                      ? '재전송 중...'
                      : '인증코드 재전송'
                    : `재전송 가능까지 ${formatTime(resendCooldown)} 대기`}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 3: 비밀번호 + 약관 ── */}
          {step === 3 && (
            <>
              <h1 className="mb-1 text-xl font-bold text-stone-900">비밀번호 설정</h1>
              <p className="mb-5 text-sm text-stone-500">
                이메일 인증이 완료되었습니다.
              </p>
              <form onSubmit={onStep3Submit} className="flex flex-col gap-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-stone-700">비밀번호</label>
                  <input
                    type="password"
                    placeholder="8~32자"
                    {...pwForm.register('password')}
                    className={inputCls}
                  />
                  {pwForm.formState.errors.password && (
                    <p className="mt-1.5 text-xs text-red-500">{pwForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-stone-700">비밀번호 확인</label>
                  <input
                    type="password"
                    placeholder="비밀번호 재입력"
                    {...pwForm.register('passwordConfirm')}
                    className={inputCls}
                  />
                  {pwForm.formState.errors.passwordConfirm && (
                    <p className="mt-1.5 text-xs text-red-500">{pwForm.formState.errors.passwordConfirm.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-3 rounded-2xl bg-stone-50 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...pwForm.register('agreedTerms')}
                      className="mt-0.5 h-4 w-4 rounded accent-orange-500"
                    />
                    <span className="text-sm text-stone-600">
                      <Link href="/terms" target="_blank" className="text-orange-600 underline underline-offset-2">
                        이용약관
                      </Link>
                      에 동의합니다 <span className="text-red-400">(필수)</span>
                    </span>
                  </label>
                  {pwForm.formState.errors.agreedTerms && (
                    <p className="text-xs text-red-500">{pwForm.formState.errors.agreedTerms.message}</p>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...pwForm.register('agreedPrivacy')}
                      className="mt-0.5 h-4 w-4 rounded accent-orange-500"
                    />
                    <span className="text-sm text-stone-600">
                      <Link href="/privacy" target="_blank" className="text-orange-600 underline underline-offset-2">
                        개인정보 처리방침
                      </Link>
                      에 동의합니다 <span className="text-red-400">(필수)</span>
                    </span>
                  </label>
                  {pwForm.formState.errors.agreedPrivacy && (
                    <p className="text-xs text-red-500">{pwForm.formState.errors.agreedPrivacy.message}</p>
                  )}
                </div>

                {error && <ErrorBox message={error} />}

                <Button type="submit" disabled={formLoading} className="w-full gap-2 py-3.5">
                  {formLoading ? (
                    <>
                      <Spinner size="sm" />
                      <span>가입 중...</span>
                    </>
                  ) : (
                    '회원가입'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 transition-colors">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
