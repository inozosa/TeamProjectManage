import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: 지금까지 기록된 조원들의 모든 회의록 목록을 가져옵니다.
export async function GET() {
  try {
    // 1. 로그인 인증 검사
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 2. 데이터베이스에서 회의 진행 일자가 가장 최신인 순서(date: desc)로 조회합니다.
    const notes = await db.meetingNote.findMany({
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(notes);
  } catch (e) {
    console.error("GET /api/notes 에러:", e);
    return NextResponse.json({ error: "회의록 조회 중 서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST: 조원들이 작성한 회의록을 새로 등록(저장)합니다.
export async function POST(req: Request) {
  try {
    // 1. 로그인 인증 및 쓰기 권한 검사
    const session = await getServerSession(authOptions);
    
    // 구경꾼(VIEWER)은 읽기 전용이므로 회의록 등록을 막습니다.
    if (!session || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "작성 권한이 없습니다. (구경꾼 제한)" }, { status: 403 });
    }

    // 2. 요청 본문 파싱
    const body = await req.json();
    const { title, content } = body;

    // 제목과 내용의 누락 여부를 확인합니다.
    if (!title || !content) {
      return NextResponse.json({ error: "회의 주제와 본문 내용은 반드시 적어주셔야 합니다." }, { status: 400 });
    }

    // 3. 데이터베이스에 회의록을 새로 생성합니다.
    const note = await db.meetingNote.create({
      data: {
        title,
        content,
        date: new Date(), // 작성하는 현재 시각을 회의 일자로 박아둡니다.
      },
    });

    return NextResponse.json(note);
  } catch (e) {
    console.error("POST /api/notes 에러:", e);
    return NextResponse.json({ error: "회의록 저장 중 서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
