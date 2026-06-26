import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// 개발 환경(Development)에서는 Next.js가 코드 수정 시마다 프로젝트를 재시작하는 '핫 리로딩(Hot Reloading)'을 수행합니다.
// 이때 매번 새로운 PrismaClient 객체가 생성되어 DB 커넥션이 고갈되는 현상이 발생할 수 있습니다.
// 이를 해결하기 위해 global 객체(서버 실행 기간 동안 계속 유지되는 메모리 공간)에 인스턴스를 담아두고 재사용합니다.

// global 객체에 prisma 속성이 정의되어 있을 수 있음을 선언합니다.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

let dbInstance: PrismaClient;

// 이미 global 객체에 저장된 prisma 인스턴스가 있다면 그것을 그대로 사용합니다.
if (globalForPrisma.prisma) {
  dbInstance = globalForPrisma.prisma;
} else {
  // PostgreSQL용 표준 TCP 커넥션 풀을 연결합니다.
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  // 어댑터를 주입하여 PrismaClient 인스턴스를 최종 생성합니다.
  dbInstance = new PrismaClient({
    adapter,
    // 개발 모드일 때만 데이터베이스 쿼리 로그를 터미널에 상세히 출력해줍니다.
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const db = dbInstance;

// 배포 환경(Production)이 아닐 때만 global 객체에 현재의 db 인스턴스를 담아둡니다.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
