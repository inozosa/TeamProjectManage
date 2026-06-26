import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT: 특정 카드의 상태나 속성을 업데이트합니다.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 로그인 여부 및 구경꾼 권한 차단 검증
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "권한이 없습니다. (구경꾼 제한)" }, { status: 403 });
    }

    // Next.js 15+ 규격에 맞게 params 프로미스를 대기하여 id를 비동기로 받아옵니다.
    const { id } = await params;
    const body = await req.json();

    // 2. 변경할 카드가 실제로 데이터베이스에 있는지 확인하고, 이전 상태값을 읽어둡니다 (변경 이력 비교용).
    const existingCard = await db.card.findUnique({
      where: { id },
    });

    if (!existingCard) {
      return NextResponse.json({ error: "해당 카드를 찾을 수 없습니다." }, { status: 404 });
    }

    // 3. 클라이언트 측에서 보내준 속성 정보들을 분해하여 갱신할 쿼리 객체를 조립합니다.
    const { title, content, status, category, milestoneId, assigneeId, isBlocker, blockerDesc } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;
    if (category !== undefined) updateData.category = category;
    if (milestoneId !== undefined) updateData.milestoneId = milestoneId || null;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (isBlocker !== undefined) updateData.isBlocker = isBlocker;
    if (blockerDesc !== undefined) updateData.blockerDesc = blockerDesc;

    // 4. 데이터베이스 정보를 업데이트합니다.
    const updatedCard = await db.card.update({
      where: { id },
      data: updateData,
    });

    // 5. [중요 이력 자동 댓글 기록]
    // A. 드래그나 설정 변경으로 카드의 상태(TODO -> IN_PROGRESS -> DONE)가 바뀐 경우
    if (status && status !== existingCard.status) {
      const statusMap: any = { TODO: "할 일", IN_PROGRESS: "진행 중", DONE: "완료" };
      await db.comment.create({
        data: {
          content: `카드가 '${statusMap[existingCard.status]}'에서 '${statusMap[status]}' 상태로 드래그/이동되었습니다. (수정자: ${session.user.name})`,
          isSystem: true, // 시스템 자동 메시지 마크
          cardId: id,
        },
      });
    }

    // B. 에러가 나서 블로커(진행 방해 경보)를 켜거나 끈 경우
    if (isBlocker !== undefined && isBlocker !== existingCard.isBlocker) {
      if (isBlocker) {
        // 블로커 신규 등록
        await db.comment.create({
          data: {
            content: `🚨 진행 방해 요소(블로커)가 등록되었습니다! 사유: ${blockerDesc || "내용 미기재"} (작성자: ${session.user.name})`,
            isSystem: true,
            cardId: id,
          },
        });
      } else {
        // 블로커 해결 및 해제
        await db.comment.create({
          data: {
            content: `✅ 진행 방해 요소(블로커)가 해결되어 해제되었습니다. (처리자: ${session.user.name})`,
            isSystem: true,
            cardId: id,
          },
        });
      }
    }

    // 6. 업데이트 완료된 카드 내역을 반환합니다.
    return NextResponse.json(updatedCard);
  } catch (e) {
    console.error("PUT /api/cards/[id] 에러:", e);
    return NextResponse.json({ error: "카드 수정 과정에서 서버 예외 에러가 발생했습니다." }, { status: 500 });
  }
}
