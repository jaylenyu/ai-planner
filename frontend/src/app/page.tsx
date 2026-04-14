import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Compass,
  MapIcon,
  MessageCircle,
  Sparkles,
  Timer,
} from "lucide-react";
import { PrimaryButton } from "@/components/ui/primary-button";
import { AppCard } from "@/components/ui/app-card";
import { SectionLayout } from "@/components/ui/section-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Static data ────────────────────────────────────────────────────────────────

const features = [
  {
    title: "대화형 일정 브리핑",
    body: "자연어로 목적을 설명하면 AI가 핵심만 추려서 요약해 줍니다.",
    icon: MessageCircle,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    title: "실시간 동선 최적화",
    body: "지도 데이터와 이동 시간을 통합한 스마트 루트 계산.",
    icon: MapIcon,
    color: "text-pink-500",
    bg: "bg-pink-50",
  },
  {
    title: "상세한 장소 인사이트",
    body: "입력한 조건에 맞는 장소를 찾아드립니다.",
    icon: Compass,
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
];

const stats = [
  {
    label: "평균 일정 생성 시간",
    value: "5.5초",
    detail: "기존 대비 3배 빨라짐",
  },
  { label: "추천 정확도", value: "92%", detail: "사용자 피드백 기준" },
  { label: "재사용률", value: "78%", detail: "월간 활성 사용자 기준" },
];

const steps = [
  {
    key: "ideate",
    num: "01",
    label: "아이디어",
    title: "상황만 말하면 됩니다",
    description:
      '"이번 주말 홍대에서 6시간 데이트"처럼 한 줄만 남기면 AI가 자동으로 키워드를 추출하고 후보 장소를 탐색합니다.',
  },
  {
    key: "refine",
    num: "02",
    label: "다듬기",
    title: "제안 비교 & 커스터마이징",
    description:
      "AI가 제안한 여러 코스를 탭으로 넘기며 비교하고, 마음에 드는 장소만 골라 담을 수 있습니다.",
  },
  {
    key: "share",
    num: "03",
    label: "공유",
    title: "공유와 실행까지 한번에",
    description:
      "카카오톡 공유 링크, 캘린더 내보내기, PDF 스냅샷까지 버튼 한 번으로 완료됩니다.",
  },
];

const testimonials = [
  {
    quote:
      "Dayplan 덕분에 팀 워크숍 코스를 짜는 시간이 1/5로 줄었습니다. 장소별 디테일이 많아서 바로 예약까지 이어졌어요.",
    name: "이상훈",
    role: "스타트업 COO",
    initials: "이",
  },
  {
    quote:
      "AI 추천이라 걱정했는데 실제로 다녀와 보니 취향을 잘 반영해 줬어요. 특히 이동 동선이 매끄러워 만족도가 높았습니다.",
    name: "정다혜",
    role: "제품 디자이너",
    initials: "정",
  },
];

const previewItems = [
  { time: "11:00", name: "먼데이투선데이 브런치", dot: "bg-red-400" },
  { time: "13:00", name: "아트하우스 전시 관람", dot: "bg-cyan-400" },
  { time: "15:30", name: "뚝섬 한강 피크닉", dot: "bg-emerald-400" },
  { time: "18:00", name: "루프탑 와인바", dot: "bg-violet-400" },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div
      className="min-h-screen bg-white"
      style={{ color: "var(--text-primary)" }}
    >
      {/* ── NAV ── */}
      <header
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-md"
        style={{ borderBottom: "1px solid var(--divider)" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{
                background: "var(--gradient-brand)",
                boxShadow: "var(--shadow-brand)",
              }}
            >
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight">DatePlanner</span>
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden items-center gap-6 text-sm md:flex"
            aria-label="메인 메뉴"
          >
            <Link
              href="#features"
              className="transition-colors hover:text-[var(--text-primary)]"
              style={{ color: "var(--text-secondary)" }}
            >
              기능 소개
            </Link>
            <Link
              href="#workflow"
              className="transition-colors hover:text-[var(--text-primary)]"
              style={{ color: "var(--text-secondary)" }}
            >
              작동 방식
            </Link>
            {/* 후기 섹션 제거됨 */}
            <div className="ml-2 flex items-center gap-2">
              <PrimaryButton asChild variant="outline" size="sm">
                <Link href="/login">로그인</Link>
              </PrimaryButton>
              <PrimaryButton asChild variant="brand" size="sm">
                <Link href="/register">무료로 시작하기</Link>
              </PrimaryButton>
            </div>
          </nav>

          {/* Mobile CTA */}
          <PrimaryButton
            asChild
            variant="brand"
            size="sm"
            className="md:hidden"
          >
            <Link href="/register">시작하기</Link>
          </PrimaryButton>
        </div>
      </header>

      <main>
        {/* ── HERO ── */}
        <section
          className="relative overflow-hidden hero-pattern"
          aria-labelledby="hero-heading"
        >
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 sm:px-6 py-20 lg:flex-row lg:gap-16 lg:py-28">
            {/* Copy */}
            <div className="flex-1 space-y-8 animate-fade-in-up">
              <p className="label-eyebrow">AI itinerary platform</p>
              <h1
                id="hero-heading"
                className="text-balance font-extrabold leading-[1.1] tracking-tight"
                style={{
                  fontSize: "var(--font-size-display)",
                  color: "var(--text-primary)",
                }}
              >
                대화 한 번으로
                <br />
                <span className="text-gradient">완벽한 코스</span>가<br />
                완성됩니다.
              </h1>
              <p
                className="max-w-md text-base leading-relaxed sm:text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                자연어 입력 → 후보 생성 → 동선 최적화 → 공유까지 한 번에. 복잡한
                엑셀과 지도 앱을 넘나들 필요가 없습니다.
              </p>
              <div className="flex flex-wrap gap-3">
                <PrimaryButton asChild variant="brand" size="lg">
                  <Link href="/register">
                    지금 무료 체험
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </PrimaryButton>
                <PrimaryButton asChild variant="outline" size="lg">
                  <Link href="/plan">샘플 일정 보기</Link>
                </PrimaryButton>
              </div>
              <ul
                className="flex flex-wrap gap-5 text-sm"
                style={{ color: "var(--text-tertiary)" }}
              >
                <li className="flex items-center gap-1.5">
                  <Sparkles
                    className="h-3.5 w-3.5 text-orange-400"
                    aria-hidden="true"
                  />
                  맞춤 취향 분석
                </li>
                <li className="flex items-center gap-1.5">
                  <Timer
                    className="h-3.5 w-3.5 text-orange-400"
                    aria-hidden="true"
                  />
                  동선 시간 계산
                </li>
                <li className="flex items-center gap-1.5">
                  <CalendarCheck
                    className="h-3.5 w-3.5 text-orange-400"
                    aria-hidden="true"
                  />
                  캘린더 연동
                </li>
              </ul>
            </div>

            {/* Preview card */}
            <div
              className="w-full max-w-sm flex-shrink-0 animate-fade-in-up lg:w-96"
              style={{ animationDelay: "120ms" }}
            >
              <AppCard
                padding="lg"
                className="shadow-[var(--shadow-card-hover)]"
              >
                <div className="mb-5">
                  <p className="label-eyebrow mb-1">AI 생성 일정</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    이번 주 토요일 · 성수 데이트
                  </p>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Dayplan이 자동 생성한 예시 일정입니다
                  </p>
                </div>
                <ol className="flex flex-col gap-3">
                  {previewItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${item.dot} text-xs font-bold text-white`}
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      <div
                        className="flex flex-1 items-center justify-between rounded-xl px-3 py-2"
                        style={{ background: "var(--surface-sunken)" }}
                      >
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.name}
                        </span>
                        <span
                          className="ml-2 flex-shrink-0 text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {item.time}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
                    NAVER 데이터 연동
                  </span>
                  <span className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600">
                    시간표 자동 조정
                  </span>
                </div>
              </AppCard>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <SectionLayout
          background="alt"
          eyebrow="By the numbers"
          heading="숫자로 보는 DatePlanner"
        >
          <div className="grid gap-5 sm:grid-cols-3">
            {stats.map((stat, i) => (
              <AppCard
                key={stat.label}
                padding="lg"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <p
                  className="mb-3 text-sm font-medium"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {stat.label}
                </p>
                <p className="metric-value text-gradient">{stat.value}</p>
                <p
                  className="mt-2 text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {stat.detail}
                </p>
              </AppCard>
            ))}
          </div>
        </SectionLayout>

        {/* ── FEATURES ── */}
        <SectionLayout
          id="features"
          background="white"
          eyebrow="Features"
          heading="알고 보면 더 편리한 디테일"
          subheading="일정 생성부터 실행까지 필요한 순간마다 세심한 인터랙션을 제공합니다."
        >
          <div className="grid gap-5 md:grid-cols-3 stagger-children">
            {features.map((f) => (
              <AppCard
                key={f.title}
                padding="lg"
                hoverable
                className="flex flex-col gap-5"
              >
                <div
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${f.bg}`}
                  aria-hidden="true"
                >
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <div>
                  <h3
                    className="mb-1.5 font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {f.body}
                  </p>
                </div>
              </AppCard>
            ))}
          </div>
        </SectionLayout>

        {/* ── WORKFLOW ── */}
        <SectionLayout
          id="workflow"
          background="alt"
          eyebrow="Workflow"
          heading="세밀한 단계별 경험"
          subheading="사용자 조사를 통해 검증한 3단계 프로세스 — 아이디어, 다듬기, 공유."
        >
          <Tabs defaultValue="ideate">
            <TabsList
              className="h-auto rounded-full p-1"
              style={{ background: "var(--border-light)" }}
            >
              {steps.map((step) => (
                <TabsTrigger
                  key={step.key}
                  value={step.key}
                  className="rounded-full px-5 py-2 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {step.num} {step.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {steps.map((step) => (
              <TabsContent key={step.key} value={step.key} className="mt-6">
                <AppCard padding="lg" className="animate-scale-in">
                  <p className="label-eyebrow mb-3">{step.num}</p>
                  <h3
                    className="mb-3 text-xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {step.description}
                  </p>
                </AppCard>
              </TabsContent>
            ))}
          </Tabs>
        </SectionLayout>

        {/* ── TESTIMONIALS REMOVED ── */}

        {/* ── CTA ── */}
        <section
          className="py-[var(--space-section)]"
          aria-labelledby="cta-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div
              className="relative overflow-hidden p-12 text-center"
              style={{
                background: "var(--gradient-brand)",
                borderRadius: "var(--radius-xl)",
              }}
            >
              <p
                className="label-eyebrow mb-4"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Ready?
              </p>
              <h2
                id="cta-heading"
                className="mx-auto max-w-2xl text-balance font-extrabold text-white leading-tight mb-4"
                style={{ fontSize: "var(--font-size-h1)" }}
              >
                지금 바로 DatePlanner로 플랜을 세워보세요.
              </h2>
              <p className="mx-auto mb-8 max-w-md text-white/80">
                회원가입 후 30초면 이메일 인증이 끝나고, 첫 번째 일정이 자동으로
                채워집니다.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <PrimaryButton asChild variant="ghost-dark" size="lg">
                  <Link href="/register">무료 회원가입</Link>
                </PrimaryButton>
                <PrimaryButton asChild variant="ghost-dark" size="lg">
                  <Link href="/login">이미 계정이 있어요</Link>
                </PrimaryButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--divider)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-md"
              style={{ background: "var(--gradient-brand)" }}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold">DatePlanner</span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            © {new Date().getFullYear()} DatePlanner · Build delightful journeys.
          </p>
          <div
            className="flex items-center gap-4 text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            <Link
              href="/terms"
              className="transition-colors hover:text-[var(--text-primary)]"
            >
              이용약관
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-[var(--text-primary)]"
            >
              개인정보처리방침
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
