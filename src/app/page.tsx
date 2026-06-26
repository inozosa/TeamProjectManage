import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBanner } from "@/components/notification-banner"; // 알림 배너 컴포넌트 임포트

export default async function DashboardPage() {
  // 1. 서버 컴퓨터 단에서 로그인 세션 유무를 먼저 검증합니다.
  const session = await getServerSession(authOptions);
  
  // 로그인 정보가 없거나 세션이 만료된 경우 로그인 화면('/login')으로 튕겨냅니다.
  if (!session || !session.user) {
    redirect("/login");
  }

  // 1.5. 가장 최근에 조장이 발송한 오늘의 개발 브리핑 공지가 있는지 데이터베이스에서 조회합니다.
  const latestNotification = await db.notification.findFirst({
    orderBy: {
      createdAt: "desc",
    },
  });

  // 2. 데이터베이스에서 목표 일정(Milestone)들과 여기에 포함된 할 일 카드들을 한꺼번에 가져옵니다.
  // 마감일이 빠른 순(dueDate: asc)으로 정렬합니다.
  const milestones = await db.milestone.findMany({
    include: {
      cards: true,
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  // 3. 데이터베이스에서 다른 팀원의 발을 묶고 있는 에러(isBlocker = true) 카드를 담당자 정보와 함께 조회합니다.
  const blockerCards = await db.card.findMany({
    where: {
      isBlocker: true,
    },
    include: {
      assignee: true,
    },
  });

  // 4. 대시보드 상단 요약 카드를 위한 통계 수치들을 산출합니다.
  const totalCards = await db.card.count();
  const doneCards = await db.card.count({ where: { status: "DONE" } });
  const inProgressCards = await db.card.count({ where: { status: "IN_PROGRESS" } });
  const todoCards = await db.card.count({ where: { status: "TODO" } });

  // 0으로 나누어 계산 오류가 나지 않도록 방어 코드를 작성합니다 (전체 진척도 비율 계산)
  const totalProgress = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      
      {/* [상단 헤더 바] 네비게이션 및 유저 프로필 표기 */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-8">
          {/* 사이트 타이틀 */}
          <Link href="/" className="text-2xl font-extrabold tracking-wider text-slate-800">
            Dev<span className="text-sky-600">Sync</span>
          </Link>
          {/* 주요 화면 이동 메뉴 */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            <Link href="/" className="text-sky-600 font-bold">
              대시보드
            </Link>
            <Link href="/kanban" className="hover:text-slate-800 transition duration-150">
              칸반 보드
            </Link>
            <Link href="/notes" className="hover:text-slate-800 transition duration-150">
              회의록
            </Link>
            <Link href="/gantt" className="hover:text-slate-800 transition duration-150">
              간트 차트
            </Link>
            {session.user.email === "admin@devsync.com" && (
              <Link href="/admin" className="hover:text-slate-800 transition duration-150">
                승인 관리
              </Link>
            )}
          </nav>
        </div>

        {/* 우측 로그인 유저 카드 및 로그아웃 버튼 */}
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

      {/* [경고] 블로커(진행 방해 에러) 카드가 1개 이상 존재할 때 나타나는 긴급 빨간색 전광판 (헤더 하단으로 이동) */}
      {blockerCards.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200">
          <div className="flex items-center gap-3 text-sm">
            {/* 깜빡이는 사이렌 벨 효과의 SVG 경고 아이콘 */}
            <div className="flex items-center justify-center bg-red-100 p-2 rounded-xl text-red-600 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-60 rounded-xl"></span>
              <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="font-bold flex items-center gap-1.5 text-red-800">
                <span>⚠️ 긴급 병목 현상 감지(블로커 활성화)</span>
                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                  {blockerCards.length}건
                </span>
              </div>
              <p className="text-xs text-red-600/90 mt-1">
                현재 조원들의 진행을 가로막는 에러 상황: 
                {blockerCards.map((c, i) => ` [${c.assignee?.name || "미지정"} - ${c.title}]${i < blockerCards.length - 1 ? "," : ""}`)}
              </p>
            </div>
          </div>
          {/* 입체감 있는 3D 스타일의 경고 트러블슈팅 버튼 컴포넌트 */}
          <Link
            href={`/kanban?blockerId=${blockerCards[0].id}`}
            className="text-xs bg-red-600 hover:bg-red-500 border border-red-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all duration-75 shadow-[0_3px_0_0_#991b1b] hover:shadow-[0_2px_0_0_#991b1b] active:shadow-none hover:translate-y-[1px] active:translate-y-[3px]"
          >
            트러블슈팅하러 가기 &rarr;
          </Link>
        </div>
      )}

      {/* 📢 조장이 보낸 오늘의 개발 브리핑 실시간 배너 알림창 */}
      <NotificationBanner notification={latestNotification} />

      {/* [메인 컨텐츠 공간] */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        
        {/* 프로젝트 핵심 수치 대시보드 위젯 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. 전체 진척도 게이지 카드 */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition duration-200">
            <div className="text-xs text-slate-500 font-medium">전체 프로젝트 완료율</div>
            <div className="text-3xl font-extrabold text-slate-800 flex items-baseline gap-2">
              {totalProgress}%
              <span className="text-xs font-normal text-emerald-600">({doneCards}/{totalCards} 완료)</span>
            </div>
            {/* 진척도 게이지 바 시각화 */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalProgress}%` }}
              ></div>
            </div>
          </div>

          {/* 2. 할 일 잔여량 (Slate 상징 테두리 포인트 추가) */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 border-l-4 border-l-slate-400 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                해야 할 일 (TODO)
              </div>
              <div className="text-3xl font-extrabold text-slate-700 mt-2">{todoCards}</div>
            </div>
            {/* 전일 대비 서브 텍스트 추가 */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
              <span>카드 대기 수</span>
              <span className="font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">
                +1 (전일 대비)
              </span>
            </div>
          </div>

          {/* 3. 진행 중 수량 (Blue 상징 테두리 포인트 추가) */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 border-l-4 border-l-sky-500 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                현재 개발 중 (IN PROGRESS)
              </div>
              <div className="text-3xl font-extrabold text-sky-600 mt-2">{inProgressCards}</div>
            </div>
            {/* 전일 대비 서브 텍스트 추가 */}
            <div className="flex items-center justify-between text-[10px] text-sky-600/70 mt-2">
              <span>기능 카드 수</span>
              <span className="font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 flex items-center gap-0.5">
                ↑ +2 (전일 대비)
              </span>
            </div>
          </div>

          {/* 4. 완료 수량 (Green 상징 테두리 포인트 추가) */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                완료된 업무 (DONE)
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 mt-2">{doneCards}</div>
            </div>
            {/* 전일 대비 서브 텍스트 추가 */}
            <div className="flex items-center justify-between text-[10px] text-emerald-600/70 mt-2">
              <span>커밋/해결 카드 수</span>
              <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
                ↑ +3 (전일 대비)
              </span>
            </div>
          </div>
        </div>

        {/* 대시보드 하단 레이아웃: 로드맵을 가로 전체 너비로 확장 */}
        <div className="space-y-6">
          
          {/* [마일스톤 기반 프로젝트 로드맵] (가로 전체 너비 적용) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                🎯 주요 마일스톤 및 일정
              </h2>
              {/* 조장에게만 목표 일정을 편집하는 설정 바로가기를 노출시킵니다 */}
              {session.user.role === "OWNER" && (
                <span className="text-xs text-slate-500">
                  (조장 권한: 설정 탭에서 일정 편집 가능)
                </span>
              )}
            </div>

            <div className="space-y-6">
              {milestones.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                  등록된 마일스톤(목표 기한)이 존재하지 않습니다.
                </div>
              ) : (
                milestones.map((ms) => {
                  const msCards = ms.cards;
                  const msTotal = msCards.length;
                  const msDone = msCards.filter((c) => c.status === "DONE").length;
                  const msProgress = msTotal > 0 ? Math.round((msDone / msTotal) * 100) : 0;

                  // 오늘 기준으로 마감일까지 며칠이 남았는지 연산
                  const now = new Date();
                  const target = new Date(ms.dueDate);
                  const diffTime = target.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const dDayText =
                    diffDays > 0
                      ? `D-${diffDays}`
                      : diffDays === 0
                      ? "D-Day"
                      : `마감 완료 (D+${Math.abs(diffDays)})`;

                  return (
                    <div
                      key={ms.id}
                      className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4 hover:border-slate-350 shadow-sm transition duration-150"
                    >
                      {/* 타이틀 및 D-Day 배지 */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-800">{ms.title}</h3>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            {ms.description}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                            diffDays > 3
                              ? "bg-sky-50 text-sky-600 border border-sky-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          {dDayText}
                        </span>
                      </div>

                      {/* 게이지 바 및 상세 % 수치 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-500">해당 목표 달성도</span>
                          <span className="text-slate-800">
                            {msProgress}% ({msDone}/{msTotal} 개 작업 해결)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-700"
                            style={{ width: `${msProgress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* 연결된 태스크 카드 요약 리스트 (말줄임표 및 툴팁/최대 3개 한도 적용) */}
                      {msCards.length > 0 ? (
                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          {/* 1. 최대 3개까지만 카드를 나열합니다 */}
                          {msCards.slice(0, 3).map((c) => {
                            const isLong = c.title.length > 15;
                            const displayTitle = isLong ? `${c.title.substring(0, 15)}...` : c.title;

                            return (
                              <div
                                key={c.id}
                                className="relative group inline-block"
                              >
                                <span
                                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition cursor-help flex items-center gap-1 ${
                                    c.status === "DONE"
                                      ? "bg-emerald-50 border-emerald-250 text-emerald-600 line-through opacity-70"
                                      : c.isBlocker
                                      ? "bg-red-50 border-red-250 text-red-600 font-bold"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  {c.isBlocker ? "🚨 " : ""}
                                  {displayTitle}
                                </span>

                                {/* 마우스 호버 시 툴팁 노출 (Pure CSS - absolute 배치 및 group-hover 제어) */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 w-max max-w-xs bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 shadow-lg">
                                  <div className="font-semibold text-slate-200 border-b border-slate-700 pb-0.5 mb-1 flex items-center gap-1">
                                    <span>상태:</span>
                                    <span className={c.status === "DONE" ? "text-emerald-400" : c.isBlocker ? "text-red-400 font-bold" : "text-sky-400"}>
                                      {c.status === "DONE" ? "완료(DONE)" : c.status === "IN_PROGRESS" ? "개발중" : "대기(TODO)"}
                                    </span>
                                  </div>
                                  <p className="leading-snug">{c.title}</p>
                                  {/* 툴팁 말꼬리 쐐기 */}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                </div>
                              </div>
                            );
                          })}

                          {/* 2. 카드 개수가 3개 초과인 경우 나머지 개수를 N+ 형태로 묶어서 렌더링 */}
                          {msCards.length > 3 && (
                            <div className="relative group inline-block">
                              <span className="text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 px-2 py-1 rounded-lg font-bold transition cursor-help">
                                +{msCards.length - 3}
                              </span>
                              {/* 툴팁에 생략된 나머지 카드들의 타이틀 목록 노출 */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 w-56 bg-slate-800 text-white text-[10px] rounded-lg p-2.5 shadow-lg">
                                <div className="font-semibold border-b border-slate-700 pb-1 mb-1.5 text-slate-300 text-[9px] uppercase tracking-wider">
                                  생략된 업무 ({msCards.length - 3}개)
                                </div>
                                <ul className="space-y-1 text-left list-disc list-inside">
                                  {msCards.slice(3).map((c) => (
                                    <li key={c.id} className="truncate">
                                      {c.isBlocker ? "🚨 " : ""}
                                      {c.title}
                                    </li>
                                  ))}
                                </ul>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* 4. 빈 상태(Empty State)에 행동 촉구(CTA) 버튼 추가 */
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span className="text-amber-500">💡</span>
                            <span>현재 목표와 연동된 개발 기능 카드가 아직 등록되지 않았습니다.</span>
                          </div>
                          <Link
                            href="/kanban"
                            className="px-3.5 py-1.5 text-[10px] font-bold text-sky-600 hover:text-white bg-white hover:bg-sky-600 border border-sky-200 hover:border-sky-600 rounded-lg shadow-sm transition duration-150 flex items-center gap-1"
                          >
                            <span>+</span> 연동 카드 등록
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
