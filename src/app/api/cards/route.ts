import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: 칸반 보드 화면을 그릴 때 필요한 [카드 목록, 마일스톤 목록, 조원 목록]을 한 번에 가져오는 API입니다.
export async function GET() {
  try {
    // 1. 현재 요청자가 로그인했는지 인증 정보를 먼저 점검합니다.
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 2. 데이터베이스에서 모든 카드 리스트를 불러옵니다. (연동된 담당자 및 마일스톤 정보 동시 추출)
    const cards = await db.card.findMany({
      include: {
        assignee: true,
        milestone: true,
      },
      orderBy: {
        createdAt: "desc", // 최신 등록순으로 정렬
      },
    });

    // 3. 마일스톤 일정 목록을 가져옵니다.
    const milestones = await db.milestone.findMany({
      orderBy: { dueDate: "asc" },
    });

    // 4. 담당자로 지정할 수 있는 조원 리스트를 추출합니다. (보안상 비밀 정보는 제외)
    const users = await db.user.findMany({
      select: { id: true, name: true, image: true, role: true },
    });

    // 5. 정제된 종합 꾸러미를 클라이언트에 반환합니다.
    return NextResponse.json({ cards, milestones, users });
  } catch (e) {
    console.error("GET /api/cards 에러:", e);
    return NextResponse.json({ error: "데이터베이스 조회 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST: 칸반 보드에서 새로운 할 일 카드를 추가할 때 호출되는 API입니다.
export async function POST(req: Request) {
  try {
    // 1. 현재 요청자가 권한이 있는 사용자(조장 또는 조원)인지 확인합니다.
    const session = await getServerSession(authOptions);
    
    // 비로그인 사용자이거나 구경꾼(VIEWER)인 경우 카드 수정을 금지(Forbidden)합니다.
    if (!session || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "작성 권한이 없습니다. (구경꾼 권한 제한)" }, { status: 403 });
    }

    // 2. 클라이언트가 보내온 요청 본문(Body) 데이터를 수신합니다.
    const body = await req.json();
    const { title, content, category, milestoneId, assigneeId } = body;

    // 제목은 빈 칸으로 등록할 수 없도록 방어 코딩을 넣습니다.
    if (!title) {
      return NextResponse.json({ error: "태스크 제목은 필수로 적어주셔야 합니다." }, { status: 400 });
    }

    // 3. 카드를 데이터베이스에 새로 기록(생성)합니다.
    const card = await db.card.create({
      data: {
        title,
        content: content || "",
        category: category || "FRONTEND", // 카테고리 누락 시 프론트엔드를 기본값으로 설정
        status: "TODO", // 새 카드는 항상 '할 일(TODO)' 컬럼에서 출발합니다.
        milestoneId: milestoneId || null,
        assigneeId: assigneeId || null,
      },
    });

    // 4. 카드가 언제, 누구에 의해 생성되었는지 추적하기 위해 시스템 기록 로그(댓글)를 연관 테이블에 심어줍니다.
    await db.comment.create({
      data: {
        content: `카드가 새로 발급되었습니다. (작성자: ${session.user.name})`,
        isSystem: true, // 시스템 자동 생성 표기
        cardId: card.id,
      },
    });

    // 5. 성공적으로 만들어진 카드 데이터를 다시 클라이언트에 돌려보냅니다.
    return NextResponse.json(card);
  } catch (e) {
    console.error("POST /api/cards 에러:", e);
    return NextResponse.json({ error: "카드 생성 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
