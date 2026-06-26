import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/ai/summarize/publish
 * 조장(OWNER)이 AI가 요약한 오늘의 개발 브리핑 내용을 조원들 화면의 알림창으로 발송하는 API입니다.
 */
export async function POST(req: Request) {
  try {
    // 1. 현재 요청자의 로그인 세션 정보를 읽어옵니다.
    const session = await getServerSession(authOptions);

    // 2. 권한 검증: 로그인하지 않았거나 조장(OWNER 역할 또는 admin 이메일)이 아닌 경우 차단합니다.
    if (
      !session ||
      !session.user ||
      session.user.role !== "OWNER"
    ) {
      return NextResponse.json(
        { error: "브리핑을 발송할 권한이 없습니다. 조장 계정으로 로그인해 주세요." },
        { status: 403 }
      );
    }

    // 3. 요청 바디에서 제목과 내용을 파싱합니다.
    const body = await req.json();
    const { title, content } = body;

    // 4. 내용 유효성 검사 (본문이 비어있으면 에러 반환)
    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json(
        { error: "발송할 브리핑 요약 내용이 비어 있습니다." },
        { status: 400 }
      );
    }

    // 제목이 누락된 경우 기본 제목을 제공합니다. (예: "2026-06-26 오늘의 개발 브리핑 요약")
    const today = new Date();
    const defaultTitle = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 오늘의 개발 브리핑 요약`;
    const finalTitle = title && typeof title === "string" && title.trim() !== "" ? title.trim() : defaultTitle;

    // 5. Prisma DB를 사용해 Notification 테이블에 새 공지사항 레코드를 생성합니다.
    const newNotification = await db.notification.create({
      data: {
        title: finalTitle,
        content: content.trim(),
      },
    });

    // 6. 저장 완료 상태와 함께 결과 데이터를 반환합니다.
    return NextResponse.json(
      {
        message: "📢 오늘의 브리핑이 전체 조원들의 화면에 성공적으로 전파되었습니다!",
        notification: newNotification,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("브리핑 알림 발송 중 서버 에러 발생:", e);
    return NextResponse.json(
      { error: "브리핑을 알림판에 등록하는 과정에서 기술적인 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
