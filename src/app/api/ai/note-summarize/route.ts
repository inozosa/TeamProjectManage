import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

// POST: 회의록 본문을 넘겨받아 Gemini AI가 3줄 요약 및 구체적인 칸반 할 일(Action Item)을 추출해 주는 API입니다.
export async function POST(req: Request) {
  try {
    // 1. 로그인 여부 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "회의록 본문 내용을 전송해 주셔야 분석할 수 있습니다." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 2. [데모 방어 코드] API Key가 없을 경우 가상 AI 분석 Mock 데이터를 반환합니다.
    if (!apiKey) {
      const mockSummary = "💻 이번 회의에서는 프론트엔드 로그인 테마 적용과 백엔드 데이터베이스 마이그레이션 방안을 논의했습니다. 회원가입 승인 거절 버튼과 API 연동에 대해 조장과 조원이 각자 분담하여 다음 주까지 진행하기로 확정했습니다.";
      const mockActionItems = [
        { title: "로그인 페이지 라이트 테마 전환 검증", category: "FRONTEND", content: "디자인 가이드라인에 맞춘 화이트/슬레이트 테마 반영 상태 최종 체크" },
        { title: "회원가입 승인 거절 백엔드 API 연동", category: "BACKEND", content: "관리자 거절 버튼 클릭 시 DELETE API 호출되는 백엔드 로직 디버깅" },
        { title: "회의록 AI 요약 기능 동작 검토", category: "FRONTEND", content: "Gemini API 미설정 시에도 목 데이터가 예쁘게 출력되는지 테스트" }
      ];

      return NextResponse.json({ summary: mockSummary, actionItems: mockActionItems });
    }

    // 3. 실제 Gemini 기동
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
너는 IT 개발 동아리 및 대학 조별 과제 진척도 관리 서비스인 'WeAreTeam'의 똑똑하고 친절한 AI 조원 비서야.
아래에 제공된 회의록 텍스트 내용을 꼼꼼히 분석하여 3줄 이내의 핵심 요약(summary)과 이 회의에서 도출된 조원들의 실행할 할 일(actionItems) 목록을 추출해줘.

회의록 내용:
${content}

[출력 형식 가이드라인]
반드시 아래의 JSON 포맷으로만 응답해줘. 어떠한 다른 서론이나 설명 텍스트, markdown \`\`\`json tag도 붙이지 말고 순수한 JSON 문자열만 대답해줘.
JSON 구조:
{
  "summary": "회의 내용 전체를 3줄 이내로 깔끔하게 한글 요약한 문장 (친근한 말투와 IT 이모지 적절히 사용)",
  "actionItems": [
    {
      "title": "실행할 태스크 제목 (간결하고 명확하게)",
      "category": "업무 분야 카테고리 중 하나 (PLANNING, DESIGN, FRONTEND, BACKEND)",
      "content": "이 태스크에 대한 구체적인 업무 지시 사항"
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // AI가 마크다운 코드 블록으로 감쌌을 경우 정제
    if (text.startsWith("```json")) {
      text = text.substring(7);
    } else if (text.startsWith("```")) {
      text = text.substring(3);
    }
    if (text.endsWith("```")) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch (parseErr) {
      console.error("Gemini 응답 JSON 파싱 실패. 원본 텍스트:", text);
      return NextResponse.json({
        summary: "📢 AI 회의 요약 분석이 완료되었습니다. 결과가 JSON 포맷 규격에 맞지 않아 텍스트로 대체 출력합니다.\n\n" + text.substring(0, 300),
        actionItems: []
      });
    }

  } catch (e) {
    console.error("POST /api/ai/note-summarize 에러:", e);
    return NextResponse.json({ error: "AI 회의록 요약 분석 중 서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
