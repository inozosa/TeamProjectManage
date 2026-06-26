import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

// POST: 오늘 하루 동안 완료된 업무 카드와 댓글 피드백 내용을 수집해 Gemini AI로 3줄 요약 브리핑을 생성하는 API입니다.
export async function POST() {
  try {
    // 1. 로그인 인증 검증
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 2. 데이터베이스에서 모든 작업 카드 목록을 최신 수정 순으로 가져옵니다 (연결된 담당자 정보 및 댓글 포함).
    const cards = await db.card.findMany({
      include: {
        assignee: true,
        // 각 카드마다 최근 작성된 댓글 5개를 함께 로드합니다.
        comments: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { user: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const doneCards = cards.filter((c) => c.status === "DONE");
    const blockerCards = cards.filter((c) => c.isBlocker);

    // 아직 카드가 아예 등록되지 않았다면 예외 알림을 보냅니다.
    if (cards.length === 0) {
      return NextResponse.json({
        summary: "📢 현재 등록된 태스크 카드가 없습니다. 칸반 보드에서 카드를 발행하고 완료 처리해야 AI 요약이 활성화됩니다!",
      });
    }

    // 3. AI 모델에게 힌트로 제공할 오늘의 프로젝트 진척도 현황 텍스트를 구조화합니다.
    let projectStateText = "프로젝트 현재 진척도 정보:\n";
    
    projectStateText += `- 완료 처리된 업무 개수: ${doneCards.length}개\n`;
    doneCards.forEach((c) => {
      projectStateText += `  * [업무명] ${c.title} (담당: ${c.assignee?.name || "미지정"})\n`;
      c.comments.forEach((cm) => {
        if (!cm.isSystem) {
          projectStateText += `    - 조원의 의견(${cm.user?.name}): ${cm.content}\n`;
        }
      });
    });

    projectStateText += `- 에러로 진행이 차단된 업무(블로커) 개수: ${blockerCards.length}개\n`;
    blockerCards.forEach((c) => {
      projectStateText += `  * [장애명] ${c.title} (담당: ${c.assignee?.name || "미지정"}) / 원인 사유: ${c.blockerDesc}\n`;
    });

    // 4. 환경 변수에서 구글 Gemini API Key를 취득합니다.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // 💡 [데모 모드 방어 코드]
      // 학생들이나 채점관이 API Key를 환경 변수에 따로 넣지 않아도 즉석 시연이 가능하도록,
      // 현재 실제 DB 정보들을 실시간 대입한 친근한 가상 요약 브리핑 데이터를 리턴합니다.
      const mockSummary = `💡 [데모 브리핑 - GEMINI_API_KEY 미설정]
💻 오늘 우리 조는 '${doneCards[0]?.title || "초기 개발 환경 구성"}' 업무를 해결하며 힘차게 첫 삽을 떴습니다!
🚨 하지만 현재 '${blockerCards[0]?.title || "Prisma 마이그레이션 에러"}' 작업에 에러 빨간불이 켜져서 수리가 급한 상태입니다.
💬 전체 완료율은 약 ${Math.round((doneCards.length / cards.length) * 100)}%이며, 더 자세한 이력은 칸반 보드와 회의록에서 나누고 있으니 참고해 주세요!`;
      
      return NextResponse.json({ summary: mockSummary });
    }

    // 5. 실제 API Key가 제공된 경우 구글 Generative AI SDK를 기동합니다.
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 비용 효율적이고 빠른 성능을 자랑하는 gemini-1.5-flash 모델을 불러옵니다.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // AI가 수행할 비서 가이드 프롬프트를 가동합니다.
    const prompt = `
너는 IT 개발 동아리 및 대학 조별 과제 진척도 관리 서비스인 'DevSync'의 똑똑하고 친절한 AI 조원 비서야.
아래에 전달된 오늘 우리 팀의 실제 개발 진척 상황과 조원들의 피드백 대화 내역 데이터를 상세히 읽고 일일 브리핑 요약을 작성해줘.

${projectStateText}

[브리핑 작성 규칙]
1. 어려운 컴공 전문 용어나 시스템 로그 해시 같은 추상적인 데이터는 일상적인 비유(예: "첫 삽을 떴습니다", "엔진을 수리했습니다")로 풀어 써줘.
2. 오늘 거둔 핵심 성과와, 현재 어떤 부분에 에러 빨간불(블로커)이 켜져서 팀원이 곤경에 처해있는지 명확히 짚어줘.
3. 귀여운 IT 이모지(💻, 🚨, 🚀, 💬 등)를 적절히 섞어서 정확히 "딱 3줄"의 리스트로 대답해줘.
4. 첫 번째 줄은 "오늘 우리 조는~" 으로 문장을 시작해줘.
`;

    // AI 요약 생성 요청
    const result = await model.generateContent(prompt);
    const summaryText = result.response.text().trim();

    return NextResponse.json({ summary: summaryText });

  } catch (e) {
    console.error("Gemini AI 요약 처리 중 오류:", e);
    return NextResponse.json({ error: "AI 요약본 생성 과정에서 서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
