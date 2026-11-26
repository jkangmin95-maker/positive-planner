/**
 * 긍정플래너 공개 설정.
 *
 * 여기에는 Supabase 프로젝트 URL과 공개 키만 넣습니다.
 * 공개 키 이름: anon public key, 또는 publishable key.
 *
 * service_role 키와 secret 키(sb_secret_)는 절대 넣지 마세요.
 * 그 키는 모든 사용자의 기록을 읽을 수 있습니다. 이 파일과 빌드 결과에 남으면
 * 인터넷에 공개됩니다. 비밀 키는 코드, 이슈, 채팅에도 붙여 넣지 마세요.
 *
 * 값을 비워 두면 앱은 로그인 대신 '아직 연결 전' 화면을 보여 줍니다.
 * 저장 후 main에 푸시하면 GitHub Actions가 Pages에 다시 배포합니다.
 */
export const PP_CONFIG = {
  supabaseUrl: "https://awhnphwdifwnnfpbusqd.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3aG5waHdkaWZ3bm5mcGJ1c3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2NTA0OTQsImV4cCI6MjExMTIyNjQ5NH0.znWEGlzJ2bUF-Z0V3JJ7okRCSaUrJUTekIKHfBVU4bY",
};
