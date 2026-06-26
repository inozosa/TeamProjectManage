"use client";

import { signOut } from "next-auth/react";

// 사용자 세션을 안전하게 파기하고 로그인 페이지로 돌려보내는 공용 로그아웃 버튼 컴포넌트입니다.
export function LogoutButton() {
  const handleLogout = async () => {
    // 로그아웃이 완료되면 로그인 페이지('/login')로 보내줍니다.
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <button
      onClick={handleLogout}
      className="py-1.5 px-3 rounded-lg border border-red-500/20 bg-red-950/10 hover:bg-red-950/30 text-red-400 text-xs font-semibold transition duration-200"
    >
      로그아웃
    </button>
  );
}
