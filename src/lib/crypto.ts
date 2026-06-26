import crypto from "crypto";

// 암호화 시 소금(Salt)을 치듯 평문 비밀번호에 소량의 무작위 단어를 섞어
// 해커가 원본 비밀번호를 추정하기 어렵게 만드는 '소금(Salt)' 키입니다.
const SALT = "weareteam_security_salt_key_2026";

// 1. 평문 비밀번호를 받아 돌려받을 수 없는 일방향 해시 값으로 짓이겨 변환하는 함수
export function hashPassword(password: string): string {
  // Node.js 내장 crypto의 PBKDF2 암호화 규격을 기동합니다.
  // 이 방식은 비밀번호와 솔트(SALT)를 섞어 1,000번 반복해서 아주 잘게 해싱하여 난해한 16진수 문자열로 내뿜어 줍니다.
  return crypto
    .pbkdf2Sync(password, SALT, 1000, 64, "sha512")
    .toString("hex");
}

// 2. 사용자가 로그인 창에 입력한 패스워드가 DB에 박혀 있는 해시 비밀번호와 같은지 대조 검증하는 함수
export function verifyPassword(password: string, hash: string): boolean {
  // 입력받은 패스워드를 동일한 솔트(SALT) 레시피로 요리한 해시 값을 구합니다.
  const inputHash = hashPassword(password);
  
  // 두 요리의 결과물(문자열)이 정확히 같은지 대조하여 맞으면 참(true), 틀리면 거짓(false)을 리턴합니다.
  return inputHash === hash;
}
