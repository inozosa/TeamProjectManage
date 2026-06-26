import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import GanttContent from "./GanttContent";

// [서버 컴포넌트] 간트차트 페이지 데이터 로딩 및 검증 담당
export default async function GanttChartPage() {
  // 1. 로그인 세션 및 사용자 정보 확인
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  // 2. Neon DB 데이터베이스에서 마일스톤과 해당 목표에 연동된 태스크 카드 전체 조회
  const milestones = await db.milestone.findMany({
    include: {
      cards: true,
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  // 3. 타입 캐스팅 변환 (createdAt, dueDate 날짜 데이터는 직렬화를 위해 문자열로 전송)
  const serializedMilestones = milestones.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    dueDate: m.dueDate.toISOString(),
    cards: m.cards.map((c) => ({
      ...c,
      dueDate: c.dueDate ? c.dueDate.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  }));

  // 4. 모달창 조작 및 할일 실시간 연동을 위해 클라이언트 컴포넌트에 주입
  return (
    <GanttContent 
      initialMilestones={serializedMilestones as any} 
      session={session as any} 
    />
  );
}
