"use client";

import { useState } from "react";

// 당일 완료된 업무 카드 내역들을 기반으로 Gemini AI 브리핑을 요청하고 결과를 보여주는 컴포넌트입니다.
export function AiSummaryWidget() {
  const [summary, setSummary] = useState<string>(""); // 요약 결과 텍스트 상태
  const [loading, setLoading] = useState<boolean>(false); // 로딩 상태
  const [copied, setCopied] = useState<boolean>(false); // 복사 완료 표시 상태
  const [publishing, setPublishing] = useState<boolean>(false); // 알림 발송 중 로딩 상태 (추가)

  // 백엔드 API에 AI 요약 요청을 보내는 함수
  const handleGenerateSummary = async () => {
    setLoading(true);
    setSummary("");
    try {
      // '/api/ai/summarize' 경로로 POST 요청을 보냅니다.
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
      });
      const data = await response.json();
      
      if (response.ok && data.summary) {
        setSummary(data.summary);
      } else {
        setSummary(data.error || "요약본을 추출하는 중 예상치 못한 문제가 발생했습니다.");
      }
    } catch (e) {
      setSummary("서버와 통신하는 과정에서 에러가 발생했습니다. 네트워크 상태를 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  // 조원들의 대시보드 화면 상단 알림 전광판으로 브리핑 공지를 발송하는 함수 (추가)
  const handlePublishSummary = async () => {
    if (!summary) return;
    setPublishing(true);
    try {
      const response = await fetch("/api/ai/summarize/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: summary,
        }),
      });
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message || "📢 오늘의 브리핑이 성공적으로 전 조원의 화면에 전송되었습니다!");
      } else {
        alert(data.error || "브리핑을 발송하는 데 실패했습니다.");
      }
    } catch (e) {
      alert("서버와 통신하는 과정에서 에러가 발생했습니다. 네트워크 연결 상태를 확인해 주세요.");
    } finally {
      setPublishing(false);
    }
  };

  // 생성된 텍스트를 컴퓨터 클립보드에 복사해 주는 함수
  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    // 2초 뒤에 복사 성공 문구를 다시 원래대로 돌려놓습니다.
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-5 bg-[#161B22]/80 backdrop-blur-sm rounded-2xl border border-[#21262D] space-y-4">
      {/* 위젯 헤더 장식 */}
      <div className="flex items-center justify-between border-b border-[#21262D] pb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span>💡</span> AI 오늘 개발 요약기
        </h3>
        <span className="text-[10px] text-sky-400 font-semibold bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/20">
          Gemini AI
        </span>
      </div>

      {/* 로딩 중일 때 보여줄 로딩 링 */}
      {loading ? (
        <div className="py-8 text-center space-y-3">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full"></div>
          <div className="text-xs text-[#8B949E]">오늘 완료된 태스크 분석 및 정리 중...</div>
        </div>
      ) : summary ? (
        // 결과가 완성되었을 때 표기할 마크다운 상자
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#21262D] text-xs leading-relaxed text-[#C9D1D9] whitespace-pre-wrap font-mono">
            {summary}
          </div>
          {/* 복사 및 조원 알림 전송 버튼 */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCopy}
              className="py-1.5 px-3 rounded-lg border border-[#30363D] hover:bg-[#21262D] text-xs font-semibold text-white transition duration-200"
            >
              {copied ? "복사 완료! ✓" : "텍스트 복사"}
            </button>
            <button
              onClick={handlePublishSummary}
              disabled={publishing}
              className="py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition duration-200 disabled:opacity-50 flex items-center gap-1"
            >
              {publishing ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full"></span>
                  발송 중...
                </>
              ) : (
                "📢 조원 화면으로 알림 발송"
              )}
            </button>
          </div>
        </div>
      ) : (
        // 초기화 상태일 때 보여줄 설명 및 트리거 버튼
        <div className="py-6 text-center space-y-4">
          <p className="text-xs text-[#8B949E]">
            오늘 조원들이 완료한 업무 카드들과 나눈 소통 기록을 분석하여 하루 진척 사항을 3줄 요약 브리핑으로 변환해 줍니다.
          </p>
          <button
            onClick={handleGenerateSummary}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold rounded-xl transition duration-200 shadow-md"
          >
            오늘의 개발 브리핑 생성
          </button>
        </div>
      )}
    </div>
  );
}
