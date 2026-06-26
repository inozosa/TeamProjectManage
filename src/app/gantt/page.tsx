import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export default async function GanttChartPage() {
  // 1. 세션 검증 (로그인하지 않은 경우 튕겨냄)
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  // 2. 데이터베이스에서 마일스톤과 하위 카드 목록을 가져옴
  const milestones = await db.milestone.findMany({
    include: {
      cards: true,
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  // 3. 타임라인 전체 시작점과 끝점 계산 (Gantt Chart의 가로 범위)
  const now = new Date();
  let minStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 기본값: 오늘 기준 7일 전
  let maxEnd = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000); // 기본값: 오늘 기준 21일 후

  if (milestones.length > 0) {
    // 모든 마일스톤의 생성일(createdAt) 중 가장 이른 시간 추출
    const starts = milestones.map((m) => new Date(m.createdAt).getTime());
    // 모든 마일스톤의 목표 마감일(dueDate) 중 가장 늦은 시간 추출
    const ends = milestones.map((m) => new Date(m.dueDate).getTime());

    const actualMin = Math.min(...starts);
    const actualMax = Math.max(...ends);

    // 차트에 너무 빡빡하게 붙는 걸 방지하여 앞뒤로 3일씩 버퍼를 둡니다.
    minStart = new Date(actualMin - 3 * 24 * 60 * 60 * 1000);
    maxEnd = new Date(actualMax + 3 * 24 * 60 * 60 * 1000);
  }

  // 타임라인의 전체 시간적 길이 (밀리초 단위)
  const totalDuration = maxEnd.getTime() - minStart.getTime();

  // 4. 타임라인 상단 날짜 눈금 그리드 데이터 생성 (3일 혹은 7일 간격 눈금)
  const gridTicks: { date: Date; leftPercent: number; label: string }[] = [];
  const startDay = new Date(minStart);
  startDay.setHours(0, 0, 0, 0);

  // 타임라인 첫날부터 마지막날까지 돌며 7일 간격으로 세로 가이드 눈금 배치
  while (startDay.getTime() <= maxEnd.getTime()) {
    const leftPercent = ((startDay.getTime() - minStart.getTime()) / totalDuration) * 100;
    gridTicks.push({
      date: new Date(startDay),
      leftPercent,
      label: `${startDay.getMonth() + 1}/${startDay.getDate()}`,
    });
    // 일주일(7일)씩 날짜를 올립니다.
    startDay.setDate(startDay.getDate() + 7);
  }

  // 5. 오늘 날짜 가이드라인(Today Line) 비율 연산
  const todayTime = now.getTime();
  const todayLeft = ((todayTime - minStart.getTime()) / totalDuration) * 100;
  const isTodayVisible = todayLeft >= 0 && todayLeft <= 100;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      
      {/* [상단 헤더 바] 네비게이션 및 유저 프로필 표기 */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-8">
          {/* 사이트 타이틀 */}
          <Link href="/" className="text-2xl font-extrabold tracking-wider text-slate-800">
            Dev<span className="text-sky-600">Sync</span>
          </Link>
          {/* 주요 화면 이동 메뉴 (신규 간트차트 포함) */}
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

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* 설명 및 현황 요약 가이드판 */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            📅 프로젝트 간트차트 & 진척 타임라인
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            각 마일스톤의 <strong>기획 시작일(생성 시점)</strong>과 <strong>마감 목표일</strong>을 타임라인 바 형태로 연계 시각화했습니다. 
            세로로 표기된 빨간색 <span className="text-red-500 font-bold">오늘선 (Today Line)</span>을 대조하여, 계획 대비 실제 개발 완료 진도가 뒤처지는지 직관적으로 확인할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-3 pt-1 text-[10px]">
            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 font-medium">⏳ 대기 중 : 아직 시작 시각 미도달</span>
            <span className="bg-sky-50 text-sky-600 px-2 py-1 rounded border border-sky-200 font-medium">💻 진행 중 : 일정 계획에 맞게 차질없이 진행</span>
            <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded border border-amber-200 font-medium animate-pulse">⚠️ 지연 위험 : 오늘 날짜 흐름 대비 진척 속도가 15% 이상 늦음</span>
            <span className="bg-red-50 text-red-600 px-2 py-1 rounded border border-red-200 font-medium font-bold">🚨 기한 초과 : 마감 기한이 넘었으나 미해결</span>
            <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200 font-medium">✅ 완료 : 모든 업무 DONE 처리 완료</span>
          </div>
        </div>

        {/* 간트차트 핵심 타임라인 보드 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col p-6 space-y-4">
          
          {milestones.length === 0 ? (
            <div className="py-24 text-center text-slate-400 italic text-xs">
              현재 등록된 마일스톤이 존재하지 않아 간트차트를 구성할 수 없습니다.
            </div>
          ) : (
            <div className="relative border border-slate-200 rounded-xl overflow-x-auto min-w-[700px]">
              
              {/* 타임라인 헤더 (날짜 눈금 배치) */}
              <div className="bg-slate-50 border-b border-slate-200 h-10 relative flex items-center">
                <div className="w-1/4 min-w-[180px] border-r border-slate-200 px-4 text-xs font-bold text-slate-500">
                  목표 마일스톤 명칭
                </div>
                <div className="flex-1 relative h-full">
                  {/* 날짜 눈금 출력 */}
                  {gridTicks.map((tick, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 text-[10px] text-slate-400 font-semibold border-l border-slate-200/80 pt-2.5 pl-1.5"
                      style={{ left: `${tick.leftPercent}%` }}
                    >
                      {tick.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* 간트차트 타임라인 리스트 그리드 */}
              <div className="relative divide-y divide-slate-150">
                
                {/* 실시간 오늘 세로 가이드라인 (Today Line) 장착 */}
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

                {/* 각 마일스톤 행(Row) 생성 */}
                {milestones.map((ms) => {
                  const msCards = ms.cards;
                  const totalCount = msCards.length;
                  const doneCount = msCards.filter((c) => c.status === "DONE").length;
                  
                  // 진척율 퍼센트
                  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                  // 마일스톤 시작 시각과 종료 시각
                  const mStart = new Date(ms.createdAt).getTime();
                  const mEnd = new Date(ms.dueDate).getTime();
                  const mDuration = mEnd - mStart;

                  // 타임라인 상의 가로 영역 비율(%) 연산
                  let leftRatio = ((mStart - minStart.getTime()) / totalDuration) * 100;
                  let widthRatio = (mDuration / totalDuration) * 100;

                  // 그래프 삐져나옴 방어 처리
                  if (leftRatio < 0) {
                    widthRatio += leftRatio;
                    leftRatio = 0;
                  }
                  if (leftRatio + widthRatio > 100) {
                    widthRatio = 100 - leftRatio;
                  }
                  if (widthRatio < 2) {
                    widthRatio = 2; // 최소 너비 확보
                  }

                  // ⏳ 진행 상황 정밀 판독 (시간 대비 완료율 대조)
                  let statusBadge = { text: "💻 진행 중", style: "bg-sky-50 text-sky-600 border-sky-200" };

                  if (todayTime < mStart) {
                    // 1. 아직 시작일도 도달하지 않은 대기 마일스톤
                    statusBadge = { text: "⏳ 대기 중", style: "bg-slate-100 text-slate-500 border-slate-200" };
                  } else if (progress === 100) {
                    // 2. 100% 완료 상태
                    statusBadge = { text: "✅ 완료", style: "bg-emerald-50 text-emerald-600 border-emerald-250" };
                  } else if (todayTime > mEnd) {
                    // 3. 기한은 지났는데 아직 미완료인 경우
                    statusBadge = { text: "🚨 기한 초과", style: "bg-red-50 text-red-600 border-red-200 font-bold" };
                  } else {
                    // 4. 기간 도중에 진행 중인 상황
                    const timeElapsed = todayTime - mStart;
                    const timeProgressRatio = (timeElapsed / mDuration) * 100;
                    
                    // 오늘 흘러간 시간의 퍼센트보다 개발 진척율이 15% 이상 뒤쳐질 때 지연 경고 작동
                    if (progress < timeProgressRatio - 15) {
                      statusBadge = { text: "⚠️ 지연 위험", style: "bg-amber-50 text-amber-600 border-amber-200 animate-pulse font-semibold" };
                    }
                  }

                  return (
                    <div key={ms.id} className="min-h-[72px] flex items-center hover:bg-slate-50/50 transition">
                      
                      {/* 왼쪽: 마일스톤 요약 정보 */}
                      <div className="w-1/4 min-w-[180px] border-r border-slate-200 p-4 space-y-1.5 shrink-0">
                        <div className="text-xs font-bold text-slate-800 truncate" title={ms.title}>
                          {ms.title}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* 상태 판독 배지 렌더링 */}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium whitespace-nowrap ${statusBadge.style}`}>
                            {statusBadge.text}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {progress}%
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400">
                          기한: {new Date(ms.dueDate).toLocaleDateString("ko-KR")}
                        </div>
                      </div>

                      {/* 오른쪽: 타임라인 막대 바 렌더링 공간 */}
                      <div className="flex-1 h-full relative p-4 flex items-center">
                        
                        {/* 세로 눈금 점선 가이드 */}
                        {gridTicks.map((tick, tIdx) => (
                          <div
                            key={tIdx}
                            className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                            style={{ left: `${tick.leftPercent}%` }}
                          />
                        ))}

                        {/* 간트 차트 실시간 진행 막대(Bar) */}
                        <div
                          className="absolute h-6 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex shadow-sm group hover:border-slate-400 transition"
                          style={{
                            left: `${leftRatio}%`,
                            width: `${widthRatio}%`,
                          }}
                        >
                          {/* 완료된 진척도만큼 그라데이션 게이지로 채웁니다 */}
                          <div
                            className="bg-gradient-to-r from-sky-400 to-emerald-400 h-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>

                          {/* 호버 시 전체 일정 및 진척도를 나타내는 툴팁 */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block z-30 bg-slate-900 text-white text-[9px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                            달성량: {progress}% ({doneCount}/{totalCount} 완료)
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
