import Link from 'next/link';

const highlights = [
  {
    title: '대화형 일정 생성',
    body: '여행 목적과 취향을 자연어로 말하면 AI가 즉시 코스를 제안합니다.',
  },
  {
    title: '지역별 장소 데이터',
    body: 'NAVER, Google 등 외부 데이터를 조합해 믿을 수 있는 추천을 제공합니다.',
  },
  {
    title: '실시간 동선 최적화',
    body: '이동 시간을 고려해 최적의 순서를 자동으로 정렬합니다.',
  },
];

const steps = [
  '어디로 떠날지 간단한 문장으로 입력',
  'AI가 추천한 일정 초안을 훑어보기',
  '마음에 드는 장소를 추가/수정해서 마무리',
];

const testimonials = [
  {
    quote:
      '일정을 잡는 데 30분 이상 들였는데 이제는 3분이면 끝납니다. 장소 추천도 신뢰할 수 있었어요.',
    name: '김유진 · 직장인',
  },
  {
    quote: '네이버 지도로 하나씩 찾던 시절로는 돌아가기 싫어요. 주말 데이트 계획이 훨씬 쉬워졌습니다.',
    name: '박현우 · 개발자',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-orange-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-stone-900">
            Dayplan
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-stone-600">
            <a href="#features" className="hover:text-stone-900">
              기능 소개
            </a>
            <a href="#workflow" className="hover:text-stone-900">
              작동 방식
            </a>
            <a href="#stories" className="hover:text-stone-900">
              사용자 이야기
            </a>
            <Link
              href="/login"
              className="rounded-full border border-stone-200 px-4 py-1.5 text-stone-900 hover:border-stone-400"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-stone-900 px-4 py-1.5 text-white shadow-lg shadow-stone-900/20"
            >
              무료로 시작
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16 md:flex-row md:items-center">
        <div className="flex-1 space-y-6">
          <span className="inline-flex items-center rounded-full bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-orange-500">
            AI Itinerary Builder
          </span>
          <h1 className="text-4xl font-black leading-tight text-stone-900 md:text-5xl">
            채팅처럼 계획하고,
            <br />
            단 몇 분 안에 완벽한 일정 완성
          </h1>
          <p className="text-base text-stone-600 md:text-lg">
            Dayplan은 AI가 대화형으로 일정을 제안하고, 실제 장소 데이터를 기반으로 루트를 최적화합니다.
            복잡한 검색 없이 바로 실행 가능한 데이트/여행 계획을 세워보세요.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="flex items-center justify-center rounded-2xl bg-stone-900 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-stone-900/20"
            >
              무료로 체험하기
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center rounded-2xl border border-stone-300 px-6 py-3 text-base font-semibold text-stone-800 hover:border-stone-500"
            >
              이미 계정이 있어요
            </Link>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-full w-full max-w-md rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl shadow-orange-200/60">
            <div className="rounded-2xl bg-stone-900 p-4 text-sm text-white">
              <p className="text-orange-200">AI 제안</p>
              <p className="mt-2 text-lg font-semibold">서울 데이트 일정</p>
              <ul className="mt-4 space-y-3 text-stone-100">
                <li>10:00 · 성수동 브런치</li>
                <li>12:00 · 갤러리 산책</li>
                <li>15:00 · 한강 피크닉</li>
                <li>18:00 · 루프탑 다이닝</li>
              </ul>
            </div>
            <p className="mt-4 text-sm text-stone-500">
              * UI 미리보기 — 실제 일정은 사용자의 입력에 따라 자동 생성됩니다.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-3xl border border-stone-100 bg-stone-50 p-6">
              <h3 className="text-lg font-semibold text-stone-900">{item.title}</h3>
              <p className="mt-2 text-sm text-stone-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-stone-200/60">
          <h2 className="text-2xl font-bold text-stone-900">3단계로 끝나는 일정 제작</h2>
          <ol className="mt-6 space-y-4 text-stone-700">
            {steps.map((step, idx) => (
              <li key={step} className="flex items-start gap-4">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-600">
                  {idx + 1}
                </span>
                <p className="text-base">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="stories" className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-stone-900">사용자들이 전하는 이야기</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {testimonials.map((item) => (
              <figure key={item.name} className="rounded-3xl border border-stone-100 bg-stone-50 p-6">
                <blockquote className="text-base text-stone-700">“{item.quote}”</blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-stone-900">{item.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-3xl bg-stone-900 p-10 text-center text-white">
          <p className="text-sm uppercase tracking-[0.4em] text-orange-200">Ready to start?</p>
          <h3 className="mt-4 text-3xl font-bold">지금 바로 Dayplan으로 첫 일정을 만들어보세요</h3>
          <p className="mt-2 text-base text-stone-200">
            이메일 인증 후 30초면 가입이 끝납니다. 언제든 무료로 시작할 수 있어요.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="rounded-2xl bg-white px-6 py-3 text-base font-semibold text-stone-900"
            >
              무료 회원가입
            </Link>
            <Link
              href="/plan"
              className="rounded-2xl border border-white/40 px-6 py-3 text-base font-semibold text-white"
            >
              데모 일정 보기
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/70 bg-white py-6 text-center text-sm text-stone-500">
        © {new Date().getFullYear()} Dayplan. All rights reserved.
      </footer>
    </main>
  );
}
