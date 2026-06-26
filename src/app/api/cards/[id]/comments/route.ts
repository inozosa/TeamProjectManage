import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: 특정 카드 ID에 달린 댓글 및 시스템 자동 기록 히스토리 로그들을 시간순으로 가져옵니다.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 로그인 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
    }

    // Next.js 15+ 규격에 맞춰 params 프로미스를 대기하여 id를 꺼내옵니다.
    const { id } = await params;

    // 2. 데이터베이스에서 해당 카드 ID를 참조하는 댓글들을 조회합니다 (작성자 정보 포함).
    const comments = await db.comment.findMany({
      where: {
        cardId: id,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, role: true },
        },
      },
      orderBy: {
        createdAt: "asc", // 댓글은 먼저 쓴 글이 위에 오도록 정렬합니다.
      },
    });

    return NextResponse.json(comments);
  } catch (e) {
    console.error("GET /api/cards/[id]/comments 에러:", e);
    return NextResponse.json({ error: "댓글 로드 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST: 특정 카드에 새 댓글이나 교수님/멘토의 피드백 코멘트를 등록합니다.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 로그인 세션 검증
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "로그인이 필요한 작업입니다." }, { status: 401 });
    }

    // Next.js 15+ 규격에 맞춰 params 프로미스를 대기하여 id를 꺼내옵니다.
    const { id } = await params;
    const body = await req.json();
    const { content } = body;

    // 댓글 내용 공백 방지
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "댓글 내용을 한 글자 이상 입력해 주세요." }, { status: 400 });
    }

    // 2. 새로운 댓글을 데이터베이스에 삽입합니다. (작성 유저의 ID를 매핑)
    // 조장(OWNER), 조원(MEMBER), 구경꾼(VIEWER) 모두 댓글은 제한 없이 작성할 수 있습니다.
    const comment = await db.comment.create({
      data: {
        content: content.trim(),
        cardId: id,
        userId: session.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, role: true },
        },
      },
    });

    // 3. 성공적으로 추가된 댓글 정보를 반환합니다.
    return NextResponse.json(comment);
  } catch (e) {
    console.error("POST /api/cards/[id]/comments 에러:", e);
    return NextResponse.json({ error: "댓글 작성 처리 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
