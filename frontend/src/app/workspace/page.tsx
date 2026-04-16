'use client';

import { useState } from 'react';
import { AppCard } from '@/components/ui/app-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { workspaceApi } from '@/lib/api';
import { useWorkspace } from '@/hooks/useWorkspace';

export default function WorkspacePage() {
  const { workspace, role, loading, refetch } = useWorkspace();
  const [name, setName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const createWorkspace = async () => {
    setSaving(true);
    setError(null);
    try {
      await workspaceApi.create({ name });
      setName('');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : '워크스페이스를 만들지 못했습니다.');
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
    <div className="min-h-screen bg-[var(--background)]">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <AppCard padding="lg" className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-orange-600">커플 워크스페이스</p>
              <h1 className="mt-1 text-3xl font-bold text-stone-900">
                공유 일정 관리
              </h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                한 명이 구독하고 상대를 초대하면, 같은 일정과 메모를 함께 관리할 수 있습니다.
              </p>
            </div>

            {loading && <p className="text-sm text-stone-500">워크스페이스를 확인하는 중...</p>}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!workspace ? (
              <div className="space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="워크스페이스 이름"
                  className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
                />
                <PrimaryButton
                  type="button"
                  variant="brand"
                  loading={saving}
                  onClick={() => void createWorkspace()}
                >
                  워크스페이스 만들기
                </PrimaryButton>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                  <p className="text-sm font-semibold text-violet-800">
                    {workspace.name}
                  </p>
                  <p className="mt-1 text-sm text-violet-700">내 역할: {role}</p>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-stone-900">멤버</h2>
                  <div className="mt-3 space-y-2">
                    {workspace.members.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
                      >
                        <p className="font-semibold text-stone-900">
                          {member.user.email}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">{member.role}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {role === 'owner' && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-stone-900">파트너 초대</h2>
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="초대할 이메일"
                      className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
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
                        <p className="font-semibold text-stone-900">초대 링크</p>
                        <a
                          href={inviteUrl}
                          className="mt-2 block break-all text-orange-600"
                        >
                          {inviteUrl}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </AppCard>

          <AppCard padding="lg" className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-stone-900">사용 흐름</p>
              <ul className="mt-3 space-y-2 text-sm text-stone-600">
                <li>구독이 활성 상태인지 확인합니다.</li>
                <li>워크스페이스를 만들고 파트너 이메일을 초대합니다.</li>
                <li>`/plan`에서 공유 저장을 켜고 일정을 생성합니다.</li>
                <li>보관함과 상세 페이지에서 함께 수정하고 메모를 남깁니다.</li>
              </ul>
            </div>
            {workspace && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700">
                <p className="font-semibold text-stone-900">현재 상태</p>
                <p className="mt-1">
                  멤버 {workspace.members.length}명
                  {role ? ` · 내 역할 ${role}` : ''}
                </p>
                <p className="mt-1 text-stone-500">
                  공유 일정 생성 후 보관함에서 바로 함께 관리할 수 있습니다.
                </p>
              </div>
            )}
            {workspace && role === 'owner' && (
              <PrimaryButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmOpen(true)}
              >
                워크스페이스 해체
              </PrimaryButton>
            )}
          </AppCard>
        </div>
      </main>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="워크스페이스를 해체할까요?"
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
