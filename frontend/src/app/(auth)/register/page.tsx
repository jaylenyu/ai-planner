"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { LegalPolicyDialog } from "@/components/legal/LegalPolicyDialog";
import { Spinner } from "@/components/custom/Spinner";
import { OAuthButtonList } from "../../../components/auth/OAuthButtonList";
import { AppLogo } from "@/components/custom/AppLogo";
import { authApi } from "../../../lib/api";
import { useAuthStore } from "../../../stores/authStore";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

const SESSION_KEY = "register_state";
const CODE_TTL = 180;
const RESEND_COOLDOWN = 60;
const STEP2_LOADING_MS = 750;
const STEP2_SUCCESS_MS = 250;

// ── Zod 스키마 ─────────────────────────────────────────────────
const emailSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요."),
});

const codeSchema = z.object({
  code: z
    .string()
    .length(6, "인증코드는 6자리입니다.")
    .regex(/^\d{6}$/, "숫자 6자리를 입력해주세요."),
});

const nicknameSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, "닉네임은 2자 이상 입력해주세요.")
    .max(20, "닉네임은 20자 이하로 입력해주세요.")
    .regex(
      /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]([가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 _-]*[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9])?$/,
      "한글·영문·숫자·공백·밑줄·하이픈만 사용 가능하며, 첫/끝 글자는 한글·영문·숫자여야 합니다."
    )
    .regex(/[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]/, "한글 또는 영문이 하나 이상 포함되어야 합니다."),
});

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .max(32, "비밀번호는 32자 이하여야 합니다."),
    passwordConfirm: z.string(),
    agreedTerms: z
      .boolean()
      .refine((v) => v === true, { message: "이용약관에 동의해주세요." }),
    agreedPrivacy: z.boolean().refine((v) => v === true, {
      message: "개인정보 처리방침에 동의해주세요.",
    }),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

type EmailForm = z.infer<typeof emailSchema>;
type CodeForm = z.infer<typeof codeSchema>;
type NicknameForm = z.infer<typeof nicknameSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type RegisterStep = 1 | 2 | 3 | 4 | 5;

// ── 공통 입력 클래스 ───────────────────────────────────────────
const inputCls =
  "w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

