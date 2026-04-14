import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://date-planner.us";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "DatePlanner — AI 일정 플래너",
  description:
    "자연어 한마디로 완벽한 데이트 코스와 여행 일정을 만들어보세요. AI가 최적 동선을 생성합니다.",
  keywords: [
    '데이트 코스',
    '여행 일정',
    'AI 플래너',
    '동선 최적화',
    '카페 맛집 추천',
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "DatePlanner",
    title: "DatePlanner — AI 일정 플래너",
    description:
      "자연어 한마디로 완벽한 데이트 코스와 여행 일정을 만들어보세요. AI가 최적 동선을 생성합니다.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@dateplanner",
    title: "DatePlanner — AI 일정 플래너",
    description:
      "자연어 한마디로 완벽한 데이트 코스와 여행 일정을 만들어보세요. AI가 최적 동선을 생성합니다.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const naverMapClientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://date-planner.us';
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DatePlanner',
    url: siteUrl,
  };
  const webSiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'DatePlanner',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="ko" className="h-full antialiased font-sans">
      <head>
        <link rel="preconnect" href="https://oapi.map.naver.com" />
        <link rel="dns-prefetch" href="//oapi.map.naver.com" />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow">
          본문으로 건너뛰기
        </a>
        {naverMapClientId && (
          <Script
            src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverMapClientId}`}
            strategy="afterInteractive"
          />
        )}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
          suppressHydrationWarning
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
          suppressHydrationWarning
        />
        {children}
      </body>
    </html>
  );
}
