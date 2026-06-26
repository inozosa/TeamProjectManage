import NextAuth, { DefaultSession } from "next-auth";

// NextAuth.js 라이브러리의 기본 User 및 Session 타입을 확장하여,
// 우리가 프로젝트에서 사용할 고유 ID(id)와 역할(role - 조장, 조원 등)이 자동완성되도록 설정합니다.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;   // DB에 저장되는 유저 고유 ID
      role: string; // 유저 권한 (OWNER, MEMBER, VIEWER)
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;   // 유저 권한 (OWNER, MEMBER, VIEWER)
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
