"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { GithubSimulator } from "@/components/github-simulator";

// 분야(카테고리) 및 진행 상태(Status) 맵 정의
const CATEGORY_MAP: Record<string, string> = {
  PLANNING: "기획",
  DESIGN: "디자인",
  FRONTEND: "프론트엔드",
  BACKEND: "백엔드",
};

const STATUS_MAP: Record<string, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
};

// 타입 선언 정의
interface User {
  id: string;
  name: string;
  image: string | null;
  role: string;
}

interface Milestone {
  id: string;
  title: string;
}

interface Comment {
  id: string;
  content: string;
  isSystem: boolean;
  createdAt: string;
  user?: {
    name: string;
    image: string | null;
    role: string;
  };
}

interface Card {
  id: string;
  title: string;
  content: string | null;
  status: string;
  category: string;
  isBlocker: boolean;
  blockerDesc: string | null;
  assigneeId: string | null;
  assignee?: User | null;
  milestoneId: string | null;
  milestone?: Milestone | null;
}

export default function KanbanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center flex-col gap-3">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent animate-spin rounded-full"></div>
        <div className="text-xs text-slate-500">화면을 준비하는 중입니다...</div>
      </div>
    }>
      <KanbanBoardContent />
    </Suspense>
  );
}

function KanbanBoardContent() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 데이터베이스 수집 상태 목록
  const [cards, setCards] = useState<Card[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // UI 필터 및 로딩 상태
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL"); // ALL, PLANNING, DESIGN, FRONTEND, BACKEND
  const [loading, setLoading] = useState<boolean>(true);
  
  // 모바일 화면 전용 상태 전환 탭 (TODO, IN_PROGRESS, DONE 중 택일)
  const [activeMobileTab, setActiveMobileTab] = useState<"TODO" | "IN_PROGRESS" | "DONE">("TODO");

  // 모달 제어 상태
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");

  // 신규 카드 입력 폼 상태
  const [newTitle, setNewTitle] = useState<string>("");
  const [newContent, setNewContent] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("FRONTEND");
  const [newAssignee, setNewAssignee] = useState<string>("");
  const [newMilestone, setNewMilestone] = useState<string>("");

  // 카드 상세 수정 폼 상태
  const [detailTitle, setDetailTitle] = useState<string>("");
  const [detailContent, setDetailContent] = useState<string>("");
  const [detailCategory, setDetailCategory] = useState<string>("FRONTEND");
  const [detailAssignee, setDetailAssignee] = useState<string>("");
  const [detailMilestone, setDetailMilestone] = useState<string>("");
  const [detailIsBlocker, setDetailIsBlocker] = useState<boolean>(false);
  const [detailBlockerDesc, setDetailBlockerDesc] = useState<string>("");

  // 1. 비로그인 유저 리다이렉트 처리
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [sessionStatus, router]);

  // 2. 카드 및 메타데이터 가져오기
  const fetchData = async () => {
    try {
      const res = await fetch("/api/cards");
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards);
        setMilestones(data.milestones);
        setUsers(data.users);
      }
    } catch (e) {
      console.error("데이터 로드 에러:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchData();
    }
  }, [sessionStatus]);

  // 2.5. URL 쿼리 파라미터 blockerId 감지 시 해당하는 카드 모달 자동 오픈
  useEffect(() => {
    if (cards.length > 0) {
      const blockerId = searchParams.get("blockerId");
      if (blockerId) {
        const targetCard = cards.find((c) => c.id === blockerId);
        if (targetCard) {
          handleCardClick(targetCard);
        }
      }
    }
  }, [cards, searchParams]);

  // 3. 카드 클릭 시 상세 모달 오픈 및 댓글 로드
  const handleCardClick = async (card: Card) => {
    setSelectedCard(card);
    setDetailTitle(card.title);
    setDetailContent(card.content || "");
    setDetailCategory(card.category);
    setDetailAssignee(card.assigneeId || "");
    setDetailMilestone(card.milestoneId || "");
    setDetailIsBlocker(card.isBlocker);
    setDetailBlockerDesc(card.blockerDesc || "");
    setNewComment("");

    try {
      const res = await fetch(`/api/cards/${card.id}/comments`);
      if (res.ok) {
        const commentData = await res.json();
        setComments(commentData);
      }
    } catch (e) {
      console.error("댓글 로드 실패:", e);
    }
  };

  // 4. 드래그 시작 시 카드 ID 보관
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    if (session?.user.role === "VIEWER") {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", cardId);
  };

  // 5. 드롭 영역 위에 올라왔을 때 드롭 허용
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 6. 카드를 원하는 컬럼에 드롭했을 때 상태 업데이트
  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    const targetCard = cards.find((c) => c.id === cardId);

    // 이미 같은 상태이거나 대상 카드가 없으면 리턴
    if (!targetCard || targetCard.status === newStatus) return;

    // 프론트엔드 화면 상태를 즉각 업데이트하여 딜레이 없이 부드러운 전환 제공 (Optimistic Update)
    const updatedCards = cards.map((c) =>
      c.id === cardId ? { ...c, status: newStatus } : c
    );
    setCards(updatedCards);

    try {
      // 서버에 상태 변경 전송
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        // 만약 에러 시 데이터를 롤백 복구
        fetchData();
        alert("상태 변경에 실패했습니다.");
      } else {
        // 정상 변경 완료 시 최신 히스토리 댓글 동기화를 위해 재로드
        fetchData();
      }
    } catch (e) {
      fetchData();
    }
  };

  // 7. 신규 카드 발행 처리
  const handleCreateCard = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          category: newCategory,
          assigneeId: newAssignee || null,
          milestoneId: newMilestone || null,
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        // 입력 폼 초기화
        setNewTitle("");
        setNewContent("");
        setNewCategory("FRONTEND");
        setNewAssignee("");
        setNewMilestone("");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "카드 추가 실패");
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 8. 카드 상세 정보 수정 처리 (조장, 조원 전용)
  const handleUpdateCardDetails = async () => {
    if (!selectedCard) return;
    try {
      const res = await fetch(`/api/cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: detailTitle.trim(),
          content: detailContent.trim(),
          category: detailCategory,
          assigneeId: detailAssignee || null,
          milestoneId: detailMilestone || null,
          isBlocker: detailIsBlocker,
          blockerDesc: detailIsBlocker ? detailBlockerDesc.trim() : "",
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        // 상세 정보 갱신 후 리로드
        setSelectedCard(updated);
        fetchData();
        alert("카드가 정상적으로 수정되었습니다.");
      } else {
        alert("카드 수정에 실패했습니다.");
      }
    } catch (e) {
      alert("서버 연동 실패");
    }
  };

  // 8.1. 간트차트(마일스톤)에 이 카드를 즉시 연결하는 함수 (신규)
  const handleLinkToGantt = async (milestoneId: string) => {
    if (!selectedCard) return;
    if (!milestoneId) {
      alert("간트차트에 연동할 대상 목표 일정을 선택해 주세요.");
      return;
    }

    try {
      const res = await fetch(`/api/cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: detailTitle.trim(),
          content: detailContent?.trim() || "",
          category: detailCategory,
          assigneeId: detailAssignee || null,
          milestoneId: milestoneId,
          isBlocker: detailIsBlocker,
          blockerDesc: detailIsBlocker ? detailBlockerDesc.trim() : "",
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedCard(updated);
        setDetailMilestone(milestoneId);
        fetchData();
        
        // 조원이 즉석에서 달력 일정을 보러 갈 수 있도록 워프 제안
        if (confirm("📅 간트차트 일정표에 추가가 완료되었습니다!\n지금 바로 간트차트 화면으로 이동해 확인할까요?")) {
          // 모달 상세 창을 닫고 간트 탭으로 고속 워프
          setSelectedCard(null);
          router.push("/gantt");
        }
      } else {
        alert("간트차트 연동 등록에 실패했습니다.");
      }
    } catch (e) {
      alert("서버 통신 실패");
    }
  };

  // 8.2. 간트차트(마일스톤) 연동을 즉시 끊어버리는 해제 함수 (신규)
  const handleUnlinkFromGantt = async () => {
    if (!selectedCard) return;

    try {
      const res = await fetch(`/api/cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: detailTitle.trim(),
          content: detailContent?.trim() || "",
          category: detailCategory,
          assigneeId: detailAssignee || null,
          milestoneId: null, // 마일스톤 연결 해제
          isBlocker: detailIsBlocker,
          blockerDesc: detailIsBlocker ? detailBlockerDesc.trim() : "",
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedCard(updated);
        setDetailMilestone("");
        fetchData();
        alert("📅 간트차트(마일스톤) 연동 해제가 즉시 완료되었습니다.");
      } else {
        alert("연동 해제에 실패했습니다.");
      }
    } catch (e) {
      alert("서버 통신 실패");
    }
  };

  // 8.5. 카드 영구 삭제 처리 (조장, 조원 전용)
  const handleDeleteCard = async () => {
    if (!selectedCard) return;
    if (!confirm("정말 이 카드를 영구 삭제하시겠습니까?\n(등록된 댓글도 연쇄적으로 영구 삭제됩니다)")) {
      return;
    }

    try {
      const res = await fetch(`/api/cards/${selectedCard.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSelectedCard(null);
        fetchData();
        alert("카드가 삭제되었습니다.");
      } else {
        alert("카드 삭제에 실패했습니다.");
      }
    } catch (e) {
      alert("서버 통신 실패");
    }
  };

  // 9. 코멘트/피드백 작성 처리 (누구나 가능 - 구경꾼 포함)
  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !newComment.trim()) return;

    try {
      const res = await fetch(`/api/cards/${selectedCard.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (res.ok) {
        const added = await res.json();
        setComments([...comments, added]);
        setNewComment("");
      } else {
        alert("댓글 작성 실패");
      }
    } catch (e) {
      alert("서버 통신 실패");
    }
  };

  // 카테고리 필터를 적용하여 그려줄 카드 분류
  const filteredCards = cards.filter(
    (c) => selectedCategory === "ALL" || c.category === selectedCategory
  );

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center flex-col gap-3">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent animate-spin rounded-full"></div>
        <div className="text-xs text-slate-500">데이터를 가져오는 중입니다...</div>
      </div>
    );
  }

  const userRole = session?.user.role;

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
            <Link href="/kanban" className="text-sky-600 font-bold">칸반 보드</Link>
            <Link href="/notes" className="hover:text-slate-800 transition">회의록</Link>
            <Link href="/gantt" className="hover:text-slate-800 transition">간트 차트</Link>
            {session?.user.role === "OWNER" && (
              <Link href="/admin" className="hover:text-slate-800 transition">회원 관리</Link>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 hidden sm:inline">
            현재 역할: <strong className="text-slate-800">{userRole === "OWNER" ? "조장" : userRole === "MEMBER" ? "조원" : "구경꾼"}</strong>
          </span>
          <LogoutButton />
        </div>
      </header>

      {/* 서브 컨트롤 바 (필터링 및 카드 추가 버튼) */}
      <div className="max-w-7xl w-full mx-auto px-6 pt-6 pb-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* 개발 분야별 필터 탭 */}
        <div className="flex flex-wrap gap-2 p-1 bg-slate-200/50 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              selectedCategory === "ALL" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            전체 분야
          </button>
          {Object.entries(CATEGORY_MAP).map(([key, name]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                selectedCategory === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* 새 카드 만들기 버튼 (구경꾼이 아닌 경우에만 렌더링) */}
        {userRole !== "VIEWER" && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="py-2 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold rounded-xl transition duration-150 shadow-sm"
          >
            + 새 카드 추가
          </button>
        )}
      </div>

      {/* 모바일 화면 전용 상태 전환 탭 바 (md 미만 노출) */}
      <div className="md:hidden max-w-7xl w-full mx-auto px-6 mb-2">
        <div className="flex border border-slate-200 bg-white rounded-xl p-1 shadow-sm gap-1">
          {["TODO", "IN_PROGRESS", "DONE"].map((status) => {
            const count = filteredCards.filter((c) => c.status === status).length;
            const isTabActive = activeMobileTab === status;
            return (
              <button
                key={status}
                onClick={() => setActiveMobileTab(status as any)}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  isTabActive
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {status === "TODO" ? "📋 " : status === "IN_PROGRESS" ? "⚡ " : "✅ "}
                {STATUS_MAP[status]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 칸반 보드 메인 판넬 (3개의 상태 열) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {["TODO", "IN_PROGRESS", "DONE"].map((colStatus) => {
          const colCards = filteredCards.filter((c) => c.status === colStatus);

          return (
            <div
              key={colStatus}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, colStatus)}
              className={`flex-col bg-slate-100/60 rounded-2xl border border-slate-200 p-4 min-h-[500px] ${
                activeMobileTab === colStatus ? "flex" : "hidden md:flex"
              }`}
            >
              {/* 컬럼 타이틀 */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>{colStatus === "TODO" ? "📋" : colStatus === "IN_PROGRESS" ? "⚡" : "✅"}</span>
                  {STATUS_MAP[colStatus]}
                </span>
                <span className="text-xs bg-slate-250 px-2 py-0.5 rounded-md text-slate-600 font-semibold">
                  {colCards.length}
                </span>
              </div>

              {/* 컬럼 내 카드 목록 배치 */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {colCards.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 italic">
                    카드가 비어 있습니다.
                  </div>
                ) : (
                  colCards.map((card) => (
                    <div
                      key={card.id}
                      draggable={userRole !== "VIEWER"} // 구경꾼은 드래그 불가능
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      onClick={() => handleCardClick(card)}
                      className={`p-4 rounded-xl bg-white border transition cursor-pointer hover:border-slate-350 hover:scale-[1.01] duration-150 active:cursor-grabbing shadow-sm ${
                        card.isBlocker
                          ? "border-red-500 shadow-md shadow-red-500/10" // 에러 Blocker 활성화 시 빨간 광채
                          : "border-slate-200"
                      }`}
                    >
                      {/* 태그 & 담당자 */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                          {CATEGORY_MAP[card.category]}
                        </span>
                        {card.assignee && (
                          <img
                            src={card.assignee.image || ""}
                            alt={card.assignee.name}
                            title={card.assignee.name}
                            className="w-5 h-5 rounded-full border border-slate-200 bg-slate-100"
                          />
                        )}
                      </div>

                      {/* 제목 */}
                      <h4 className="text-xs font-bold text-slate-800 flex items-start gap-1">
                        {card.isBlocker && <span className="text-red-500 font-bold shrink-0">⚠️</span>}
                        <span className="line-clamp-2 leading-relaxed">{card.title}</span>
                      </h4>

                      {/* 본문 요약 */}
                      {card.content && (
                        <p className="text-[10px] text-slate-500 mt-1.5 line-clamp-2 leading-normal">
                          {card.content}
                        </p>
                      )}

                      {/* 마일스톤 명칭 */}
                      {card.milestone && (
                        <div className="mt-3 pt-2 border-t border-slate-100 text-[9px] text-sky-600 flex items-center gap-1 font-semibold">
                          <span>🎯</span>
                          <span className="truncate">{card.milestone.title}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* ==================== 1. 신규 카드 생성 모달 ==================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">🆕 새로운 업무 카드 발급</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-4">
              {/* 제목 */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">업무 제목</label>
                <input
                  type="text"
                  required
                  placeholder="예: 로그인 UI 퍼블리싱"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* 상세 정보 */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">상세 설명</label>
                <textarea
                  rows={3}
                  placeholder="구현할 기능에 대한 세부 내용을 적어주세요."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 분야 선택 */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">개발 분야</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    {Object.entries(CATEGORY_MAP).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 담당자 설정 */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">담당 조원</label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">담당자 없음</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 마일스톤 연결 */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">연계 마일스톤 (목표)</label>
                <select
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                >
                  <option value="">연결 안 함</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-350 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white rounded-xl transition"
                >
                  발행하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 2. 카드 상세 조회 및 편집 모달 ==================== */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col md:flex-row max-h-[90vh] overflow-hidden">
            
            {/* 왼쪽: 카드 상세 속성 설정 (조장/조원만 입력 가능, 구경꾼은 disabled) */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto border-r border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 font-bold px-2.5 py-1 rounded-md">
                  {STATUS_MAP[selectedCard.status]} 상태
                </span>
                <span className="text-[10px] text-slate-400">ID: {selectedCard.id}</span>
              </div>

              <div className="space-y-3">
                {/* 제목 */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">업무 제목</label>
                  <input
                    type="text"
                    disabled={userRole === "VIEWER"}
                    value={detailTitle}
                    onChange={(e) => setDetailTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 disabled:opacity-50 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* 설명 */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">상세 설명</label>
                  <textarea
                    rows={4}
                    disabled={userRole === "VIEWER"}
                    value={detailContent}
                    onChange={(e) => setDetailContent(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 disabled:opacity-50 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* 카테고리 */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium">분야</label>
                    <select
                      disabled={userRole === "VIEWER"}
                      value={detailCategory}
                      onChange={(e) => setDetailCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 disabled:opacity-50 focus:outline-none"
                    >
                      {Object.entries(CATEGORY_MAP).map(([key, name]) => (
                        <option key={key} value={key}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 담당자 */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium">담당 조원</label>
                    <select
                      disabled={userRole === "VIEWER"}
                      value={detailAssignee}
                      onChange={(e) => setDetailAssignee(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 disabled:opacity-50 focus:outline-none"
                    >
                      <option value="">담당자 없음</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 연결 마일스톤 */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">소속 마일스톤 (목표 일정)</label>
                  <select
                    disabled={userRole === "VIEWER"}
                    value={detailMilestone}
                    onChange={(e) => setDetailMilestone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 disabled:opacity-50 focus:outline-none"
                  >
                    <option value="">연결 안 함</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 🚨 에러 블로커(빨간 불) 스위치 */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-red-500 text-sm">🚨</span> 에러 블로커(진행 장해) 활성화
                      </span>
                      <p className="text-[10px] text-slate-500">
                        에러나 환경 이슈로 개발이 완전히 막혔을 때 켭니다.
                      </p>
                    </div>
                    {/* 토글 스위치 (구경꾼이 아닐 때만 작동) */}
                    <input
                      type="checkbox"
                      disabled={userRole === "VIEWER"}
                      checked={detailIsBlocker}
                      onChange={(e) => setDetailIsBlocker(e.target.checked)}
                      className="w-4 h-4 rounded text-red-500 accent-red-500 disabled:opacity-50"
                    />
                  </div>

                  {/* 블로커 활성화 시 입력할 장애 설명 칸 */}
                  {detailIsBlocker && (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="text-[10px] text-red-500 font-semibold">블로커 원인 및 상세 사유</label>
                      <input
                        type="text"
                        required
                        disabled={userRole === "VIEWER"}
                        placeholder="예: Node.js 버전 불일치 에러 발생, API가 안 뚫림 등"
                        value={detailBlockerDesc}
                        onChange={(e) => setDetailBlockerDesc(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-red-350 rounded-xl text-slate-800 disabled:opacity-50 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  )}
                </div>

                {/* 📅 간트차트(일정표)에 작업 추가/연동 제어 패널 (신규 추가) */}
                <div className="pt-2.5 border-t border-slate-100 space-y-3">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="text-sky-600 text-sm">📅</span> 간트차트 일정표에 추가
                  </span>
                  {detailMilestone ? (
                    // A. 이미 특정 목표 일정(마일스톤)에 카드 정보가 연동 중인 경우
                    <div className="p-3 bg-sky-50/50 border border-sky-200 rounded-xl flex items-center justify-between gap-3 animate-fadeIn text-[10px]">
                      <div className="text-slate-600 leading-relaxed truncate">
                        현재 <strong className="text-sky-700 font-bold">[{milestones.find(m => m.id === detailMilestone)?.title || "연동된 일정"}]</strong>에 지정되어 일정 막대로 표기되고 있습니다.
                      </div>
                      {userRole !== "VIEWER" && (
                        <button
                          type="button"
                          onClick={handleUnlinkFromGantt}
                          className="bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-bold px-2.5 py-1 rounded-lg shrink-0 shadow-sm transition"
                        >
                          연동 해제
                        </button>
                      )}
                    </div>
                  ) : (
                    // B. 아직 마일스톤에 연동되지 않아, 간트차트 추가 단축 패널을 보여주는 경우
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-fadeIn">
                      <p className="text-[10px] text-slate-500 leading-normal">
                        이 태스크를 목표 일정과 연동하여 간트차트 타임라인 화면에 가로 막대로 나타나도록 즉시 등록합니다.
                      </p>
                      {milestones.length === 0 ? (
                        <div className="text-[10px] text-amber-600 italic">
                          ※ 등록된 마일스톤이 존재하지 않습니다. 먼저 간트 차트 화면에서 목표 일정을 추가해 주세요.
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            disabled={userRole === "VIEWER"}
                            value={detailMilestone}
                            onChange={(e) => setDetailMilestone(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-[10px] bg-white border border-slate-250 rounded-lg text-slate-800 focus:outline-none"
                          >
                            <option value="">대상 일정(마일스톤) 선택...</option>
                            {milestones.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.title}
                              </option>
                            ))}
                          </select>
                          {userRole !== "VIEWER" && (
                            <button
                              type="button"
                              onClick={() => handleLinkToGantt(detailMilestone)}
                              disabled={!detailMilestone}
                              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg shadow-sm transition whitespace-nowrap"
                            >
                              간트차트에 등록
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 조장/조원 수정 및 삭제 버튼 */}
              {userRole !== "VIEWER" && (
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteCard}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-4 py-2 rounded-xl transition shrink-0"
                  >
                    🗑️ 삭제
                  </button>
                  <button
                    onClick={handleUpdateCardDetails}
                    className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition"
                  >
                    카드 세부 설정 저장
                  </button>
                </div>
              )}
            </div>

            {/* 오른쪽: 조원들과 나눌 댓글 피드 & 작업 히스토리 목록 (구경꾼 포함 누구나 작성 가능) */}
            <div className="w-full md:w-96 p-6 flex flex-col bg-slate-50 max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 shrink-0">
                <h3 className="text-sm font-bold text-slate-800">💬 히스토리 및 댓글 피드</h3>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              {/* 댓글 피드 리스트 */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
                {comments.length === 0 ? (
                  <div className="text-center py-12 text-[10px] text-slate-400 italic">
                    등록된 소통 기록이 없습니다.
                  </div>
                ) : (
                  comments.map((cmt) => (
                    <div
                      key={cmt.id}
                      className={`p-2.5 rounded-xl border ${
                        cmt.isSystem
                          ? "bg-slate-200/50 border-slate-350/60 text-[10px] text-slate-500 font-mono" // 시스템 자동 로그 스타일
                          : "bg-white border-slate-200 text-xs text-slate-750"
                      }`}
                    >
                      {/* 일반 코멘트 헤더 */}
                      {!cmt.isSystem && cmt.user && (
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500 font-semibold">
                          <span>{cmt.user.name}</span>
                          <span className="text-[8px] px-1 rounded bg-slate-200 uppercase text-sky-700">
                            {cmt.user.role === "OWNER" ? "조장" : cmt.user.role === "MEMBER" ? "조원" : "구경꾼"}
                          </span>
                        </div>
                      )}

                      {/* 본문 */}
                      <div className="whitespace-pre-wrap leading-relaxed break-all">{cmt.content}</div>
                      
                      {/* 날짜 */}
                      <div className="text-[8px] text-slate-400 text-right mt-1.5">
                        {new Date(cmt.createdAt).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 댓글 작성 폼 (모든 권한에서 개방) */}
              <form onSubmit={handleAddComment} className="mt-4 pt-3 border-t border-slate-200 shrink-0 space-y-2">
                <input
                  type="text"
                  placeholder="의견이나 피드백을 남겨주세요..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 active:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  댓글 작성
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
      
      {/* 깃허브 웹훅 연동 실시간 시뮬레이션용 플로팅 패널 */}
      <GithubSimulator cards={cards} onSuccess={fetchData} />
    </div>
  );
}
