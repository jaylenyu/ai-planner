"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { AppLogo } from "@/components/custom/AppLogo";
import { Spinner } from "@/components/custom/Spinner";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

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

type NicknameForm = z.infer<typeof nicknameSchema>;

function decodeProviderEmail(token: string): string | null {
  try {
    const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const wrapper = JSON.parse(atob(padded)) as { payload?: string };
    if (!wrapper.payload) return null;
    const payload = JSON.parse(wrapper.payload) as {
      providerEmail?: string | null;
    };
    return payload.providerEmail ?? null;
  } catch {
    return null;
  }
}

function OAuthCompleteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const provider = searchParams.get("provider") ?? "oauth";
  const providerEmail = useMemo(() => decodeProviderEmail(token), [token]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [nickname, setNickname] = useState("");

  const form = useForm<NicknameForm>({
    resolver: zodResolver(nicknameSchema),
  });

  const onSubmit = form.handleSubmit(async (data) => {
    if (!token) {
      setError("OAuth 가입 세션이 만료되었습니다. 다시 시도해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const trimmedNickname = data.nickname.trim();
      const res = await authApi.completeOAuthSignup(token, trimmedNickname);
      useAuthStore.getState().setTokens(res.access_token, res.refresh_token);
      setNickname(trimmedNickname);
      setCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입 실패");
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center hero-pattern">
      <div className="w-full max-w-md mx-4">
        <div className="mb-8 text-center">
          <AppLogo size="lg" className="justify-center" />
          <p className="mt-2 text-sm text-stone-500">소셜 가입을 완료해주세요</p>
        </div>

        <div className="rounded-3xl border border-stone-100 bg-white p-8 shadow-xl shadow-stone-200/50">
          {completed ? (
            <div className="flex flex-col items-center gap-6 py-4 text-center">
              <div className="flex h-18 w-18 items-center justify-center rounded-full bg-orange-50 ring-8 ring-orange-100/60">
                <CheckCircle2 className="h-9 w-9 text-orange-500" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-stone-900">
                  회원가입이 완료되었습니다
                </h1>
                <p className="text-sm leading-6 text-stone-500">
                  {nickname}님, 이제 일정 만들기를 바로 시작할 수 있어요.
                </p>
              </div>
              <Link
                href="/plan"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-orange-600 hover:to-pink-600 hover:shadow-lg active:opacity-95"
              >
                일정 만들기
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-xl font-bold text-stone-900">
                닉네임 설정
              </h1>
              <p className="mb-5 text-sm text-stone-500">
                {provider} 계정으로 가입을 완료합니다.
              </p>

              {providerEmail && (
                <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                  <p className="text-xs font-semibold text-stone-400">
                    연동된 이메일
                  </p>
                  <p className="mt-1 break-all font-medium text-stone-800">
                    {providerEmail}
                  </p>
                </div>
              )}

              <form onSubmit={onSubmit} className="flex flex-col gap-5">
                <div className="relative pb-1">
                  <label className="block pb-1 text-sm font-semibold text-stone-700">
                    닉네임
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="예: 데이트러버"
                    {...form.register("nickname")}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 outline-none transition-colors placeholder-stone-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  {form.formState.errors.nickname?.message && (
                    <p className="absolute right-0 top-full text-right text-xs font-medium text-red-500">
                      {form.formState.errors.nickname.message}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-orange-600 hover:to-pink-600 hover:shadow-lg active:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading && <Spinner size="sm" />}
                  가입 완료
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OAuthCompletePage() {
  return (
    <Suspense fallback={null}>
      <OAuthCompleteContent />
    </Suspense>
  );
}
