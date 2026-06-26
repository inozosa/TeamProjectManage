import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// 우리가 작성한 authOptions(인증 옵션)를 담아 NextAuth 핸들러를 생성합니다.
const handler = NextAuth(authOptions);

// Next.js App Router API 규격에 맞춰, 이 경로로 들어오는 모든 GET 요청과 POST 요청을 NextAuth 핸들러가 처리하도록 내보냅니다.
export { handler as GET, handler as POST };
