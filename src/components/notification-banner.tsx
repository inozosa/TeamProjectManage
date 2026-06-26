"use client";

import { useEffect, useState } from "react";

// 알림 정보의 데이터 타입 정의
interface NotificationProps {
  id: string;
  title: string;
  content: string;
  createdAt: Date | string;
}

/**
 * NotificationBanner 컴포넌트
 * 대시보드 최상단에 유리 블러(Glassmorphism) 스타일로 조장의 실시간 개발 브리핑을 띄워주는 클라이언트 컴포넌트입니다.
 */
export function NotificationBanner({ notification }: { notification: NotificationProps | null }) {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // 컴포넌트가 마운트되었을 때, 이전에 읽어서 닫은 알림인지 localStorage를 확인합니다.
  useEffect(() => {
    if (!notification) return;

    const closedNotificationId = localStorage.getItem(`closed_notification_${notification.id}`);
    
    // 이미 닫았던 알림이 아니라면 배너를 화면에 노출시킵니다.
    if (closedNotificationId !== notification.id) {
      setIsVisible(true);
    }
  }, [notification]);

  // 브리핑을 읽고 확인(닫기)을 눌렀을 때 작동하는 함수
  const handleClose = () => {
    if (!notification) return;

    // 로컬 스토리지에 해당 알림 ID를 기록하여 다시 열리지 않도록 저장합니다.
    localStorage.setItem(`closed_notification_${notification.id}`, notification.id);
    setIsVisible(false);
  };

  // 노출해야 할 알림 데이터가 없거나 이미 읽어서 닫은 경우 아무것도 그리지 않습니다.
  if (!notification || !isVisible) return null;

  // 알림 생성 날짜 포맷팅
  const dateObj = new Date(notification.createdAt);
  const formattedDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 ${dateObj.getHours().toString().padStart(2, "0")}:${dateObj.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div className="w-full px-6 pt-6 transition-all duration-300 animate-fadeIn">
      {/* 글래스모피즘이 적용된 은은한 하늘색 그라디언트 및 테두리 디자인 배너 */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-950/30 via-[#161B22]/80 to-indigo-950/20 backdrop-blur-md p-5 shadow-2xl">
        {/* 미려한 빛 번짐(Glow) 효과 배경 장식 */}
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            {/* 타이틀 영역 */}
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400"></span>
              </span>
              <h4 className="text-sm font-extrabold text-white tracking-wide">
                {notification.title}
              </h4>
              <span className="text-[10px] text-sky-400/80 font-mono bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/10">
                {formattedDate}
              </span>
            </div>

            {/* 마크다운 요약 본문 표시 영역 (줄바꿈 허용) */}
            <div className="text-xs text-[#C9D1D9] leading-relaxed whitespace-pre-wrap font-sans bg-[#0B0F19]/60 p-4 rounded-xl border border-[#21262D] max-h-48 overflow-y-auto">
              {notification.content}
            </div>
          </div>

          {/* 확인 완료 및 닫기 액션 버튼 */}
          <div className="flex items-center justify-end self-end md:self-center">
            <button
              onClick={handleClose}
              className="py-2 px-4 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 active:bg-sky-500/30 border border-sky-500/35 hover:border-sky-500/50 text-sky-400 text-xs font-bold transition duration-200 shadow-lg shadow-sky-950/20"
            >
              읽음 확인 완료 ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
