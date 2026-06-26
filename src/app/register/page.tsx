"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  // 입력 상자 상태들
  const [loginId, setLoginId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("MEMBER"); // 기본 역할은 조원(MEMBER)
  
  // 상태 제어 변수들
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);

  // 회원가입 전송 처리 함수
  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // 입력값 유효성 기본 검사
    if (!loginId.trim() || !password.trim() || !name.trim() || !email.trim()) {
      setError("모든 필수 입력 정보들을 적어주셔야 합니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: loginId.trim(),
          password: password.trim(),
          name: name.trim(),
          email: email.trim(),
          role,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        // 가입 신청 성공 시 3초 후에 로그인 페이지로 안전하게 리다이렉트 시킵니다.
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.error || "회원가입 처리 중 오류가 발생했습니다.");
      }
    } catch (e) {
      setError("서버와 통신하는 과정에서 에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50 min-h-screen">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 shadow-xl rounded-2xl space-y-6">
        
        {/* 타이틀 및 헤더 */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">DevSync 회원가입 신청</h2>
          <p className="text-xs text-slate-500">
            정보 입력 후 관리자가 승인하면 즉시 로그인이 가능합니다.
          </p>
        </div>

        {/* ❌ 오류 발생 시 경고 상자 */}
        {error && (
          <div className="p-3 bg-red-55 border border-red-200 rounded-xl text-xs text-red-600 text-center">
            {error}
          </div>
        )}

        {/* 🎉 성공 시 녹색 안내 상자 */}
        {success ? (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-center animate-fadeIn">
            <div className="text-2xl">🎉</div>
            <div className="text-xs text-emerald-700 font-bold">가입 신청 완료!</div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              조장(admin)의 가입 승인이 이루어지면 가입하신 정보로 로그인이 가능합니다.<br />
              잠시 후 자동으로 로그인 페이지로 이동합니다.
            </p>
            <Link
              href="/login"
              className="inline-block text-[10px] bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-700 px-3.5 py-1.5 rounded-lg transition font-bold"
            >
              즉시 로그인 페이지로 가기 &rarr;
            </Link>
          </div>
        ) : (
          // 회원가입 입력 양식 폼
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* 아이디 */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-semibold">아이디 (CUID 대체 고유 ID)</label>
              <input
                type="text"
                required
                placeholder="영문, 숫자 혼용 로그인 아이디"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-semibold">비밀번호</label>
              <input
                type="password"
                required
                placeholder="로그인 시 인증할 비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* 실명 이름 */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-semibold">이름 (본명)</label>
              <input
                type="text"
                required
                placeholder="예: 홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* 이메일 주소 */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-semibold">이메일 주소</label>
              <input
                type="email"
                required
                placeholder="예: student@university.ac.kr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* 역할(Role) 지정 */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-semibold">동아리 과제 내 역할 (Role)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none"
              >
                <option value="MEMBER">💻 일반 조원 (Member - 카드 관리 및 의견 가능)</option>
                <option value="VIEWER">👀 구경꾼 (Viewer - 모니터링 및 댓글 피드백)</option>
              </select>
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition duration-150 shadow-md cursor-pointer"
            >
              {loading ? "가입 요청을 보내는 중..." : "가입 신청하기"}
            </button>
          </form>
        )}

        {/* 이전 로그인 페이지 리턴 링크 */}
        {!success && (
          <div className="text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-sky-600 hover:underline font-bold">
              로그인하러 가기
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
