"use client";

import { useState } from "react";

// 테스트를 위해 카드 목록과 성공 시 칸반 보드 데이터를 갱신해 줄 콜백 함수를 인자로 받습니다.
interface Card {
  id: string;
  title: string;
}

interface GithubSimulatorProps {
  cards: Card[];
  onSuccess: () => void;
}

export function GithubSimulator({ cards, onSuccess }: GithubSimulatorProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false); // 모달 오픈 상태
  const [selectedCardId, setSelectedCardId] = useState<string>(""); // 선택한 카드 CUID
  const [author, setAuthor] = useState<string>("김도윤"); // 가상 커밋 작성자 이름
  const [commitMessage, setCommitMessage] = useState<string>(""); // 가상 커밋 메시지
  const [loading, setLoading] = useState<boolean>(false); // 요청 로딩 상태

  // 드롭다운에서 테스트할 카드를 골랐을 때 호출되는 함수
  const handleCardChange = (cardId: string) => {
    setSelectedCardId(cardId);
    if (cardId) {
      // 25자리 카드 CUID를 커밋 메시지 포맷에 맞추어 자동으로 자동완성해 줍니다 (사용자 편의).
      setCommitMessage(`[DevSync-${cardId}] 로그인 기능 버그 수정 및 연동 완료! fix`);
    } else {
      setCommitMessage("");
    }
  };

  // 모의 깃허브 웹훅 데이터를 전송하는 핵심 함수
  const handleSimulate = async () => {
    if (!selectedCardId || !commitMessage.trim()) return;

    setLoading(true);
    try {
      // 깃허브 웹훅(Github Webhook JSON Payload) 규격에 완벽히 맞춘 가상 데이터를 설계합니다.
      const mockPayload = {
        commits: [
          {
            // 가상 7자리 커밋 해시 ID 생성
            id: Math.random().toString(36).substring(2, 9),
            message: commitMessage.trim(),
            author: {
              name: author.trim(),
              email: `${author.trim()}@github.com`,
            },
          },
        ],
      };

      // 우리가 구현한 '/api/webhooks/github' 주소로 가상 웹훅 요청을 보냅니다.
      const res = await fetch("/api/webhooks/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPayload),
      });

      if (res.ok) {
        alert("깃허브 푸시 웹훅 시뮬레이션 발송 성공! 칸반 카드가 자동으로 갱신됩니다. 🚀");
        setIsOpen(false);
        // 모달창을 닫고, 칸반 보드의 카드 목록을 새로고침하는 콜백 함수를 가동합니다.
        onSuccess();
      } else {
        alert("웹훅 수신은 되었으나 데이터 처리에 실패했습니다.");
      }
    } catch (e) {
      alert("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 화면 우측 하단에 고정되어 돌아가는 태엽 모양의 플로팅 휠 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gray-900 border border-gray-700 hover:border-sky-500 text-sky-400 text-xs font-bold rounded-full shadow-2xl transition duration-200 group"
      >
        <span className="animate-spin group-hover:animate-none">⚙️</span>
        <span>GitHub 시뮬레이터</span>
      </button>

      {/* 시뮬레이터 전용 대화상자(모달) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#161B22] border border-[#21262D] rounded-2xl shadow-2xl p-6 space-y-4">
            
            {/* 헤더 부분 */}
            <div className="flex items-center justify-between border-b border-[#21262D] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>🐱</span> 깃허브 웹훅 시뮬레이터
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#8B949E] hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* 안내 배너 */}
            <div className="text-[10px] text-gray-400 bg-sky-950/20 border border-sky-500/20 p-3 rounded-lg leading-relaxed">
              <strong>💡 시뮬레이션 가이드</strong><br />
              실제 깃허브에 코드를 push하지 않아도, 지정한 카드에 대해 '가상 커밋' 소식을 전송해 **[카드 자동 완료 처리]** 및 **[커밋 로그 기록]** 기능이 정상 구동하는지 눈으로 확인할 수 있는 개발자용 패널입니다.
            </div>

            {/* 입력 폼 필드들 */}
            <div className="space-y-3 text-left">
              {/* 1. 카드 지정 드롭다운 */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#8B949E] font-semibold">대상 업무 카드 지정</label>
                <select
                  value={selectedCardId}
                  onChange={(e) => handleCardChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B0F19] border border-[#30363D] rounded-xl text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">테스트할 카드를 선택하세요</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.id.substring(0, 5)}..] {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. 커밋 메시지 작성자 */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#8B949E] font-semibold">커밋 작성 조원 이름</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B0F19] border border-[#30363D] rounded-xl text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* 3. 커밋 메시지 입력 */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#8B949E] font-semibold">커밋 메시지 (카드 ID 포함)</label>
                <textarea
                  rows={2}
                  placeholder="예: [DevSync-카드ID] 에러 수정완료"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B0F19] border border-[#30363D] rounded-xl text-white focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
                />
                <span className="text-[8px] text-gray-500 block leading-tight">
                  ※ 메시지에 <strong className="text-[#38BDF8]">fix, resolve, close, done, 완료, 해결</strong> 단어가 섞여 있으면, 카드가 자동으로 <strong>'완료(DONE)'</strong> 컬럼으로 비행해 날아가게 됩니다.
                </span>
              </div>
            </div>

            {/* 모달 하단 버튼 그룹 */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="py-1.5 px-4 rounded-xl border border-[#30363D] hover:bg-[#21262D] text-xs font-semibold text-white transition"
              >
                닫기
              </button>
              <button
                onClick={handleSimulate}
                disabled={loading || !selectedCardId || !commitMessage.trim()}
                className="py-1.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition"
              >
                {loading ? "웹훅 패킷 발송 중.." : "모의 푸시 웹훅 발송"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
