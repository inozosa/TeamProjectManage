import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// 관리자 권한 검증 헬퍼 함수
async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") {
    return null;
  }
  return session;
}

// GET: 관리자 전용 — 승인 대기자 목록 + 전체 승인 회원 목록 함께 반환
export async function GET() {
  try {
    const session = await verifyAdmin();
    if (!session) {
      return NextResponse.json({ error: "관리자만 접근할 수 있는 API입니다." }, { status: 403 });
    }

    // 승인 대기자 목록 (isApproved: false, 관리자 본인 제외)
    const pendingUsers = await db.user.findMany({
      where: {
        isApproved: false,
        NOT: { loginId: "admin" },
      },
      select: {
        id: true,
        loginId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // 승인된 활성 회원 목록 (isApproved: true, 관리자 본인 제외)
    const approvedUsers = await db.user.findMany({
      where: {
        isApproved: true,
        NOT: { loginId: "admin" }, // 관리자 본인은 리스트에서 제외
      },
      select: {
        id: true,
        loginId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        image: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ pendingUsers, approvedUsers });
  } catch (e) {
    console.error("GET /api/admin 에러:", e);
    return NextResponse.json({ error: "회원 목록 조회 중 서버 오류 발생" }, { status: 500 });
  }
}

// POST: 특정 대기 조원을 승인 완료(isApproved: true) 처리합니다.
export async function POST(req: Request) {
  try {
    const session = await verifyAdmin();
    if (!session) {
      return NextResponse.json({ error: "수행 권한이 없습니다." }, { status: 403 });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "승인 처리할 유저 고유 ID가 누락되었습니다." }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { isApproved: true },
    });

    return NextResponse.json({
      message: `'${updatedUser.name}' 조원의 가입이 최종 승인되었습니다!`,
      user: { id: updatedUser.id, loginId: updatedUser.loginId, isApproved: updatedUser.isApproved },
    });
  } catch (e) {
    console.error("POST /api/admin 에러:", e);
    return NextResponse.json({ error: "조원 승인 처리 중 서버 오류 발생" }, { status: 500 });
  }
}

// PATCH: 기존 승인 회원의 역할(role)을 변경합니다.
export async function PATCH(req: Request) {
  try {
    const session = await verifyAdmin();
    if (!session) {
      return NextResponse.json({ error: "수행 권한이 없습니다." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: "유저 ID와 변경할 역할이 필요합니다." }, { status: 400 });
    }

    // 허용 가능한 역할 값만 처리
    const allowedRoles = ["OWNER", "MEMBER", "VIEWER"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "유효하지 않은 역할 값입니다." }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json({
      message: `'${updatedUser.name}'의 역할이 '${role}'로 변경되었습니다.`,
      user: { id: updatedUser.id, role: updatedUser.role },
    });
  } catch (e) {
    console.error("PATCH /api/admin 에러:", e);
    return NextResponse.json({ error: "역할 변경 중 서버 오류 발생" }, { status: 500 });
  }
}

// DELETE: 가입 신청 거절 또는 기존 회원 강제 탈퇴 처리합니다.
export async function DELETE(req: Request) {
  try {
    const session = await verifyAdmin();
    if (!session) {
      return NextResponse.json({ error: "수행 권한이 없습니다." }, { status: 403 });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "삭제 처리할 유저 고유 ID가 누락되었습니다." }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } });

    if (!targetUser) {
      return NextResponse.json({ error: "존재하지 않는 사용자입니다." }, { status: 404 });
    }

    // 관리자 본인 삭제 방어
    if (targetUser.loginId === "admin") {
      return NextResponse.json({ error: "관리자 계정은 삭제할 수 없습니다." }, { status: 400 });
    }

    // 해당 유저가 담당자로 지정된 카드들에서 assigneeId를 null로 초기화합니다 (외래키 오류 방지)
    await db.card.updateMany({
      where: { assigneeId: userId },
      data: { assigneeId: null },
    });

    // 해당 유저가 작성한 댓글의 userId를 null로 초기화합니다 (외래키 오류 방지)
    await db.comment.updateMany({
      where: { userId: userId },
      data: { userId: null },
    });

    // 유저 데이터베이스에서 최종 삭제
    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({
      message: `'${targetUser.name}' 계정이 성공적으로 삭제(탈퇴 처리)되었습니다.`,
    });
  } catch (e) {
    console.error("DELETE /api/admin 에러:", e);
    return NextResponse.json({ error: "회원 삭제 처리 중 서버 오류 발생" }, { status: 500 });
  }
}
