import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";

// POST: 신규 회원가입 신청을 접수하는 API 엔드포인트입니다.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { loginId, password, name, email, role } = body;

    // 1. 필수 입력 필드 누락 검사
    if (!loginId || !password || !name || !email) {
      return NextResponse.json(
        { error: "아이디, 비밀번호, 이름, 이메일은 모두 작성하셔야 합니다." },
        { status: 400 }
      );
    }

    // 2. 아이디 중복 여부 확인
    const existingUserById = await db.user.findUnique({
      where: { loginId },
    });
    if (existingUserById) {
      return NextResponse.json(
        { error: "이미 다른 조원이 사용 중인 아이디입니다." },
        { status: 400 }
      );
    }

    // 3. 이메일 중복 여부 확인
    const existingUserByEmail = await db.user.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "이미 가입된 이메일 주소입니다." },
        { status: 400 }
      );
    }

    // 4. 입력된 평문 패스워드를 PBKDF2 단방향 알고리즘으로 안전하게 해싱 암호화 처리합니다.
    const encryptedPassword = hashPassword(password);

    // 5. 유저 레코드를 데이터베이스에 새로 만듭니다.
    // 🚨 중요: 새로 가입한 일반 사용자는 admin의 수동 승인이 필요하므로 isApproved는 false로 박아둡니다.
    const newUser = await db.user.create({
      data: {
        loginId,
        password: encryptedPassword,
        name,
        email,
        role: role || "MEMBER", // 조원(MEMBER) 또는 구경꾼(VIEWER) 선택
        isApproved: false, // 승인 대기 상태
        image: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`, // 귀여운 봇 프로필 자동 지정
      },
    });

    // 성공 메시지와 함께 패스워드를 제외한 안전한 정보만 응답으로 돌려줍니다.
    return NextResponse.json(
      {
        message: "회원가입 신청이 성공적으로 접수되었습니다. 관리자 승인을 기다려 주세요.",
        user: {
          id: newUser.id,
          loginId: newUser.loginId,
          name: newUser.name,
          role: newUser.role,
        },
      },
      { status: 201 }
    );

  } catch (e) {
    console.error("POST /api/auth/register 에러:", e);
    return NextResponse.json(
      { error: "회원가입 처리 중 서버 내부 예외 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
