import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST: GitHub Repository에서 코드 푸시(Push)가 일어났을 때 전송되는 Webhook을 수신하는 API입니다.
export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // 깃허브 푸시 이벤트에 포함된 커밋(Commit) 정보 배열을 꺼냅니다.
    const commits = payload.commits || [];
    
    if (commits.length === 0) {
      return NextResponse.json({ message: "수신된 커밋 내역이 없습니다." }, { status: 200 });
    }

    // 카드 고유 CUID 매칭용 정규식 선언
    // 예: 커밋 메시지에 "[clx123...]" 또는 "[DevSync-clx123...]" 형태가 포함되어 있으면 해당 25자리 카드 ID를 추출합니다.
    const cardIdRegex = /\[(?:WeAreTeam-|DevSync-)?([a-z0-9]{25})\]/i;
    
    // 완료/해결을 암시하는 깃허브 표준 연동 단어 정규식 (대소문자 무관 및 한글 키워드 포함)
    const finishKeywords = /(?:fix|resolve|close|done|완료|해결)/i;

    let processedCount = 0; // 몇 개의 카드를 갱신했는지 추적하는 카운터

    // 푸시된 커밋들을 하나씩 순회하며 분석합니다.
    for (const commit of commits) {
      const message = commit.message || "";
      const authorName = commit.author?.name || "GitHub 개발자";
      const commitHash = commit.id?.substring(0, 7) || "unknown"; // 앞 7자리 커밋 해시만 잘라냄
      
      const match = message.match(cardIdRegex);
      
      // 커밋 메시지에 DevSync 카드 ID가 들어있다면
      if (match) {
        const cardId = match[1];

        // 데이터베이스에 실제로 등록되어 있는 카드인지 조회합니다.
        const card = await db.card.findUnique({
          where: { id: cardId },
        });

        if (card) {
          // 커밋 메시지 본문에 'fix'나 '완료' 같은 키워드가 들어있는지 점검합니다.
          const isFinishing = finishKeywords.test(message);
          // 완료 키워드가 들어있다면 DONE으로 올리고, 없다면 기존 상태를 유지합니다.
          const newStatus = isFinishing ? "DONE" : card.status;

          // 데이터베이스 카드의 상태를 업데이트합니다.
          await db.card.update({
            where: { id: cardId },
            data: {
              status: newStatus,
            },
          });

          // 개발 히스토리 댓글 로그 내용을 조립합니다.
          const logContent = `💻 [GitHub Commit] ${authorName}: "${message}" (${commitHash})${
            isFinishing ? " ➔ 카드가 자동으로 '완료(DONE)' 처리되었습니다." : ""
          }`;

          // 해당 카드에 시스템 로그 댓글을 달아줍니다.
          await db.comment.create({
            data: {
              content: logContent,
              isSystem: true, // 시스템 자동 로그 표기
              cardId: cardId,
            },
          });

          processedCount++;
        }
      }
    }

    return NextResponse.json({
      message: `GitHub 웹훅 처리 완료. 총 ${processedCount}개의 카드 진척도가 갱신되었습니다.`
    }, { status: 200 });

  } catch (e) {
    console.error("GitHub 웹훅 수신 에러:", e);
    return NextResponse.json({ error: "웹훅 처리 과정에서 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
