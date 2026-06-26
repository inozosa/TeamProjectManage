import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: 마일스톤 목록과 아직 마일스톤에 연동되지 않은(미연동) 카드 목록을 불러옵니다.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 전체 마일스톤 목록 조회 (카드 정보 포함)
    const milestones = await db.milestone.findMany({
      include: { cards: true },
      orderBy: { dueDate: "asc" },
    });

    // 마일스톤이 할당되지 않은 (milestoneId가 null인) 카드 목록 조회
    const unlinkedCards = await db.card.findMany({
      where: { milestoneId: null },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ milestones, unlinkedCards });
  } catch (e) {
    console.error("GET /api/milestones 에러:", e);
    return NextResponse.json({ error: "데이터베이스 조회 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST: 새로운 마일스톤을 생성하고, 동시에 전달받은 카드 ID 목록을 해당 마일스톤에 연동시킵니다.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 비로그인 사용자이거나 뷰어(VIEWER) 권한인 경우 수정을 금지합니다.
    if (!session || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "수정 권한이 없습니다. (구경꾼 제한)" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, dueDate, cardIds } = body;

    if (!title || !dueDate) {
      return NextResponse.json({ error: "마일스톤 제목과 마감 목표일은 필수입니다." }, { status: 400 });
    }

    // 1. 마일스톤 추가
    const milestone = await db.milestone.create({
      data: {
        title,
        description: description || "",
        dueDate: new Date(dueDate),
      },
    });

    // 2. 전달된 카드 ID가 있다면 마일스톤에 연동시킴
    if (cardIds && Array.isArray(cardIds) && cardIds.length > 0) {
      await db.card.updateMany({
        where: { id: { in: cardIds } },
        data: { milestoneId: milestone.id },
      });

      // 카드별 시스템 로그(변경 기록) 추가
      for (const cardId of cardIds) {
        await db.comment.create({
          data: {
            content: `간트차트에서 마일스톤 "${title}" 목표에 자동 연동되었습니다. (등록자: ${session.user.name})`,
            isSystem: true,
            cardId,
          },
        });
      }
    }

    return NextResponse.json(milestone);
  } catch (e) {
    console.error("POST /api/milestones 에러:", e);
    return NextResponse.json({ error: "마일스톤 생성 및 카드 연동 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// PUT: 기존 마일스톤 정보를 수정하고, 연동할 카드 목록을 갱신합니다.
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "수정 권한이 없습니다. (구경꾼 제한)" }, { status: 403 });
    }

    const body = await req.json();
    const { id, title, description, dueDate, cardIds } = body;

    if (!id || !title || !dueDate) {
      return NextResponse.json({ error: "수정 대상 마일스톤 ID와 필수 입력값이 누락되었습니다." }, { status: 400 });
    }

    // 1. 마일스톤 세부 정보 업데이트
    const milestone = await db.milestone.update({
      where: { id },
      data: {
        title,
        description: description || "",
        dueDate: new Date(dueDate),
      },
    });

    // 2. 카드 연동 관계 갱신
    if (cardIds && Array.isArray(cardIds)) {
      // 2-1. 기존에 연동되어 있었으나, 이번 수정 목록에서 제외된 카드들은 연동 해제 (milestoneId = null)
      await db.card.updateMany({
        where: {
          milestoneId: id,
          id: { notIn: cardIds },
        },
        data: { milestoneId: null },
      });

      // 2-2. 새로 선택되어 들어온 카드들은 마일스톤 ID 부여
      if (cardIds.length > 0) {
        await db.card.updateMany({
          where: { id: { in: cardIds } },
          data: { milestoneId: id },
        });

        // 변경 로그 남기기
        for (const cardId of cardIds) {
          await db.comment.create({
            data: {
              content: `간트차트에서 마일스톤 "${title}" 목표와의 연동 관계가 갱신되었습니다. (수정자: ${session.user.name})`,
              isSystem: true,
              cardId,
            },
          });
        }
      }
    }

    return NextResponse.json(milestone);
  } catch (e) {
    console.error("PUT /api/milestones 에러:", e);
    return NextResponse.json({ error: "마일스톤 정보 수정 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// DELETE: 마일스톤을 삭제합니다. (카드는 SetNull 관계 설정에 의해 자동으로 연동이 풀립니다)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 마일스톤 ID가 전달되지 않았습니다." }, { status: 400 });
    }

    await db.milestone.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/milestones 에러:", e);
    return NextResponse.json({ error: "마일스톤 삭제 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
