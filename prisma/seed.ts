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

  console.log("🌱 ID/PW 로그인 개편용 신규 시드 데이터를 주입합니다...");

  // 1. 기존 데이터 전체 청소
  await prisma.comment.deleteMany({});
  await prisma.card.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.meetingNote.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. 가상 계정 4종 생성 (비밀번호는 해싱하여 데이터베이스에 적재합니다)
  
  // A. 관리자 (조장 / 바로 로그인 가능)
  const owner = await prisma.user.create({
    data: {
      loginId: "admin",
      password: hashPassword("admin"),
      name: "관리자 (조장)",
      email: "admin@devsync.com",
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
      role: "OWNER",
      isApproved: true, // 관리자는 즉시 승인 상태
    },
  });

  // B. 테스트용 조원 (바로 로그인 가능)
  const member = await prisma.user.create({
    data: {
      loginId: "seoyeon",
      password: hashPassword("seoyeon"),
      name: "이서연 (조원)",
      email: "seoyeon@devsync.com",
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=seoyeon",
      role: "MEMBER",
      isApproved: true, // 승인 상태로 세팅
    },
  });

  // C. 테스트용 구경꾼 (멘토 / 바로 로그인 가능)
  const viewer = await prisma.user.create({
    data: {
      loginId: "minwoo",
      password: hashPassword("minwoo"),
      name: "박민우 (멘토/교수님)",
      email: "minwoo@devsync.com",
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=minwoo",
      role: "VIEWER",
      isApproved: true, // 승인 상태로 세팅
    },
  });

  // D. 테스트용 가입 대기자 (승인 받기 전까진 로그인 불가)
  const pendingMember = await prisma.user.create({
    data: {
      loginId: "waiting",
      password: hashPassword("waiting"),
      name: "장태호 (승인대기 조원)",
      email: "waiting@devsync.com",
      image: "https://api.dicebear.com/7.x/bottts/svg?seed=waiting",
      role: "MEMBER",
      isApproved: false, // 🚨 승인 대기 상태 (로그인 불가 상태)
    },
  });

  // 3. 마일스톤 생성
  const ms1 = await prisma.milestone.create({
    data: {
      title: "중간 완성본 제출",
      description: "기본적인 칸반 보드 카드 드래그와 SQLite DB 연동 상태를 확인받는 날입니다.",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 현재일로부터 7일 뒤
    },
  });

  const ms2 = await prisma.milestone.create({
    data: {
      title: "최종 완성본 시연 및 배포",
      description: "GitHub 실시간 커밋 연동과 AI 일일 요약기가 포함된 전체 시스템 제출 기한입니다.",
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 현재일로부터 21일 뒤
    },
  });

  // 4. 칸반 카드 생성 (유저 ID를 새 구조에 맞춰 다시 엮어줍니다)
  const cardDone = await prisma.card.create({
    data: {
      title: "Next.js 14+ 및 Prisma 초기 프로젝트 셋업",
      content: "create-next-app을 활용해 TypeScript, TailwindCSS, App Router 구조를 구축하고 Prisma 마이그레이션을 마침.",
      status: "DONE",
      category: "FRONTEND",
      milestoneId: ms1.id,
      assigneeId: owner.id, // 관리자가 담당한 일로 매핑
    },
  });

  await prisma.comment.create({
    data: {
      content: "GitHub Commit (hash: a1b2c3d)에 의해 카드가 자동으로 완료(DONE) 상태로 전환되었습니다.",
      isSystem: true,
      cardId: cardDone.id,
    },
  });

  const cardBlocker = await prisma.card.create({
    data: {
      title: "Prisma ORM 마이그레이션 도중 getConfig wasm 오류 해결하기",
      content: "Prisma 7.x 버전부터 schema.prisma에서 url 변수가 폐지됨에 따라 발생하는 설정 충돌 현상을 디버깅함.",
      status: "IN_PROGRESS",
      category: "BACKEND",
      isBlocker: true,
      blockerDesc: "schema.prisma 내부의 url 프로퍼티를 지우고 prisma.config.ts 설정을 통해 연동해야 정상 작동합니다.",
      milestoneId: ms1.id,
      assigneeId: owner.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "터미널에 getConfig wasm 관련 예외 에러 코드가 잡혀서 컴파일이 안 됩니다. 조원분들 중 Prisma 7 연결 방법 아시는 분 계신가요?",
      cardId: cardBlocker.id,
      userId: owner.id,
    },
  });

  await prisma.card.create({
    data: {
      title: "Linear 스타일의 UI 테마 및 컴포넌트 마크업",
      content: "사용자 중심의 깔끔한 다크 모드 테마 가이드를 세우고 카드 컴포넌트 목업 퍼블리싱 진행하기.",
      status: "TODO",
      category: "DESIGN",
      milestoneId: ms1.id,
      assigneeId: member.id, // 이서연 조원이 담당한 일로 매핑
    },
  });

  // 5. 회의록 생성
  await prisma.meetingNote.create({
    data: {
      title: "DevSync 로그인 개편 및 관리자 승인제 도입 긴급 회의록",
      content: `## 📅 회의 일시
2026-06-26 10:00 (진행: 관리자 조장)

## 📌 회의 내용 및 주제
- **로그인 방식 개편**: 깃허브 소셜 로그인 대신, 팀원들이 직접 아이디/비번을 만들어 회원 가입하는 방식으로 전환.
- **가입 승인 장치 마련**: 외부 악성 사용자가 가입하여 과제 진척도를 망치는 것을 막기 위해, 가입 후 반드시 조장(admin)이 수동 승인을 해 주어야만 최종 로그인이 가능하도록 제한함.
- **관리자 수퍼 키**: ID: admin / PW: admin 으로 기설정하여 즉시 진입이 가능하도록 구성.

## 📝 조치 예정 태스크
- 회원가입 신청 양식 개발 (Register UI)
- 관리자 전용 대기 인원 승인 대시보드 구현
- 비밀번호 보안 해시 암호화 유틸리티 개발`,
      date: new Date(),
    },
  });

  console.log("🎉 새로운 ID/PW 기반 시드 데이터 주입이 성공적으로 완수되었습니다!");
}

main()
  .catch((e) => {
    console.error("❌ 시드 도중 에러가 발생했습니다:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
