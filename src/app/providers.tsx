"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

// 클라이언트 컴포넌트(화면 로직)들에서 로그인된 세션 상태에 자유롭게 접근할 수 있도록 
// NextAuth의 SessionProvider로 자식 컴포넌트들을 감싸 반환하는 래퍼 컴포넌트입니다.
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
