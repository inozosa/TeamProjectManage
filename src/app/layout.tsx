import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import MobileNav from "@/components/MobileNav"; // 모바일 네비게이션바 임포트

// 구글의 세련된 Inter 폰트를 설정하여 고급스러운 느낌의 서체를 제공합니다.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// SEO 및 웹 브라우저 탭에 표시될 메타데이터 정보들을 정의합니다.
export const metadata: Metadata = {
  title: "WeAreTeam - IT 개발 진척도 관리 및 협업 서비스",
  description: "조별 과제 및 IT 동아리 프로젝트를 위한 직관적인 칸반 보드, 깃허브 코드 연동, 블로커 경보 지원 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // HTML 언어 설정을 한국어(ko)로 바꾸고, 밤샘 코딩용 다크 모드(dark)를 기본 활성화합니다.
    <html
      lang="ko"
      className={`${inter.variable} light h-full antialiased`}
    >
      {/* 모바일 하단 플로팅 탭바에 가려지는 요소가 없도록 pb-24 패딩을 확보합니다. */}
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans antialiased pb-24 md:pb-0">
        {/* NextAuth 세션 정보 공유를 위해 Providers로 자식 컴포넌트들을 감싸줍니다. */}
        <Providers>
          {children}
          <MobileNav /> {/* 공통 모바일 하단 네비게이션 탑재 */}
        </Providers>
      </body>
    </html>
  );
}

