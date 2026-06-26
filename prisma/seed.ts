import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hashPassword } from "../src/lib/crypto"; // 비밀번호 암호화 유틸 임포트

let prisma: PrismaClient;

async function main() {
  console.log("DEBUG DATABASE_URL:", process.env.DATABASE_URL);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });

  console.log("🌱 풍부한 더미 데이터를 주입합니다...");

  // ─────────────────────────────────────────────
  // 1. 기존 데이터 전체 청소 (순서 중요: 외래키 의존성 때문에 자식 테이블부터)
  // ─────────────────────────────────────────────
  await prisma.comment.deleteMany({});
  await prisma.card.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.meetingNote.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.user.deleteMany({});

  // ─────────────────────────────────────────────
  // 2. 가상 팀원 5명 생성
  // ─────────────────────────────────────────────

  // 조장 (관리자)
  const owner = await prisma.user.create({
    data: {
      loginId: "admin",
      password: hashPassword("admin"),
      name: "김지훈 (조장)",
      email: "jihun@devsync.team",
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=jihun",
      role: "OWNER",
      isApproved: true,
    },
  });

  // 프론트엔드 담당 조원
  const frontDev = await prisma.user.create({
    data: {
      loginId: "seoyeon",
      password: hashPassword("seoyeon"),
      name: "이서연 (FE 개발)",
      email: "seoyeon@devsync.team",
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=seoyeon",
      role: "MEMBER",
      isApproved: true,
    },
  });

  // 백엔드 담당 조원
  const backDev = await prisma.user.create({
    data: {
      loginId: "minjae",
      password: hashPassword("minjae"),
      name: "박민재 (BE 개발)",
      email: "minjae@devsync.team",
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=minjae",
      role: "MEMBER",
      isApproved: true,
    },
  });

  // 디자인 담당 조원
  const designer = await prisma.user.create({
    data: {
      loginId: "yuna",
      password: hashPassword("yuna"),
      name: "최유나 (UI/UX 디자이너)",
      email: "yuna@devsync.team",
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=yuna",
      role: "MEMBER",
      isApproved: true,
    },
  });

  // 교수님 (멘토 / 구경꾼)
  const mentor = await prisma.user.create({
    data: {
      loginId: "prof",
      password: hashPassword("prof"),
      name: "정승환 교수님 (멘토)",
      email: "prof@university.ac.kr",
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=prof",
      role: "VIEWER",
      isApproved: true,
    },
  });

  // 가입 대기 중인 신규 조원
  await prisma.user.create({
    data: {
      loginId: "waiting",
      password: hashPassword("waiting"),
      name: "장태호 (승인 대기 중)",
      email: "waiting@devsync.team",
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=waiting",
      role: "MEMBER",
      isApproved: false, // 🚨 승인 전이라 로그인 불가
    },
  });

  // ─────────────────────────────────────────────
  // 3. 마일스톤 4개 생성 (간트차트에 보여질 핵심 일정)
  // ─────────────────────────────────────────────
  const now = new Date();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000);

  const ms1 = await prisma.milestone.create({
    data: {
      title: "1차: 기획 및 설계 완료",
      description: "요구사항 분석, 화면 설계, DB 스키마 설계, 기술 스택 선정을 완료합니다.",
      dueDate: daysFromNow(-10), // 10일 전 (이미 완료된 마일스톤)
    },
  });

  const ms2 = await prisma.milestone.create({
    data: {
      title: "2차: 핵심 기능 개발 완료",
      description: "로그인/회원가입, 칸반 보드 CRUD, Neon DB 연동 등 핵심 기능을 완성합니다.",
      dueDate: daysFromNow(5), // 5일 후 (진행 중인 마일스톤)
    },
  });

  const ms3 = await prisma.milestone.create({
    data: {
      title: "3차: 중간 발표 및 피드백 반영",
      description: "교수님께 중간 발표를 진행하고, 수렴된 피드백을 기반으로 개선사항을 반영합니다.",
      dueDate: daysFromNow(14), // 14일 후
    },
  });

  const ms4 = await prisma.milestone.create({
    data: {
      title: "4차: 최종 시연 및 배포",
      description: "AI 요약 기능, GitHub 웹훅 연동, Vercel 배포를 완료하고 최종 발표를 진행합니다.",
      dueDate: daysFromNow(28), // 28일 후 (최종 마일스톤)
    },
  });

  // ─────────────────────────────────────────────
  // 4. 칸반 카드 생성 (DONE / IN_PROGRESS / TODO 고르게 분포)
  // ─────────────────────────────────────────────

  // === DONE (완료된 카드들) ===
  const c1 = await prisma.card.create({
    data: {
      title: "프로젝트 요구사항 문서 작성",
      content: "팀 전체가 모여 PRD(Product Requirements Document)를 작성하고 기능 우선순위를 확정했습니다.",
      status: "DONE",
      category: "PLANNING",
      milestoneId: ms1.id,
      assigneeId: owner.id,
      dueDate: daysFromNow(-12),
    },
  });

  const c2 = await prisma.card.create({
    data: {
      title: "Figma 와이어프레임 제작",
      content: "대시보드, 칸반 보드, 회의록, 간트차트 4개 화면의 와이어프레임을 Figma로 완성했습니다.",
      status: "DONE",
      category: "DESIGN",
      milestoneId: ms1.id,
      assigneeId: designer.id,
      dueDate: daysFromNow(-11),
    },
  });

  const c3 = await prisma.card.create({
    data: {
      title: "Next.js + Prisma 초기 프로젝트 셋업",
      content: "create-next-app으로 TypeScript, App Router 구조를 구축하고 Prisma 7 + Neon DB 연동을 완료했습니다.",
      status: "DONE",
      category: "FRONTEND",
      milestoneId: ms1.id,
      assigneeId: owner.id,
      dueDate: daysFromNow(-9),
    },
  });

  const c4 = await prisma.card.create({
    data: {
      title: "Neon PostgreSQL DB 스키마 설계 및 마이그레이션",
      content: "User, Card, Milestone, Comment, MeetingNote, Notification 6개 테이블을 설계하고 Neon DB에 배포했습니다.",
      status: "DONE",
      category: "BACKEND",
      milestoneId: ms1.id,
      assigneeId: backDev.id,
      dueDate: daysFromNow(-8),
    },
  });

  const c5 = await prisma.card.create({
    data: {
      title: "다크 모드 글로벌 디자인 시스템 구축",
      content: "CSS 변수 기반의 색상 팔레트, 타이포그래피, 컴포넌트 스타일 가이드를 완성했습니다.",
      status: "DONE",
      category: "DESIGN",
      milestoneId: ms2.id,
      assigneeId: designer.id,
      dueDate: daysFromNow(-5),
    },
  });

  const c6 = await prisma.card.create({
    data: {
      title: "아이디/비밀번호 로그인 시스템 개발",
      content: "NextAuth.js를 활용한 커스텀 Credentials Provider를 구현하고 bcrypt 비밀번호 해싱을 적용했습니다.",
      status: "DONE",
      category: "BACKEND",
      milestoneId: ms2.id,
      assigneeId: backDev.id,
      dueDate: daysFromNow(-4),
    },
  });

  const c7 = await prisma.card.create({
    data: {
      title: "관리자 승인제 회원가입 UI 개발",
      content: "신규 회원이 가입 신청을 하면 조장(admin)의 승인을 받아야 로그인 가능하도록 플로우를 구현했습니다.",
      status: "DONE",
      category: "FRONTEND",
      milestoneId: ms2.id,
      assigneeId: frontDev.id,
      dueDate: daysFromNow(-3),
    },
  });

  // === IN_PROGRESS (진행 중인 카드들) ===
  const c8 = await prisma.card.create({
    data: {
      title: "칸반 보드 드래그 앤 드롭 기능 구현",
      content: "react-beautiful-dnd 또는 @dnd-kit 라이브러리를 활용해 카드의 상태 변경을 드래그로 처리합니다.",
      status: "IN_PROGRESS",
      category: "FRONTEND",
      milestoneId: ms2.id,
      assigneeId: frontDev.id,
      dueDate: daysFromNow(3),
    },
  });

  const c9 = await prisma.card.create({
    data: {
      title: "카드 상세 모달 및 댓글 시스템 개발",
      content: "카드 클릭 시 상세 모달이 열리고, 팀원들이 댓글을 달 수 있는 기능을 구현 중입니다.",
      status: "IN_PROGRESS",
      category: "FRONTEND",
      milestoneId: ms2.id,
      assigneeId: frontDev.id,
      dueDate: daysFromNow(4),
    },
  });

  const c10 = await prisma.card.create({
    data: {
      title: "간트차트 타임라인 시각화 컴포넌트 개발",
      content: "마일스톤과 카드의 일정을 SVG 기반 간트차트로 시각화하는 커스텀 컴포넌트를 개발 중입니다.",
      status: "IN_PROGRESS",
      category: "FRONTEND",
      milestoneId: ms3.id,
      assigneeId: frontDev.id,
      dueDate: daysFromNow(12),
      isBlocker: true,
      blockerDesc: "SVG 날짜 스케일 계산 시 타임존 오프셋 버그 발생 중. UTC 기준으로 통일하는 방향으로 수정 중.",
    },
  });

  const c11 = await prisma.card.create({
    data: {
      title: "마일스톤 CRUD API 엔드포인트 개발",
      content: "마일스톤 생성/조회/수정/삭제 REST API를 Next.js Route Handler로 구현하고 있습니다.",
      status: "IN_PROGRESS",
      category: "BACKEND",
      milestoneId: ms2.id,
      assigneeId: backDev.id,
      dueDate: daysFromNow(2),
    },
  });

  // === TODO (예정된 카드들) ===
  await prisma.card.create({
    data: {
      title: "GitHub 웹훅 연동 - 커밋 시 카드 상태 자동 변경",
      content: "GitHub Actions에서 커밋 메시지에 #card-id DONE 형식을 포함하면 해당 카드가 자동으로 완료 처리됩니다.",
      status: "TODO",
      category: "BACKEND",
      milestoneId: ms3.id,
      assigneeId: backDev.id,
      dueDate: daysFromNow(10),
      githubIssueNo: 12,
    },
  });

  await prisma.card.create({
    data: {
      title: "AI 일일 개발 브리핑 자동 생성 기능",
      content: "Google Gemini API를 호출해 당일 완료된 카드들을 요약하고 Notification 테이블에 저장하는 Cron Job을 구현합니다.",
      status: "TODO",
      category: "BACKEND",
      milestoneId: ms3.id,
      assigneeId: owner.id,
      dueDate: daysFromNow(11),
      githubIssueNo: 15,
    },
  });

  await prisma.card.create({
    data: {
      title: "회의록 마크다운 에디터 개선",
      content: "현재 textarea 기반의 입력창을 마크다운 프리뷰가 지원되는 rich text 에디터로 교체합니다.",
      status: "TODO",
      category: "FRONTEND",
      milestoneId: ms3.id,
      assigneeId: frontDev.id,
      dueDate: daysFromNow(13),
    },
  });

  await prisma.card.create({
    data: {
      title: "Vercel 프로덕션 배포 및 환경변수 세팅",
      content: "Vercel에 프로젝트를 배포하고 Neon DB, NextAuth Secret 등 환경변수를 프로덕션 환경에 등록합니다.",
      status: "TODO",
      category: "PLANNING",
      milestoneId: ms4.id,
      assigneeId: owner.id,
      dueDate: daysFromNow(25),
    },
  });

  await prisma.card.create({
    data: {
      title: "최종 발표 PPT 제작 및 시연 스크립트 작성",
      content: "프로젝트의 핵심 기능과 기술 스택을 정리한 발표 자료를 제작하고 라이브 시연 순서를 작성합니다.",
      status: "TODO",
      category: "PLANNING",
      milestoneId: ms4.id,
      assigneeId: designer.id,
      dueDate: daysFromNow(26),
    },
  });

  await prisma.card.create({
    data: {
      title: "반응형 모바일 레이아웃 최적화",
      content: "태블릿 및 모바일 화면에서 칸반 보드와 대시보드가 올바르게 표시되도록 반응형 CSS를 적용합니다.",
      status: "TODO",
      category: "FRONTEND",
      milestoneId: ms4.id,
      assigneeId: frontDev.id,
      dueDate: daysFromNow(20),
    },
  });

  // ─────────────────────────────────────────────
  // 5. 댓글/로그 생성
  // ─────────────────────────────────────────────
  await prisma.comment.create({
    data: {
      content: "GitHub Commit (hash: a1b2c3d) — 'feat: next.js initial setup complete' 에 의해 카드가 자동으로 완료(DONE) 처리되었습니다.",
      isSystem: true,
      cardId: c3.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "Neon DB 연결 완료! prisma migrate dev 실행 결과 6개 테이블이 정상 생성되었습니다.",
      isSystem: false,
      cardId: c4.id,
      userId: backDev.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "NextAuth Credentials Provider에서 세션 토큰이 간헐적으로 만료되는 이슈가 있었는데, NEXTAUTH_SECRET 환경변수 설정 후 해결되었습니다.",
      isSystem: false,
      cardId: c6.id,
      userId: backDev.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "디자이너 유나님이 피그마 컴포넌트 링크를 공유해줬습니다. 참고해서 퍼블리싱 진행할게요!",
      isSystem: false,
      cardId: c8.id,
      userId: frontDev.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "드래그 앤 드롭 라이브러리를 react-beautiful-dnd 대신 @dnd-kit으로 교체했습니다. React 19 호환성 이슈가 있었기 때문입니다.",
      isSystem: false,
      cardId: c8.id,
      userId: frontDev.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "GitHub Issue #18 링크: SVG 타임존 버그 재현 방법 — 한국 시간(KST)으로 자정 경계 이동 시 날짜가 하루 뒤로 밀리는 증상입니다.",
      isSystem: false,
      cardId: c10.id,
      userId: owner.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "카드 CRUD API 개발 완료. /api/cards POST, GET, PATCH, DELETE 전부 테스트 완료.",
      isSystem: true,
      cardId: c11.id,
    },
  });

  // ─────────────────────────────────────────────
  // 6. 회의록 4건 생성
  // ─────────────────────────────────────────────
  await prisma.meetingNote.create({
    data: {
      title: "킥오프 회의 — 프로젝트 방향 및 기술 스택 결정",
      content: `## 📅 회의 일시
2026-06-16 (월) 오후 2:00 ~ 4:00 | 장소: 공학관 302호

## 👥 참석자
김지훈(조장), 이서연(FE), 박민재(BE), 최유나(디자인), 정승환 교수님

## 📌 결정 사항

### 기술 스택
- **프레임워크**: Next.js 16 (App Router) + TypeScript
- **데이터베이스**: Neon PostgreSQL (서버리스)
- **ORM**: Prisma v7
- **인증**: NextAuth.js v4 (Credentials Provider)
- **배포**: Vercel

### 프로젝트 개요
팀 프로젝트 관리 도구 **DevSync**를 개발합니다. 칸반 보드, 마일스톤 관리, 회의록, 간트차트, AI 브리핑 기능을 포함합니다.

## 📝 다음 액션 아이템
- [ ] 조장: 깃허브 레포 생성 및 팀원 초대
- [ ] 디자이너: Figma 와이어프레임 제작 시작
- [ ] BE: DB 스키마 초안 작성
- [ ] FE: Next.js 프로젝트 초기 셋업`,
      date: daysFromNow(-14),
    },
  });

  await prisma.meetingNote.create({
    data: {
      title: "스프린트 1 회의 — 로그인 개편 및 DB 연동 계획",
      content: `## 📅 회의 일시
2026-06-20 (금) 오후 3:00 ~ 4:30 | 장소: Discord 화상 회의

## 👥 참석자
김지훈(조장), 이서연(FE), 박민재(BE), 최유나(디자인)

## 📌 회의 내용

### 로그인 방식 변경
깃허브 소셜 로그인에서 **아이디/비밀번호 기반 자체 로그인**으로 방향 전환.
외부 팀원이 GitHub 계정이 없는 경우를 대비하고, 교수님/멘토의 접근을 용이하게 하기 위함.

### 가입 승인제 도입
악성 사용자 방지를 위해 **조장 수동 승인 후 로그인 가능** 방식 채택.
- isApproved 필드를 User 모델에 추가
- 관리자 전용 대기 인원 목록 페이지 구현 필요

### Neon DB 연동 이슈
Prisma 7.x 버전부터 schema.prisma의 \`url\` 프로퍼티가 폐지됨.
prisma.config.ts를 통해 연결 URL을 관리하는 방식으로 수정 완료.

## 📝 다음 액션 아이템
- [ ] BE: 로그인/회원가입 API 개발
- [ ] FE: 로그인 UI 마크업
- [ ] 조장: Neon DB 마이그레이션 실행`,
      date: daysFromNow(-8),
    },
  });

  await prisma.meetingNote.create({
    data: {
      title: "스프린트 2 회의 — 칸반 보드 및 UI 개발 현황 점검",
      content: `## 📅 회의 일시
2026-06-24 (화) 오후 1:00 ~ 2:30 | 장소: 공학관 302호

## 👥 참석자
김지훈(조장), 이서연(FE), 박민재(BE), 최유나(디자인)

## 📌 진행 상황 공유

### ✅ 완료된 항목
- 로그인/회원가입 시스템 완성
- Neon DB 6개 테이블 마이그레이션 완료
- 다크 모드 디자인 시스템 구축

### 🔄 진행 중인 항목
- 칸반 보드 드래그 앤 드롭 (이서연, ~6/28)
- 마일스톤 API 개발 (박민재, ~6/27)

### 🚨 블로커 이슈
- 간트차트 SVG 타임존 버그: KST 기준 자정 경계에서 날짜 계산 오류 발생
- react-beautiful-dnd → @dnd-kit 라이브러리 교체 필요 (React 19 호환성 이슈)

## 📝 다음 목표 (스프린트 3)
- 칸반 드래그 앤 드롭 완성
- 댓글 시스템 구현
- GitHub 웹훅 연동 시작`,
      date: daysFromNow(-2),
    },
  });

  await prisma.meetingNote.create({
    data: {
      title: "긴급 기술 논의 — AI 브리핑 기능 설계 검토",
      content: `## 📅 회의 일시
2026-06-25 (수) 오후 5:00 ~ 6:00 | 장소: Discord 음성 채널

## 👥 참석자
김지훈(조장), 박민재(BE)

## 📌 논의 내용

### Gemini AI 브리핑 기능 설계
매일 오전 8시, 전날 완료된 카드 목록을 Google Gemini API에 전달해 요약 브리핑을 자동 생성합니다.

**프롬프트 구조:**
\`\`\`
오늘 팀이 완료한 작업 목록입니다: {카드 제목 목록}
각 작업을 2~3문장으로 요약하고, 팀의 진행 상황을 격려하는 메시지를 포함해주세요.
\`\`\`

**구현 방안:**
1. Vercel Cron Jobs 또는 GitHub Actions을 이용한 스케줄링
2. 생성된 브리핑을 Notification 테이블에 저장
3. 대시보드 상단에 오늘의 AI 브리핑 위젯으로 표시

## 📝 결론
- 박민재 주도로 /api/ai/briefing 엔드포인트 개발 시작
- Vercel Cron 방식으로 구현 (GitHub Actions보다 간단)`,
      date: daysFromNow(-1),
    },
  });

  // ─────────────────────────────────────────────
  // 7. 알림/공지사항 생성
  // ─────────────────────────────────────────────
  await prisma.notification.create({
    data: {
      title: "🤖 AI 일일 브리핑 — 6월 25일 개발 요약",
      content: `오늘 DevSync 팀은 활발한 개발을 진행했습니다!

**✅ 오늘 완료한 작업**
- 아이디/비밀번호 로그인 시스템 개발이 완료되었습니다. NextAuth.js Credentials Provider를 성공적으로 구현했습니다.
- 관리자 승인제 회원가입 UI가 완성되어 팀장의 수동 승인 후 로그인이 가능합니다.
- Neon PostgreSQL 데이터베이스 연동이 완료되어 모든 데이터가 클라우드에 안전하게 저장됩니다.

**🔄 내일 예정된 작업**
칸반 보드 드래그 앤 드롭 기능 완성과 댓글 시스템 구현이 예정되어 있습니다.

팀 여러분 오늘도 수고 많으셨습니다! 💪`,
      createdAt: daysFromNow(-1),
    },
  });

  await prisma.notification.create({
    data: {
      title: "🤖 AI 일일 브리핑 — 6월 24일 개발 요약",
      content: `DevSync 팀의 6월 24일 개발 브리핑입니다.

**✅ 오늘 완료한 작업**
- 다크 모드 글로벌 디자인 시스템 구축이 완료되었습니다. 일관된 색상 팔레트와 타이포그래피가 적용되었습니다.

**🚨 주의 필요 사항**
간트차트 SVG 컴포넌트에서 타임존 관련 버그가 발견되었습니다. KST 기준 자정 경계 처리에 주의가 필요합니다.

내일도 화이팅! 🚀`,
      createdAt: daysFromNow(-2),
    },
  });

  console.log("🎉 더미 데이터 주입이 성공적으로 완료되었습니다!");
  console.log("");
  console.log("📊 생성된 데이터 요약:");
  console.log("  👥 유저 6명 (조장1, 조원3, 교수님1, 대기1)");
  console.log("  🎯 마일스톤 4개");
  console.log("  📋 칸반 카드 15개 (DONE 7, IN_PROGRESS 4, TODO 4)");
  console.log("  💬 댓글/로그 7개");
  console.log("  📝 회의록 4개");
  console.log("  🔔 알림 2개");
}

main()
  .catch((e) => {
    console.error("❌ 시드 도중 에러가 발생했습니다:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
