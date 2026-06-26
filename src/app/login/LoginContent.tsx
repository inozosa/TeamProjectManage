"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, FormEvent } from "react";
import Link from "next/link";

export function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error"); // NextAuth 인증 오류 코드

  // 입력 상자 상태 관리
  const [loginId, setLoginId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // 일반 ID/PW 로그인 제출 처리
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) return;

    setLoading(true);
    // Credentials 방식 인증 호출
    await signIn("credentials", {
      loginId: loginId.trim(),
      password: password.trim(),
      callbackUrl: "/", // 성공 시 대시보드로 이동
    });
    setLoading(false);
  };

  // 채점관 및 개발 테스트용 ID/PW 원클릭 자동 입력기 헬퍼
  const handleQuickFill = (id: string, pw: string) => {
    setLoginId(id);
    setPassword(pw);
  };

  return (
    <div className="w-full max-w-md p-8 bg-white border border-slate-200 shadow-xl rounded-2xl space-y-6">
      {/* 로고 */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 mb-2">
          WeAre<span className="text-sky-600">Team</span>
        </h1>
        <p className="text-xs text-slate-500">
          IT 개발 동아리 및 조별 과제 진척도 관리 서비스
        </p>
      </div>

      {/* 🚨 상황별 에러 피드백 경고 창 */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 text-center leading-relaxed">
          {error === "InvalidCredentials" && (
            <span>❌ 아이디 또는 비밀번호가 일치하지 않습니다.</span>
          )}
          {error === "NotApproved" && (
            <span>
              🚨 <strong>가입 승인 대기 중!</strong><br />
              관리자(admin)가 가입을 승인한 이후에만 로그인하실 수 있습니다.
            </span>
          )}
          {error === "MissingCredentials" && (
            <span>⚠️ 아이디와 비밀번호를 빠짐없이 기입해 주세요.</span>
          )}
          {error !== "InvalidCredentials" && error !== "NotApproved" && error !== "MissingCredentials" && (
            <span>연동 장애가 발생했습니다. 잠시 후 재시도해 주세요.</span>
          )}
        </div>
      )}

      {/* 로그인 입력 폼 */}
      <form onSubmit={handleLoginSubmit} className="space-y-4">
        {/* 아이디 */}
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">아이디</label>
          <input
            type="text"
            required
            placeholder="아이디를 입력하세요"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* 비밀번호 */}
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">비밀번호</label>
          <input
            type="password"
            required
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* 로그인 제출 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold rounded-xl transition duration-150 shadow-md cursor-pointer disabled:opacity-50 text-xs"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      {/* 회원가입 페이지 이동 안내 */}
      <div className="text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
        아직 회원이 아니신가요?{" "}
        <Link href="/register" className="text-sky-600 hover:underline font-bold">
          가입 신청하기
        </Link>
      </div>

      {/* ⚡ 채점 및 시연용 퀵 자동 입력 기능 패널 */}
      <div className="space-y-2.5 pt-2">
        <div className="text-[10px] text-slate-400 text-center uppercase tracking-wider font-semibold">
          ⚡ 원클릭 빠른 입력 패널 (테스트용)
        </div>
        <div className="grid grid-cols-3 gap-2">
          {/* 관리자 */}
          <button
            onClick={() => handleQuickFill("admin", "admin")}
            className="py-2 px-1 text-[10px] text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg cursor-pointer text-center font-bold leading-tight"
          >
            관리자
            <span className="block text-[8px] text-sky-500/70 font-normal">admin/admin</span>
          </button>
          {/* 승인된 조원 */}
          <button
            onClick={() => handleQuickFill("seoyeon", "seoyeon")}
            className="py-2 px-1 text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer text-center font-bold leading-tight"
          >
            승인 조원
            <span className="block text-[8px] text-emerald-500/70 font-normal">seoyeon/seoyeon</span>
          </button>
          {/* 대기 유저 */}
          <button
            onClick={() => handleQuickFill("waiting", "waiting")}
            className="py-2 px-1 text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer text-center font-bold leading-tight"
          >
            대기 조원
            <span className="block text-[8px] text-amber-500/70 font-normal">waiting/waiting</span>
          </button>
        </div>
      </div>
    </div>
  );
}
