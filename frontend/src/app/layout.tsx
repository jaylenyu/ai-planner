import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://date-planner.us";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "DatePlanner — AI 일정 플래너",
  description:
    "자연어 한마디로 완벽한 데이트 코스와 여행 일정을 만들어보세요. AI가 최적 동선을 생성합니다.",
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

  return (
    <html lang="ko" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col">
        {naverMapClientId && (
          <Script
            src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverMapClientId}`}
            strategy="afterInteractive"
          />
        )}
        {children}
      </body>
    </html>
  );
}
