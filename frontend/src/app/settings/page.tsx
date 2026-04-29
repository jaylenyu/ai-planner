'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Turnstile } from '@marsidev/react-turnstile';
import { AppCard } from '@/components/ui/app-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useMe, useInvalidateMe } from '@/hooks/useMe';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/lib/api';
import {
  changePassword,
  requestPasswordSetup,
  verifyPasswordSetup,
  requestOAuthLinkToken,
  unlinkOAuth,
  updateSettings,
  updateEmail,
  updateNickname,
  logoutAll,
  deleteMe,
  ApiError,
  authApi,
} from '@/lib/api';

type Provider = 'google' | 'kakao' | 'naver';

const providerNames: Record<Provider, string> = {
  google: 'Google',
  kakao: '카카오',
  naver: '네이버',
};

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA';

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-medium shadow-lg sm:bottom-8 ${
        type === 'success' ? 'bg-stone-900 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {message}
    </div>
  );
}

function SkeletonSection() {
  return (
    <AppCard padding="md" className="space-y-4 animate-pulse">
      <div className="h-4 w-1/4 rounded-full bg-stone-200" />
      <div className="h-3 w-2/3 rounded-full bg-stone-100" />
      <div className="h-3 w-1/2 rounded-full bg-stone-100" />
    </AppCard>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: me, isLoading: meLoading } = useMe();
  const invalidateMe = useInvalidateMe();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  // Nickname edit state
  const [nicknameEdit, setNicknameEdit] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  // Password change state
  const [pwStep, setPwStep] = useState<'idle' | 'code-sent' | 'code-verified'>('idle');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwCode, setPwCode] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Email setup state
  const [emailStep, setEmailStep] = useState<'idle' | 'code-sent'>('idle');
  const [emailInput, setEmailInput] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCaptchaToken, setEmailCaptchaToken] = useState('');
  const [emailCaptchaKey, setEmailCaptchaKey] = useState(0);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Unlink/delete confirm dialogs
  const [unlinkTarget, setUnlinkTarget] = useState<Provider | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteStep, setDeleteStep] = useState<'idle' | 'code-sent' | 'code-verified'>('idle');
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteVerifyToken, setDeleteVerifyToken] = useState('');

  // Handle ?linked=provider or ?linkError=code query params
  useEffect(() => {
    const linked = searchParams.get('linked');
    const linkError = searchParams.get('linkError');
    if (linked) {
      const name = providerNames[linked as Provider] ?? linked;
      showToast(`${name} 계정이 연결되었습니다.`);
      router.replace('/settings', { scroll: false });
    } else if (linkError) {
      const msgs: Record<string, string> = {
        already_linked: '이미 다른 계정에 연결된 소셜 계정입니다.',
        token_expired: '연결 요청이 만료되었습니다. 다시 시도해주세요.',
        provider_mismatch: '요청한 소셜 계정과 일치하지 않습니다.',
      };
      showToast(msgs[linkError] ?? '소셜 연결 중 오류가 발생했습니다.', 'error');
      router.replace('/settings', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const NICKNAME_ALLOWED =
    /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]([가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 _-]*[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9])?$/;
  const NICKNAME_HAS_LETTER = /[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]/;

  const handleNicknameChange = async () => {
    const trimmed = nicknameInput.replace(/\s+/g, ' ').trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setNicknameError('닉네임은 2자 이상 20자 이하로 입력해주세요.');
      return;
    }
    if (!NICKNAME_ALLOWED.test(trimmed)) {
      setNicknameError('한글·영문·숫자·공백·밑줄·하이픈만 사용 가능하며, 첫/끝 글자는 한글·영문·숫자여야 합니다.');
      return;
    }
    if (!NICKNAME_HAS_LETTER.test(trimmed)) {
      setNicknameError('한글 또는 영문이 하나 이상 포함되어야 합니다.');
      return;
    }
    setNicknameLoading(true);
    setNicknameError(null);
    try {
      const result = await updateNickname(trimmed);
      useAuthStore.getState().setTokens(result.access_token, result.refresh_token);
      void invalidateMe();
      setNicknameEdit(false);
      setNicknameInput('');
      showToast('닉네임이 변경되었습니다.');
    } catch (err) {
      setNicknameError(err instanceof ApiError ? err.message : '닉네임 변경에 실패했습니다.');
    } finally {
      setNicknameLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPw !== confirmPw) {
      setPwError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPw.length < 8) {
      setPwError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setPwLoading(true);
    setPwError(null);
    try {
      const payload = me?.hasPassword
        ? { currentPassword: currentPw, newPassword: newPw }
        : { verifyToken, newPassword: newPw };
      const result = await changePassword(payload);
      useAuthStore.getState().setTokens(result.access_token, result.refresh_token);
      showToast('비밀번호가 변경되었습니다.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwStep('idle');
      setVerifyToken('');
      void invalidateMe();
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleRequestSetupCode = async () => {
    setPwLoading(true);
    setPwError(null);
    try {
      await requestPasswordSetup();
      setPwStep('code-sent');
      showToast('이메일로 인증 코드를 전송했습니다.');
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : '코드 전송에 실패했습니다.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleVerifySetupCode = async () => {
    if (!pwCode.trim()) return;
    setPwLoading(true);
    setPwError(null);
    try {
      const result = await verifyPasswordSetup(pwCode);
      setVerifyToken(result.verifyToken);
      setPwStep('code-verified');
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : '코드 인증에 실패했습니다.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleRequestEmailCode = async () => {
    const nextEmail = emailInput.trim().toLowerCase();
    if (!nextEmail) {
      setEmailError('이메일을 입력해주세요.');
      return;
    }
    if (!emailCaptchaToken) {
      setEmailError('보안 인증을 완료해주세요.');
      return;
    }
    setEmailLoading(true);
    setEmailError(null);
    try {
      await authApi.requestEmailCode(nextEmail, emailCaptchaToken);
      setEmailStep('code-sent');
      setEmailInput(nextEmail);
      setEmailCaptchaToken('');
      setEmailCaptchaKey((key) => key + 1);
      showToast('인증 코드를 전송했습니다.');
    } catch (err) {
      setEmailError(err instanceof ApiError ? err.message : '코드 전송에 실패했습니다.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyAndSaveEmail = async () => {
    const nextEmail = emailInput.trim().toLowerCase();
    if (!nextEmail || emailCode.length !== 6) return;
    setEmailLoading(true);
    setEmailError(null);
    try {
      await authApi.verifyEmailCode(nextEmail, emailCode);
      const tokens = await updateEmail(nextEmail);
      useAuthStore.getState().setTokens(tokens.access_token, tokens.refresh_token);
      setEmailStep('idle');
      setEmailInput('');
      setEmailCode('');
      void invalidateMe();
      showToast('이메일이 등록되었습니다.');
    } catch (err) {
      setEmailError(err instanceof ApiError ? err.message : '이메일 등록에 실패했습니다.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleLinkOAuth = async (provider: Provider) => {
    try {
      await requestOAuthLinkToken(provider);
      window.location.href = `${API_BASE_URL}/auth/${provider}`;
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '소셜 연결 시작에 실패했습니다.', 'error');
    }
  };

  const handleUnlinkOAuth = async () => {
    if (!unlinkTarget) return;
    setUnlinkLoading(true);
    try {
      await unlinkOAuth(unlinkTarget);
      void invalidateMe();
      showToast(`${providerNames[unlinkTarget]} 연결이 해제되었습니다.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '연결 해제에 실패했습니다.', 'error');
    } finally {
      setUnlinkLoading(false);
      setUnlinkTarget(null);
    }
  };

  const handleToggleSetting = async (
    key: 'inAppNotificationsEnabled' | 'emailNotificationsEnabled',
    value: boolean,
  ) => {
    try {
      await updateSettings({ [key]: value });
      void invalidateMe();
    } catch {
      showToast('설정 저장에 실패했습니다.', 'error');
    }
  };

  const handleLogoutAll = async () => {
    setLogoutAllLoading(true);
    try {
      await logoutAll();
      useAuthStore.getState().clearTokens();
      router.replace('/login');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '로그아웃에 실패했습니다.', 'error');
    } finally {
      setLogoutAllLoading(false);
      setLogoutAllOpen(false);
    }
  };

  const handleDeleteMe = async () => {
    setDeleteLoading(true);
    try {
      const payload = me?.hasPassword
        ? { password: deletePw }
        : { verifyToken: deleteVerifyToken };
      await deleteMe(payload);
      useAuthStore.getState().clearTokens();
      router.replace('/login?deleted=1');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '탈퇴 처리에 실패했습니다.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRequestDeleteCode = async () => {
    setDeleteLoading(true);
    try {
      await requestPasswordSetup();
      setDeleteStep('code-sent');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '코드 전송에 실패했습니다.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleVerifyDeleteCode = async () => {
    if (!deleteCode.trim()) return;
    setDeleteLoading(true);
    try {
      const result = await verifyPasswordSetup(deleteCode);
      setDeleteVerifyToken(result.verifyToken);
      setDeleteStep('code-verified');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '코드 인증에 실패했습니다.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const providers: Provider[] = ['google', 'kakao', 'naver'];

  return (
    <div className="bg-[var(--background)]">
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-6 text-2xl font-bold text-stone-900">설정</h1>

        <div className="space-y-4">
          {/* 계정 */}
          {meLoading ? (
            <SkeletonSection />
          ) : (
            <AppCard padding="md" className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">계정</p>
              <div>
                <p className="text-sm text-stone-500">닉네임</p>
                {nicknameEdit ? (
                  <div className="mt-1 space-y-2">
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => { setNicknameInput(e.target.value); setNicknameError(null); }}
                      maxLength={20}
                      placeholder="새 닉네임 입력"
                      className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
                    />
                    {nicknameError && <p className="text-xs text-red-500">{nicknameError}</p>}
                    <div className="flex gap-2">
                      <PrimaryButton
                        type="button"
                        variant="brand"
                        size="sm"
                        loading={nicknameLoading}
                        disabled={!nicknameInput.trim()}
                        onClick={() => void handleNicknameChange()}
                      >
                        저장
                      </PrimaryButton>
                      <PrimaryButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setNicknameEdit(false); setNicknameInput(''); setNicknameError(null); }}
                      >
                        취소
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="font-semibold text-stone-900 break-all">{me?.nickname ?? '-'}</p>
                    <button
                      type="button"
                      onClick={() => { setNicknameEdit(true); setNicknameInput(me?.nickname ?? ''); }}
                      className="text-xs text-stone-400 hover:text-stone-600 underline"
                    >
                      변경
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-stone-500">이메일</p>
                <p className="mt-0.5 font-semibold text-stone-900 break-all">
                  {me?.email ?? '등록된 이메일이 없습니다.'}
                </p>
              </div>
              {!me?.email && (
                <div className="space-y-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">이메일 등록</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      안내 메일과 비밀번호 설정을 사용하려면 이메일 인증이 필요합니다.
                    </p>
                  </div>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="example@email.com"
                    disabled={emailStep === 'code-sent'}
                    className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300 disabled:bg-stone-100"
                  />
                  {emailStep === 'idle' ? (
                    <>
                      <div className="min-h-[78px] overflow-hidden">
                        <Turnstile
                          key={`email-turnstile-${emailCaptchaKey}`}
                          siteKey={TURNSTILE_SITE_KEY}
                          onSuccess={(token) => setEmailCaptchaToken(token)}
                          onError={() => setEmailCaptchaToken('')}
                          onExpire={() => setEmailCaptchaToken('')}
                          options={{
                            theme: 'light',
                            refreshExpired: 'auto',
                            size: 'flexible',
                          }}
                        />
                      </div>
                      <PrimaryButton
                        type="button"
                        variant="brand"
                        size="sm"
                        loading={emailLoading}
                        disabled={!emailInput.trim()}
                        onClick={() => void handleRequestEmailCode()}
                      >
                        인증코드 전송
                      </PrimaryButton>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={emailCode}
                        onChange={(e) =>
                          setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="6자리 코드"
                        className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
                      />
                      <PrimaryButton
                        type="button"
                        variant="brand"
                        size="sm"
                        loading={emailLoading}
                        disabled={emailCode.length !== 6}
                        onClick={() => void handleVerifyAndSaveEmail()}
                      >
                        이메일 등록
                      </PrimaryButton>
                    </div>
                  )}
                  {emailError && <p className="text-sm text-red-600">{emailError}</p>}
                </div>
              )}
            </AppCard>
          )}

          {/* 비밀번호 */}
          {meLoading ? (
            <SkeletonSection />
          ) : (
            <AppCard padding="md" className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">비밀번호</p>

              {me?.hasPassword ? (
                /* 비밀번호 보유 유저: 변경 폼 */
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700">현재 비밀번호</label>
                    <input
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="현재 비밀번호"
                      className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700">새 비밀번호</label>
                    <input
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="새 비밀번호 (8자 이상)"
                      className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700">새 비밀번호 확인</label>
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="새 비밀번호 재입력"
                      className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
                    />
                  </div>
                  {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                  <PrimaryButton
                    type="button"
                    variant="brand"
                    size="sm"
                    loading={pwLoading}
                    disabled={!currentPw || !newPw || !confirmPw}
                    onClick={() => void handlePasswordChange()}
                  >
                    비밀번호 변경
                  </PrimaryButton>
                </div>
              ) : (
                /* OAuth-only 유저: 2단계 이메일 인증 */
                <div className="space-y-3">
                  {pwStep === 'idle' && (
                    <>
                      <p className="text-sm text-stone-600">
                        소셜 로그인 계정입니다. 비밀번호를 설정하려면 이메일 인증이 필요합니다.
                      </p>
                      {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                      <PrimaryButton
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={pwLoading}
                        onClick={() => void handleRequestSetupCode()}
                      >
                        이메일 인증 코드 전송
                      </PrimaryButton>
                    </>
                  )}
                  {pwStep === 'code-sent' && (
                    <>
                      <p className="text-sm text-stone-600">이메일로 전송된 6자리 코드를 입력하세요.</p>
                      <input
                        type="text"
                        value={pwCode}
                        onChange={(e) => setPwCode(e.target.value)}
                        placeholder="인증 코드 6자리"
                        maxLength={6}
                        className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
                      />
                      {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                      <PrimaryButton
                        type="button"
                        variant="brand"
                        size="sm"
                        loading={pwLoading}
                        disabled={pwCode.length < 6}
                        onClick={() => void handleVerifySetupCode()}
                      >
                        확인
                      </PrimaryButton>
                    </>
                  )}
                  {pwStep === 'code-verified' && (
                    <>
                      <p className="text-sm text-stone-600">인증이 완료되었습니다. 사용할 비밀번호를 입력하세요.</p>
                      <div>
                        <label className="block text-sm font-medium text-stone-700">새 비밀번호</label>
                        <input
                          type="password"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          placeholder="새 비밀번호 (8자 이상)"
                          className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700">새 비밀번호 확인</label>
                        <input
                          type="password"
                          value={confirmPw}
                          onChange={(e) => setConfirmPw(e.target.value)}
                          placeholder="새 비밀번호 재입력"
                          className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
                        />
                      </div>
                      {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                      <PrimaryButton
                        type="button"
                        variant="brand"
                        size="sm"
                        loading={pwLoading}
                        disabled={!newPw || !confirmPw}
                        onClick={() => void handlePasswordChange()}
                      >
                        비밀번호 설정
                      </PrimaryButton>
                    </>
                  )}
                </div>
              )}
            </AppCard>
          )}

          {/* 소셜 연동 */}
          {meLoading ? (
            <SkeletonSection />
          ) : (
            <AppCard padding="md" className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">소셜 연동</p>
              <div className="space-y-3">
                {providers.map((provider) => {
                  const connected = me?.providers[provider] ?? false;
                  return (
                    <div key={provider} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-800">{providerNames[provider]}</span>
                        {connected && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            연결됨
                          </span>
                        )}
                      </div>
                      {connected ? (
                        <PrimaryButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setUnlinkTarget(provider)}
                        >
                          해제
                        </PrimaryButton>
                      ) : (
                        <PrimaryButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleLinkOAuth(provider)}
                        >
                          연결
                        </PrimaryButton>
                      )}
                    </div>
                  );
                })}
              </div>
            </AppCard>
          )}

          {/* 알림 설정 */}
          {meLoading ? (
            <SkeletonSection />
          ) : (
            <AppCard padding="md" className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">알림 설정</p>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-stone-800">인앱 알림</p>
                    <p className="text-xs text-stone-500">앱 내 알림을 받습니다.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={me?.inAppNotificationsEnabled ?? true}
                    onClick={() =>
                      void handleToggleSetting(
                        'inAppNotificationsEnabled',
                        !(me?.inAppNotificationsEnabled ?? true),
                      )
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      (me?.inAppNotificationsEnabled ?? true) ? 'bg-orange-500' : 'bg-stone-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        (me?.inAppNotificationsEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-stone-800">이메일 알림</p>
                    <p className="text-xs text-stone-500">이메일로 알림을 받습니다.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={me?.emailNotificationsEnabled ?? true}
                    onClick={() =>
                      void handleToggleSetting(
                        'emailNotificationsEnabled',
                        !(me?.emailNotificationsEnabled ?? true),
                      )
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      (me?.emailNotificationsEnabled ?? true) ? 'bg-orange-500' : 'bg-stone-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        (me?.emailNotificationsEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>
            </AppCard>
          )}

          {/* 위험 영역 */}
          <AppCard padding="md" className="space-y-4 border border-red-200 bg-red-50/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500">위험 영역</p>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">모든 기기 로그아웃</p>
                  <p className="text-xs text-stone-500 mt-0.5">현재 기기를 포함한 모든 기기에서 로그아웃합니다.</p>
                </div>
                <PrimaryButton
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:text-red-700 hover:border-red-400 shrink-0"
                  onClick={() => setLogoutAllOpen(true)}
                >
                  로그아웃
                </PrimaryButton>
              </div>

              <div className="h-px bg-red-200" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">회원탈퇴</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    계정이 비활성화되고 30일 후 영구 삭제됩니다. 활성 구독도 함께 취소됩니다.
                  </p>
                </div>
                <PrimaryButton
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:text-red-700 hover:border-red-400 shrink-0"
                  onClick={() => setDeleteOpen(true)}
                >
                  탈퇴
                </PrimaryButton>
              </div>
            </div>
          </AppCard>
        </div>
      </main>

      {/* 소셜 해제 확인 */}
      <ConfirmDialog
        open={!!unlinkTarget}
        onOpenChange={(open) => { if (!open) setUnlinkTarget(null); }}
        title={`${unlinkTarget ? providerNames[unlinkTarget] : ''} 연결을 해제할까요?`}
        description="해제 후 해당 소셜 계정으로 로그인할 수 없습니다."
        confirmLabel="해제"
        destructive
        loading={unlinkLoading}
        onConfirm={() => void handleUnlinkOAuth()}
      />

      {/* 모든 기기 로그아웃 확인 */}
      <ConfirmDialog
        open={logoutAllOpen}
        onOpenChange={setLogoutAllOpen}
        title="모든 기기에서 로그아웃할까요?"
        description="현재 기기를 포함한 모든 기기에서 로그아웃됩니다."
        confirmLabel="로그아웃"
        destructive
        loading={logoutAllLoading}
        onConfirm={() => void handleLogoutAll()}
      />

      {/* 회원탈퇴 확인 */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[var(--radius-xl)] bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-stone-900">회원탈퇴</h2>
            <p className="text-sm text-stone-600">
              계정이 비활성화되고 30일 후 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>

            {me?.hasPassword && deleteStep === 'idle' && (
              <div>
                <label className="block text-sm font-medium text-stone-700">비밀번호 확인</label>
                <input
                  type="password"
                  value={deletePw}
                  onChange={(e) => setDeletePw(e.target.value)}
                  placeholder="비밀번호"
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
                />
              </div>
            )}

            {!me?.hasPassword && deleteStep === 'idle' && (
              <PrimaryButton
                type="button"
                variant="outline"
                size="sm"
                loading={deleteLoading}
                onClick={() => void handleRequestDeleteCode()}
              >
                이메일 인증 코드 전송
              </PrimaryButton>
            )}
            {!me?.hasPassword && deleteStep === 'code-sent' && (
              <div className="space-y-2">
                <p className="text-sm text-stone-600">이메일로 전송된 6자리 코드를 입력하세요.</p>
                <input
                  type="text"
                  value={deleteCode}
                  onChange={(e) => setDeleteCode(e.target.value)}
                  placeholder="인증 코드 6자리"
                  maxLength={6}
                  className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
                />
                <PrimaryButton
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={deleteLoading}
                  disabled={deleteCode.length < 6}
                  onClick={() => void handleVerifyDeleteCode()}
                >
                  확인
                </PrimaryButton>
              </div>
            )}
            {!me?.hasPassword && deleteStep === 'code-verified' && (
              <p className="text-sm font-semibold text-green-600">인증 완료. 탈퇴 버튼을 눌러 진행하세요.</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <PrimaryButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletePw('');
                  setDeleteStep('idle');
                  setDeleteCode('');
                  setDeleteVerifyToken('');
                }}
              >
                취소
              </PrimaryButton>
              <PrimaryButton
                type="button"
                variant="brand"
                size="sm"
                className="bg-red-500 hover:bg-red-600 border-red-500"
                loading={deleteLoading}
                disabled={
                  me?.hasPassword
                    ? !deletePw
                    : deleteStep !== 'code-verified'
                }
                onClick={() => void handleDeleteMe()}
              >
                탈퇴하기
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
