import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT: 특정 회의록 내용을 수정합니다. (제목/본문)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 로그인 여부 및 권한(구경꾼 차단) 검사
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "수정 권한이 없습니다. (구경꾼 권한 제한)" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, content } = body;

    // 제목과 본문 누락 예외 처리
    if (!title || !content) {
      return NextResponse.json({ error: "회의 주제와 본문 내용은 필수입니다." }, { status: 400 });
    }

    // 2. 데이터베이스 회의록 레코드 수정
    const updatedNote = await db.meetingNote.update({
      where: { id },
      data: {
        title,
        content,
      },
    });

    return NextResponse.json(updatedNote);
  } catch (e) {
    console.error("PUT /api/notes/[id] 에러:", e);
    return NextResponse.json({ error: "회의록 수정 중 서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}

// DELETE: 특정 회의록을 영구 삭제합니다.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 로그인 여부 및 권한(구경꾼 차단) 검사
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "삭제 권한이 없습니다. (구경꾼 권한 제한)" }, { status: 403 });
    }

    const { id } = await params;

    // 2. 데이터베이스에서 회의록 영구 삭제
    await db.meetingNote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/notes/[id] 에러:", e);
    return NextResponse.json({ error: "회의록 삭제 중 서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