// ── 단계 표시기 ────────────────────────────────────────────────
function StepIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              n <= step ? "bg-orange-500" : "bg-stone-200"
            }`}
          />
          {n < 4 && (
            <div
              className={`h-px w-6 ${n < step ? "bg-orange-300" : "bg-stone-200"}`}
            />
          )}
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="absolute right-0 top-full text-right text-xs font-medium text-red-500">
      {message}
    </p>
  );
}

function FieldHint({
  message,
  tone = "success",
}: {
  message?: string;
  tone?: "success" | "neutral";
}) {
  if (!message) return null;
  return (
    <p
      className={`absolute right-0 top-full text-right text-xs font-medium ${
        tone === "success" ? "text-emerald-600" : "text-stone-500"
      }`}
    >
      {message}
    </p>
  );
}

function SuccessScreen({
  email,
  nickname,
  registeredAt,
  redirectPath,
}: {
  email?: string | null;
  nickname: string;
  registeredAt: string;
  redirectPath: string;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <div className="flex h-18 w-18 items-center justify-center rounded-full bg-orange-50 ring-8 ring-orange-100/60">
        <CheckCircle2 className="h-9 w-9 text-orange-500" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-stone-900">
          회원가입이 완료되었습니다
        </h1>
        <p className="text-sm leading-6 text-stone-500">
          이제 일정 만들기를 바로 시작할 수 있어요.
        </p>
      </div>

      <div className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-5 py-4 text-left">
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              닉네임
            </p>
            <p className="mt-1 font-medium text-stone-900">{nickname}</p>
          </div>
          {email && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                가입 이메일
              </p>
              <p className="mt-1 font-medium text-stone-900">{email}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              가입 일시
            </p>
            <p className="mt-1 font-medium text-stone-900">{registeredAt}</p>
          </div>
        </div>
      </div>

      <Link
        href={redirectPath}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-orange-600 hover:to-pink-600 hover:shadow-lg active:opacity-95"
      >
        일정 만들기
      </Link>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────
function RegisterPageContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<RegisterStep>(1);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [registeredAt, setRegisteredAt] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaInstanceKey, setCaptchaInstanceKey] = useState(0);
  const [error, setError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailCheckMessage, setEmailCheckMessage] = useState("");
  const [emailChecked, setEmailChecked] = useState(false);
  const [checkedEmail, setCheckedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [codeSubmitState, setCodeSubmitState] = useState<
    "idle" | "loading" | "success"
  >("idle");
  const [openPolicy, setOpenPolicy] = useState<"terms" | "privacy" | null>(
    null,
  );
  const redirectPath = searchParams.get("redirect") || "/plan";

  // 타이머 상태
  const [timeLeft, setTimeLeft] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const confettiFiredRef = useRef(false);
  const canResend = resendCooldown === 0;
  const turnstileWidgetKey = `turnstile-${captchaInstanceKey}`;

  const startTimer = useCallback(
    (codeSeconds = CODE_TTL, resendSeconds = RESEND_COOLDOWN) => {
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
    },
    [],
  );

  // 새로고침 복원
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const { savedEmail, savedStep, requestedAt } = JSON.parse(saved);
        if (savedEmail && savedStep === 2) {
          const age = requestedAt
            ? Math.floor((Date.now() - requestedAt) / 1000)
            : 0;
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

  useEffect(() => {
    if (step !== 5 || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    void confetti({
      particleCount: 130,
      spread: 80,
      startVelocity: 34,
      origin: { y: 0.65 },
      colors: ["#f97316", "#fb7185", "#f59e0b", "#ffffff"],
    });
  }, [step]);

  const formatTime = (s: number) => {
    const clamped = Math.max(0, s);
    return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
  };

  // ── Step 1 폼 ──────────────────────────────────────────────
  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const emailField = emailForm.register("email");

  const onCheckEmail = async () => {
    const isValid = await emailForm.trigger("email");
    if (!isValid) {
      setEmailChecked(false);
      setCheckedEmail("");
      setEmailCheckMessage("");
      return;
    }

    const nextEmail = emailForm.getValues("email").trim().toLowerCase();
    setEmailCheckLoading(true);
    setError("");
    setEmailCheckMessage("");

    try {
      const result = await authApi.checkEmail(nextEmail);
      if (!result.available) {
        setEmailChecked(false);
        setCheckedEmail("");
        setEmailCheckMessage(result.message);
        return;
      }
      setEmailChecked(true);
      setCheckedEmail(nextEmail);
      setEmailCheckMessage(result.message);
    } catch (err) {
      setEmailChecked(false);
      setCheckedEmail("");
      setEmailCheckMessage(
        err instanceof Error ? err.message : "이메일 중복확인 실패",
      );
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const onStep1Submit = emailForm.handleSubmit(async (data) => {
    const normalizedEmail = data.email.trim().toLowerCase();
    if (!emailChecked || checkedEmail !== normalizedEmail) {
      setError("이메일 중복확인을 먼저 완료해주세요.");
      return;
    }
    if (!captchaToken) {
      setError("보안 인증을 완료해주세요.");
      return;
    }
    setFormLoading(true);
    setError("");
    try {
      await authApi.requestEmailCode(normalizedEmail, captchaToken);
      setEmail(normalizedEmail);
      const requestedAt = Date.now();
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          savedEmail: normalizedEmail,
          savedStep: 2,
          requestedAt,
        }),
      );
      setStep(2);
      startTimer();
      setCaptchaToken("");
      setCaptchaInstanceKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증코드 전송 실패");
    } finally {
      setFormLoading(false);
    }
  });

  // ── Step 2 폼 ──────────────────────────────────────────────
  const codeForm = useForm<CodeForm>({ resolver: zodResolver(codeSchema) });
  const autoSubmitRef = useRef(false);
  const lastAutoSubmittedCodeRef = useRef("");
  const codeValue = codeForm.watch("code");

  const onStep2Submit = codeForm.handleSubmit(async (data) => {
    setCodeSubmitState("loading");
    setError("");
    const loadingStartedAt = Date.now();
    try {
      await authApi.verifyEmailCode(email, data.code);
      const loadingElapsed = Date.now() - loadingStartedAt;
      if (loadingElapsed < STEP2_LOADING_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, STEP2_LOADING_MS - loadingElapsed),
        );
      }
      sessionStorage.removeItem(SESSION_KEY);
      setCodeSubmitState("success");
      await new Promise((resolve) => setTimeout(resolve, STEP2_SUCCESS_MS));
      setStep(3);
    } catch (err) {
      setCodeSubmitState("idle");
      setError(err instanceof Error ? err.message : "인증 실패");
    }
  });

  useEffect(() => {
    if (step !== 2) {
      autoSubmitRef.current = false;
      setCodeSubmitState("idle");
      return;
    }
    if (
      codeValue?.length === 6 &&
      codeSubmitState === "idle" &&
      !autoSubmitRef.current &&
      lastAutoSubmittedCodeRef.current !== codeValue
    ) {
      lastAutoSubmittedCodeRef.current = codeValue;
      autoSubmitRef.current = true;
      void onStep2Submit().finally(() => {
        autoSubmitRef.current = false;
      });
    } else if ((codeValue?.length ?? 0) < 6) {
      autoSubmitRef.current = false;
      lastAutoSubmittedCodeRef.current = "";
      if (codeSubmitState !== "loading" && codeSubmitState !== "success") {
        setCodeSubmitState("idle");
      }
    }
  }, [codeValue, codeSubmitState, onStep2Submit, step]);

  const onResend = async () => {
    if (!canResend || !email) return;
    if (!captchaToken) {
      setError("보안 인증을 다시 완료해주세요.");
      return;
    }
    setResendLoading(true);
    setError("");
    try {
      await authApi.requestEmailCode(email, captchaToken);
      const requestedAt = Date.now();
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ savedEmail: email, savedStep: 2, requestedAt }),
      );
      startTimer();
      codeForm.reset();
      lastAutoSubmittedCodeRef.current = "";
      setCodeSubmitState("idle");
      setCaptchaToken("");
      setCaptchaInstanceKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "재전송 실패");
    } finally {
      setResendLoading(false);
    }
  };

  // ── Step 3 폼 ──────────────────────────────────────────────
  const nicknameForm = useForm<NicknameForm>({
    resolver: zodResolver(nicknameSchema),
  });

  const onStep3Submit = nicknameForm.handleSubmit((data) => {
    setNickname(data.nickname.trim());
    setError("");
    setStep(4);
  });

  // ── Step 4 폼 ──────────────────────────────────────────────
  const pwForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onStep4Submit = pwForm.handleSubmit(async (data) => {
    setFormLoading(true);
    setError("");
    try {
      const res = await authApi.register(
        email,
        nickname,
        data.password,
        data.agreedTerms,
        data.agreedPrivacy,
      );
      useAuthStore.getState().setTokens(res.access_token, res.refresh_token);
      setRegisteredAt(
        new Date().toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입 실패");
    } finally {
      setFormLoading(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center hero-pattern">
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <AppLogo size="lg" className="justify-center" />
          <p className="mt-2 text-sm text-stone-500">
            나만의 일정을 만들어보세요
          </p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-stone-200/50 border border-stone-100">
          {step !== 5 && <StepIndicator step={step} />}

          {step === 5 && (
              <SuccessScreen
                email={email}
                nickname={nickname}
                registeredAt={registeredAt}
                redirectPath={redirectPath}
              />
          )}

          {/* ── STEP 1: 이메일 입력 ── */}
          {step === 1 && (
            <>
              <h1 className="mb-6 text-xl font-bold text-stone-900">
                이메일 인증
              </h1>
              <form onSubmit={onStep1Submit} className="flex flex-col gap-5">
                <div className="relative pb-1">
                  <label className="block pb-1 text-sm font-semibold text-stone-700">
                    이메일
                  </label>
                  <div className="flex items-start gap-2">
                    <input
                      type="email"
                      placeholder="example@email.com"
                      {...emailField}
                      onChange={(e) => {
                        emailField.onChange(e);
                        setEmailChecked(false);
                        setCheckedEmail("");
                        setEmailCheckMessage("");
                        setError("");
                      }}
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => void onCheckEmail()}
                      disabled={emailCheckLoading}
                      className={`inline-flex min-w-[96px] items-center justify-center rounded-2xl px-3 py-3 text-xs font-semibold transition-colors ${
                        emailChecked
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border border-stone-200 bg-white text-stone-700 hover:border-orange-200 hover:text-orange-600"
                      } ${emailCheckLoading ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                      {emailCheckLoading ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Spinner size="sm" />
                          확인중
                        </span>
                      ) : emailChecked ? (
                        "확인완료"
                      ) : (
                        "중복확인"
                      )}
                    </button>
                  </div>
                  <FieldError
                    message={emailForm.formState.errors.email?.message}
                  />
                  {!emailForm.formState.errors.email &&
                    !emailChecked &&
                    emailCheckMessage && (
                      <FieldError message={emailCheckMessage} />
                    )}
                  {!emailForm.formState.errors.email && emailChecked && (
                    <FieldHint message={emailCheckMessage} />
                  )}
                </div>

                <div className="h-[78px] w-full overflow-hidden">
                  <Turnstile
                    key={turnstileWidgetKey}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken("")}
                    onExpire={() => setCaptchaToken("")}
                    options={{
                      theme: "light",
                      refreshExpired: "auto",
                      size: "flexible",
                    }}
                  />
                </div>

                {error && <ErrorBox message={error} />}

                <button
                  type="submit"
                  disabled={formLoading || !emailChecked}
                  className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    formLoading || !emailChecked
                      ? "bg-gradient-to-br from-orange-400 to-pink-400 text-white opacity-70 cursor-not-allowed"
                      : "bg-gradient-to-br from-orange-500 to-pink-500 text-white hover:shadow-lg hover:from-orange-600 hover:to-pink-600 active:opacity-95"
                  }`}
                >
                  {formLoading ? (
                    <>
                      <Spinner size="sm" />
                      <span>전송 중...</span>
                    </>
                  ) : (
                    "인증코드 전송"
                  )}
                </button>
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
              <h1 className="mb-1 text-xl font-bold text-stone-900">
                인증코드 확인
              </h1>
              <p className="mb-5 text-sm text-stone-500">
                <span className="font-medium text-stone-700">{email}</span>로
                전송된 6자리 코드를 입력해주세요.
              </p>
              <form onSubmit={onStep2Submit} className="flex flex-col gap-5">
                <div className="relative pb-1">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      {...codeForm.register("code")}
                      className={`${inputCls} text-center text-2xl tracking-[0.5em] font-bold`}
                    />
                    {timeLeft > 0 && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-orange-500">
                        {formatTime(timeLeft)}
                      </span>
                    )}
                  </div>
                  <FieldError
                    message={codeForm.formState.errors.code?.message}
                  />
                  <FieldError
                    message={
                      timeLeft === 0
                        ? "인증코드가 만료되었습니다. 재전송 해주세요."
                        : undefined
                    }
                  />
                </div>

                <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
                  <p className="mb-2 font-semibold text-stone-700">보안 인증</p>
                  <p className="text-xs text-stone-500">
                    인증코드를 다시 받으려면 아래 Cloudflare Turnstile 인증을
                    다시 완료해주세요.
                  </p>
                  <div className="mt-3 h-[78px] w-full overflow-hidden">
                    <Turnstile
                      key={turnstileWidgetKey}
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setCaptchaToken(token)}
                      onError={() => setCaptchaToken("")}
                      onExpire={() => setCaptchaToken("")}
                      options={{
                        theme: "light",
                        refreshExpired: "auto",
                        size: "flexible",
                      }}
                    />
                  </div>
                </div>

                {error && <ErrorBox message={error} />}

                <button
                  type="submit"
                  disabled={timeLeft === 0 || codeSubmitState !== "idle"}
                  className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    timeLeft === 0 || codeSubmitState !== "idle"
                      ? "bg-gradient-to-br from-orange-400 to-pink-400 text-white opacity-70 cursor-not-allowed"
                      : "bg-gradient-to-br from-orange-500 to-pink-500 text-white hover:shadow-lg hover:from-orange-600 hover:to-pink-600 active:opacity-95"
                  }`}
                >
                  {codeSubmitState === "loading" ? (
                    <>
                      <Spinner size="sm" />
                      <span>확인 중...</span>
                    </>
                  ) : codeSubmitState === "success" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>인증 완료</span>
                    </>
                  ) : (
                    "인증 확인"
                  )}
                </button>

                <button
                  type="button"
                  onClick={onResend}
                  disabled={
                    !canResend || codeSubmitState !== "idle" || resendLoading
                  }
                  className="text-sm text-stone-500 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {canResend ? (
                    resendLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner size="sm" />
                        <span>재전송 중...</span>
                      </span>
                    ) : (
                      "인증코드 재전송"
                    )
                  ) : (
                    `재전송 가능까지 ${formatTime(resendCooldown)} 대기`
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 3: 닉네임 입력 ── */}
          {step === 3 && (
            <>
              <h1 className="mb-1 text-xl font-bold text-stone-900">
                닉네임 설정
              </h1>
              <p className="mb-5 text-sm text-stone-500">
                일정과 메모에서 이메일 대신 보여줄 이름입니다.
              </p>
              <form onSubmit={onStep3Submit} className="flex flex-col gap-5">
                <div className="relative pb-1">
                  <label className="block pb-1 text-sm font-semibold text-stone-700">
                    닉네임
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="예: 데이트러버"
                    {...nicknameForm.register("nickname")}
                    className={inputCls}
                  />
                  <FieldError
                    message={nicknameForm.formState.errors.nickname?.message}
                  />
                </div>

                {error && <ErrorBox message={error} />}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-orange-600 hover:to-pink-600 hover:shadow-lg active:opacity-95"
                >
                  다음
                </button>
              </form>
            </>
          )}

          {/* ── STEP 4: 비밀번호 + 약관 ── */}
          {step === 4 && (
            <>
              <h1 className="mb-1 text-xl font-bold text-stone-900">
                비밀번호 설정
              </h1>
              <p className="mb-5 text-sm text-stone-500">
                이메일 인증이 완료되었습니다.
              </p>
              <form onSubmit={onStep4Submit} className="flex flex-col gap-5">
                <div className="relative pb-1">
                  <label className="block pb-1 text-sm font-semibold text-stone-700">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    placeholder="8~32자"
                    {...pwForm.register("password")}
                    className={inputCls}
                  />
                  <FieldError
                    message={pwForm.formState.errors.password?.message}
                  />
                </div>

                <div className="relative pb-1">
                  <label className="block pb-1 text-sm font-semibold text-stone-700">
                    비밀번호 확인
                  </label>
                  <input
                    type="password"
                    placeholder="비밀번호 재입력"
                    {...pwForm.register("passwordConfirm")}
                    className={inputCls}
                  />
                  <FieldError
                    message={pwForm.formState.errors.passwordConfirm?.message}
                  />
                </div>

                <div className="flex flex-col gap-3 rounded-2xl bg-stone-50 p-4">
                  <label className="relative flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...pwForm.register("agreedTerms")}
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-orange-500"
                    />
                    <span className="text-xs text-stone-600">
                      <button
                        type="button"
                        onClick={() => setOpenPolicy("terms")}
                        className="cursor-pointer text-orange-600 underline underline-offset-2"
                      >
                        이용약관
                      </button>
                      에 동의합니다 <span className="text-red-400">(필수)</span>
                    </span>
                    <FieldError
                      message={pwForm.formState.errors.agreedTerms?.message}
                    />
                  </label>

                  <label className="relative flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...pwForm.register("agreedPrivacy")}
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-orange-500"
                    />
                    <span className="text-xs text-stone-600">
                      <button
                        type="button"
                        onClick={() => setOpenPolicy("privacy")}
                        className="cursor-pointer text-orange-600 underline underline-offset-2"
                      >
                        개인정보 처리방침
                      </button>
                      에 동의합니다 <span className="text-red-400">(필수)</span>
                    </span>
                    <FieldError
                      message={pwForm.formState.errors.agreedPrivacy?.message}
                    />
                  </label>
                </div>

                {error && <ErrorBox message={error} />}

                <button
                  type="submit"
                  disabled={formLoading}
                  className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    formLoading
                      ? "bg-gradient-to-br from-orange-400 to-pink-400 text-white opacity-70 cursor-not-allowed"
                      : "bg-gradient-to-br from-orange-500 to-pink-500 text-white hover:shadow-lg hover:from-orange-600 hover:to-pink-600 active:opacity-95"
                  }`}
                >
                  {formLoading ? (
                    <>
                      <Spinner size="sm" />
                      <span>가입 중...</span>
                    </>
                  ) : (
                    "회원가입"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {step !== 5 && (
          <p className="mt-6 text-center text-sm text-stone-500">
            이미 계정이 있으신가요?{" "}
            <Link
              href={`/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
              className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 transition-colors"
            >
              로그인
            </Link>
          </p>
        )}
      </div>
      <LegalPolicyDialog
        open={openPolicy !== null}
        type={openPolicy}
        onOpenChange={(open) => {
          if (!open) {
            setOpenPolicy(null);
          }
        }}
      />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
