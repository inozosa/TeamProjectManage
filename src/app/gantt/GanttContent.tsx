"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

// Prisma 모델 타입 정의
interface Card {
  id: string;
  title: string;
  content: string | null;
  status: string;
  category: string;
  dueDate: string | null;
  milestoneId: string | null;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  createdAt: string;
  cards: Card[];
}

interface GanttContentProps {
  initialMilestones: Milestone[];
  session: {
    user: {
      name: string;
      email: string;
      image?: string;
      role: string;
    };
  };
}

export default function GanttContent({ initialMilestones, session }: GanttContentProps) {
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [loading, setLoading] = useState(false);

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  // 모달 입력 폼 상태 관리
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  // 데이터베이스에서 자동으로 불러온 미연동 할일(카드) 목록
  const [unlinkedCards, setUnlinkedCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // 1. 간트차트 가로 범위 및 그리드 날짜 연산 로직 (클라이언트 렌더링 동기화)
  const now = new Date();
  const todayTime = now.getTime();
  
  // 시작 지점은 항상 오늘 날짜의 00:00:00으로 설정하여 오늘선이 맨 왼쪽에 정렬되도록 함
  const minStart = new Date(now);
  minStart.setHours(0, 0, 0, 0);

  // 기본 마감 지점은 오늘 기준 21일 후
  let maxEnd = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

  if (milestones.length > 0) {
    const ends = milestones.map((m) => new Date(m.dueDate).getTime());
    const actualMax = Math.max(...ends);
    const calculatedMaxEnd = new Date(actualMax + 3 * 24 * 60 * 60 * 1000); // 3일 버퍼
    if (calculatedMaxEnd.getTime() > maxEnd.getTime()) {
      maxEnd = calculatedMaxEnd;
    }
  }

  const totalDuration = maxEnd.getTime() - minStart.getTime();

  // 7일 간격 세로 눈금
  const gridTicks: { leftPercent: number; label: string }[] = [];
  const startDay = new Date(minStart);
  while (startDay.getTime() <= maxEnd.getTime()) {
    const leftPercent = ((startDay.getTime() - minStart.getTime()) / totalDuration) * 100;
    gridTicks.push({
      leftPercent,
      label: `${startDay.getMonth() + 1}/${startDay.getDate()}`,
    });
    startDay.setDate(startDay.getDate() + 7);
  }

  const todayLeft = ((todayTime - minStart.getTime()) / totalDuration) * 100;
  const isTodayVisible = todayLeft >= 0 && todayLeft <= 100;

  // 2. 전체 마일스톤 데이터 리프레시 API 호출
  const refreshData = async () => {
    try {
      const res = await fetch("/api/milestones");
      if (res.ok) {
        const data = await res.json();
        setMilestones(data.milestones);
      }
    } catch (e) {
      console.error("데이터 갱신 실패:", e);
    }
  };

  // 3. 할일(카드) 불러오기 API 호출 (자동 불러오기 기능)
  const fetchUnlinkedCards = async () => {
    setLoadingCards(true);
    try {
      const res = await fetch("/api/milestones");
      if (res.ok) {
        const data = await res.json();
        setUnlinkedCards(data.unlinkedCards);
      }
    } catch (e) {
      console.error("할일 불러오기 실패:", e);
    } finally {
      setLoadingCards(false);
    }
  };

  // 4. 모달 열기 제어
  const openCreateModal = () => {
    setModalMode("CREATE");
    setSelectedMilestoneId(null);
    setTitle("");
    setDescription("");
    // 마감일 기본값: 오늘 기준 7일 뒤
    const defaultDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setDueDate(defaultDue.toISOString().split("T")[0]);
    setSelectedCardIds([]);
    setUnlinkedCards([]);
    setIsModalOpen(true);
  };

  const openEditModal = (milestone: Milestone) => {
    setModalMode("EDIT");
    setSelectedMilestoneId(milestone.id);
    setTitle(milestone.title);
    setDescription(milestone.description || "");
    const dueFormatted = new Date(milestone.dueDate).toISOString().split("T")[0];
    setDueDate(dueFormatted);
    // 현재 마일스톤에 엮인 카드들의 ID 목록을 초기 체크 상태로 탑재
    setSelectedCardIds(milestone.cards.map((c) => c.id));
    setUnlinkedCards([]);
    setIsModalOpen(true);
  };

  // 5. 할일 자동 불러오기 & 전체 자동 선택 처리
  const handleAutoLoadCards = async () => {
    await fetchUnlinkedCards();
  };

  // 미연동 카드들 전체 선택/해제 토글
  const handleSelectAllUnlinked = () => {
    const unlinkedIds = unlinkedCards.map((c) => c.id);
    const allChecked = unlinkedIds.every((id) => selectedCardIds.includes(id));

    if (allChecked) {
      // 전체 해제 (미연동 카드만 선택 해제하고 기존 연동 카드는 보존)
      setSelectedCardIds((prev) => prev.filter((id) => !unlinkedIds.includes(id)));
    } else {
      // 전체 선택 (기존 선택지에 미연동 카드 추가)
      setSelectedCardIds((prev) => {
        const unique = new Set([...prev, ...unlinkedIds]);
        return Array.from(unique);
      });
    }
  };

  // 개별 카드 선택 제어
  const handleCardToggle = (cardId: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // 6. 저장 및 삭제 처리 API 연동
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) {
      alert("목표 제목과 마감 목표일을 지정해주세요.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        id: selectedMilestoneId,
        title,
        description,
        dueDate,
        cardIds: selectedCardIds,
      };

      const method = modalMode === "CREATE" ? "POST" : "PUT";
      const res = await fetch("/api/milestones", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        await refreshData();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "일정 저장 중 서버 오류가 발생했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("네트워크 연결 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (milestoneId: string) => {
    if (!confirm("정말 이 마일스톤 목표를 삭제하시겠습니까?\n(연동된 업무 카드들의 연결은 자동으로 풀립니다)")) {
      return;
    }

    try {
      const res = await fetch(`/api/milestones?id=${milestoneId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await refreshData();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "삭제에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* 상단 헤더 바 */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-extrabold tracking-wider text-slate-800">
            Dev<span className="text-sky-600">Sync</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800 transition duration-150">
              대시보드
            </Link>
            <Link href="/kanban" className="hover:text-slate-800 transition duration-150">
              칸반 보드
            </Link>
            <Link href="/notes" className="hover:text-slate-800 transition duration-150">
              회의록
            </Link>
            <Link href="/gantt" className="text-sky-600 font-bold">
              간트 차트
            </Link>
            {session.user.email === "admin@devsync.com" && (
              <Link href="/admin" className="hover:text-slate-800 transition duration-150">
                승인 관리
              </Link>
            )}
          </nav>
        </div>

        {/* 우측 로그인 카드 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            {session.user.image && (
              <img
                src={session.user.image}
                alt="User Profile"
                className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100"
              />
            )}
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-800">{session.user.name}</div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                {session.user.role === "OWNER"
                  ? "👑 조장(Owner)"
                  : session.user.role === "MEMBER"
                  ? "💻 조원(Member)"
                  : "👀 구경꾼(Viewer)"}
              </div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* 현황 요약 가이드판 */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              📅 프로젝트 간트차트 & 진척 타임라인
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
              마일스톤을 직접 수정 및 등록하고, 칸반 보드의 **할일에 등록된 일**을 간편하게 자동으로 긁어와 목표에 엮어줄 수 있습니다.
              타임라인 상의 빨간색 점선인 <span className="text-red-500 font-bold">오늘선 (Today Line)</span> 기준 계획 대비 진척 현황 배지가 실시간 동적 판독 매핑됩니다.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 font-medium">⏳ 대기 중</span>
              <span className="bg-sky-50 text-sky-600 px-2 py-1 rounded border border-sky-200 font-medium">💻 진행 중</span>
              <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded border border-amber-200 font-medium">⚠️ 지연 위험</span>
              <span className="bg-red-50 text-red-600 px-2 py-1 rounded border border-red-200 font-bold">🚨 기한 초과</span>
              <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200 font-medium">✅ 완료</span>
            </div>
          </div>

          {/* 목표 추가 버튼 (Viewer가 아닐 때만 허용) */}
          {session.user.role !== "VIEWER" && (
            <button
              onClick={openCreateModal}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition duration-150 whitespace-nowrap shrink-0 hover:scale-[1.02] active:scale-[0.98]"
            >
              ➕ 목표 마일스톤 추가
            </button>
          )}
        </div>

        {/* 간트차트 핵심 타임라인 보드 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col p-6 space-y-4">
          {milestones.length === 0 ? (
            <div className="py-24 text-center text-slate-400 italic text-xs">
              현재 등록된 마일스톤이 존재하지 않아 간트차트를 구성할 수 없습니다. 상단에서 목표 마일스톤을 추가해 보세요!
            </div>
          ) : (
            <div className="relative border border-slate-200 rounded-xl overflow-x-auto min-w-[700px]">
              {/* 타임라인 헤더 (날짜 눈금) */}
              <div className="bg-slate-50 border-b border-slate-200 h-12 relative flex items-center">
                <div className="w-1/4 min-w-[180px] border-r border-slate-200 px-4 text-xs font-bold text-slate-500 relative z-25 bg-slate-50">
                  목표 마일스톤 명칭 / 관리
                </div>
                <div className="flex-1 relative h-full">
                  {gridTicks.map((tick, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 text-[10px] text-slate-400 font-semibold border-l border-slate-200/80 pt-3.5 pl-1.5"
                      style={{ left: `${tick.leftPercent}%` }}
                    >
                      {tick.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* 간트차트 본체 */}
              <div className="flex relative bg-white">
                {/* 1. 왼쪽 고정 명칭 및 조작 컬럼 */}
                <div className="w-1/4 min-w-[180px] border-r border-slate-200 divide-y divide-slate-200 shrink-0 bg-white relative z-20">
                  {milestones.map((ms) => {
                    const msCards = ms.cards;
                    const totalCount = msCards.length;
                    const doneCount = msCards.filter((c) => c.status === "DONE").length;
                    const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                    const mStart = new Date(ms.createdAt).getTime();
                    const mEnd = new Date(ms.dueDate).getTime();

                    // 진행 상태 판독 배지 식별
                    let statusBadge = { text: "💻 진행 중", style: "bg-sky-50 text-sky-600 border-sky-200" };
                    if (todayTime < mStart) {
                      statusBadge = { text: "⏳ 대기 중", style: "bg-slate-100 text-slate-500 border-slate-200" };
                    } else if (progress === 100) {
                      statusBadge = { text: "✅ 완료", style: "bg-emerald-50 text-emerald-600 border-emerald-250" };
                    } else if (todayTime > mEnd) {
                      statusBadge = { text: "🚨 기한 초과", style: "bg-red-50 text-red-600 border-red-200 font-bold" };
                    } else {
                      const timeElapsed = todayTime - mStart;
                      const timeProgressRatio = (timeElapsed / (mEnd - mStart)) * 100;
                      if (progress < timeProgressRatio - 15) {
                        statusBadge = { text: "⚠️ 지연 위험", style: "bg-amber-50 text-amber-600 border-amber-200 animate-pulse font-semibold" };
                      }
                    }

                    return (
                      <div key={ms.id} className="h-[76px] p-3 flex flex-col justify-center bg-white group select-none">
                        <div className="flex items-center justify-between gap-1">
                          <div className="text-xs font-bold text-slate-800 truncate" title={ms.title}>
                            {ms.title}
                          </div>
                          {/* 조원/조장 권한일 경우 수정/삭제 툴 메뉴 노출 */}
                          {session.user.role !== "VIEWER" && (
                            <div className="flex items-center gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(ms)}
                                className="text-[10px] bg-slate-100 hover:bg-sky-50 hover:text-sky-600 px-1.5 py-0.5 rounded border border-slate-200 transition"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(ms.id)}
                                className="text-[10px] bg-slate-100 hover:bg-red-50 hover:text-red-600 px-1.5 py-0.5 rounded border border-slate-200 transition"
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium whitespace-nowrap ${statusBadge.style}`}>
                            {statusBadge.text}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {progress}% ({doneCount}/{totalCount}개)
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          기한: {new Date(ms.dueDate).toLocaleDateString("ko-KR")}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. 오른쪽 타임라인 그래프 컬럼 */}
                <div className="flex-1 relative divide-y divide-slate-200 bg-white">
                  {/* 실시간 오늘 세로 가이드라인 */}
                  {isTodayVisible && (
                    <div
                      className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-500 z-10 flex flex-col items-center pointer-events-none"
                      style={{ left: `${todayLeft}%` }}
                    >
                      <span className="bg-red-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow -translate-x-1/2 -translate-y-2.5 whitespace-nowrap">
                        오늘 (TODAY)
                      </span>
                    </div>
                  )}

                  {milestones.map((ms) => {
                    const msCards = ms.cards;
                    const totalCount = msCards.length;
                    const doneCount = msCards.filter((c) => c.status === "DONE").length;
                    const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                    const mStart = new Date(ms.createdAt).getTime();
                    const mEnd = new Date(ms.dueDate).getTime();
                    const mDuration = mEnd - mStart;

                    let leftRatio = ((mStart - minStart.getTime()) / totalDuration) * 100;
                    let widthRatio = (mDuration / totalDuration) * 100;

                    if (leftRatio < 0) {
                      widthRatio += leftRatio;
                      leftRatio = 0;
                    }
                    if (leftRatio + widthRatio > 100) {
                      widthRatio = 100 - leftRatio;
                    }
                    if (widthRatio < 2) {
                      widthRatio = 2;
                    }

                    return (
                      <div key={ms.id} className="h-[76px] relative flex items-center px-4 hover:bg-slate-50/50 transition">
                        {gridTicks.map((tick, tIdx) => (
                          <div
                            key={tIdx}
                            className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                            style={{ left: `${tick.leftPercent}%` }}
                          />
                        ))}

                        {/* 간트 차트 실시간 진행 막대(Bar) */}
                        <div
                          className="absolute h-6 rounded-lg bg-slate-150 border border-slate-200 overflow-hidden flex shadow-sm group hover:border-slate-400 transition cursor-pointer"
                          style={{
                            left: `${leftRatio}%`,
                            width: `${widthRatio}%`,
                          }}
                          onClick={() => session.user.role !== "VIEWER" && openEditModal(ms)}
                        >
                          <div
                            className="bg-gradient-to-r from-sky-400 to-emerald-400 h-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>

                          {/* 호버 시 툴팁 */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block z-30 bg-slate-900 text-white text-[9px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                            달성량: {progress}% ({doneCount}/{totalCount} 완료)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 목표 마일스톤 생성/수정 대화상자 (모달) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {modalMode === "CREATE" ? "🎯 신규 목표 마일스톤 등록" : "⚙️ 목표 마일스톤 및 일정 수정"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* 제목 입력 */}
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">목표 명칭 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 최종 완성본 시연 및 배포"
                  className="w-full px-3 py-2 border border-slate-350 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-hidden focus:border-sky-500"
                  required
                />
              </div>

              {/* 상세 설명 */}
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">상세 설명</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="목표 마일스톤에 대한 구체적인 내역을 기록하세요."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-350 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              {/* 목표 마감일 */}
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">목표 마감 기한 *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-slate-350 rounded-lg text-slate-800 bg-white focus:outline-hidden focus:border-sky-500"
                  required
                />
              </div>

              {/* ⚡ 할일에 등록된 일 자동으로 불러오기 영역 */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-700 block">📂 할일(칸반 카드) 연동 관리</span>
                    <span className="text-[10px] text-slate-400">마일스톤에 엮어서 진척도를 추적할 태스크를 연결합니다.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoLoadCards}
                    className="bg-white hover:bg-sky-50 text-sky-600 border border-sky-200 hover:border-sky-300 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-xs transition"
                  >
                    🔄 할일 불러오기
                  </button>
                </div>

                {/* 불러온 카드 체크박스 리스트 */}
                {loadingCards ? (
                  <div className="text-center py-4 text-slate-400 italic text-[11px]">
                    데이터베이스에서 미연동 할일을 가져오는 중...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* 수정 모드일 때 이미 해당 마일스톤에 엮여 있는 카드 목록 표시 */}
                    {modalMode === "EDIT" && milestones.find((m) => m.id === selectedMilestoneId)?.cards.map((card) => (
                      <label
                        key={card.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-50 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedCardIds.includes(card.id)}
                            onChange={() => handleCardToggle(card.id)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                          />
                          <span className="font-bold text-slate-700">{card.title}</span>
                        </div>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-semibold">
                          현재 연동 중
                        </span>
                      </label>
                    ))}

                    {/* 데이터베이스에서 자동으로 긁어온 미연동 카드(할일) 목록 표시 */}
                    {unlinkedCards.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between border-t border-slate-200 pt-2 pb-1">
                          <span className="text-[10px] font-bold text-slate-500">✨ 미연동 할일 ({unlinkedCards.length}개 발견)</span>
                          <button
                            type="button"
                            onClick={handleSelectAllUnlinked}
                            className="text-[9px] text-sky-600 font-extrabold hover:underline"
                          >
                            {unlinkedCards.every((c) => selectedCardIds.includes(c.id)) ? "☑️ 전체 해제" : "✅ 전체 선택"}
                          </button>
                        </div>
                        <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1">
                          {unlinkedCards.map((card) => (
                            <label
                              key={card.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/20 transition cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCardIds.includes(card.id)}
                                onChange={() => handleCardToggle(card.id)}
                                className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                              />
                              <div className="flex-1">
                                <div className="font-semibold text-slate-800">{card.title}</div>
                                <div className="text-[9px] text-slate-400 capitalize">상태: {card.status} | 분야: {card.category}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      modalMode === "CREATE" && (
                        <div className="text-center py-3 text-slate-400 italic text-[10px]">
                          미연동된 할일이 없습니다. [할일 불러오기] 버튼을 누르거나 칸반 보드에서 새 태스크를 생성해 주세요.
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2 rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-5 py-2 rounded-xl shadow transition disabled:opacity-50"
                >
                  {loading ? "저장 중..." : "목표 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
