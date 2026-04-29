'use client';

import { useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, Link2, Sparkles, UserPlus, Users } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { workspaceApi } from '@/lib/api';
import { useWorkspace } from '@/hooks/useWorkspace';

function formatRole(role?: string) {
  if (role === 'owner') return '플랜 오너';
  if (role === 'member') return '파트너';
  return '미정';
}

export default function WorkspaceSettingsPage() {
  const { workspace, role, loading, refetch } = useWorkspace();
  const [name, setName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const roleLabel = useMemo(() => formatRole(role), [role]);

  const createWorkspace = async () => {
    setSaving(true);
    setError(null);
    try {
      await workspaceApi.create({ name });
      setName('');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : '커플 플랜을 만들지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const invite = async () => {
    if (!workspace) return;
    setSaving(true);
    setError(null);
    try {
      const response = await workspaceApi.invite(workspace.id, {
        email: inviteEmail,
      });
      setInviteUrl(response.inviteUrl);
      setInviteEmail('');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대를 보내지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[var(--background)]">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-6">
          <AppCard padding="lg" className="space-y-6 overflow-hidden">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <p className="text-sm font-semibold text-orange-600">공유설정</p>
                <h1 className="text-3xl font-bold text-stone-900 sm:text-4xl">
                  커플 플랜 연결과 초대를 관리하세요
                </h1>
                <p className="break-keep text-sm leading-6 text-stone-600">
                  커플 플랜 생성, 파트너 초대, 멤버 상태, 플랜 해체 같은 공유
                  설정을 이곳에서 관리합니다.
                </p>
              </div>
              <div className="rounded-[24px] border border-violet-200 bg-violet-50 px-4 py-4 text-sm text-violet-800 lg:min-w-[240px]">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <p className="font-semibold">현재 상태</p>
                </div>
                <p className="mt-2">
                  {workspace
                    ? `${workspace.name} · 멤버 ${workspace.members.length}명`
                    : '아직 커플 플랜이 없습니다.'}
                </p>
                <p className="mt-1 text-violet-700">
                  {workspace
                    ? `현재 역할: ${roleLabel}`
                    : '공유 플랜을 만들 준비를 해보세요.'}
                </p>
              </div>
            </div>

            {loading && (
              <p className="text-sm text-stone-500">커플 플랜을 확인하는 중...</p>
            )}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!workspace ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-stone-900">
                    커플 플랜 이름
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="우리 일정"
                    className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
                  />
                </div>
                <PrimaryButton
                  type="button"
                  variant="brand"
                  loading={saving}
                  onClick={() => void createWorkspace()}
                >
                  커플 플랜 만들기
                </PrimaryButton>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-stone-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-500" />
                    <h2 className="text-base font-bold text-stone-900">멤버</h2>
                  </div>
                  <div className="mt-4 space-y-3">
                    {workspace.members.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-stone-900">
                            {member.user.nickname}
                          </p>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-stone-500">
                            {member.role === 'owner' ? '플랜 오너' : '파트너'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          합류일 {new Date(member.joinedAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-stone-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-orange-500" />
                    <h2 className="text-base font-bold text-stone-900">
                      초대 링크 관리
                    </h2>
                  </div>
                  <p className="mt-2 text-sm text-stone-500">
                    플랜 오너만 초대할 수 있고, 발급된 링크는 7일간 유효합니다.
                  </p>
                  <div className="mt-4 space-y-3">
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="초대할 이메일"
                      className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
                    />
                    <PrimaryButton
                      type="button"
                      variant="brand"
                      loading={saving}
                      disabled={!inviteEmail.trim()}
                      onClick={() => void invite()}
                    >
                      초대 보내기
                    </PrimaryButton>
                    {inviteUrl && (
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-orange-500" />
                          <p className="font-semibold text-stone-900">초대 링크</p>
                        </div>
                        <a
                          href={inviteUrl}
                          className="mt-2 block break-all text-orange-600"
                        >
                          {inviteUrl}
                        </a>
                      </div>
                    )}
                    {workspace.invites.length > 0 && (
                      <div className="space-y-2">
                        {workspace.invites.map((invite) => (
                          <div
                            key={invite.id}
                            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-stone-900">{invite.email}</p>
                              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">
                                {invite.status}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-stone-500">
                              만료일 {new Date(invite.expiresAt).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </AppCard>

          <div className="grid gap-4 md:grid-cols-2">
            <AppCard
              padding="lg"
              className={`space-y-4 ${role === 'owner' ? 'border-orange-200 bg-orange-50/50' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <h2 className="text-base font-bold text-stone-900">플랜 오너</h2>
                </div>
                {role === 'owner' && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                    현재 역할
                  </span>
                )}
              </div>
              <ul className="space-y-2 text-sm text-stone-600">
                <li>플랜을 만들고 초대할 파트너를 선택합니다.</li>
                <li>초대 링크를 발급하고 참여 상태를 관리합니다.</li>
                <li>공유 플랜을 해체할 수 있습니다.</li>
              </ul>
            </AppCard>

            <AppCard
              padding="lg"
              className={`space-y-4 ${role === 'member' ? 'border-violet-200 bg-violet-50/50' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-violet-500" />
                  <h2 className="text-base font-bold text-stone-900">파트너</h2>
                </div>
                {role === 'member' && (
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                    현재 역할
                  </span>
                )}
              </div>
              <ul className="space-y-2 text-sm text-stone-600">
                <li>초대 링크를 수락해 커플 플랜에 합류합니다.</li>
                <li>공유 일정의 장소와 메모를 함께 확인합니다.</li>
                <li>커플 플랜의 공유 일정을 열어 수정과 메모를 이어갑니다.</li>
              </ul>
            </AppCard>
          </div>

          {workspace && (
            <AppCard padding="lg" className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-500" />
                <h2 className="text-base font-bold text-stone-900">
                  사용 흐름
                </h2>
              </div>
              <ul className="grid gap-2 text-sm text-stone-600 md:grid-cols-2">
                <li>구독이 활성 상태인지 확인합니다.</li>
                <li>커플 플랜을 만들고 파트너를 초대합니다.</li>
                <li>`/plan`에서 공유 저장을 켜고 일정을 생성합니다.</li>
                <li>보관함에서 개인 일정을 커플 플랜으로 이동할 수 있습니다.</li>
              </ul>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700">
                <p className="font-semibold text-stone-900">현재 상태</p>
                <p className="mt-1">
                  멤버 {workspace.members.length}명
                  {role ? ` · 내 역할 ${roleLabel}` : ''}
                </p>
                <p className="mt-1 text-stone-500">
                  공유 일정은 커플 플랜에서 확인하고 메모를 남길 수 있습니다.
                </p>
              </div>
              {role === 'owner' && (
                <PrimaryButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                >
                  커플 플랜 해체
                </PrimaryButton>
              )}
            </AppCard>
          )}
        </div>
      </main>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="커플 플랜을 해체할까요?"
        description="공유 연결이 해제되고, 공유 일정은 각자의 보관함으로 분리됩니다."
        confirmLabel="해체"
        destructive
        loading={saving}
        onConfirm={async () => {
          if (!workspace) return;
          setSaving(true);
          try {
            await workspaceApi.dissolve(workspace.id);
            await refetch();
            setConfirmOpen(false);
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
