import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: 관리자(admin) 계정 전용으로, 가입 승인을 기다리는 [승인 대기자 목록]을 불러옵니다.
export async function GET() {
  try {
    // 1. 세션을 가져와 현재 사용자가 관리자인지 확인합니다.
    const session = await getServerSession(authOptions);
    
    // 비로그인이거나 아이디가 'admin'이 아닌 경우 접속을 차단(403 Forbidden)합니다.
    if (!session || !session.user || session.user.email !== "admin@devsync.com") {
      return NextResponse.json({ error: "관리자만 접근할 수 있는 API입니다." }, { status: 403 });
    }

    // 2. 데이터베이스에서 승인 대기자(isApproved: false) 목록을 가입일 순서(createdAt: asc)로 가져옵니다.
    // (관리자 계정 본인은 리스트에서 당연히 제외됩니다.)
    const pendingUsers = await db.user.findMany({
      where: {
        isApproved: false,
        NOT: {
          loginId: "admin",
        },
      },
      select: {
        id: true,
        loginId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(pendingUsers);
  } catch (e) {
    console.error("GET /api/admin 에러:", e);
    return NextResponse.json({ error: "대기 조원 조회 중 서버 오류 발생" }, { status: 500 });
  }
}

// POST: 특정 대기 조원을 승인 완료(isApproved: true) 처리합니다.
export async function POST(req: Request) {
  try {
    // 1. 관리자 권한 검증
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.email !== "admin@devsync.com") {
      return NextResponse.json({ error: "수행 권한이 없습니다." }, { status: 403 });
    }

    // 2. 요청 바디에서 대상 유저 ID 추출
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "승인 처리할 유저 고유 ID가 누락되었습니다." }, { status: 400 });
    }

    // 3. 대상 유저를 찾아 승인 처리(isApproved: true)를 데이터베이스에 반영합니다.
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        isApproved: true,
      },
    });

    return NextResponse.json({
      message: `'${updatedUser.name}' 조원의 가입이 최종 승인되었습니다!`,
      user: {
        id: updatedUser.id,
        loginId: updatedUser.loginId,
        isApproved: updatedUser.isApproved,
      },
    });
  } catch (e) {
    console.error("POST /api/admin 에러:", e);
    return NextResponse.json({ error: "조원 승인 처리 중 서버 오류 발생" }, { status: 500 });
  }
}

// DELETE: 특정 대기 조원의 가입 신청을 거절(데이터베이스에서 삭제) 처리합니다.
export async function DELETE(req: Request) {
  try {
    // 1. 관리자 권한 검증
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.email !== "admin@devsync.com") {
      return NextResponse.json({ error: "수행 권한이 없습니다." }, { status: 403 });
    }

    // 2. 요청 바디에서 거절 대상 유저 ID 추출
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "거절 처리할 유저 고유 ID가 누락되었습니다." }, { status: 400 });
    }

    // 3. 대상 유저가 데이터베이스에 존재하는지, 그리고 승인 대기 상태인지 조회 및 검증
    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "존재하지 않는 가입 신청자입니다." }, { status: 404 });
    }

    if (targetUser.isApproved) {
      return NextResponse.json(
        { error: "이미 가입 승인이 완료되어 활동 중인 정식 조원은 거절(삭제)할 수 없습니다." },
        { status: 400 }
      );
    }

    // 4. 데이터베이스에서 완전 삭제(가입 신청 거절 및 정보 파기)
    await db.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: `'${targetUser.name}' 조원의 가입 신청이 성공적으로 거절 및 파기 처리되었습니다.`,
    });
  } catch (e) {
    console.error("DELETE /api/admin 에러:", e);
    return NextResponse.json({ error: "조원 거절 처리 중 서버 오류 발생" }, { status: 500 });
  }
}

