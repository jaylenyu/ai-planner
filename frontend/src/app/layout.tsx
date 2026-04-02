import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 일정 플래너",
  description: "자연어로 입력하면 AI가 최적 동선을 생성합니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const naverMapClientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
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
