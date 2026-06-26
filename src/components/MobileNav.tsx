"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * 모바일 화면(md 미만)에서 하단에 고정되는 반응형 네비게이션 플로팅 탭바 컴포넌트입니다.
 * 스마트폰 화면 아랫부분에 예쁜 알약 모양(Capsule)으로 떠 있게 설계했습니다.
 */
export default function MobileNav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // 로그인 상태가 아니거나 세션을 불러오는 중이면 탭바를 숨깁니다.
  if (status !== "authenticated" || !session) {
    return null;
  }

  // 로그인 화면이나 회원가입 화면에서는 탭바를 노출하지 않습니다.
  const hideOnPaths = ["/login", "/register"];
  if (hideOnPaths.includes(pathname)) {
    return null;
  }

  // 사용자의 권한이 OWNER(조장)인지 확인합니다.
  const isOwner = session.user.role === "OWNER";

  // 현재 메뉴가 선택되었는지 여부를 확인하는 판별기
  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
      {/* 글래스모피즘(backdrop-blur) 및 부드러운 3D 그림자가 적용된 탭바 바디 */}
      <nav className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl py-3.5 px-4 flex items-center justify-around">
        
        {/* 1. 대시보드 탭 */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 transition duration-150 ${
            isActive("/") ? "text-sky-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
          </svg>
          <span className="text-[10px]">대시보드</span>
        </Link>

        {/* 2. 칸반 보드 탭 */}
        <Link
          href="/kanban"
          className={`flex flex-col items-center gap-1 transition duration-150 ${
            isActive("/kanban") ? "text-sky-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span className="text-[10px]">칸반 보드</span>
        </Link>

        {/* 3. 회의록 탭 */}
        <Link
          href="/notes"
          className={`flex flex-col items-center gap-1 transition duration-150 ${
            isActive("/notes") ? "text-sky-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-[10px]">회의록</span>
        </Link>

        {/* 4. 간트 차트 탭 */}
        <Link
          href="/gantt"
          className={`flex flex-col items-center gap-1 transition duration-150 ${
            isActive("/gantt") ? "text-sky-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px]">간트 차트</span>
        </Link>

        {/* 5. 회원 관리 탭 (어드민 계정일 때만 스페셜 노출) */}
        {isOwner && (
          <Link
            href="/admin"
            className={`flex flex-col items-center gap-1 transition duration-150 ${
              isActive("/admin") ? "text-sky-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[10px]">회원 관리</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
