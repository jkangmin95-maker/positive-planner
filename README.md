# 긍정플래너

『긍정학개론』을 매일 짧게 연습하는 모바일 우선 웹 플래너입니다. 로그인 뒤 기록은 전용 Supabase Postgres에 있고, 각 사용자는 자기 행만 봅니다. 홈 화면에 설치할 수 있는 PWA입니다.

하루의 필수 입력은 **오늘 한 줄** 하나입니다. 빈칸은 실패로 보이지 않고, 연속 일수는 세지 않습니다. 날짜는 Asia/Seoul입니다.

공개 주소: https://jkangmin95-maker.github.io/positive-planner/

설정 순서는 [SETUP.md](SETUP.md)에 있습니다. URL과 anon 키만 `src/config.js`에 넣습니다.

```bash
npm install
npm test
npm run build
npm run serve
```
