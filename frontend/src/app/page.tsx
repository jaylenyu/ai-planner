import Link from 'next/link';
import { CalendarCheck, Compass, MapIcon, MessageCircle, Sparkles, Timer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const features = [
  {
    title: '대화형 일정 브리핑',
    body: '자연어로 목적을 설명하면 AI가 핵심만 추려서 요약해 줍니다.',
    icon: MessageCircle,
  },
  {
    title: '실시간 동선 최적화',
    body: '지도 데이터와 이동 시간을 통합한 스마트 루트 계산.',
    icon: MapIcon,
  },
  {
    title: '상세한 장소 인사이트',
    body: '운영시간·예약 팁·분위기까지 한 화면에 확인 가능합니다.',
    icon: Compass,
  },
];

const stats = [
  { label: '평균 일정 생성 시간', value: '2분 41초', detail: '기존 대비 6배 빨라짐' },
  { label: '추천 정확도', value: '92%', detail: '사용자 피드백 기준' },
  { label: '재사용률', value: '78%', detail: '월간 활성 사용자 기준' },
];

const steps = [
  {
    key: 'ideate',
    title: '상황만 말하면 됩니다',
    description: '“이번 주말 홍대에서 6시간 데이트”처럼 한 줄만 남기면 자동으로 키워드를 추출합니다.',
  },
  {
    key: 'refine',
    title: '제안 비교 & 커스터마이징',
    description: 'AI가 제안한 여러 코스를 탭으로 넘기며 비교하고, 마음에 드는 장소만 골라 담을 수 있습니다.',
  },
  {
    key: 'share',
    title: '공유와 실행까지 한번에',
    description: '카카오톡 공유 링크, 캘린더 내보내기, PDF 스냅샷까지 버튼 한 번으로 완료됩니다.',
  },
];

const testimonials = [
  {
    quote:
      'Dayplan 덕분에 팀 워크숍 코스를 짜는 시간이 1/5로 줄었습니다. 장소별 디테일이 많아서 바로 예약까지 이어졌어요.',
    name: '이상훈 · 스타트업 COO',
  },
  {
    quote:
      'AI 추천이라 걱정했는데 실제로 다녀와 보니 취향을 잘 반영해 줬어요. 특히 이동 동선이 매끄러워 만족도가 높았습니다.',
    name: '정다혜 · 제품 디자이너',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#040306] text-stone-50">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#040306]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            Dayplan
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-stone-300 md:flex">
            <Link href="#features" className="hover:text-white">
              기능 소개
            </Link>
            <Link href="#workflow" className="hover:text-white">
              작동 방식
            </Link>
            <Link href="#stories" className="hover:text-white">
              후기
            </Link>
            <Button asChild variant="ghost" className="text-stone-100">
              <Link href="/login">로그인</Link>
            </Button>
            <Button asChild className="bg-white text-stone-900 hover:bg-white/90">
              <Link href="/register">무료로 시작하기</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,120,90,0.35),_transparent_60%)]" />
        </div>

        <section className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <Badge className="border-transparent bg-gradient-to-r from-orange-500 to-pink-500 text-[11px] uppercase tracking-[0.4em] text-white">
              AI itinerary platform
            </Badge>
            <h1 className="text-4xl font-black leading-tight text-white md:text-5xl">
              대화 한 번으로 여행·데이트 코스가 완성됩니다.
            </h1>
            <p className="text-base text-stone-300 md:text-lg">
              Dayplan은 자연어 입력 → 후보 생성 → 동선 최적화 → 공유까지 한 번에 처리해 주는 스마트 플래너입니다.
              복잡한 엑셀과 지도 앱을 넘나들 필요가 없습니다.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">지금 무료 체험</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/40 text-white">
                <Link href="/plan">샘플 일정 보기</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-stone-400">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-400" />
                맞춤 취향 분석
              </div>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-orange-400" />
                동선 시간 계산
              </div>
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-orange-400" />
                캘린더 연동
              </div>
            </div>
          </div>
          <div className="flex-1">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle>이번 주 토요일 · 성수 데이트</CardTitle>
                <CardDescription className="text-stone-300">
                  입력 문장을 토대로 Dayplan이 생성한 아이디어 스케치입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  '11:00 · 먼데이투선데이 브런치',
                  '13:00 · 아트하우스 전시 관람',
                  '15:30 · 뚝섬 한강 피크닉',
                  '18:00 · 루프탑 와인바',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                    {item}
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex flex-col gap-3 text-xs text-stone-300">
                <span>* 추천은 사용자의 피드백을 학습해 지속적으로 개선됩니다.</span>
                <div className="flex gap-2 text-[11px]">
                  <Badge variant="outline" className="border-white/30 text-white">
                    NAVER 데이터 연동
                  </Badge>
                  <Badge variant="outline" className="border-white/30 text-white">
                    시간표 자동 조정
                  </Badge>
                </div>
              </CardFooter>
            </Card>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardDescription className="text-stone-400">{stat.label}</CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-stone-400">{stat.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section id="features" className="bg-white py-20 text-stone-900">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <Badge variant="outline" className="border-stone-200 text-stone-600">
                Features
              </Badge>
              <h2 className="mt-4 text-3xl font-bold">알고 보면 더 편리한 디테일</h2>
              <p className="mt-2 text-stone-500">
                일정 생성부터 실행까지 필요한 순간마다 shadcn/ui 기반의 세심한 인터랙션을 제공합니다.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="hover:border-stone-300">
                  <CardHeader>
                    <feature.icon className="h-10 w-10 rounded-2xl bg-stone-900/5 p-2 text-stone-900" />
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.body}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <Badge className="border-transparent bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                  Workflow
                </Badge>
                <h2 className="mt-3 text-3xl font-bold text-white">세밀한 단계별 경험</h2>
                <p className="mt-2 max-w-2xl text-sm text-stone-300">
                  사용자 조사를 통해 검증한 3단계 프로세스—아이디어, 다듬기, 공유—를 shadcn 탭 컴포넌트로 직관적으로 보여줍니다.
                </p>
              </div>
            </div>
            <Tabs defaultValue="ideate" className="mt-8">
              <TabsList className="rounded-full bg-white/10 p-1 text-sm text-stone-300">
                {steps.map((step) => (
                  <TabsTrigger
                    key={step.key}
                    value={step.key}
                    className="min-w-[120px] rounded-full px-4 py-2 text-sm font-medium text-stone-200 transition-all data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow"
                  >
                    {step.title.split(' ')[0]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {steps.map((step) => (
                <TabsContent key={step.key} value={step.key} className="mt-6">
                  <Card className="border-white/10 bg-white/5 text-white">
                    <CardHeader>
                      <CardTitle>{step.title}</CardTitle>
                      <CardDescription className="text-stone-200">{step.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        <section id="stories" className="bg-stone-50 py-20 text-stone-900">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-10 text-center">
              <Badge variant="outline" className="border-stone-300 text-stone-600">
                Voices
              </Badge>
              <h2 className="mt-3 text-3xl font-bold">사용자 후기</h2>
              <p className="text-sm text-stone-500">Dayplan을 먼저 경험한 사람들의 생생한 평가입니다.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {testimonials.map((item) => (
                <Card key={item.name} className="border-stone-200">
                  <CardContent className="space-y-4">
                    <p className="text-lg font-semibold text-stone-900">“{item.quote}”</p>
                    <p className="text-sm text-stone-500">{item.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-20">
          <Card className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            <CardHeader className="space-y-3 text-center">
              <Badge variant="outline" className="border-white/40 text-white">
                Ready?
              </Badge>
              <CardTitle className="text-3xl">지금 바로 Dayplan으로 플랜을 세워보세요.</CardTitle>
              <CardDescription className="text-stone-100">
                회원가입 후 30초면 이메일 인증이 끝나고, 첫 번째 일정이 자동으로 채워집니다.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild variant="secondary" size="lg" className="text-stone-900">
                <Link href="/register">무료 회원가입</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-white hover:bg-white/20">
                <Link href="/login">이미 계정이 있어요</Link>
              </Button>
            </CardFooter>
          </Card>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} Dayplan · Build delightful journeys.
      </footer>
    </div>
  );
}
