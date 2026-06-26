import { Suspense } from "react";
import { LoginContent } from "./LoginContent";

// 이 파일은 Next.js 14+ App Router 사양에 따른 '서버 컴포넌트'입니다.
// 자체 ID/PW 로그인 방식으로 전향함에 따라 소셜 로그인 여부 체크가 불필요해졌으므로 깔끔하게 폼만 마운트합니다.
export default async function LoginPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50">
      {/* 쿼리 스트링의 useSearchParams 대기 처리를 위한 Suspense 장막을 칩니다. */}
      <Suspense fallback={<div className="text-slate-800 text-xs">페이지 로딩 중...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
