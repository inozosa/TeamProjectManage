"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

interface PendingUser {
  id: string;
  loginId: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. 관리자 권한 여부 체크하여 비권한자 추방
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    } else if (sessionStatus === "authenticated") {
      // 👑 관리자 계정('admin@devsync.com')이 아니면 일반 대시보드로 추방합니다.
      if (session.user.email !== "admin@devsync.com") {
        alert("접근 권한이 없습니다. 관리자(admin) 계정만 들어올 수 있습니다.");
        router.push("/");
      } else {
        fetchPendingUsers();
      }
    }
  }, [sessionStatus, session, router]);

  // 2. 가입 대기 조원들 리스트 로드
  const fetchPendingUsers = async () => {
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const data = await res.json();
        setPendingUsers(data);
      }
    } catch (e) {
      console.error("대기 회원 조회 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  // 3. 특정 회원의 가입을 승인 처리하는 함수
  const handleApprove = async (userId: string, userName: string) => {
    if (!confirm(`'${userName}' 조원의 회원가입을 승인하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        alert(`'${userName}' 조원의 승인이 성공적으로 처리되었습니다! 이제 로그인이 가능합니다.`);
        // 화면 리스트에서 해당 승인된 유저를 즉각 제거합니다.
        setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
      } else {
        alert("승인 처리에 실패하였습니다.");
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 4. 특정 회원의 가입 신청을 거절 및 파기 처리하는 함수 (추가)
  const handleReject = async (userId: string, userName: string) => {
    if (!confirm(`'${userName}' 조원의 회원가입 신청을 거절하고 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        alert(`'${userName}' 조원의 가입 신청이 성공적으로 거절 및 삭제되었습니다.`);
        // 화면 리스트에서 즉각 반려된 유저를 제외시킵니다.
        setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.error || "거절 처리에 실패하였습니다.");
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center flex-col gap-3">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent animate-spin rounded-full"></div>
        <div className="text-xs text-slate-500">관리자 제어판 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      
      {/* 상단 네비게이션 헤더 */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-extrabold tracking-wider text-slate-800">
            Dev<span className="text-sky-600">Sync</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800 transition">대시보드</Link>
            <Link href="/kanban" className="hover:text-slate-800 transition">칸반 보드</Link>
            <Link href="/notes" className="hover:text-slate-800 transition">회의록</Link>
            <Link href="/gantt" className="hover:text-slate-800 transition">간트 차트</Link>
            <Link href="/admin" className="text-sky-600 font-bold">승인 관리</Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs text-sky-700 font-bold bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
            👑 시스템 관리자 모드
          </span>
          <LogoutButton />
        </div>
      </header>

      {/* 관리자 승인 대시보드 본문 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              🛡️ 신규 조원 가입 승인 관리 대시보드
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              조원이 직접 회원 가입을 신청하면 이곳에 대기 상태로 나타납니다. 신원을 확인한 후 승인 도장을 찍어주세요.
            </p>
          </div>
          <span className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 shadow-sm">
            승인 대기 건수 : <strong className="text-sky-600">{pendingUsers.length}</strong>건
          </span>
        </div>

        {/* 승인 대기자 목록 표 (Table) */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {pendingUsers.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <span className="text-3xl">📭</span>
              <div className="text-sm font-semibold">현재 승인을 대기하는 조원 신청이 없습니다.</div>
              <p className="text-xs text-slate-500">가입 승인 대기실이 아주 평화로운 상태입니다!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                    <th className="p-4">가입 일시</th>
                    <th className="p-4">신청 아이디</th>
                    <th className="p-4">조원 성명</th>
                    <th className="p-4">이메일 주소</th>
                    <th className="p-4">희망 역할</th>
                    <th className="p-4 text-center">승인 제어</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition duration-150">
                      <td className="p-4 text-slate-400 font-mono">
                        {new Date(user.createdAt).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{user.loginId}</td>
                      <td className="p-4">{user.name}</td>
                      <td className="p-4 font-mono text-slate-500">{user.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          user.role === "MEMBER"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}>
                          {user.role === "MEMBER" ? "일반 조원" : "구경꾼(멘토)"}
                        </span>
                      </td>
                      <td className="p-4 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApprove(user.id, user.name)}
                          className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg cursor-pointer transition text-[10px] shadow-sm"
                        >
                          가입 승인하기
                        </button>
                        <button
                          onClick={() => handleReject(user.id, user.name)}
                          className="py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg cursor-pointer transition text-[10px] shadow-sm"
                        >
                          거절하기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
