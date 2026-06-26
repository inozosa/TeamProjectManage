"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

// 분야(카테고리) 정의 맵
const CATEGORY_MAP: Record<string, string> = {
  PLANNING: "기획",
  DESIGN: "디자인",
  FRONTEND: "프론트엔드",
  BACKEND: "백엔드",
};

interface MeetingNote {
  id: string;
  title: string;
  content: string;
  date: string;
}

interface User {
  id: string;
  name: string;
}

interface Milestone {
  id: string;
  title: string;
}

export default function MeetingNotesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // 회의록 및 메타데이터 목록 상태
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  
  // 로딩 및 제어 상태
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  // 새 회의록 폼 상태
  const [newNoteTitle, setNewNoteTitle] = useState<string>("");
  const [newNoteContent, setNewNoteContent] = useState<string>("");

  // 회의록 연계 즉석 카드 발행 폼 상태
  const [cardTitle, setCardTitle] = useState<string>("");
  const [cardContent, setCardContent] = useState<string>("");
  const [cardCategory, setCardCategory] = useState<string>("FRONTEND");
  const [cardAssignee, setCardAssignee] = useState<string>("");
  const [cardMilestone, setCardMilestone] = useState<string>("");

  // 회의록 개별 수정 폼 상태 변수
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editContent, setEditContent] = useState<string>("");

  // AI 분석/요약 모달 관련 상태 변수
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiActionItems, setAiActionItems] = useState<{ title: string; category: string; content: string }[]>([]);

  // 1. 비로그인 유저 리다이렉트
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [sessionStatus, router]);

  // 1.5. 선택된 회의록이 변경될 때 수정 폼 인풋값 동기화 및 수정 모드 해제
  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setIsEditing(false);
    }
  }, [selectedNote]);

  // 2. 회의록 및 카드 발급에 필요한 유저/마일스톤 가져오기
  const fetchData = async () => {
    try {
      // 회의록 목록 조회
      const resNotes = await fetch("/api/notes");
      if (resNotes.ok) {
        const notesData = await resNotes.json();
        setNotes(notesData);
        // 만약 회의록이 있고 선택된 회의록이 없으면 첫 번째 회의록을 보여줍니다.
        if (notesData.length > 0 && !selectedNote) {
          setSelectedNote(notesData[0]);
        }
      }

      // 카드 생성 메타데이터(유저, 마일스톤) 조회를 위해 기존 카드 API 재활용
      const resMeta = await fetch("/api/cards");
      if (resMeta.ok) {
        const metaData = await resMeta.json();
        setUsers(metaData.users);
        setMilestones(metaData.milestones);
      }
    } catch (e) {
      console.error("회의록 데이터 로드 에러:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchData();
    }
  }, [sessionStatus]);

  // 3. 신규 회의록 등록 제출 처리
  const handleCreateNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNoteTitle.trim(),
          content: newNoteContent.trim(),
        }),
      });

      if (res.ok) {
        const added = await res.json();
        setNotes([added, ...notes]);
        setSelectedNote(added);
        setIsCreateOpen(false);
        // 입력 폼 초기화
        setNewNoteTitle("");
        setNewNoteContent("");
      } else {
        alert("회의록을 저장하는 데 실패했습니다.");
      }
    } catch (e) {
      alert("서버 오류 발생");
    }
  };

  // 3.5. 개별 회의록 수정 제출 처리
  const handleUpdateNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedNote || !editTitle.trim() || !editContent.trim()) return;

    try {
      const res = await fetch(`/api/notes/${selectedNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        const updatedNotes = notes.map((n) => (n.id === selectedNote.id ? updated : n));
        setNotes(updatedNotes);
        setSelectedNote(updated);
        setIsEditing(false);
        alert("회의록이 정상적으로 수정되었습니다.");
      } else {
        alert("회의록 수정에 실패했습니다.");
      }
    } catch (e) {
      alert("서버 오류 발생");
    }
  };

  // 3.6. 개별 회의록 영구 삭제 처리
  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    if (!confirm("정말 이 회의록을 영구 삭제하시겠습니까?\n(복구할 수 없습니다)")) return;

    try {
      const res = await fetch(`/api/notes/${selectedNote.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const remainingNotes = notes.filter((n) => n.id !== selectedNote.id);
        setNotes(remainingNotes);
        if (remainingNotes.length > 0) {
          setSelectedNote(remainingNotes[0]);
        } else {
          setSelectedNote(null);
        }
        setIsEditing(false);
        alert("회의록이 삭제되었습니다.");
      } else {
        alert("회의록 삭제에 실패했습니다.");
      }
    } catch (e) {
      alert("서버 오류 발생");
    }
  };

  // 3.7. 회의록 AI 요약 요청 처리
  const handleAiSummarizeNote = async () => {
    if (!selectedNote) return;
    setIsAiOpen(true);
    setAiLoading(true);
    setAiSummary("");
    setAiActionItems([]);

    try {
      const res = await fetch("/api/ai/note-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: selectedNote.content }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
        setAiActionItems(data.actionItems || []);
      } else {
        alert("AI 분석을 수행하는 중 오류가 발생했습니다.");
        setIsAiOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert("AI 요약 분석기 통신 실패");
      setIsAiOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  // 3.8. AI가 도출한 할 일을 즉석 카드 폼에 바인딩
  const handleFillQuickCardForm = (item: { title: string; category: string; content: string }) => {
    setCardTitle(item.title);
    setCardContent(item.content);
    setCardCategory(item.category);
    
    // 모달 닫기
    setIsAiOpen(false);

    // 즉석 카드 폼 영역으로 포커스 자동 스크롤 이동
    const formElement = document.getElementById("quick-card-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }

    alert("💡 AI 할 일이 하단 폼에 자동 입력되었습니다! 담당 조원과 목표 마일스톤을 지정한 뒤 [칸반 보드로 즉석 카드 발행]을 클릭해 주세요.");
  };

  // 4. 회의 내용 바탕 즉석 카드 발급 처리
  const handleQuickCardSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!cardTitle.trim()) {
      alert("할 일 제목을 적어주세요.");
      return;
    }

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cardTitle.trim(),
          content: cardContent.trim() || `[${selectedNote?.title} 회의 도출 안건]`,
          category: cardCategory,
          assigneeId: cardAssignee || null,
          milestoneId: cardMilestone || null,
        }),
      });

      if (res.ok) {
        alert("즉석 할 일이 등록되었습니다.");
        // 폼 리셋
        setCardTitle("");
        setCardContent("");
        setCardCategory("FRONTEND");
        setCardAssignee("");
        setCardMilestone("");
      } else {
        alert("할 일을 추가하는 데 실패했습니다.");
      }
    } catch (e) {
      alert("서버 오류 발생");
    }
  };

  // 데이터 로딩 중 화면 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center flex-col gap-3">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent animate-spin rounded-full"></div>
        <div className="text-xs text-slate-500">회의록을 불러오는 중입니다...</div>
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
            Dev<span className="text-sky-600">Sync</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800 transition">대시보드</Link>
            <Link href="/kanban" className="hover:text-slate-800 transition">칸반 보드</Link>
            <Link href="/notes" className="text-sky-600 font-bold">회의록</Link>
            <Link href="/gantt" className="hover:text-slate-800 transition">간트 차트</Link>
            {session?.user.email === "admin@devsync.com" && (
              <Link href="/admin" className="hover:text-slate-800 transition">승인 관리</Link>
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

      {/* 메인 이단 분할 화면 레이아웃 (왼쪽: 리스트, 오른쪽: 상세 보기) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col md:flex-row gap-6 overflow-hidden">
        
        {/* 1. 왼쪽 패널: 회의록 목록 사이드바 */}
        <section className="w-full md:w-80 shrink-0 flex flex-col bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>📝</span> 조원 회의록 리스트
            </span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
              {notes.length}
            </span>
          </div>

          {/* 회의록 작성 단축 버튼 (구경꾼이 아닐 때만 렌더링) */}
          {userRole !== "VIEWER" && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition duration-150 shadow-sm shrink-0"
            >
              + 새 회의록 기록하기
            </button>
          )}

          {/* 회의록 제목 나열 리스트 */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {notes.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 italic">
                저장된 회의록이 없습니다.
              </div>
            ) : (
              notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`w-full text-left p-3.5 rounded-xl border transition duration-150 ${
                    selectedNote?.id === note.id
                      ? "bg-sky-50 border-sky-350 text-sky-600 font-semibold"
                      : "bg-slate-50 border-slate-150 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  <div className="text-xs truncate">{note.title}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {new Date(note.date).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* 2. 오른쪽 패널: 회의록 본문 상세 내용 및 즉석 카드 발급 */}
        <section className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl p-6 overflow-y-auto shadow-sm">
          {selectedNote ? (
            isEditing ? (
              // 회의록 편집 모드 (인라인 에디터)
              <form onSubmit={handleUpdateNote} className="space-y-5 text-xs">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">📝 회의록 정보 수정</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3.5 py-1.5 rounded-xl border border-slate-350 transition"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-1.5 rounded-xl transition shadow-sm"
                    >
                      저장하기
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-500 font-medium">회의 주제 (안건)</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 bg-slate-50 focus:outline-none focus:border-sky-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-500 font-medium">회의록 본문</label>
                  <textarea
                    rows={12}
                    required
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 bg-slate-50 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
                  />
                </div>
              </form>
            ) : (
              // 회의록 일반 조회 모드
              <div className="space-y-6">
                {/* 회의록 상세 타이틀 */}
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 leading-snug">{selectedNote.title}</h2>
                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                      <span>📅 회의 진행일시:</span>
                      <span>{new Date(selectedNote.date).toLocaleString("ko-KR")}</span>
                    </div>
                  </div>
                  {/* 조장/조원에게만 편집/삭제/AI분석 버튼 표출 */}
                  {userRole !== "VIEWER" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleAiSummarizeNote}
                        className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3.5 py-2 rounded-xl transition duration-150 font-bold flex items-center gap-1 hover:scale-[1.02]"
                      >
                        🤖 AI 요약 분석
                      </button>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl transition duration-150 font-bold"
                      >
                        수정
                      </button>
                      <button
                        onClick={handleDeleteNote}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-xl transition duration-150 font-bold"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>

                {/* 회의 본문 내용 (마크다운 풍 줄바꿈 처리) */}
                <div className="text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200/60 p-5 rounded-xl font-mono whitespace-pre-wrap">
                  {selectedNote.content}
                </div>

                {/* ================= 회의록 기반 즉석 할 일 카드 발급 폼 (구경꾼 제한) ================= */}
                {userRole !== "VIEWER" ? (
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <span>🎯</span> 이 회의 내용을 기반으로 즉석 할 일 추가
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        회의 결과로 도출된 작업이 있다면 여기서 바로 칸반 카드를 발행할 수 있습니다.
                      </p>
                    </div>

                    <form id="quick-card-form" onSubmit={handleQuickCardSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 할 일 제목 */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-semibold">할 일 제목</label>
                        <input
                          type="text"
                          required
                          placeholder="예: 회의 결정에 따른 DB 인덱스 설계"
                          value={cardTitle}
                          onChange={(e) => setCardTitle(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* 추가 설명 (옵션) */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-semibold">세부 메모 (선택)</label>
                        <input
                          type="text"
                          placeholder="부가적인 지시사항을 입력해 주세요."
                          value={cardContent}
                          onChange={(e) => setCardContent(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 분야 분류 */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-semibold">개발 분야</label>
                        <select
                          value={cardCategory}
                          onChange={(e) => setCardCategory(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                        >
                          {Object.entries(CATEGORY_MAP).map(([key, name]) => (
                            <option key={key} value={key}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 담당 조원 지정 */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-semibold">담당자 배정</label>
                        <select
                          value={cardAssignee}
                          onChange={(e) => setCardAssignee(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                        >
                          <option value="">담당자 지정 안 함</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 연계 마일스톤 */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-semibold">연관 목표 기한</label>
                        <select
                          value={cardMilestone}
                          onChange={(e) => setCardMilestone(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                        >
                          <option value="">연결 기한 없음</option>
                          {milestones.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-2 bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition duration-150"
                    >
                      칸반 보드로 즉석 카드 발행
                    </button>
                  </form>
                </div>
              ) : (
                // 구경꾼 접속자용 가이드 문구
                <div className="border-t border-slate-100 pt-6 text-[10px] text-slate-400 italic text-center">
                  💡 구경꾼(교수님/멘토) 권한은 회의록 내용 열람만 가능하며, 새로운 할 일 추가는 조장/조원만 가능합니다.
                </div>
              )}
            </div>
          )
          ) : (
            // 회의록이 하나도 없는 기본 대기 상태
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-2 py-24">
              <span className="text-4xl">📭</span>
              <div className="text-sm font-semibold">회의록 리스트가 비어 있습니다.</div>
              <div className="text-xs">왼쪽 사이드바의 버튼을 눌러 회의 결과를 기록해 보세요.</div>
            </div>
          )}
        </section>
      </main>

      {/* ==================== 회의록 작성 모달 팝업 ==================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">✍️ 새로운 팀 회의록 기록</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-4">
              {/* 회의 안건 주제 */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">회의 주제 (안건)</label>
                <input
                  type="text"
                  required
                  placeholder="예: DevSync 2차 피드백 반영 및 버그 회의"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* 회의록 작성 영역 */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">회의록 본문 내용</label>
                <textarea
                  rows={10}
                  required
                  placeholder="## 회의 일시&#13;2026-xx-xx&#13;&#13;## 회의 안건&#13;- ...&#13;&#13;## 결정 사항&#13;- ..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
                />
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
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 3. AI 회의록 분석 및 요약 결과 모달 팝업 ==================== */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <span>🤖</span> Gemini AI 회의록 분석 브리핑
              </h3>
              <button
                onClick={() => setIsAiOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {aiLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-purple-650 border-t-transparent animate-spin rounded-full"></div>
                <div className="text-xs text-slate-500 font-semibold">Gemini가 회의 내용을 요약하고 할 일을 도출하는 중입니다...</div>
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* AI 요약 리포트 */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 block">📊 회의록 핵심 요약</span>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 leading-relaxed text-slate-700 whitespace-pre-wrap font-mono">
                    {aiSummary}
                  </div>
                </div>

                {/* 도출된 실행 계획 (Action Item) */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 block">📋 도출된 실행 할 일 (Action Item)</span>
                  {aiActionItems.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 italic">
                      회의 내용에서 추출된 명확한 할 일이 발견되지 않았습니다.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {aiActionItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl hover:border-purple-300 transition flex items-center justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                                {item.category === "PLANNING" ? "기획" : item.category === "DESIGN" ? "디자인" : item.category === "FRONTEND" ? "프론트엔드" : "백엔드"}
                              </span>
                              <span className="font-bold text-slate-800">{item.title}</span>
                            </div>
                            <p className="text-slate-500 text-[10px] leading-relaxed">{item.content}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleFillQuickCardForm(item)}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow transition"
                          >
                            입력 폼 복사
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAiOpen(false)}
                className="py-2 px-4 rounded-xl border border-slate-350 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
