import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto"; // 비밀번호 해시 대조 유틸 임포트

export const authOptions: NextAuthOptions = {
  // 인증 정보를 암호화된 토큰(JWT)으로 브라우저에 저장하고 확인합니다.
  session: {
    strategy: "jwt",
  },
  
  // 로그인 수단을 정의합니다. (오직 자체 아이디/비밀번호 인증만 사용)
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "DevSync Account",
      credentials: {
        loginId: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        // 1. 입력 인자 누락 방어
        if (!credentials?.loginId || !credentials?.password) {
          throw new Error("MissingCredentials");
        }

        // 2. 데이터베이스에서 해당 아이디를 가진 회원이 있는지 찾습니다.
        const user = await db.user.findUnique({
          where: { loginId: credentials.loginId },
        });

        // 3. 회원이 존재하지 않거나 비밀번호가 다르면 로그인 반려
        if (!user || !verifyPassword(credentials.password, user.password)) {
          // 커스텀 에러를 던져 로그인 화면 주소창에 ?error=InvalidCredentials 를 띄우게 만듭니다.
          throw new Error("InvalidCredentials");
        }

        // 4. 🚨 [핵심 보안 장치] 가입은 되었으나 관리자(admin)가 승인해주지 않은 상태인 경우
        if (!user.isApproved) {
          // 커스텀 에러를 던져 로그인 화면 주소창에 ?error=NotApproved 를 유도시켜 로그인을 원천 격리시킵니다.
          throw new Error("NotApproved");
        }

        // 5. 모든 검문(아이디 검사, 비밀번호 검사, 승인여부 검사)을 무사히 통과한 경우 세션 생성용 유저 객체 전달
        return {
          id: user.id,
          name: user.name,
          // 깃허브 API 연동 로그인 시 이메일을 기준으로 아바타를 대조하던 기존 레이아웃 호환성을 위해,
          // admin 계정은 email 값으로 "admin@devsync.com"을 들려보내 헤더의 관리자 탭 활성화에 씁니다.
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],

  // 로그인 상태 주기(Lifecycle)마다 세션을 주입해주는 콜백 설정
  callbacks: {
    // JWT 토큰을 구울 때 유저 고유 ID와 역할을 심어둡니다.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    // 브라우저가 현재 로그인 상태(세션)를 읽어갈 때 토큰에 심어둔 정보를 복사해 줍니다.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  
  // 로그인 폼 화면을 직접 커스터마이징한 경로(/login)로 연동합니다.
  pages: {
    signIn: "/login",
    error: "/login", // 오류 발생 시에도 로그인 폼에서 적절한 알림 경고를 띄우게 유도합니다.
  },
};
