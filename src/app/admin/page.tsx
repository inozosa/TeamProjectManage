"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

// 역할 한글 매핑
const ROLE_MAP: Record<string, { label: string; color: string }> = {
  OWNER: { label: "조장", color: "bg-amber-50 border-amber-300 text-amber-700" },
  MEMBER: { label: "조원", color: "bg-emerald-50 border-emerald-300 text-emerald-700" },
  VIEWER: { label: "구경꾼(멘토)", color: "bg-purple-50 border-purple-300 text-purple-700" },
};

interface User {
  id: string;
  loginId: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  image?: string | null;
}

// 탭 타입
type TabType = "pending" | "members";

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // 데이터 상태
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // UI 상태
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null); // 역할 변경 드롭다운 열린 유저 ID

  // 1. 관리자 권한 검증
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    } else if (sessionStatus === "authenticated") {
      if (session.user.role !== "OWNER") {
        alert("접근 권한이 없습니다. 관리자(admin) 계정만 접근 가능합니다.");
        router.push("/");
      } else {
        fetchAllData();
      }
    }
  }, [sessionStatus, session, router]);

  // 2. 전체 회원 데이터 로드 (대기자 + 승인 회원)
  const fetchAllData = async () => {
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const data = await res.json();
        setPendingUsers(data.pendingUsers || []);
        setApprovedUsers(data.approvedUsers || []);
      }
    } catch (e) {
      console.error("회원 데이터 조회 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  // 3. 가입 승인 처리
  const handleApprove = async (userId: string, userName: string | null) => {
    if (!confirm(`'${userName}' 조원의 회원가입을 승인하시겠습니까?`)) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        // 승인된 유저를 대기 목록에서 제거하고 승인 목록에 추가
        const approved = pendingUsers.find((u) => u.id === userId);
        if (approved) {
          setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
          setApprovedUsers([...approvedUsers, { ...approved, role: approved.role }]);
        }
        alert(`✅ '${userName}' 조원이 승인되어 이제 로그인 가능합니다!`);
      } else {
        alert("승인 처리에 실패했습니다.");
      }
    } catch {
      alert("서버 연결 실패");
    }
  };

  // 4. 가입 거절 처리 (대기자 삭제)
  const handleReject = async (userId: string, userName: string | null) => {
    if (!confirm(`'${userName}' 조원의 가입 신청을 거절하고 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch("/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
        alert(`❌ '${userName}' 조원의 가입 신청이 거절되었습니다.`);
      } else {
        const data = await res.json();
        alert(data.error || "거절 처리에 실패했습니다.");
      }
    } catch {
      alert("서버 연결 실패");
    }
  };

  // 5. 권한 변경 처리
  const handleRoleChange = async (userId: string, userName: string | null, newRole: string) => {
    if (!confirm(`'${userName}'의 역할을 '${ROLE_MAP[newRole]?.label}'로 변경하시겠습니까?`)) {
      setEditingRoleId(null);
      return;
    }
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        setApprovedUsers(approvedUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        setEditingRoleId(null);
        alert(`✅ '${userName}'의 역할이 '${ROLE_MAP[newRole]?.label}'로 변경되었습니다.`);
      } else {
        alert("역할 변경에 실패했습니다.");
      }
    } catch {
      alert("서버 연결 실패");
    }
  };

  // 6. 기존 회원 강제 탈퇴(삭제)
  const handleDeleteMember = async (userId: string, userName: string | null) => {
    if (!confirm(`⚠️ '${userName}' 회원을 강제 탈퇴시키겠습니까?\n\n이 작업은 되돌릴 수 없습니다!`)) return;
    try {
      const res = await fetch("/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setApprovedUsers(approvedUsers.filter((u) => u.id !== userId));
        alert(`🗑️ '${userName}' 회원이 강제 탈퇴 처리되었습니다.`);
      } else {
        const data = await res.json();
        alert(data.error || "탈퇴 처리에 실패했습니다.");
      }
    } catch {
      alert("서버 연결 실패");
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-3">
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
            WeAre<span className="text-sky-600">Team</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800 transition">대시보드</Link>
            <Link href="/kanban" className="hover:text-slate-800 transition">칸반 보드</Link>
            <Link href="/notes" className="hover:text-slate-800 transition">회의록</Link>
            <Link href="/gantt" className="hover:text-slate-800 transition">간트 차트</Link>
            <Link href="/admin" className="text-sky-600 font-bold">회원 관리</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-sky-700 font-bold bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
            👑 시스템 관리자 모드
          </span>
          <LogoutButton />
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* 페이지 제목 + 요약 배지 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              🛡️ 관리자 회원 관리 센터
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              신규 가입 신청을 승인/거절하고, 기존 회원의 역할을 변경하거나 강제 탈퇴시킬 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg text-orange-700 font-bold shadow-sm">
              ⏳ 승인 대기 {pendingUsers.length}건
            </span>
            <span className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 shadow-sm">
              👥 총 활성 회원 {approvedUsers.length}명
            </span>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition duration-150 flex items-center gap-1.5 ${
              activeTab === "pending"
                ? "bg-white text-sky-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>⏳</span> 가입 승인 대기
            {pendingUsers.length > 0 && (
              <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition duration-150 flex items-center gap-1.5 ${
              activeTab === "members"
                ? "bg-white text-sky-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>👥</span> 기존 회원 관리
          </button>
        </div>

        {/* =================== 탭 1: 가입 승인 대기 =================== */}
        {activeTab === "pending" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {pendingUsers.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <span className="text-3xl">📭</span>
                <div className="text-sm font-semibold">승인 대기 중인 가입 신청이 없습니다.</div>
                <p className="text-xs text-slate-400">가입 대기실이 평화로운 상태입니다!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                      <th className="p-4">가입 신청일</th>
                      <th className="p-4">아이디</th>
                      <th className="p-4">이름</th>
                      <th className="p-4">이메일</th>
                      <th className="p-4">희망 역할</th>
                      <th className="p-4 text-center">승인 처리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pendingUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-orange-50/40 transition duration-100">
                        <td className="p-4 text-slate-400 font-mono">
                          {new Date(user.createdAt).toLocaleString("ko-KR", {
                            year: "numeric", month: "2-digit", day: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="p-4 font-bold text-slate-800">{user.loginId}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {/* 아바타 이미지 */}
                            <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-xs text-slate-500">
                              {user.name?.charAt(0) || "?"}
                            </div>
                            <span>{user.name || "이름 없음"}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-500">{user.email || "-"}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ROLE_MAP[user.role]?.color || ""}`}>
                            {ROLE_MAP[user.role]?.label || user.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(user.id, user.name)}
                              className="py-1.5 px-3.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition text-[10px] shadow-sm"
                            >
                              ✅ 승인
                            </button>
                            <button
                              onClick={() => handleReject(user.id, user.name)}
                              className="py-1.5 px-3.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-lg transition text-[10px]"
                            >
                              ❌ 거절
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =================== 탭 2: 기존 회원 관리 =================== */}
        {activeTab === "members" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {approvedUsers.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <span className="text-3xl">👤</span>
                <div className="text-sm font-semibold">승인된 회원이 없습니다.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                      <th className="p-4">가입일</th>
                      <th className="p-4">아이디</th>
                      <th className="p-4">이름</th>
                      <th className="p-4">이메일</th>
                      <th className="p-4">현재 역할</th>
                      <th className="p-4 text-center">역할 변경</th>
                      <th className="p-4 text-center">강제 탈퇴</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {approvedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition duration-100">
                        <td className="p-4 text-slate-400 font-mono">
                          {new Date(user.createdAt).toLocaleDateString("ko-KR", {
                            year: "numeric", month: "2-digit", day: "2-digit",
                          })}
                        </td>
                        <td className="p-4 font-bold text-slate-800">{user.loginId}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {/* 아바타 */}
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 overflow-hidden shrink-0 flex items-center justify-center text-white font-bold text-[10px]">
                              {user.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.image} alt={user.name || ""} className="w-full h-full object-cover" />
                              ) : (
                                user.name?.charAt(0) || "?"
                              )}
                            </div>
                            <span>{user.name || "이름 없음"}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-500">{user.email || "-"}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ROLE_MAP[user.role]?.color || ""}`}>
                            {ROLE_MAP[user.role]?.label || user.role}
                          </span>
                        </td>

                        {/* 역할 변경 드롭다운 */}
                        <td className="p-4 text-center">
                          {editingRoleId === user.id ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <select
                                defaultValue={user.role}
                                onChange={(e) => handleRoleChange(user.id, user.name, e.target.value)}
                                className="text-[10px] border border-sky-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
                              >
                                <option value="OWNER">조장</option>
                                <option value="MEMBER">조원</option>
                                <option value="VIEWER">구경꾼(멘토)</option>
                              </select>
                              <button
                                onClick={() => setEditingRoleId(null)}
                                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingRoleId(user.id)}
                              className="py-1.5 px-3 bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200 hover:border-sky-300 font-bold rounded-lg transition text-[10px]"
                            >
                              ✏️ 역할 변경
                            </button>
                          )}
                        </td>

                        {/* 강제 탈퇴 버튼 */}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteMember(user.id, user.name)}
                            className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-400 font-bold rounded-lg transition text-[10px]"
                          >
                            🗑️ 탈퇴
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 관리자 주의사항 안내 */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 leading-relaxed">
          <strong>⚠️ 관리자 주의사항</strong><br />
          · 강제 탈퇴 시 해당 회원이 담당했던 카드의 담당자가 자동으로 해제됩니다.<br />
          · 관리자(admin) 본인 계정은 삭제하거나 역할을 변경할 수 없습니다.<br />
          · 역할 변경은 즉시 반영되며, 해당 회원의 다음 로그인 시점부터 적용됩니다.
        </div>
      </main>
    </div>
  );
}
